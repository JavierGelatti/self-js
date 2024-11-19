import {beforeEach, describe, expect, test, vi} from "vitest";
import {setupPointerCaptureSimulation} from "./pointer_capture_simulation";
import {point, World} from "../src/world";

import {within} from "@testing-library/dom";
import {fireMousePointerEvent, fireMousePointerEventOver} from "./dom_event_simulation";

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

        expect(headerOf(outlinerDomElement).textContent).toEqual("un Object");
    });

    test("the outliner shows the properties of the object", () => {
        world.openOutliner({ x: 1, y: 2 });

        const [outlinerDomElement] = outliners();

        expect(propertyNamesOn(outlinerDomElement)).toEqual(["x", "y"]);
        expect(propertyValueOn("x", outlinerDomElement)).toEqual("1");
        expect(propertyValueOn("y", outlinerDomElement)).toEqual("2");
    });

    test("it's possible to add new properties to objects", () => {
        const anObject = {};
        world.openOutliner(anObject);
        vi.spyOn(window, 'prompt').mockImplementationOnce(() => "newProperty");

        const [outlinerDomElement] = outliners();

        const addPropertyButton = within(outlinerDomElement)
            .getByRole("button", { name: "Add property" });
        addPropertyButton.click();

        expect(Reflect.has(anObject, "newProperty")).toBe(true);
        expect(propertyValueOn("newProperty", outlinerDomElement)).toEqual("undefined");
    });

    test("does nothing if the newly added property already existed", () => {
        const anObject = { existingProperty: "previousValue" };
        world.openOutliner(anObject);
        vi.spyOn(window, 'prompt').mockImplementationOnce(() => "existingProperty");

        const [outlinerDomElement] = outliners();

        const addPropertyButton = within(outlinerDomElement)
            .getByRole("button", { name: "Add property" });
        addPropertyButton.click();

        expect(anObject.existingProperty).toEqual("previousValue");
        expect(propertyValueOn("existingProperty", outlinerDomElement)).toEqual("previousValue");
        expect(propertiesOn(outlinerDomElement).length).toEqual(1);
    });

    test("does nothing if the user cancels the prompt", () => {
        const anObject = {};
        world.openOutliner(anObject);
        vi.spyOn(window, 'prompt').mockImplementationOnce(() => null);

        const [outlinerDomElement] = outliners();

        const addPropertyButton = within(outlinerDomElement)
            .getByRole("button", { name: "Add property" });
        addPropertyButton.click();

        expect(Object.keys(anObject)).toEqual([]);
        expect(propertiesOn(outlinerDomElement).length).toEqual(0);
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
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerUp",   { x: 5 + 4, y: 3 + 2 });

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
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerUp",   { x: 5 + 4 + 1, y: 3 + 2 + 1 });

            expect(outlinerDomElement.getBoundingClientRect()).toMatchObject({ x: 10 + 4 + 1, y: 20 + 2 + 1 });
        });

        test("the position of the outliner stops changing if the pointer goes up", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerDown", { x: 5, y: 3 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerUp",   { x: 5, y: 3 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerMove", { x: 5 + 4, y: 3 + 2 });

            expect(outlinerDomElement.getBoundingClientRect()).toMatchObject({ x: 10, y: 20 });
        });

        test("if the dragging doesn't stop, the position of the outliner continues to change even if the pointer moves outside of it", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();

            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerDown", { x: 5, y: 3 });
            fireMousePointerEvent("pointerMove", { clientX: 888, clientY: 999 });

            expect(outlinerDomElement.getBoundingClientRect()).toMatchObject({ x: 888 - 5, y: 999 - 3 });
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
        });

        test("the header stops signalling the user when it ended being dragged", () => {
            world.openOutliner({}, point(10, 20));

            const [outlinerDomElement] = outliners();
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerDown", { x: 5, y: 3 });
            fireMousePointerEventOver(headerOf(outlinerDomElement), "pointerUp", { x: 5, y: 3 });

            expect(headerOf(outlinerDomElement)).not.toHaveClass("dragging");
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
            .getAllByRole("row")
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
});
