import {createEvent} from "@testing-library/dom";

export type Position = { x: number; y: number };
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

export function fireTouchPointerEvent(
    target: Element,
    eventType: TestingLibraryPointerEventName,
    offsetLocation: Position,
    pointerId: TouchPointerId,
) {
    firePointerEventWithOffset(target, eventType, offsetLocation, {
        pointerType: "touch",
        pointerId,
        primary: pointerId === 3,
    });
}

export function fireMousePointerEventOver(
    target: Element,
    eventType: TestingLibraryPointerEventName,
    offsetLocation: Position,
) {
    const clientLocation = offsetToClientLocation(offsetLocation, target);

    fireMousePointerEvent(eventType, clientLocation);
}

export function fireMousePointerEvent(
    eventType: TestingLibraryPointerEventName,
    clientLocation: { clientX: number, clientY: number },
) {
    const target = document.elementFromPoint(clientLocation.clientX, clientLocation.clientY) ?? document.body;

    firePointerEvent(target, eventType, {
        ...clientLocation,
        pointerType: "mouse",
        pointerId: 1,
        primary: true,
    });
}

function firePointerEventWithOffset(
    target: Element,
    eventType: TestingLibraryPointerEventName,
    offsetLocation: Position,
    options: { pointerType: "mouse" | "touch", pointerId: number, primary?: boolean },
) {
    const clientLocation = offsetToClientLocation(offsetLocation, target);
    firePointerEvent(target, eventType, {...clientLocation, ...options});
}

export function firePointerEvent(
    target: Element,
    eventType: TestingLibraryPointerEventName,
    options: { pointerType: "mouse" | "touch", pointerId: number, primary?: boolean, clientX?: number, clientY?: number },
) {
    const event = createEvent[eventType](target, options);
    target.dispatchEvent(event);
}

function offsetToClientLocation(offsetLocation: Position, element: Element) {
    const elementClientLocation = element.getBoundingClientRect();
    return {
        clientX: offsetLocation.x + elementClientLocation.x,
        clientY: offsetLocation.y + elementClientLocation.y,
    };
}
