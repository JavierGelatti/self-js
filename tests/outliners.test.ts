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
import {point, sumOf} from "../src/position";

import "../styles.css";
import {InspectableObject} from "../src/objectOutliner";
import {asClientLocation, positionOfDomElement} from "../src/dom.ts";
import {OutlinerElement} from "./outlinerElement.ts";

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
        world.openOutliner(anObject);
        world.openOutliner(anotherObject);
        world.openOutliner(anObject);

        expect(openOutliners().length).toEqual(2);
    });

    test("show a title for the object", () => {
        world.openOutliner({});

        const [outlinerElement] = openOutliners();

        expect(outlinerElement.title()).toEqual("un Object");
    });

    test("can be closed", () => {
        world.openOutliner({});

        const [outlinerElement] = openOutliners();
        outlinerElement.close();

        expect(openOutliners()).toEqual([]);
    });

    test("can inspect primitive objects", () => {
        const outliner = world.openOutliner(1);
        const [outlinerElement] = openOutliners();

        expect(outliner.title()).toEqual("1");
        expect(outliner.type()).toEqual("primitive");
        expect(outlinerElement.numberOfProperties()).toEqual(0);
        expect(outlinerElement.stereotype()).toEqual("«primitivo : number»");
        expect(() => outliner.update()).not.toThrowError();
    });

    test("have different types", () => {
        expect(outlinerElementInspecting({}).type()).toEqual("object");
        expect(outlinerElementInspecting(function f() {}).type()).toEqual("function");
        expect(outlinerElementInspecting(new Error()).type()).toEqual("error");
    });

    describe("titles", () => {
        test("show the name of the object's prototype", () => {
            class Texto {}

            expect(world.openOutliner({}).title()).toEqual("un Object");
            expect(world.openOutliner(new Texto()).title()).toEqual("un Texto");
        });

        test("show a default text if the object's prototype is null", () => {
            const anObject = { __proto__: null };

            expect(world.openOutliner(anObject).title()).toEqual("un objeto");
        });

        test("show custom string representations as title", () => {
            const aNamedObject = { toString() { return "soy especial"; }};
            const aDate = new Date(2024, 0, 31, 0, 0, 0, 0);

            expect(world.openOutliner(aNamedObject).title()).toEqual("soy especial");
            expect(world.openOutliner(aDate).title()).toContain("Wed Jan 31 2024 00:00:00");
        });

        test("show the default representation when it fails to obtain a custom one", () => {
            expect(world.openOutliner(Date.prototype).title()).toEqual("un Object");
        });

        test("show a special title for functions", () => {
            function f() {}

            expect(world.openOutliner(f).title()).toEqual("función f");
        });

        test("show a special title for arrays", () => {
            expect(world.openOutliner([1, 2, 3]).title()).toEqual("un Array");
        });
    });

    describe("object outliners", () => {
        test("show the properties of the inspected object", () => {
            world.openOutliner(point(1, 2));

            const [outlinerElement] = openOutliners();

            expect(outlinerElement.propertyNames()).toEqual(["x", "y"]);
            expect(outlinerElement.propertyValueOn("x")).toEqual("1");
            expect(outlinerElement.propertyValueOn("y")).toEqual("2");
        });

        test("can add new properties to the inspected object", () => {
            const anObject = {};
            world.openOutliner(anObject);

            const [outlinerElement] = openOutliners();

            outlinerElement.addPropertyOn("newProperty");

            expect(Reflect.has(anObject, "newProperty")).toBe(true);
            expect(outlinerElement.propertyValueOn("newProperty")).toEqual("undefined");
        });

        test("if the newly added property already existed, nothing is changed", () => {
            const anObject = { existingProperty: "previousValue" };
            world.openOutliner(anObject);

            const [outlinerElement] = openOutliners();

            outlinerElement.addPropertyOn("existingProperty");

            expect(anObject.existingProperty).toEqual("previousValue");
            expect(outlinerElement.propertyValueOn("existingProperty")).toEqual("previousValue");
            expect(outlinerElement.numberOfProperties()).toEqual(1);
        });

        test("if the user cancels the prompt, nothing is changed", () => {
            const anObject = {};
            world.openOutliner(anObject);

            const [outlinerElement] = openOutliners();

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
            world.openOutliner(anObject);

            anObject["newProperty"] = 1;
            world.updateOutliners();

            const [outlinerElement] = openOutliners();

            expect(outlinerElement.propertyNames()).toEqual(["oldProperty", "newProperty"]);
            expect(outlinerElement.propertyValueOn("newProperty")).toEqual("1");
        });

        test("when a property is removed from the object", () => {
            const anObject: InspectableObject = {
                oldProperty: 0
            };
            world.openOutliner(anObject);

            delete anObject.oldProperty;
            world.updateOutliners();

            const [outlinerElement] = openOutliners();

            expect(outlinerElement.numberOfProperties()).toEqual(0);
        });

        test("when an existing property is updated", () => {
            const anObject: InspectableObject = {
                existingProperty: 0
            };
            world.openOutliner(anObject);

            anObject.existingProperty = 1;
            world.updateOutliners();

            const [outlinerElement] = openOutliners();

            expect(outlinerElement.numberOfProperties()).toEqual(1);
            expect(outlinerElement.propertyValueOn("existingProperty")).toEqual("1");
        });

        test("repeated updates", () => {
            const anObject: InspectableObject = {
                existingProperty: 0
            };
            world.openOutliner(anObject);
            const [outlinerElement] = openOutliners();

            anObject.newProperty = 1;
            world.updateOutliners();
            outlinerElement.addPropertyOn("yetAnotherNewProperty");
            world.updateOutliners();

            expect(outlinerElement.propertyNames()).toEqual(["existingProperty", "newProperty", "yetAnotherNewProperty"]);
        });

        test("updates the title when it changes", () => {
            const anObject = {};
            world.openOutliner(anObject);

            anObject.toString = () => "titulo nuevo";
            world.updateOutliners();

            const [outlinerElement] = openOutliners();

            expect(outlinerElement.title()).toEqual("titulo nuevo");
        });

        test("updates the type when it changes", () => {
            const anObject = {};
            world.openOutliner(anObject);

            Object.setPrototypeOf(anObject, Error.prototype);
            world.updateOutliners();

            const [outlinerElement] = openOutliners();

            expect(outlinerElement.type()).toEqual("error");
        });
    });

    describe("movements", () => {
        beforeEach(() => {
            document.body.append(worldDomElement);
        });

        test("the starting position of the outliner can be specified", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();

            expect(outlinerElement.position()).toEqual(point(10, 20));
        });

        test("the position of the outliner changes when dragging its header", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerMove", point(5, 3).plus(point(4, 2)));
            fireMousePointerEventOver(outlinerElement.header(), "pointerUp",   point(5, 3));

            expect(outlinerElement.position()).toEqual(point(10, 20).plus(point(4, 2)));
        });

        test("the position of the outliner does not change if the pointer was never down", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();

            fireMousePointerEventOver(outlinerElement.header(), "pointerMove", point(9, 5));

            expect(outlinerElement.position()).toEqual(point(10, 20));
        });

        test("the position of the outliner keeps changing if the pointer keeps moving", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerMove", point(5, 3).plus(point(4, 2)));
            fireMousePointerEventOver(outlinerElement.header(), "pointerMove", point(5, 3).plus(point(1, 1)));
            fireMousePointerEventOver(outlinerElement.header(), "pointerUp",   point(5, 3));

            expect(outlinerElement.position()).toEqual(point(10, 20).plus(point(4, 2)).plus(point(1, 1)));
        });

        test("the position of the outliner stops changing if the pointer goes up", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerUp",   point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerMove", point(5, 3).plus(point(4, 2)));

            expect(outlinerElement.position()).toEqual(point(10, 20));
        });

        test("the position of the outliner stops changing if the pointer interaction is cancelled", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown",   point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerCancel", point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerMove",   point(5, 3).plus(point(4, 2)));

            expect(outlinerElement.position()).toEqual(point(10, 20));
        });

        test("if the dragging doesn't stop, the position of the outliner continues to change even if the pointer moves outside of it", () => {
            world.openOutliner({}, point(0, 0));

            const [outlinerElement] = openOutliners();

            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));
            fireMousePointerEvent("pointerMove", asClientLocation(point(888, 999)));

            expect(positionOfDomElement(outlinerElement.header())).toEqual(point(888, 999).minus(point(5, 3)));
        });

        test("prevents the default action (of making a selection) from happening when dragging starts", () => {
            world.openOutliner({}, point(10, 20));
            let event: PointerEvent;
            worldDomElement.addEventListener("pointerdown", e => event = e)

            const [outlinerElement] = openOutliners();
            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));

            expect(event!.defaultPrevented).toBe(true);
        });

        test("the header signals to the user that is draggable", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();

            expect(outlinerElement.header()).toHaveClass("draggable");
            expect(outlinerElement.header()).not.toHaveClass("dragging");
        });

        test("the header signals the user when it's being dragged", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();
            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));

            expect(outlinerElement.header()).toHaveClass("dragging");
            expect(outlinerElement.isMoving()).toBe(true);
        });

        test("the header stops signalling the user when it ended being dragged", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();
            fireMousePointerEventOver(outlinerElement.header(), "pointerDown", point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerUp", point(5, 3));

            expect(outlinerElement.header()).not.toHaveClass("dragging");
            expect(outlinerElement.isMoving()).toBe(false);
        });

        test("the last picked-up outliner ends up being at the top of the rest", () => {
            world.openOutliner({}, point(0, 0));
            world.openOutliner({}, point(20, 20));

            const [firstOutliner, secondOutliner] = openOutliners();
            fireMousePointerEventOver(firstOutliner.header(), "pointerDown", point(5, 5));

            expect(openOutliners()).toEqual([secondOutliner, firstOutliner]);
        });

        test("does not start dragging if starting from the close button", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();

            fireMousePointerEventOver(outlinerElement.closeButton(), "pointerDown", point(5, 3));
            fireMousePointerEventOver(outlinerElement.closeButton(), "pointerMove", point(5, 3));

            expect(outlinerElement.isMoving()).toBe(false);
        });

        test("when an object is inspected, it's grabbed", () => {
            const anObject = {};
            world.openOutliner(anObject);
            const [outlinerElement] = openOutliners();
            outlinerElement.inputCode("{ y: 5 }");

            const button = outlinerElement.inspectItButton();
            const buttonPosition = positionOf(button);
            fireMousePointerEventOver(button, "pointerDown", point(1, 2));
            const [, newOutliner] = openOutliners();
            fireMousePointerEvent("pointerMove", asClientLocation(buttonPosition.plus(point(1, 2)).plus(point(3, 4))));

            const offset = point(-50, -10);
            expect(newOutliner.position()).toEqual(sumOf(buttonPosition, offset, point(1, 2), point(3, 4)));
        });

        test("when an already visible object is inspected, it's grabbed from its header", () => {
            world.openOutliner(5);
            const [outlinerElement] = openOutliners();
            outlinerElement.inputCode("5");

            const button = outlinerElement.inspectItButton();
            const buttonPosition = positionOf(button);
            fireMousePointerEventOver(button, "pointerDown", point(10, 12));

            const offset = point(-50, -10);
            expect(outlinerElement.position()).toEqual(sumOf(buttonPosition, point(10, 12), offset));
        });

        test("when an outliner is grabbed, it ignores the movements of other pointers", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();

            fireTouchPointerEventOver(outlinerElement.header(), "pointerDown", firstFinger, point(5, 3));
            fireTouchPointerEventOver(outlinerElement.header(), "pointerMove", secondFinger, point(5, 6));
            fireTouchPointerEventOver(outlinerElement.header(), "pointerMove", firstFinger, point(5, 3).plus(point(4, 2)));
            fireMousePointerEventOver(outlinerElement.header(), "pointerMove", point(1, 1));

            expect(outlinerElement.position()).toEqual(point(10, 20).plus(point(4, 2)));
        });

        test("when an outliner is grabbed, it isn't dropped if other pointers are up or cancel the interaction", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();

            fireTouchPointerEventOver(outlinerElement.header(), "pointerDown", firstFinger, point(5, 3));
            fireTouchPointerEventOver(outlinerElement.header(), "pointerUp", secondFinger, point(5, 3));
            fireMousePointerEventOver(outlinerElement.header(), "pointerCancel", point(5, 3));
            fireTouchPointerEventOver(outlinerElement.header(), "pointerMove", firstFinger, point(5, 3).plus(point(4, 2)));

            expect(outlinerElement.position()).toEqual(point(10, 20).plus(point(4, 2)));
        });

        test("the pointer grabbing the outliner is the last one that starts dragging", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerElement] = openOutliners();

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
            world.openOutliner({});
            const [outlinerElement] = openOutliners();

            expect(outlinerElement.canDoIt()).toBe(false);
            expect(outlinerElement.canInspectIt()).toBe(false);
        });

        test("the evaluation buttons are enabled when the code to evaluate is not blank", () => {
            world.openOutliner({});
            const [outlinerElement] = openOutliners();

            outlinerElement.inputCode("1 + 1");

            expect(outlinerElement.canDoIt()).toBe(true);
            expect(outlinerElement.canInspectIt()).toBe(true);
        });

        test("the evaluation buttons are disabled when the code to evaluate is blank", () => {
            world.openOutliner({});
            const [outlinerElement] = openOutliners();

            outlinerElement.inputCode("    ");

            expect(outlinerElement.canDoIt()).toBe(false);
            expect(outlinerElement.canInspectIt()).toBe(false);
        });

        test("the outliners are updated when code is evaluated; this is bound to the inspected object", () => {
            const anObject = { x: 1 };
            world.openOutliner(anObject);

            const [outlinerElement] = openOutliners();

            outlinerElement.doIt("this.x = 2");

            expect(outlinerElement.propertyValueOn("x")).toEqual("2");
        });

        test("can inspect the result of a computation", () => {
            const anObject = { x: 1 };
            world.openOutliner(anObject);

            const [outlinerElement] = openOutliners();

            outlinerElement.inspectIt("{ y: 5 }");

            const [, newOutliner] = openOutliners();
            expect(newOutliner.propertyValueOn("y")).toEqual("5");
            expect(newOutliner.position()).toEqual(point(0, 0));
        });

        test("if the inspection of a computation results in an exception, inspect it", () => {
            const outlinerElement = outlinerElementInspecting({});

            outlinerElement.inspectIt("this.lala()");

            const [, newOutliner] = openOutliners();
            expect(newOutliner.title()).toContain("TypeError");
        });

        test("if the input is blank, inspecting does nothing", () => {
            world.openOutliner({});
            const [outlinerElement] = openOutliners();

            outlinerElement.inspectIt("   ");

            expect(openOutliners().length).toEqual(1);
        });

        test("if evaluating something throws an exception, inspect it", () => {
            const outlinerElement = outlinerElementInspecting({});

            outlinerElement.doIt("this.lala()");

            const [, newOutliner] = openOutliners();
            expect(newOutliner.title()).toContain("TypeError");
        });

        test("if the input is blank, evaluating does nothing", () => {
            world.openOutliner({});
            const [outlinerElement] = openOutliners();

            outlinerElement.doIt("   ");

            expect(openOutliners().length).toEqual(1);
        });
    });

    function openOutliners(): OutlinerElement[] {
        return Array.from(worldDomElement.querySelectorAll<HTMLElement>(".outliner")).map(domElement => new OutlinerElement(domElement));
    }

    function positionOf(domElement: HTMLElement) {
        return positionOfDomElement(domElement).map(Math.round);
    }

    function outlinerElementInspecting(anObject: unknown) {
        const outliner = world.openOutliner(anObject);
        return new OutlinerElement(outliner.domElement());
    }
});
