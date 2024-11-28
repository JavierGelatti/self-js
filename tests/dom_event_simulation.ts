import {createEvent} from "@testing-library/dom";
import {Position} from "../src/position.ts";
import {asClientLocation, ClientLocation, positionOfDomElement} from "../src/dom.ts";

export type TestingLibraryPointerEventName
    = "pointerOver"
    | "pointerEnter"
    | "pointerDown"
    | "pointerMove"
    | "pointerUp"
    | "pointerCancel"
    | "pointerOut"
    | "pointerLeave"

export type TouchPointerId = 3 | 4;
export const firstFinger: TouchPointerId = 3;
export const secondFinger: TouchPointerId = 4;

export function fireTouchPointerEventOver(
    target: Element,
    eventType: TestingLibraryPointerEventName,
    pointerId: TouchPointerId,
    offsetLocation: Position,
) {
    const clientLocation = offsetToClientLocation(offsetLocation, target);

    fireTouchPointerEvent(eventType, clientLocation, pointerId, target);
}

export function fireTouchPointerEvent(
    eventType: TestingLibraryPointerEventName,
    clientLocation: ClientLocation,
    pointerId: TouchPointerId,
    defaultTarget: Element,
) {
    const elementAtPosition = document.elementFromPoint(clientLocation.clientX, clientLocation.clientY);
    const target = elementAtPosition === null || elementAtPosition === document.body ? defaultTarget : elementAtPosition;

    firePointerEvent(target, eventType, {
        ...clientLocation,
        pointerType: "touch",
        pointerId,
        primary: pointerId === firstFinger,
    });
}

export function fireMousePointerEventOver(
    target: Element,
    eventType: TestingLibraryPointerEventName,
    offsetLocation: Position,
) {
    const clientLocation = offsetToClientLocation(offsetLocation, target);

    fireMousePointerEvent(eventType, clientLocation, target);
}

export function fireMousePointerEvent(
    eventType: TestingLibraryPointerEventName,
    clientLocation: ClientLocation,
    defaultTarget: Element = document.body
) {
    const elementAtPosition = document.elementFromPoint(clientLocation.clientX, clientLocation.clientY);
    const target = elementAtPosition === null || elementAtPosition === document.body ? defaultTarget : elementAtPosition;

    firePointerEvent(target, eventType, {
        ...clientLocation,
        pointerType: "mouse",
        pointerId: 1,
        primary: true,
    });
}

export function firePointerEvent(
    target: Element,
    eventType: TestingLibraryPointerEventName,
    options: { pointerType: "mouse" | "touch", pointerId: number, primary?: boolean, clientX?: number, clientY?: number },
) {
    const event = createEvent[eventType](target, options);
    target.dispatchEvent(event);
}

export function offsetToClientLocation(offsetLocation: Position, element: Element): ClientLocation {
    return asClientLocation(positionOfDomElement(element).plus(offsetLocation));
}
