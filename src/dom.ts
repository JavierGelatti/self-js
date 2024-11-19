import {deltaBetween, point, Position} from "./position.ts";

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

export function clientPositionOf(event: PointerEvent): Position {
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
    draggableElement.addEventListener("pointerdown", (event: PointerEvent) => {
        onDragStart?.();
        event.preventDefault();
        draggableElement.setPointerCapture(event.pointerId);
        draggableElement.classList.add("dragging");

        const dragEnd = new AbortController();

        let lastPosition: Position = clientPositionOf(event);

        draggableElement.addEventListener("pointermove", (event: PointerEvent) => {
            const newPosition = clientPositionOf(event);
            const delta = deltaBetween(lastPosition, newPosition);

            onDrag?.(newPosition, delta);

            lastPosition = newPosition;
        }, {signal: dragEnd.signal});

        const endDrag = () => {
            onDragEnd?.();
            draggableElement.classList.remove("dragging");
            dragEnd.abort();
        };

        draggableElement.addEventListener("pointerup", endDrag, {signal: dragEnd.signal});
        draggableElement.addEventListener("pointercancel", endDrag, {signal: dragEnd.signal});
    });
}
