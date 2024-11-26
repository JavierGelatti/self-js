import {beforeEach, describe, expect, test, vi} from "vitest";
import {setupPointerCaptureSimulation} from "./pointer_capture_simulation";
import {World} from "../src/world";

import {fireEvent, within} from "@testing-library/dom";
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

describe("The world", () => {
    setupPointerCaptureSimulation();

    let world: World;
    let worldDomElement: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = "";

        world = new World();
        worldDomElement = world.domElement();
    });

    test("opens one outliner per object", () => {
        const anObject = {};
        const anotherObject = {};
        world.openOutliner(anObject);
        world.openOutliner(anotherObject);
        world.openOutliner(anObject);

        expect(outliners().length).toEqual(2);
    });

    test("the outliner shows a title for the object", () => {
        world.openOutliner({});

        const [outlinerDomElement] = outliners();

        expect(titleOf(outlinerDomElement)).toEqual("un Object");
    });

    test("the outliner can be closed", () => {
        world.openOutliner({});

        const [outlinerDomElement] = outliners();
        close(outlinerDomElement);

        expect(outliners()).toEqual([]);
    });

    test("can inspect primitive objects", () => {
        const outliner = world.openOutliner(1);

        expect(outliner.title()).toEqual("1");
        expect(outliner.type()).toEqual("primitive");
        expect(propertiesOn(outliner.domElement())).toEqual([]);
        expect(stereotypeOf(outliner.domElement())).toEqual("«primitivo : number»");
        expect(() => outliner.update()).not.toThrowError();
    });

    describe("types of outliners", () => {
        test("the outliners have different types", () => {
            expect(typeOfOutlinerOf({})).toEqual("object");
            expect(typeOfOutlinerOf(function f() {})).toEqual("function");
            expect(typeOfOutlinerOf(new Error())).toEqual("error");
        });

        function typeOfOutlinerOf(anObject: {}) {
            return inspectorType(world.openOutliner(anObject).domElement());
        }
    });

    describe("title", () => {
        test("the outliner shows the name of the object's prototype", () => {
            class Texto {}

            expect(world.openOutliner({}).title()).toEqual("un Object");
            expect(world.openOutliner(new Texto()).title()).toEqual("un Texto");
        });

        test("the outliner shows a default text if the object's prototype is null", () => {
            const anObject = { __proto__: null };

            expect(world.openOutliner(anObject).title()).toEqual("un objeto");
        });

        test("the outliner shows custom string representations as title", () => {
            const aNamedObject = { toString() { return "soy especial"; }};
            const aDate = new Date(2024, 0, 31, 0, 0, 0, 0);

            expect(world.openOutliner(aNamedObject).title()).toEqual("soy especial");
            expect(world.openOutliner(aDate).title()).toContain("Wed Jan 31 2024 00:00:00");
        });

        test("the outliner shows the default representation when it fails to obtain a custom one", () => {
            expect(world.openOutliner(Date.prototype).title()).toEqual("un Object");
        });

        test("the outliner shows a special title for functions", () => {
            function f() {}

            expect(world.openOutliner(f).title()).toEqual("función f");
        });

        test("the outliner shows a special title for arrays", () => {
            expect(world.openOutliner([1, 2, 3]).title()).toEqual("un Array");
        });
    });

    describe("the outliner with respect to the properties", () => {
        test("shows the properties of the object", () => {
            world.openOutliner({ x: 1, y: 2 });

            const [outlinerDomElement] = outliners();

            expect(propertyNamesOn(outlinerDomElement)).toEqual(["x", "y"]);
            expect(propertyValueOn("x", outlinerDomElement)).toEqual("1");
            expect(propertyValueOn("y", outlinerDomElement)).toEqual("2");
        });

        test("it's possible to add new properties to objects", () => {
            const anObject = {};
            world.openOutliner(anObject);

            const [outlinerDomElement] = outliners();

            addPropertyOn("newProperty", outlinerDomElement);

            expect(Reflect.has(anObject, "newProperty")).toBe(true);
            expect(propertyValueOn("newProperty", outlinerDomElement)).toEqual("undefined");
        });

        test("does nothing if the newly added property already existed", () => {
            const anObject = { existingProperty: "previousValue" };
            world.openOutliner(anObject);

            const [outlinerDomElement] = outliners();

            addPropertyOn("existingProperty", outlinerDomElement);

            expect(anObject.existingProperty).toEqual("previousValue");
            expect(propertyValueOn("existingProperty", outlinerDomElement)).toEqual("previousValue");
            expect(propertiesOn(outlinerDomElement).length).toEqual(1);
        });

        test("does nothing if the user cancels the prompt", () => {
            const anObject = {};
            world.openOutliner(anObject);

            const [outlinerDomElement] = outliners();

            addPropertyOn(null, outlinerDomElement);

            expect(Object.keys(anObject)).toEqual([]);
            expect(propertiesOn(outlinerDomElement).length).toEqual(0);
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

            const [outlinerDomElement] = outliners();

            expect(propertyNamesOn(outlinerDomElement)).toEqual(["oldProperty", "newProperty"]);
            expect(propertyValueOn("newProperty", outlinerDomElement)).toEqual("1");
        });

        test("when a property is removed from the object", () => {
            const anObject: InspectableObject = {
                oldProperty: 0
            };
            world.openOutliner(anObject);

            delete anObject.oldProperty;
            world.updateOutliners();

            const [outlinerDomElement] = outliners();

            expect(propertiesOn(outlinerDomElement).length).toEqual(0);
        });

        test("when an existing property is updated", () => {
            const anObject: InspectableObject = {
                existingProperty: 0
            };
            world.openOutliner(anObject);

            anObject.existingProperty = 1;
            world.updateOutliners();

            const [outlinerDomElement] = outliners();

            expect(propertiesOn(outlinerDomElement).length).toEqual(1);
            expect(propertyValueOn("existingProperty", outlinerDomElement)).toEqual("1");
        });

        test("repeated updates", () => {
            const anObject: InspectableObject = {
                existingProperty: 0
            };
            world.openOutliner(anObject);
            const [outlinerDomElement] = outliners();

            anObject.newProperty = 1;
            world.updateOutliners();
            addPropertyOn("yetAnotherNewProperty", outlinerDomElement);
            world.updateOutliners();

            expect(propertyNamesOn(outlinerDomElement)).toEqual(["existingProperty", "newProperty", "yetAnotherNewProperty"]);
        });

        test("updates the title when it changes", () => {
            const anObject = {};
            world.openOutliner(anObject);

            anObject.toString = () => "titulo nuevo";
            world.updateOutliners();

            const [outlinerDomElement] = outliners();

            expect(titleOf(outlinerDomElement)).toEqual("titulo nuevo");
        });

        test("updates the type when it changes", () => {
            const anObject = {};
            world.openOutliner(anObject);

            Object.setPrototypeOf(anObject, Error.prototype);
            world.updateOutliners();

            const [outlinerDomElement] = outliners();

            expect(inspectorType(outlinerDomElement)).toEqual("error");
        });
    });

    describe("movements", () => {
        beforeEach(() => {
            document.body.append(worldDomElement);
        });

        test("the starting position of the outliner can be specified", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            expect(outlinerDomElement.getBoundingClientRect()).toMatchObject({ x: 10, y: 20 });
        });

        test("the position of the outliner changes when dragging its header", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerDown", { x: 5, y: 3 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerMove", { x: 5 + 4, y: 3 + 2 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerUp",   { x: 5, y: 3 });

            expect(outlinerDomElement.getBoundingClientRect()).toMatchObject({ x: 10 + 4, y: 20 + 2 });
        });

        test("the position of the outliner does not change if the pointer was never down", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerMove", { x: 9, y: 5});

            expect(outlinerDomElement.getBoundingClientRect()).toMatchObject({ x: 10, y: 20 });
        });

        test("the position of the outliner keeps changing if the pointer keeps moving", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerDown", { x: 5, y: 3 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerMove", { x: 5 + 4, y: 3 + 2 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerMove", { x: 5 + 1, y: 3 + 1 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerUp",   { x: 5, y: 3 });

            expect(positionOf(outlinerDomElement)).toEqual(point(10 + 4 + 1, 20 + 2 + 1));
        });

        test("the position of the outliner stops changing if the pointer goes up", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerDown", { x: 5, y: 3 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerUp",   { x: 5, y: 3 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerMove", { x: 5 + 4, y: 3 + 2 });

            expect(outlinerDomElement.getBoundingClientRect()).toMatchObject({ x: 10, y: 20 });
        });

        test("the position of the outliner stops changing if the pointer interaction is cancelled", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerDown",   { x: 5, y: 3 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerCancel", { x: 5, y: 3 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerMove",   { x: 5 + 4, y: 3 + 2 });

            expect(outlinerDomElement.getBoundingClientRect()).toMatchObject({ x: 10, y: 20 });
        });

        test("if the dragging doesn't stop, the position of the outliner continues to change even if the pointer moves outside of it", () => {
            world.openOutliner({}, point(0, 0));

            const [outlinerDomElement] = outliners();

            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerDown", { x: 5, y: 3 });
            fireMousePointerEvent("pointerMove", { clientX: 888, clientY: 999 });

            expect(positionOf(headerOf(outlinerDomElement))).toEqual(point(888 - 5, 999 - 3));
        });

        test("prevents the default action (of making a selection) from happening when dragging starts", () => {
            world.openOutliner({}, point(10, 20));
            let event: PointerEvent;
            worldDomElement.addEventListener("pointerdown", e => event = e)

            const [outlinerDomElement] = outliners();
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerDown", { x: 5, y: 3 });

            expect(event!.defaultPrevented).toBe(true);
        });

        test("the header signals to the user that is draggable", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            expect(headerOf(outlinerDomElement)).toHaveClass("draggable");
            expect(headerOf(outlinerDomElement)).not.toHaveClass("dragging");
        });

        test("the header signals the user when it's being dragged", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerDown", { x: 5, y: 3 });

            expect(headerOf(outlinerDomElement)).toHaveClass("dragging");
            expect(outlinerDomElement).toHaveClass("moving");
        });

        test("the header stops signalling the user when it ended being dragged", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerDown", { x: 5, y: 3 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerUp", { x: 5, y: 3 });

            expect(headerOf(outlinerDomElement)).not.toHaveClass("dragging");
            expect(outlinerDomElement).not.toHaveClass("moving");
        });

        test("the last picked-up outliner ends up being at the top of the rest", () => {
            world.openOutliner({}, point(0, 0));
            world.openOutliner({}, point(20, 20));

            const [firstOutliner, secondOutliner] = outliners();
            fireMousePointerEventOver(headerOf(firstOutliner), "pointerDown", { x: 5, y: 5 });

            expect(outliners()).toEqual([secondOutliner, firstOutliner]);
        });

        test("does not start dragging if starting from the close button", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            fireMousePointerEventOver(closeButtonOf(outlinerDomElement), "pointerDown",   { x: 5, y: 3 });
            fireMousePointerEventOver(closeButtonOf(outlinerDomElement), "pointerMove", { x: 5, y: 3 });

            expect(outlinerDomElement).not.toHaveClass("moving");
        });

        test("when an object is inspected, it's grabbed", () => {
            const anObject = {};
            world.openOutliner(anObject);
            const [outlinerDomElement] = outliners();
            inputCode(outlinerDomElement, "{ y: 5 }");

            const button = inspectItButton(outlinerDomElement);
            const buttonPosition = positionOf(button);
            fireMousePointerEventOver(button, "pointerDown", {x: 1, y: 2});
            const [, newOutliner] = outliners();
            fireMousePointerEvent("pointerMove", { clientX: buttonPosition.x + 1 + 3, clientY: buttonPosition.y + 2 + 4 });

            const offset = point(-50, -10);
            expect(positionOf(newOutliner)).toEqual(sumOf(buttonPosition, offset, point(1, 2), point(3, 4)));
        });

        test("when an already visible object is inspected, it's grabbed from its header", () => {
            world.openOutliner(5);
            const [outlinerDomElement] = outliners();
            inputCode(outlinerDomElement, "5");

            const button = inspectItButton(outlinerDomElement);
            const buttonPosition = positionOf(button);
            fireMousePointerEventOver(button, "pointerDown", {x: 10, y: 12});

            const offset = point(-50, -10);
            expect(positionOf(outlinerDomElement)).toEqual(sumOf(buttonPosition, point(10, 12), offset));
        });

        test("when an outliner is grabbed, it ignores the movements of other pointers", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            fireTouchPointerEventOver(headerOf(outlinerDomElement), "pointerDown", firstFinger, { x: 5, y: 3 });
            fireTouchPointerEventOver(headerOf(outlinerDomElement), "pointerMove", secondFinger, { x: 5, y: 6 });
            fireTouchPointerEventOver(headerOf(outlinerDomElement), "pointerMove", firstFinger, { x: 5 + 4, y: 3 + 2 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerMove", { x: 1, y: 1 });

            expect(positionOf(outlinerDomElement)).toEqual(point(10 + 4, 20 + 2));
        });

        test("when an outliner is grabbed, it isn't dropped if other pointers are up or cancel the interaction", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            fireTouchPointerEventOver(headerOf(outlinerDomElement), "pointerDown", firstFinger, { x: 5, y: 3 });
            fireTouchPointerEventOver(headerOf(outlinerDomElement), "pointerUp", secondFinger, { x: 5, y: 3 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerCancel", { x: 5, y: 3 });
            fireTouchPointerEventOver(headerOf(outlinerDomElement), "pointerMove", firstFinger, { x: 5 + 4, y: 3 + 2 });

            expect(positionOf(outlinerDomElement)).toEqual(point(10 + 4, 20 + 2));
        });

        test("the pointer grabbing the outliner is the last one that starts dragging", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            fireTouchPointerEventOver(headerOf(outlinerDomElement), "pointerDown", firstFinger, { x: 5, y: 3 });
            fireTouchPointerEventOver(headerOf(outlinerDomElement), "pointerDown", secondFinger, { x: 1, y: 2 });
            fireTouchPointerEventOver(headerOf(outlinerDomElement), "pointerMove", secondFinger, { x: 1 + 1, y: 2 + 5 });
            fireTouchPointerEventOver(headerOf(outlinerDomElement), "pointerMove", firstFinger, { x: 5 + 4, y: 3 + 2 });

            expect(outlinerDomElement).toHaveClass("moving");
            expect(positionOf(outlinerDomElement)).toEqual(point(10 + 1, 20 + 5));
        });
    });

    describe("code evaluation", () => {
        test("the evaluation buttons are initially disabled", () => {
            world.openOutliner({});
            const [outlinerDomElement] = outliners();

            expect(doItButton(outlinerDomElement)).toBeDisabled();
            expect(inspectItButton(outlinerDomElement)).toBeDisabled();
        });

        test("the outliners are updated when code is evaluated; this is bound to the inspected object", () => {
            const anObject = { x: 1 };
            world.openOutliner(anObject);

            const [outlinerDomElement] = outliners();

            doIt(outlinerDomElement, "this.x = 2");

            expect(propertyValueOn("x", outlinerDomElement)).toEqual("2");
            expect(doItButton(outlinerDomElement)).toBeEnabled();
        });

        test("can inspect the result of a computation", () => {
            const anObject = { x: 1 };
            world.openOutliner(anObject);

            const [outlinerDomElement] = outliners();

            inspectIt(outlinerDomElement, "{ y: 5 }");

            const [, newOutliner] = outliners();
            expect(propertyValueOn("y", newOutliner)).toEqual("5");
            expect(positionOf(newOutliner)).toEqual(point(0, 0));
            expect(inspectItButton(outlinerDomElement)).toBeEnabled();
        });

        test("if the inspection of a computation results in an exception, inspect it", () => {
            const outlinerDomElement = world.openOutliner({}).domElement();

            inspectIt(outlinerDomElement, "this.lala()");

            const [, newOutliner] = outliners();
            expect(titleOf(newOutliner)).toContain("TypeError");
        });

        test("if the input is blank, inspecting does nothing", () => {
            world.openOutliner({});
            const [outlinerDomElement] = outliners();

            inspectIt(outlinerDomElement, "   ");

            expect(outliners().length).toEqual(1);
            expect(inspectItButton(outlinerDomElement)).toBeDisabled();
        });

        test("if evaluating something throws an exception, inspect it", () => {
            const outlinerDomElement = world.openOutliner({}).domElement();

            doIt(outlinerDomElement, "this.lala()");

            const [, newOutliner] = outliners();
            expect(titleOf(newOutliner)).toContain("TypeError");
        });

        test("if the input is blank, evaluating does nothing", () => {
            world.openOutliner({});
            const [outlinerDomElement] = outliners();

            doIt(outlinerDomElement, "   ");

            expect(outliners().length).toEqual(1);
            expect(doItButton(outlinerDomElement)).toBeDisabled();
        });
    });

    function propertyValueOn(propertyName: string, outlinerDomElement: HTMLElement) {
        const propertyRow = propertiesOn(outlinerDomElement)
            .find(row => propertyNameOn(row) === propertyName);

        if (propertyRow === undefined) throw new Error(`Cannot find property '${propertyName}' on outliner`);

        return within(propertyRow).getAllByRole("cell")[1].textContent;
    }

    function propertyNamesOn(outlinerDomElement: HTMLElement) {
        return propertiesOn(outlinerDomElement)
            .map(row => propertyNameOn(row));
    }

    function propertiesOn(outlinerDomElement: HTMLElement) {
        return within(outlinerDomElement)
            .queryAllByRole("row", {  })
            .filter(row => row.classList.contains("property"));
    }

    function propertyNameOn(row: HTMLElement) {
        return within(row).getAllByRole("cell")[0].textContent ?? "";
    }

    function headerOf(outlinerDomElement: HTMLElement) {
        return within(outlinerDomElement).getByRole("heading");
    }

    function outliners(): HTMLElement[] {
        return Array.from(worldDomElement.querySelectorAll(".outliner"));
    }

    const addPropertyOn = (newPropertyName: string | null, outlinerDomElement: HTMLElement) => {
        vi.spyOn(window, "prompt").mockImplementationOnce(() => newPropertyName);

        const addPropertyButton = within(outlinerDomElement)
            .getByRole("button", {description: "Add property"});

        addPropertyButton.click();
    };

    function positionOf(outlinerDomElement: HTMLElement) {
        const { x, y } = outlinerDomElement.getBoundingClientRect();
        return point(Math.round(x), Math.round(y));
    }

    function closeButtonOf(outlinerDomElement: HTMLElement) {
        return within(headerOf(outlinerDomElement)).getByRole("button", {description: "Close"});
    }

    function close(outlinerDomElement: HTMLElement) {
        closeButtonOf(outlinerDomElement).click();
    }

    function titleOf(outlinerDomElement: HTMLElement) {
        return headerOf(outlinerDomElement).firstChild?.textContent;
    }

    function doItButton(outlinerDomElement: HTMLElement) {
        return within(outlinerDomElement).getByRole("button", {description: "Do it"});
    }

    function doIt(outlinerDomElement: HTMLElement, code: string) {
        inputCode(outlinerDomElement, code);

        doItButton(outlinerDomElement).click();
    }

    function inspectItButton(outlinerDomElement: HTMLElement) {
        return within(outlinerDomElement).getByRole("button", {description: "Inspect it"});
    }

    function inspectIt(outlinerDomElement: HTMLElement, code: string) {
        inputCode(outlinerDomElement, code);

        fireMousePointerEventOver(inspectItButton(outlinerDomElement), "pointerDown", { x: 1, y: 1 });
    }

    function inputCode(outlinerDomElement: HTMLElement, code: string) {
        const evaluator = within(outlinerDomElement).getByRole("textbox");
        fireEvent.input(evaluator, {target: {textContent: code}});
    }

    function inspectorType(outlinerDomElement: HTMLElement) {
        return outlinerDomElement.dataset.type;
    }

    function stereotypeOf(outlinerDomElement: HTMLElement) {
        return outlinerDomElement.querySelector(".stereotype")!.textContent;
    }
});
