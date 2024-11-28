import {afterEach, beforeEach, vi} from "vitest";
import {firePointerEvent, TestingLibraryPointerEventName} from "./dom_event_simulation";
import {PointerEventType} from "../src/dom";

class PointerCaptureSimulator {
    private readonly eventTypeToTestingLibraryNames = new Map<PointerEventType, TestingLibraryPointerEventName>([
        ["pointerover", "pointerOver"],
        ["pointerenter", "pointerEnter"],
        ["pointerdown", "pointerDown"],
        ["pointermove", "pointerMove"],
        ["pointerup", "pointerUp"],
        ["pointercancel", "pointerCancel"],
        ["pointerout", "pointerOut"],
        ["pointerleave", "pointerLeave"],
    ]);
    private _documentEventHandlersControllers: Map<number, [Element, AbortController]> = new Map();

    capturePointerOn(captureTarget: Element, capturedPointerId: number) {
        const documentEventHandlersController = new AbortController();
        this._documentEventHandlersControllers.set(capturedPointerId, [captureTarget, documentEventHandlersController]);

        this._redirectToOn(
            capturedPointerId, captureTarget,
            ["pointermove", "pointerdown", "pointerup", "pointercancel"],
        );

        this._abortAll(
            capturedPointerId,
            ["pointerover", "pointerenter", "pointerleave", "pointerout"],
        );

        this._releaseCaptureOn(
            capturedPointerId, captureTarget,
            ["pointerup", "pointercancel"],
        );
    }

    private _releaseCaptureOn(capturedPointerId: number, captureTarget: Element, eventTypes: PointerEventType[]) {
        for (const eventType of eventTypes) {
            this._addEventListenerForPointer(capturedPointerId, eventType,
                () => this.releasePointerCapture(captureTarget, capturedPointerId),
            );
        }
    }

    private _abortAll(capturedPointerId: number, eventTypes: PointerEventType[]) {
        for (const eventType of eventTypes) {
            this._addEventListenerForPointer(capturedPointerId, eventType,
                event => this._abortEvent(event),
            );
        }
    }

    private _redirectToOn(capturedPointerId: number, captureTarget: Element, eventTypes: PointerEventType[]) {
        for (const eventType of eventTypes) {
            this._addEventListenerForPointer(capturedPointerId, eventType,
                (event) => this._redirectEventTo(event, captureTarget),
            );
        }
    }

    private _addEventListenerForPointer<E extends PointerEventType>(pointerId: number, eventType: E, eventHandler: (event: PointerEvent) => void) {
        document.body.addEventListener(
            eventType,
            event => {
                if (event.pointerId !== pointerId) return;

                eventHandler(event);
            },
            {capture: true, signal: this._abortControllerFor(pointerId)!.signal},
        );
    }

    private _redirectEventTo(eventToRedirect: PointerEvent, newTarget: Element) {
        if (eventToRedirect.target === newTarget) return;

        this._abortEvent(eventToRedirect);
        this._fireCopyOfEventOn(eventToRedirect, newTarget);
    }

    private _abortEvent(event: Event) {
        event.stopImmediatePropagation();
        event.preventDefault();
    }

    private _fireCopyOfEventOn(eventToCopy: PointerEvent, target: Element) {
        const testingLibraryEventName = this.eventTypeToTestingLibraryNames.get(eventToCopy.type as PointerEventType)!;
        firePointerEvent(target, testingLibraryEventName, {
            pointerType: eventToCopy.pointerType as any,
            pointerId: eventToCopy.pointerId,
            primary: eventToCopy.isPrimary,
            clientX: eventToCopy.clientX,
            clientY: eventToCopy.clientY,
        });
    }

    releasePointerCapture(target: Element, pointerId: number) {
        if (this.hasPointerCapture(target, pointerId)) {
            this._abortControllerFor(pointerId)!.abort();
        }
    }

    hasPointerCapture(target: Element, pointerId: number) {
        return this._capturingElementFor(pointerId) === target;
    }

    private _capturingElementFor(pointerId: number) {
        return this._documentEventHandlersControllers.get(pointerId)?.[0];
    }

    private _abortControllerFor(pointerId: number) {
        return this._documentEventHandlersControllers.get(pointerId)?.[1];
    }

    reset() {
        for (const [, c] of this._documentEventHandlersControllers.values()) {
            c.abort();
        }
        this._documentEventHandlersControllers.clear();
    }
}

export function setupPointerCaptureSimulation() {
    const pointerCaptureSimulator = new PointerCaptureSimulator();

    beforeEach(() => {
        Element.prototype.setPointerCapture = vi.fn(function (this: Element, pointerId: number) {
            pointerCaptureSimulator.capturePointerOn(this, pointerId);
        });
        Element.prototype.hasPointerCapture = vi.fn(function (this: Element, pointerId: number) {
            return pointerCaptureSimulator.hasPointerCapture(this, pointerId);
        });
        Element.prototype.releasePointerCapture = vi.fn(function (this: Element, pointerId: number) {
            pointerCaptureSimulator.releasePointerCapture(this, pointerId);
        });
    });

    afterEach(() => {
        pointerCaptureSimulator.reset();
        vi.restoreAllMocks();
    });
}
