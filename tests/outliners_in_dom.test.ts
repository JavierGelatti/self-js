import {beforeEach, describe, expect, test} from "vitest";
import {setupPointerCaptureSimulation} from "./pointer_capture_simulation";
import {World} from "../src/world";
import {
    fireMousePointerEvent,
    fireMousePointerEventOver,
    fireTouchPointerEventOver,
    firstFinger,
    secondFinger,
} from "./dom_event_simulation";
import {point, Position, sumOf} from "../src/position";

import "../styles.css";
import {InspectableObject} from "../src/objectOutliner";
import {asClientLocation, positionOfDomElement} from "../src/dom.ts";
import {OutlinerFromDomElement} from "./outlinerFromDomElement.ts";

describe("The outliners in the world", () => {
    setupPointerCaptureSimulation();

    let world: World;
    let worldDomElement: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = "";

        world = new World();
        worldDomElement = world.domElement();
    });

    test("are opened once per object", () => {
        const anObject = {};
        const anotherObject = {};
        openOutlinerFor(anObject);
        openOutlinerFor(anotherObject);
        openOutlinerFor(anObject);

        expect(numberOfOpenOutliners()).toEqual(2);
    });

    test("show a title for the object", () => {
        const outlinerElement = openOutlinerFor({});

        expect(outlinerElement.title()).toEqual("un Object");
    });

    test("can be closed", () => {
        const outlinerElement = openOutlinerFor({});

        outlinerElement.close();

        expect(numberOfOpenOutliners()).toEqual(0);
    });

    test("can inspect primitive objects", () => {
        const outlinerElement = openOutlinerFor(1);

        expect(outlinerElement.title()).toEqual("1");
        expect(outlinerElement.type()).toEqual("primitive");
        expect(outlinerElement.numberOfProperties()).toEqual(0);
        expect(outlinerElement.stereotype()).toEqual("«primitivo : number»");
        expect(() => updateOutliners()).not.toThrowError();
    });

    test("have different types", () => {
        expect(openOutlinerFor({}).type()).toEqual("object");
        expect(openOutlinerFor(function f() {}).type()).toEqual("function");
        expect(openOutlinerFor(new Error()).type()).toEqual("error");
    });

    describe("object outliners", () => {
        test("show the properties of the inspected object", () => {
            const outlinerElement = openOutlinerFor({ x: 1, y: 2 });

            expect(outlinerElement.propertyNames()).toEqual(["x", "y"]);
            expect(outlinerElement.propertyValueOn("x")).toEqual("1");
            expect(outlinerElement.propertyValueOn("y")).toEqual("2");
        });

        test("can add new properties to the inspected object", () => {
            const anObject = {};
            const outlinerElement = openOutlinerFor(anObject);

            outlinerElement.addPropertyOn("newProperty");

            expect(Reflect.has(anObject, "newProperty")).toBe(true);
            expect(outlinerElement.propertyValueOn("newProperty")).toEqual("undefined");
        });

        test("if the newly added property already existed, nothing is changed", () => {
            const anObject = { existingProperty: "previousValue" };
            const outlinerElement = openOutlinerFor(anObject);

            outlinerElement.addPropertyOn("existingProperty");

            expect(anObject.existingProperty).toEqual("previousValue");
            expect(outlinerElement.propertyValueOn("existingProperty")).toEqual("previousValue");
            expect(outlinerElement.numberOfProperties()).toEqual(1);
        });

        test("if the user cancels the prompt, nothing is changed", () => {
            const anObject = {};
            const outlinerElement = openOutlinerFor(anObject);

            outlinerElement.addPropertyOn(null);

            expect(Object.keys(anObject)).toEqual([]);
            expect(outlinerElement.numberOfProperties()).toEqual(0);
        });
    });

    describe("updates", () => {
        test("when a property is added to the object", () => {
            const anObject: InspectableObject = {
                oldProperty: 0
            };
            const outlinerElement = openOutlinerFor(anObject);

            anObject["newProperty"] = 1;
            updateOutliners();

            expect(outlinerElement.propertyNames()).toEqual(["oldProperty", "newProperty"]);
            expect(outlinerElement.propertyValueOn("newProperty")).toEqual("1");
        });

        test("when a property is removed from the object", () => {
            const anObject: InspectableObject = {
                oldProperty: 0
            };
            const outlinerElement = openOutlinerFor(anObject);

            delete anObject.oldProperty;
            updateOutliners();

            expect(outlinerElement.numberOfProperties()).toEqual(0);
        });

        test("when an existing property is updated", () => {
            const anObject: InspectableObject = {
                existingProperty: 0
            };
            const outlinerElement = openOutlinerFor(anObject);

            anObject.existingProperty = 1;
            updateOutliners();

            expect(outlinerElement.numberOfProperties()).toEqual(1);
            expect(outlinerElement.propertyValueOn("existingProperty")).toEqual("1");
        });

        test("repeated updates", () => {
            const anObject: InspectableObject = {
                existingProperty: 0
            };
            const outlinerElement = openOutlinerFor(anObject);

            anObject.newProperty = 1;
            updateOutliners();
            outlinerElement.addPropertyOn("yetAnotherNewProperty");
            updateOutliners();

            expect(outlinerElement.propertyNames()).toEqual(["existingProperty", "newProperty", "yetAnotherNewProperty"]);
        });

        test("updates the title when it changes", () => {
            const anObject = {};
            const outlinerElement = openOutlinerFor(anObject);

            anObject.toString = () => "titulo nuevo";
            updateOutliners();

            expect(outlinerElement.title()).toEqual("titulo nuevo");
        });

        test("updates the type when it changes", () => {
            const anObject = {};
            const outlinerElement = openOutlinerFor(anObject);

            Object.setPrototypeOf(anObject, Error.prototype);
            updateOutliners();

            expect(outlinerElement.type()).toEqual("error");
        });
    });

    describe("movements", () => {
        beforeEach(() => {
            document.body.append(worldDomElement);
        });

        test("the starting position of the outliner can be specified", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            expect(outlinerElement.position()).toEqual(point(10, 20));
        });

        test("the position of the outliner changes when dragging its header", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerMove", point(5, 3).plus(point(4, 2)));
            fireMousePointerEventOver(outlinerElement.header(), "pointerUp",   point(5, 3));

            expect(outlinerElement.position()).toEqual(point(10, 20).plus(point(4, 2)));
        });

        test("the position of the outliner does not change if the pointer was never down", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            fireMousePointerEventOver(outlinerElement.header(), "pointerMove", point(9, 5));

            expect(outlinerElement.position()).toEqual(point(10, 20));
        });

        test("the position of the outliner keeps changing if the pointer keeps moving", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerMove", point(5, 3).plus(point(4, 2)));
            fireMousePointerEventOver(outlinerElement.header(), "pointerMove", point(5, 3).plus(point(1, 1)));
            fireMousePointerEventOver(outlinerElement.header(), "pointerUp",   point(5, 3));

            expect(outlinerElement.position()).toEqual(point(10, 20).plus(point(4, 2)).plus(point(1, 1)));
        });

        test("the position of the outliner stops changing if the pointer goes up", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerUp",   point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerMove", point(5, 3).plus(point(4, 2)));

            expect(outlinerElement.position()).toEqual(point(10, 20));
        });

        test("the position of the outliner stops changing if the pointer interaction is cancelled", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown",   point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerCancel", point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerMove",   point(5, 3).plus(point(4, 2)));

            expect(outlinerElement.position()).toEqual(point(10, 20));
        });

        test("if the dragging doesn't stop, the position of the outliner continues to change even if the pointer moves outside of it", () => {
            const outlinerElement = openOutlinerFor({}, point(0, 0));

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));
            fireMousePointerEvent("pointerMove", asClientLocation(point(888, 999)));

            expect(positionOfDomElement(outlinerElement.header())).toEqual(point(888, 999).minus(point(5, 3)));
        });

        test("prevents the default action (of making a selection) from happening when dragging starts", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));
            let event: PointerEvent;
            worldDomElement.addEventListener("pointerdown", e => event = e)

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));

            expect(event!.defaultPrevented).toBe(true);
        });

        test("the header signals to the user that is draggable", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            expect(outlinerElement.header()).toHaveClass("draggable");
            expect(outlinerElement.header()).not.toHaveClass("dragging");
        });

        test("the header signals the user when it's being dragged", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));

            expect(outlinerElement.header()).toHaveClass("dragging");
            expect(outlinerElement.isMoving()).toBe(true);
        });

        test("the header stops signalling the user when it ended being dragged", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerUp", point(5, 3));

            expect(outlinerElement.header()).not.toHaveClass("dragging");
            expect(outlinerElement.isMoving()).toBe(false);
        });

        test("the last picked-up outliner ends up being at the top of the rest", () => {
            const firstOutliner = openOutlinerFor({}, point(0, 0));
            const secondOutliner = openOutlinerFor({}, point(20, 20));

            fireMousePointerEventOver(firstOutliner.header(), "pointerDown", point(5, 5));

            expect(openOutliners()).toEqual([secondOutliner, firstOutliner]);
        });

        test("does not start dragging if starting from the close button", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            fireMousePointerEventOver(outlinerElement.closeButton(), "pointerDown", point(5, 3));
            fireMousePointerEventOver(outlinerElement.closeButton(), "pointerMove", point(5, 3));

            expect(outlinerElement.isMoving()).toBe(false);
        });

        test("when an object is inspected, it's grabbed", () => {
            const anObject = {};
            const outlinerElement = openOutlinerFor(anObject);
            outlinerElement.inputCode("{ y: 5 }");

            const button = outlinerElement.inspectItButton();
            const buttonPosition = positionOf(button);
            fireMousePointerEventOver(button, "pointerDown", point(1, 2));
            const newOutliner = lastOutliner();
            fireMousePointerEvent("pointerMove", asClientLocation(buttonPosition.plus(point(1, 2)).plus(point(3, 4))));

            const offset = point(-50, -10);
            expect(newOutliner.position()).toEqual(sumOf(buttonPosition, offset, point(1, 2), point(3, 4)));
        });

        test("when an already visible object is inspected, it's grabbed from its header", () => {
            const outlinerElement = openOutlinerFor(5);
            outlinerElement.inputCode("5");

            const button = outlinerElement.inspectItButton();
            const buttonPosition = positionOf(button);
            fireMousePointerEventOver(button, "pointerDown", point(10, 12));

            const offset = point(-50, -10);
            expect(outlinerElement.position()).toEqual(sumOf(buttonPosition, point(10, 12), offset));
        });

        test("when an outliner is grabbed, it ignores the movements of other pointers", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            fireTouchPointerEventOver(outlinerElement.header(), "pointerDown", firstFinger, point(5, 3));
            fireTouchPointerEventOver(outlinerElement.header(), "pointerMove", secondFinger, point(5, 6));
            fireTouchPointerEventOver(outlinerElement.header(), "pointerMove", firstFinger, point(5, 3).plus(point(4, 2)));
            fireMousePointerEventOver(outlinerElement.header(), "pointerMove", point(1, 1));

            expect(outlinerElement.position()).toEqual(point(10, 20).plus(point(4, 2)));
        });

        test("when an outliner is grabbed, it isn't dropped if other pointers are up or cancel the interaction", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            fireTouchPointerEventOver(outlinerElement.header(), "pointerDown", firstFinger, point(5, 3));
            fireTouchPointerEventOver(outlinerElement.header(), "pointerUp", secondFinger, point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerCancel", point(5, 3));
            fireTouchPointerEventOver(outlinerElement.header(), "pointerMove", firstFinger, point(5, 3).plus(point(4, 2)));

            expect(outlinerElement.position()).toEqual(point(10, 20).plus(point(4, 2)));
        });

        test("the pointer grabbing the outliner is the last one that starts dragging", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));

            fireTouchPointerEventOver(outlinerElement.header(), "pointerDown", firstFinger, point(5, 3));
            fireTouchPointerEventOver(outlinerElement.header(), "pointerDown", secondFinger, point(1, 2));
            fireTouchPointerEventOver(outlinerElement.header(), "pointerMove", secondFinger, point(1, 2).plus(point(1, 5)));
            fireTouchPointerEventOver(outlinerElement.header(), "pointerMove", firstFinger, point(5, 3).plus(point(4, 2)));

            expect(outlinerElement.isMoving()).toBe(true);
            expect(outlinerElement.position()).toEqual(point(10, 20).plus(point(1, 5)));
        });
    });

    describe("code evaluation", () => {
        test("the evaluation buttons are initially disabled", () => {
            const outlinerElement = openOutlinerFor({});

            expect(outlinerElement.canDoIt()).toBe(false);
            expect(outlinerElement.canInspectIt()).toBe(false);
        });

        test("the evaluation buttons are enabled when the code to evaluate is not blank", () => {
            const outlinerElement = openOutlinerFor({});

            outlinerElement.inputCode("1 + 1");

            expect(outlinerElement.canDoIt()).toBe(true);
            expect(outlinerElement.canInspectIt()).toBe(true);
        });

        test("the evaluation buttons are disabled when the code to evaluate is blank", () => {
            const outlinerElement = openOutlinerFor({});

            outlinerElement.inputCode("    ");

            expect(outlinerElement.canDoIt()).toBe(false);
            expect(outlinerElement.canInspectIt()).toBe(false);
        });

        test("the outliners are updated when code is evaluated; this is bound to the inspected object", () => {
            const anObject = { x: 1 };
            const outlinerElement = openOutlinerFor(anObject);

            outlinerElement.doIt("this.x = 2");

            expect(outlinerElement.propertyValueOn("x")).toEqual("2");
        });

        test("can inspect the result of a computation", () => {
            const anObject = { x: 1 };
            const outlinerElement = openOutlinerFor(anObject);

            outlinerElement.inspectIt("{ y: 5 }");

            const newOutliner = lastOutliner();
            expect(newOutliner.propertyValueOn("y")).toEqual("5");
            expect(newOutliner.position()).toEqual(point(0, 0));
        });

        test("if the inspection of a computation results in an exception, inspect it", () => {
            const outlinerElement = openOutlinerFor({});

            outlinerElement.inspectIt("this.lala()");

            const newOutliner = lastOutliner();
            expect(newOutliner.title()).toContain("TypeError");
        });

        test("if the input is blank, inspecting does nothing", () => {
            const outlinerElement = openOutlinerFor({});

            outlinerElement.inspectIt("   ");

            expect(numberOfOpenOutliners()).toEqual(1);
        });

        test("if evaluating something throws an exception, inspect it", () => {
            const outlinerElement = openOutlinerFor({});

            outlinerElement.doIt("this.lala()");

            const newOutliner = lastOutliner();
            expect(newOutliner.title()).toContain("TypeError");
        });

        test("if the input is blank, evaluating does nothing", () => {
            const outlinerElement = openOutlinerFor({});

            outlinerElement.doIt("   ");

            expect(numberOfOpenOutliners()).toEqual(1);
        });
    });

    function openOutliners() {
        return Array.from(worldDomElement.querySelectorAll<HTMLElement>(".outliner"))
            .map(domElement => new OutlinerFromDomElement(domElement));
    }

    function positionOf(domElement: HTMLElement) {
        return positionOfDomElement(domElement).map(Math.round);
    }

    function openOutlinerFor(anObject: unknown, position?: Position) {
        world.openOutliner(anObject, position);
        return lastOutliner();
    }

    function updateOutliners() {
        world.updateOutliners();
    }

    function lastOutliner() {
        return openOutliners().pop()!;
    }

    function numberOfOpenOutliners() {
        return openOutliners().length;
    }
});
