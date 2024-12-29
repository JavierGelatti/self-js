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

export type ClientLocation = { clientX: number, clientY: number };

export function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K, properties: Partial<Omit<HTMLElementTagNameMap[K], "style"> & { style: Partial<CSSStyleDeclaration> }> = {}, children: (Node | string)[] = [],
) {
    const newElement = document.createElement(tagName);
    const { style, ...propertiesWithoutStyle } = properties;
    Object.assign(newElement, propertiesWithoutStyle);
    if (style) Object.assign(newElement.style, style);
    newElement.append(...children);
    return newElement;
}

type SVGAttributesMap = {
    "path": {
        d: string,
        stroke: string,
        fill: string,
        pathLength: number,
    },
    "svg": {
        width: number,
        height: number,
    }
};


type SVGAttributes<K extends keyof SVGElementTagNameMap> = K extends keyof SVGAttributesMap ? SVGAttributesMap[K] : `UNKNOWN TAG: ${K}`;

export function createSvgElement<K extends keyof SVGElementTagNameMap>(
    tagName: K, attributes: Partial<SVGAttributes<K>> = {}, children: (Node | string)[] = [],
) {
    const newElement = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    for (const [attributeName, attributeValue] of Object.entries(attributes)) {
        newElement.setAttribute(attributeName, String(attributeValue));
    }
    newElement.append(...children);
    return newElement;
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

export function clientPositionOf(event: MouseEvent): Position {
    return point(event.clientX, event.clientY);
}

export function asClientLocation(position: Position): ClientLocation {
    return {clientX: position.x, clientY: position.y};
}

export class PageBox {
    constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly width: number,
        public readonly height: number,
    ) {}

    get position() {
        return point(this.x, this.y);
    }

    get size() {
        return point(this.width, this.height);
    }

    get top() {
        return this.y;
    }

    get bottom() {
        return this.y + this.height;
    }

    get left() {
        return this.x;
    }

    get right() {
        return this.x + this.width;
    }

    center() {
        return point(this.x + this.width / 2, this.y + this.height / 2);
    }
}

export function positionOfDomElement(element: Element) {
    return boundingPageBoxOf(element).position;
}

export function sizeOfDomElement(element: Element) {
    return boundingPageBoxOf(element).size;
}

export function centerOf(domBox: DOMRect) {
    return point(domBox.x + domBox.width / 2, domBox.y + domBox.height / 2);
}

export function getElementAt(position: Position) {
    return document.elementFromPoint(position.x, position.y);
}

export function boundingPageBoxOf(controlEnd: Element) {
    const clientRect = controlEnd.getBoundingClientRect();
    return new PageBox(
        clientRect.x + window.scrollX,
        clientRect.y + window.scrollY,
        clientRect.width,
        clientRect.height,
    );
}