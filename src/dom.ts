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

export type DragHandler = {
    grabbedElement: HTMLElement,
    onDrag?: (cursorPosition: Position, delta: Position) => void,
    onDrop?: (cursorPosition: Position) => void,
    onCancel?: () => void,
};

export function makeDraggable(
    draggableElement: HTMLElement,
    onStart: (clientGrabPosition: Position) => DragHandler,
) {
    draggableElement.classList.add("draggable");

    function grab(pointerId: number, clientGrabPosition: Position) {
        const { grabbedElement, onDrag, onDrop, onCancel } = onStart(clientGrabPosition);
        grabbedElement.setPointerCapture(pointerId);
        draggableElement.classList.add("dragging");
        grabbedElement.classList.add("dragging");

        const dragEnd = new AbortController();

        let lastPosition: Position = clientGrabPosition;

        grabbedElement.addEventListener("pointermove", (event: PointerEvent) => {
            if (event.pointerId !== pointerId) return;

            const newPosition = clientPositionOf(event);
            const delta = lastPosition.deltaToReach(newPosition);

            onDrag?.(newPosition.plus(scrollPosition()), delta);

            lastPosition = newPosition;
        }, {signal: dragEnd.signal});

        const endDragRunning = (callback?: (cursorPosition: Position) => void) => (event: PointerEvent) => {
            if (event.pointerId !== pointerId) return;

            callback?.(clientPositionOf(event));
            grabbedElement.classList.remove("dragging");
            draggableElement.classList.remove("dragging");
            dragEnd.abort();
        };

        grabbedElement.addEventListener("pointerup", endDragRunning(onDrop), {signal: dragEnd.signal});
        grabbedElement.addEventListener("pointercancel", endDragRunning(onCancel), {signal: dragEnd.signal});
        grabbedElement.addEventListener("pointerdown", () => { dragEnd.abort() }, {signal: dragEnd.signal});
    }

    draggableElement.addEventListener("pointerdown", (event: PointerEvent) => {
        if (event.target !== draggableElement) return;

        event.preventDefault();
        grab(event.pointerId, clientPositionOf(event));
    });

    return grab;
}

function scrollPosition() {
    return point(window.scrollX, window.scrollY);
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

    origin() {
        return point(this.x, this.y);
    }

    extent() {
        return point(this.width, this.height);
    }

    centerOffset() {
        return this.extent().map(c => c / 2);
    }

    deltaToReach(anotherBox: PageBox) {
        return this.origin().deltaToReach(anotherBox.origin());
    }

    contains(position: Position) {
        return this._areOrdered(this.left, position.x, this.right) &&
            this._areOrdered(this.top, position.y, this.bottom);
    }

    private _areOrdered(a: number, b: number, c: number) {
        return a <= b && b <= c;
    }
}

export function positionOfDomElement(element: Element) {
    return boundingPageBoxOf(element).position;
}

export function clientPositionOfDomElement(element: Element) {
    const clientRect = element.getBoundingClientRect();
    return point(clientRect.x, clientRect.y);
}

export function sizeOfDomElement(element: Element) {
    return boundingPageBoxOf(element).size;
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