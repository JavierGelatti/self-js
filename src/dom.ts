import {point, Position} from "./position.ts";

export type PointerEventType
    = 'pointerover'
    | 'pointerenter'
    | 'pointerdown'
    | 'pointermove'
    | 'pointerup'
    | 'pointercancel'
    | 'pointerout'
    | 'pointerleave'

export function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K, properties: Partial<HTMLElementTagNameMap[K]> = {}, children: (Node | string)[] = [],
) {
    const newElement = document.createElement(tagName);
    Object.assign(newElement, properties);
    newElement.append(...children);
    return newElement;
}

export function clientPositionOf(event: MouseEvent): Position {
    return point(event.clientX, event.clientY);
}

export function makeDraggable(
    draggableElement: HTMLElement,
    {onDragStart, onDrag, onDragEnd}: {
        onDragStart?: () => void,
        onDrag?: (cursorPosition: Position, delta: Position) => void,
        onDragEnd?: () => void,
    },
) {
    draggableElement.classList.add("draggable");

    function grab(pointerId: number, grabPosition: Position) {
        onDragStart?.();
        draggableElement.setPointerCapture(pointerId);
        draggableElement.classList.add("dragging");

        const dragEnd = new AbortController();

        let lastPosition: Position = grabPosition;

        draggableElement.addEventListener("pointermove", (event: PointerEvent) => {
            if (event.pointerId !== pointerId) return;

            const newPosition = clientPositionOf(event);
            const delta = lastPosition.deltaToReach(newPosition);

            onDrag?.(newPosition, delta);

            lastPosition = newPosition;
        }, {signal: dragEnd.signal});

        const endDrag = (event: PointerEvent) => {
            if (event.pointerId !== pointerId) return;

            onDragEnd?.();
            draggableElement.classList.remove("dragging");
            dragEnd.abort();
        };

        draggableElement.addEventListener("pointerup", endDrag, {signal: dragEnd.signal});
        draggableElement.addEventListener("pointercancel", endDrag, {signal: dragEnd.signal});
        draggableElement.addEventListener("pointerdown", () => { dragEnd.abort() }, {signal: dragEnd.signal});
    }

    draggableElement.addEventListener("pointerdown", (event: PointerEvent) => {
        if (event.target !== draggableElement) return;

        event.preventDefault();
        grab(event.pointerId, clientPositionOf(event));
    });

    return grab;
}
