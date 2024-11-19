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

export function clientPositionOf(event: PointerEvent): Position {
    return point(event.clientX, event.clientY);
}