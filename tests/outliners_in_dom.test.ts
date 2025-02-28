import {beforeEach, describe, expect, test, vitest} from "vitest";
import {setupPointerCaptureSimulation} from "./pointer_capture_simulation";
import {World} from "../src/world";
import {
    fireMousePointerEvent,
    fireMousePointerEventOn,
    fireMousePointerEventOver,
    fireTouchPointerEventOver,
    firstFinger,
    offsetToClientLocation,
    scrollToBottomOfDocument,
    secondFinger,
} from "./dom_event_simulation";
import {point, Position, sumOf} from "../src/position";

import "../styles.css";
import {InspectableObject} from "../src/objectOutliner";
import {
    asClientLocation,
    asPosition,
    boundingPageBoxOf,
    ClientLocation,
    clientPositionOfDomElement,
    getElementAt,
    positionOfDomElement,
    scrollPosition,
} from "../src/dom.ts";
import {OutlinerFromDomElement} from "./outlinerFromDomElement.ts";
import {Selector} from "../src/slot.ts";
import {svgDefinitions} from "../src/arrows.ts";

describe("The outliners in the world", () => {
    const { world, worldDomElement } = createWorldInDomBeforeEach();

    beforeEach(() => {
        document.body.append(worldDomElement(), svgDefinitions());
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

        expect(outlinerElement.title()).toEqual("an Object");
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
            expect(outlinerElement.valueOfSlot("x")).toEqual("1");
            expect(outlinerElement.valueOfSlot("y")).toEqual("2");
        });

        test("shows 'this' for self-referential properties", () => {
            const inspectedObject: Record<string, unknown> = {};
            inspectedObject.x = inspectedObject;

            const outlinerElement = openOutlinerFor(inspectedObject);

            expect(outlinerElement.valueOfSlot("x")).toEqual("this");
        });

        test("does not show any property for revoked proxies", () => {
            const revocableProxy = Proxy.revocable(
                { x: 1 }, { get: () => 123 },
            );
            const outlinerElement = openOutlinerFor(revocableProxy.proxy);
            expect(outlinerElement.valueOfSlot("x")).toEqual("123");

            revocableProxy.revoke();
            outlinerElement.update();

            expect(outlinerElement.title()).toEqual("a revoked Proxy");
            expect(outlinerElement.type()).toEqual("revoked-proxy");
            expect(outlinerElement.numberOfProperties()).toEqual(0);
            expect(outlinerElement.numberOfInternalSlots()).toEqual(0);
            expect(outlinerElement.objectAttributes()).toEqual([]);
        });

        describe("adding properties", () => {
            test("can add new properties to the inspected object", () => {
                const anObject = {};
                const outlinerElement = openOutlinerFor(anObject);

                outlinerElement.createNewProperty("newProperty");

                expect(outlinerElement.canAddProperties()).toBe(true);
                expect(Reflect.has(anObject, "newProperty")).toBe(true);
                expect(outlinerElement.valueOfSlot("newProperty")).toEqual("undefined");
            });

            test("if the newly added property already existed, nothing is changed", () => {
                const anObject = { existingProperty: "previousValue" };
                const outlinerElement = openOutlinerFor(anObject);

                outlinerElement.createNewProperty("existingProperty");

                expect(anObject.existingProperty).toEqual("previousValue");
                expect(outlinerElement.valueOfSlot("existingProperty")).toEqual("previousValue");
                expect(outlinerElement.numberOfProperties()).toEqual(1);
            });

            test("if the newly added property already existed but in the prototype of the object, it is added as its own", () => {
                const anObject: InspectableObject = { __proto__: { x: 1 } };
                const outlinerElement = openOutlinerFor(anObject);

                outlinerElement.createNewProperty("x");

                expect(anObject.x).toEqual(undefined);
                expect(outlinerElement.valueOfSlot("x")).toEqual("undefined");
                expect(outlinerElement.numberOfProperties()).toEqual(1);
            });

            test("if the user cancels the prompt, nothing is changed", () => {
                const anObject = {};
                const outlinerElement = openOutlinerFor(anObject);

                outlinerElement.createNewProperty(null);

                expect(Object.keys(anObject)).toEqual([]);
                expect(outlinerElement.numberOfProperties()).toEqual(0);
            });

            test("cannot add new properties if the object was not extensible", () => {
                const anObject = { existingProperty: "previousValue" };
                Object.preventExtensions(anObject);

                const outlinerElement = openOutlinerFor(anObject);

                expect(outlinerElement.canAddProperties()).toBe(false);
            });

            test("cannot add new properties if the object is made not extensible", () => {
                const anObject = { existingProperty: "previousValue" };
                const outlinerElement = openOutlinerFor(anObject);

                outlinerElement.doIt(`Object.preventExtensions(this)`);

                expect(outlinerElement.canAddProperties()).toBe(false);
            });
        });

        test("if a property value fails to be represented as string, a placeholder is shown", () => {
            const outlinerElement = openOutlinerFor({ get x() { throw new Error() }});

            expect(outlinerElement.valueOfSlot("x")).toEqual("???");
        });

        describe('property attributes', () => {
            test("explicitly shows non-configurable and non-writable property attributes", () => {
                const inspectedObject = {};
                Object.defineProperty(inspectedObject, "x", {
                    configurable: false,
                    enumerable: false,
                    writable: false,
                    value: 1
                });

                expect(openOutlinerFor(inspectedObject).attributesOf("x")).toEqual([
                    "non-configurable",
                    "non-writeable"
                ]);
            });

            test("for writable, configurable and enumerable data property, only explicitly shows the enumerable attribute", () => {
                const inspectedObject = {};
                Object.defineProperty(inspectedObject, "x", {
                    configurable: true,
                    enumerable: true,
                    writable: true,
                    value: 1
                });

                expect(openOutlinerFor(inspectedObject).attributesOf("x")).toEqual([
                    "enumerable"
                ]);
            });

            test("shows non-writable attribute for read-only but configurable and enumerable data property", () => {
                const inspectedObject = {};
                Object.defineProperty(inspectedObject, "x", {
                    configurable: true,
                    enumerable: true,
                    writable: false,
                    value: 1
                });

                expect(openOutlinerFor(inspectedObject).attributesOf("x")).toEqual([
                    "enumerable",
                    "non-writeable"
                ]);
            });

            test("shows accessor with getter only", () => {
                const inspectedObject = {};
                Object.defineProperty(inspectedObject, "x", {
                    configurable: true,
                    enumerable: true,
                    get: () => 1
                });

                expect(openOutlinerFor(inspectedObject).attributesOf("x")).toEqual([
                    "enumerable",
                    "accessor: get"
                ]);
            });

            test("shows accessor with setter only", () => {
                const inspectedObject = {};
                Object.defineProperty(inspectedObject, "x", {
                    configurable: true,
                    enumerable: true,
                    set: () => {}
                });

                expect(openOutlinerFor(inspectedObject).attributesOf("x")).toEqual([
                    "enumerable",
                    "accessor: set"
                ]);
            });

            test("shows accessor with both getter and setter", () => {
                const inspectedObject = {};
                Object.defineProperty(inspectedObject, "x", {
                    configurable: true,
                    enumerable: true,
                    get: () => 1,
                    set: () => {}
                });

                expect(openOutlinerFor(inspectedObject).attributesOf("x")).toEqual([
                    "enumerable",
                    "accessor: get set"
                ]);
            });

            test("shows non-configurable, non-enumerable accessor", () => {
                const inspectedObject = {};
                Object.defineProperty(inspectedObject, "x", {
                    configurable: false,
                    enumerable: false,
                    get: () => 1,
                    set: () => {}
                });

                expect(openOutlinerFor(inspectedObject).attributesOf("x")).toEqual([
                    "non-configurable",
                    "accessor: get set"
                ]);
            });

            test("shows nothing for non-enumerable, writeable and configurable data properties", () => {
                const inspectedObject = {};
                Object.defineProperty(inspectedObject, "x", {
                    configurable: true,
                    writable: true,
                    enumerable: false,
                    value: 1
                });

                expect(openOutlinerFor(inspectedObject).attributesOf("x")).toEqual([]);
            });

            test("updates the attribute indicators of a property when the attributes change", () => {
                const inspectedObject = {};
                Object.defineProperty(inspectedObject, "x", {
                    configurable: true,
                    writable: true,
                    enumerable: false,
                    value: 1
                });

                const outlinerElement = openOutlinerFor(inspectedObject);
                outlinerElement.doIt(`
                    Object.defineProperty(this, "x", {
                        configurable: false,
                        writable: false,
                        enumerable: true,
                        value: 1
                    })
                `);

                expect(outlinerElement.attributesOf("x")).toEqual([
                    'non-configurable',
                    'enumerable',
                    'non-writeable'
                ]);
            });
        });

        describe('object attributes', () => {
            test("by default there are no indicators", () => {
                const inspectedObject = { x: 1 };

                const outlinerElement = openOutlinerFor(inspectedObject);

                expect(outlinerElement.objectAttributes()).toEqual([]);
            });

            test("for non-extensible objects", () => {
                const inspectedObject = { x: 1 };
                Object.preventExtensions(inspectedObject);

                const outlinerElement = openOutlinerFor(inspectedObject);

                expect(outlinerElement.objectAttributes()).toEqual([
                      "non-extensible",
                ]);
            });

            test("for sealed objects", () => {
                const inspectedObject = { x: 1 };
                Object.seal(inspectedObject);

                const outlinerElement = openOutlinerFor(inspectedObject);

                expect(outlinerElement.objectAttributes()).toEqual([
                    "sealed",
                    "non-extensible",
                ]);
            });

            test("for frozen objects", () => {
                const inspectedObject = { x: 1 };
                Object.freeze(inspectedObject);

                const outlinerElement = openOutlinerFor(inspectedObject);

                expect(outlinerElement.objectAttributes()).toEqual([
                    "frozen",
                    "sealed",
                    "non-extensible",
                ]);
            });

            test("updates if there are changes", () => {
                const inspectedObject = { x: 1 };
                const outlinerElement = openOutlinerFor(inspectedObject);

                outlinerElement.doIt(`
                    Object.freeze(this)
                `);

                expect(outlinerElement.objectAttributes()).toEqual([
                    "frozen",
                    "sealed",
                    "non-extensible",
                ]);
            });
        });

        describe("code of functions", () => {
            test("when inspecting a function, shows the code of the function", () => {
                const outlinerElement = openOutlinerFor((x: number) => x + 1);

                expect(outlinerElement.functionCode()).toEqual("(x) => x + 1");
            });

            test("when inspecting an object that is not a function, doesn't show any code", () => {
                const outlinerElement = openOutlinerFor({});

                expect(outlinerElement.functionCode()).toEqual("");
            });

            test("when inspecting a class, shows an abbreviation of the code", () => {
                const outlinerElement = openOutlinerFor(class X {});

                expect(outlinerElement.functionCode()).toEqual("class X { ... }");
            });

            test("when inspecting an unnamed class, the abbreviation looks correct", () => {
                expect(openOutlinerFor(class {}).functionCode()).toEqual("class { ... }");
            });
        });

        describe("associations", () => {
            beforeEach(() => {
                // Needed to get the location of the inspect button (for the arrow)
                document.body.append(worldDomElement(), svgDefinitions());
            });

            test("can inspect a property", () => {
                const inspectedObject = { x: 1, y: 2 };
                const outlinerElement = openOutlinerFor(inspectedObject);

                outlinerElement.inspectProperty("x");

                const outlinerForProperty = lastOutliner();
                expect(outlinerForProperty.title()).toEqual("1");
                const association = world().associationFor(inspectedObject, "x");
                expect(association).toBeDefined();
            });

            test("inspecting a property again hides the arrow and does not open an extra outliner", () => {
                const inspectedObject = { x: 1, y: 2 };
                const outlinerElement = openOutlinerFor(inspectedObject);
                outlinerElement.inspectProperty("x");

                outlinerElement.inspectProperty("x");

                expect(openOutliners().length).toBeLessThanOrEqual(2);
                expect(visibleArrowElements().length).toEqual(0);
            });

            test("inspecting a property again when the target outliner has not moved and is not referenced by other arrows closes the target outliner", () => {
                const inspectedObject = { x: 1, y: 2 };
                const outlinerElement = openOutlinerFor(inspectedObject);
                outlinerElement.inspectProperty("x");

                outlinerElement.inspectProperty("x");

                expect(openOutliners()).toEqual([outlinerElement]);
            });

            test("inspecting a property again when the target outliner has moved does not close the target outliner", () => {
                const inspectedObject = { x: 1, y: 2 };
                const outlinerElement = openOutlinerFor(inspectedObject);
                outlinerElement.inspectProperty("x");
                const targetOutliner = lastOutliner();
                targetOutliner.move(point(1, 1));

                outlinerElement.inspectProperty("x");

                expect(openOutliners().length).toEqual(2);
                expect(visibleArrowElements().length).toEqual(0);
            });

            test("inspecting a property again when the target outliner is referenced by other target arrows does not close the target outliner", () => {
                const inspectedObject = { x: 1, y: 1 };
                const outlinerElement = openOutlinerFor(inspectedObject);
                outlinerElement.inspectProperty("x");
                outlinerElement.inspectProperty("y");

                outlinerElement.inspectProperty("x");

                expect(openOutliners().length).toEqual(2);
                expect(visibleArrowElements().length).toEqual(1);
            });

            test("inspecting a property again when the target outliner is referenced by other source arrows does not close the target outliner", () => {
                const inspectedObject = { x: { y: 1 } };
                const outlinerElement = openOutlinerFor(inspectedObject);
                outlinerElement.inspectProperty("x");
                const targetOutliner = lastOutliner();
                targetOutliner.inspectProperty("y");

                outlinerElement.inspectProperty("x");

                expect(openOutliners().length).toEqual(3);
                expect(visibleArrowElements().length).toEqual(1);
            });

            test("after inspecting a property, the arrow is removed when the source outliner is closed", () => {
                const inspectedObject = { x: 1, y: 2 };
                const originOutliner = openOutlinerFor(inspectedObject);
                originOutliner.inspectProperty("x");
                const arrow = arrowForAssociation(inspectedObject, "x");

                originOutliner.close();

                const association = world().associationFor(inspectedObject, "x");
                expect(association).not.toBeDefined();
                expect(arrow.svgElement()).not.toBeInTheDocument();
                expect(visibleArrowElements().length).toEqual(0);
            });

            test("after inspecting a property, the arrow is removed when the destination outliner is closed", () => {
                const inspectedObject = { x: 1, y: 2 };
                const originOutliner = openOutlinerFor(inspectedObject);
                originOutliner.inspectProperty("x");
                const arrow = arrowForAssociation(inspectedObject, "x");
                const destinationOutliner = lastOutliner();

                destinationOutliner.close();

                const association = world().associationFor(inspectedObject, "x");
                expect(association).not.toBeDefined();
                expect(arrow.svgElement()).not.toBeInTheDocument();
                expect(visibleArrowElements().length).toEqual(0);
            });

            test("when the source outliner is closed and the destination is moved, the arrow is still gone", () => {
                const inspectedObject = { x: 1, y: 2 };
                const sourceOutliner = openOutlinerFor(inspectedObject);
                sourceOutliner.inspectProperty("x");
                const arrow = arrowForAssociation(inspectedObject, "x");
                const destinationOutliner = lastOutliner();

                sourceOutliner.close();
                destinationOutliner.move(point(1, 1));

                const association = world().associationFor(inspectedObject, "x");
                expect(association).not.toBeDefined();
                expect(arrow.svgElement()).not.toBeInTheDocument();
                expect(visibleArrowElements().length).toEqual(0);
            });

            test("when the destination outliner is closed and the source is moved, the arrow is still gone", () => {
                const inspectedObject = { x: 1, y: 2 };
                const sourceOutliner = openOutlinerFor(inspectedObject);
                sourceOutliner.inspectProperty("x");
                const arrow = arrowForAssociation(inspectedObject, "x");
                const destinationOutliner = lastOutliner();

                destinationOutliner.close();
                sourceOutliner.move(point(1, 1));

                const association = world().associationFor(inspectedObject, "x");
                expect(association).not.toBeDefined();
                expect(arrow.svgElement()).not.toBeInTheDocument();
                expect(visibleArrowElements().length).toEqual(0);
            });

            test("when the value of an inspected property changes and there is no outliner for the new value, the arrow is removed", () => {
                const inspectedObject = { x: 1, y: 2 };
                const sourceOutliner = openOutlinerFor(inspectedObject);

                sourceOutliner.inspectProperty("x");
                sourceOutliner.doIt("this.x = 3");

                const association = world().associationFor(inspectedObject, "x");
                expect(association).not.toBeDefined();
                expect(visibleArrowElements().length).toEqual(0);
            });

            test("when the value of an inspected property changes but there is an outliner for the new value, the arrow is updated", () => {
                const inspectedObject = { x: 1, y: 2 };
                const sourceOutliner = openOutlinerFor(inspectedObject);
                const newValueOutliner = openOutlinerFor(3);

                sourceOutliner.inspectProperty("x");
                sourceOutliner.doIt("this.x = 3");

                expect(world().associationFor(inspectedObject, "x")).toBeDefined();
                expect(visibleArrowElements().length).toEqual(1);
                expect(arrowForAssociation(inspectedObject, "x").end()).toEqual(newValueOutliner.boundingBox());
                expect(newValueOutliner.domElement()).toHaveClass("shaking");
            });

            test("when an inspected property is updated to the same value, the arrow is maintained", () => {
                const inspectedObject = { x: 1, y: 2 };
                const sourceOutliner = openOutlinerFor(inspectedObject);

                sourceOutliner.inspectProperty("x");
                sourceOutliner.doIt("this.x = 1");

                expect(world().associationFor(inspectedObject, "x")).toBeDefined();
                expect(visibleArrowElements().length).toEqual(1);
                expect(lastOutliner().domElement()).not.toHaveClass("shaking");
            });

            test("when an arrow is redirected, updates its position when the new destination is moved", () => {
                const inspectedObject = { x: 1, y: 2 };
                const sourceOutliner = openOutlinerFor(inspectedObject);
                const newValueOutliner = openOutlinerFor(3);
                sourceOutliner.inspectProperty("x");

                sourceOutliner.doIt("this.x = 3");
                newValueOutliner.move(point(5, 5));

                expect(arrowForAssociation(inspectedObject, "x").end()).toEqual(newValueOutliner.boundingBox());
            });

            test("when an inspected property is removed, the arrow is removed (:. not pointed to undefined)", () => {
                const inspectedObject = { x: 1, y: 2 };
                const sourceOutliner = openOutlinerFor(inspectedObject);
                sourceOutliner.inspectProperty("x");
                openOutlinerFor(undefined);

                sourceOutliner.doIt("delete this.x");

                const association = world().associationFor(inspectedObject, "x");
                expect(association).not.toBeDefined();
                expect(visibleArrowElements().length).toEqual(0);
            });

            test("the arrows are added just above the source outliner", () => {
                const inspectedObject = { x: 1, y: 2 };
                const sourceOutliner = openOutlinerFor(inspectedObject);
                const _anotherOutliner = openOutlinerFor("hola");
                sourceOutliner.inspectProperty("x");

                const [arrow] = visibleArrowElements();
                expect(arrow.parentElement!.previousElementSibling).toBe(sourceOutliner.domElement());
            });

            test("if inspecting a property raises an error, an outliner for the error is opened", () => {
                const outlinerElement = openOutlinerFor({ get x() { throw new Error() }});

                outlinerElement.inspectProperty("x");

                const outlinerForProperty = lastOutliner();
                expect(outlinerForProperty.title()).toEqual("Error");
                expect(visibleArrowElements().length).toEqual(0);
            });

            test("if redirecting a property raises an error while setting the value, an outliner for the error is opened", () => {
                const outlinerElement = openOutlinerFor({ set x(_: unknown) { throw new Error() }});

                grabAssociationFromStartingPoint(outlinerElement, "x")
                    .dropInto(outlinerElement.domElement());

                const outlinerForProperty = lastOutliner();
                expect(outlinerForProperty.title()).toEqual("Error");
                expect(visibleArrowElements().length).toEqual(0);
                expect(outlinerElement.domElement()).not.toHaveClass("hovered");
            });

            test("when redirecting a property that raises an error while getting the value, the arrow is removed and the error is logged (not inspected)", () => {
                const consoleInfo = vitest.spyOn(console, "info").mockImplementation(() => {});
                const outlinerElement = openOutlinerFor({ get x() { throw new Error("GET") }});

                grabAssociationFromStartingPoint(outlinerElement, "x")
                    .dropInto(outlinerElement.domElement());

                expect(lastOutliner()).toEqual(outlinerElement);
                expect(visibleArrowElements().length).toEqual(0);
                expect(consoleInfo).toHaveBeenCalledOnce();
                expect(consoleInfo.mock.lastCall![0].toString()).toEqual("Error: GET");
                expect(outlinerElement.domElement()).not.toHaveClass("hovered");
            });

            test("if redirecting a property raises an error both while setting and getting the value, an outliner for the set error is opened", () => {
                const consoleInfo = vitest.spyOn(console, "info");
                const outlinerElement = openOutlinerFor({
                    get x() { throw new Error("GET") },
                    set x(_: unknown) { throw new Error("SET") }
                });

                grabAssociationFromStartingPoint(outlinerElement, "x")
                    .dropInto(outlinerElement.domElement());

                const outlinerForProperty = lastOutliner();
                expect(outlinerForProperty.title()).toEqual("Error: SET");
                expect(visibleArrowElements().length).toEqual(0);
                expect(consoleInfo).not.toHaveBeenCalled();
                expect(outlinerElement.domElement()).not.toHaveClass("hovered");
            });
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
            expect(outlinerElement.valueOfSlot("newProperty")).toEqual("1");
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
            expect(outlinerElement.valueOfSlot("existingProperty")).toEqual("1");
        });

        test("repeated updates", () => {
            const anObject: InspectableObject = {
                existingProperty: 0
            };
            const outlinerElement = openOutlinerFor(anObject);

            anObject.newProperty = 1;
            updateOutliners();
            outlinerElement.createNewProperty("yetAnotherNewProperty");
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
            fireMousePointerEventOver(outlinerElement.header(), "pointerOut", point(888, 999));
            fireMousePointerEvent("pointerMove", asClientLocation(point(888, 999)));

            expect(positionOfDomElement(outlinerElement.header())).toEqual(point(888, 999).minus(point(5, 3)));
        });

        test("prevents the default action (of making a selection) from happening when dragging starts", () => {
            const outlinerElement = openOutlinerFor({}, point(10, 20));
            let event: PointerEvent;
            worldDomElement().addEventListener("pointerdown", e => event = e)

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

        test("when inspecting a property, an arrow is shown", () => {
            const inspectedObject = { x: 1, y: 2 };
            const outlinerElement = openOutlinerFor(inspectedObject);

            outlinerElement.inspectProperty("x");

            const associationArrow = arrowForAssociation(inspectedObject, "x");
            expect(getElementAt(associationArrow.start()))
                .toEqual(outlinerElement.buttonToInspectProperty("x"));
            expect(associationArrow.end())
                .toEqual(lastOutliner().boundingBox());
        });

        test("when the source outliner is moved, the arrow is updated", () => {
            const inspectedObject = { x: 1, y: 2 };
            const outlinerElement = openOutlinerFor(inspectedObject);
            outlinerElement.inspectProperty("x");
            const associationArrow = arrowForAssociation(inspectedObject, "x");
            const originalArrowStart = associationArrow.start();

            outlinerElement.move(point(10, 20));

            expect(associationArrow.start()).toEqual(originalArrowStart.plus(point(10, 20)));
        });

        test("when the target outliner is moved, the arrow is updated", () => {
            const inspectedObject = { x: 1, y: 2 };
            const outlinerElement = openOutlinerFor(inspectedObject);
            outlinerElement.inspectProperty("x");
            const associationArrow = arrowForAssociation(inspectedObject, "x");
            const targetOutliner = lastOutliner();

            targetOutliner.move(point(10, 20));

            expect(associationArrow.end())
                .toEqual(targetOutliner.boundingBox());
        });

        test("when the source outliner is moved after scrolling, the arrow is updated", () => {
            const inspectedObject = { x: 1, y: 2 };
            const outlinerElement = openOutlinerFor(inspectedObject, point(0, 0));
            outlinerElement.inspectProperty("x");
            const associationArrow = arrowForAssociation(inspectedObject, "x");
            const originalArrowStart = associationArrow.start();
            scrollToBottomOfDocument();

            outlinerElement.move(point(10, 20));

            expect(associationArrow.start()).toEqual(originalArrowStart.plus(point(10, 20)));
        });

        test("when the destination outliner is over the arrow start, the arrow is hidden", () => {
            const inspectedObject = { x: 1, y: 2 };
            const sourceOutliner = openOutlinerFor(inspectedObject);
            const _destinationOutliner = openOutlinerFor(1, point(150, 0));
            sourceOutliner.inspectProperty("x");

            const [arrow] = visibleArrowElements();
            expect(arrow).toHaveClass("arrow-hidden");
            expect(arrow).not.toHaveClass("arrow-faded");
        });

        test("when the source outliner is over the arrow end, the arrow is faded", () => {
            const inspectedObject = { x: 1, y: 2 };
            const sourceOutliner = openOutlinerFor(inspectedObject);

            sourceOutliner.inspectProperty("x");
            sourceOutliner.move(point(20, 0));

            const [arrow] = visibleArrowElements();
            expect(arrow).not.toHaveClass("arrow-hidden");
            expect(arrow).toHaveClass("arrow-faded");
        });

        test("arrows to self are visible", () => {
            const inspectedObject = { x: 1, y: 2 };
            const sourceOutliner = openOutlinerFor(inspectedObject);
            sourceOutliner.doIt("this.x = this");

            sourceOutliner.inspectProperty("x");

            const [arrow] = visibleArrowElements();
            expect(arrow).not.toHaveClass("arrow-hidden");
            expect(arrow).not.toHaveClass("arrow-faded");
        });

        test("by default, arrows are visible", () => {
            const inspectedObject = { x: 1, y: 2 };
            const sourceOutliner = openOutlinerFor(inspectedObject);

            sourceOutliner.inspectProperty("x");

            const [arrow] = visibleArrowElements();
            expect(arrow).not.toHaveClass("arrow-hidden");
            expect(arrow).not.toHaveClass("arrow-faded");
        });

        test("when the destination outliner is over the arrow start and then the source outliner is moved to the top, the arrow returns to normal", () => {
            const inspectedObject = { x: 1, y: 2 };
            const sourceOutliner = openOutlinerFor(inspectedObject, point(0, 20));
            const _destinationOutliner = openOutlinerFor(1, point(140, 10));
            sourceOutliner.inspectProperty("x");
            sourceOutliner.move(point(1, 1));

            const [arrow] = visibleArrowElements();
            expect(arrow).not.toHaveClass("arrow-hidden");
            expect(arrow).not.toHaveClass("arrow-faded");
        });

        test("when the source outliner is over the arrow end and then the destination outliner is moved to the top, the arrow returns to normal", () => {
            const inspectedObject = { x: 1, y: 2 };
            const sourceOutliner = openOutlinerFor(inspectedObject);
            sourceOutliner.inspectProperty("x");
            sourceOutliner.move(point(20, 0));

            const destinationOutliner = openOutlinerFor(1);
            destinationOutliner.move(point(1, 1));

            const [arrow] = visibleArrowElements();
            expect(arrow).not.toHaveClass("arrow-hidden");
            expect(arrow).not.toHaveClass("arrow-faded");
        });

        test("when an outliner is moved, its sourced-arrows are moved just above the outliner", () => {
            const inspectedObject = { x: 1, y: 2 };
            const sourceOutliner = openOutlinerFor(inspectedObject);
            const targetOutliner = openOutlinerFor(1);
            const anotherOutliner = openOutlinerFor("hola");
            sourceOutliner.inspectProperty("x");

            anotherOutliner.move(point(1, 1));
            sourceOutliner.move(point(1, 1));
            targetOutliner.move(point(1, 1));

            const [arrow] = visibleArrowElements();
            expect(arrow.parentElement!.previousElementSibling).toBe(sourceOutliner.domElement());
        });

        test("it's possible to redirect associations", () => {
            const inspectedObject = { x: 1, y: 2 };
            const outliner = openOutlinerFor(inspectedObject);
            const newValueOutliner = openOutlinerFor(2, point(20, 200));
            outliner.inspectProperty("x");
            const [associationElement] = visibleAssociationElements();

            grabAssociationFromArrowEnd(associationElement)
                .dropInto(newValueOutliner.domElement());

            expect(inspectedObject.x).toEqual(2);
            expect(outliner.valueOfSlot("x")).toEqual("2");
            expect(arrowForAssociation(inspectedObject, "x").end()).toEqual(
                boundingPageBoxOf(newValueOutliner.domElement())
            );
            expect(newValueOutliner.domElement()).not.toHaveClass("hovered");
        });

        test("redirecting associations when the view is scrolled works the same", () => {
            scrollToBottomOfDocument();
            const inspectedObject = { x: 1, y: 2 };
            const outliner = openOutlinerFor(inspectedObject, scrollPosition());
            const newValueOutliner = openOutlinerFor(2, point(20, 200).plus(scrollPosition()));
            outliner.inspectProperty("x");
            const [associationElement] = visibleAssociationElements();

            grabAssociationFromArrowEnd(associationElement)
                .dropInto(newValueOutliner.domElement());

            expect(inspectedObject.x).toEqual(2);
            expect(outliner.valueOfSlot("x")).toEqual("2");
            expect(arrowForAssociation(inspectedObject, "x").end()).toEqual(
                boundingPageBoxOf(newValueOutliner.domElement())
            );
            expect(newValueOutliner.domElement()).not.toHaveClass("hovered");
        });

        test("while redirecting an association, the currently-hovered outliner is highlighted and the arrow points to it", () => {
            const inspectedObject = { x: 1, y: 2 };
            const outliner = openOutlinerFor(inspectedObject);
            const anotherOutliner = openOutlinerFor(2, point(20, 200));
            const yetAnotherOutliner = openOutlinerFor(3, point(40, 300));
            outliner.inspectProperty("x");
            const [associationElement] = visibleAssociationElements();

            grabAssociationFromArrowEnd(associationElement)
                .hover(anotherOutliner.domElement())
                .hover(yetAnotherOutliner.domElement());

            expect(anotherOutliner.domElement()).not.toHaveClass("hovered");
            expect(yetAnotherOutliner.domElement()).toHaveClass("hovered");
            expect(arrowForAssociation(inspectedObject, "x").end()).toEqual(
                boundingPageBoxOf(yetAnotherOutliner.domElement())
            );
        });

        test("while redirecting an association, if no outliner is hovered the arrow follows the cursor", () => {
            const inspectedObject = { x: 1, y: 2 };
            const outliner = openOutlinerFor(inspectedObject);
            const anotherOutliner = openOutlinerFor(2, point(20, 200));
            outliner.inspectProperty("x");
            const [associationElement] = visibleAssociationElements();

            grabAssociationFromArrowEnd(associationElement)
                .hover(anotherOutliner.domElement())
                .moveTo(asClientLocation(point(999, 999)));

            expect(anotherOutliner.domElement()).not.toHaveClass("hovered");
            expect(arrowForAssociation(inspectedObject, "x").end()).toEqual(point(999, 999));
        });

        test("if the arrow is not dropped to an outliner when redirecting an association, nothing is changed", () => {
            const inspectedObject = { x: 1, y: 2 };
            const outliner = openOutlinerFor(inspectedObject);
            const valueOutliner = openOutlinerFor(1, point(20, 200));
            outliner.inspectProperty("x");
            const [associationElement] = visibleAssociationElements();

            grabAssociationFromArrowEnd(associationElement)
                .hover(outliner.domElement())
                .move(point(999, 999))
                .drop();

            expect(inspectedObject.x).toEqual(1);
            expect(outliner.valueOfSlot("x")).toEqual("1");
            expect(arrowForAssociation(inspectedObject, "x").end()).toEqual(
                boundingPageBoxOf(valueOutliner.domElement())
            )
        });

        test("if the interaction is cancelled when redirecting an association, nothing is changed", () => {
            const inspectedObject = { x: 1, y: 2 };
            const outliner = openOutlinerFor(inspectedObject);
            const valueOutliner = openOutlinerFor(1, point(20, 200));
            outliner.inspectProperty("x");
            const [associationElement] = visibleAssociationElements();

            grabAssociationFromArrowEnd(associationElement)
                .hover(outliner.domElement())
                .cancel();

            expect(outliner.domElement()).not.toHaveClass("hovered");
            expect(inspectedObject.x).toEqual(1);
            expect(outliner.valueOfSlot("x")).toEqual("1");
            expect(arrowForAssociation(inspectedObject, "x").end()).toEqual(
                boundingPageBoxOf(valueOutliner.domElement())
            )
        });

        describe("arrow mode is updated when grabbing an association", () => {
            test("when the source outliner is above the arrow end", () => {
                const inspectedObject = { x: 1, y: 2 };
                const outlinerBelow = openOutlinerFor("this is below");
                const outliner = openOutlinerFor(inspectedObject, point(0, 150));
                outliner.inspectProperty("x");
                outliner.move(point(1, 1));
                const [associationElement] = visibleAssociationElements();

                grabAssociationFromArrowEnd(associationElement)
                    .hover(outlinerBelow.domElement());

                const [arrow] = visibleArrowElements();
                expect(arrow).toHaveClass("arrow-faded");
            });

            test("considering the potentially-new target outliner as the target outliner to determine the arrow mode", () => {
                const inspectedObject = { x: 1, y: 2 };
                const outliner = openOutlinerFor(inspectedObject, point(10, 10));
                const _valueOutliner = openOutlinerFor(1, point(220, 10));
                outliner.inspectProperty("x");
                const outlinerAbove = openOutlinerFor("this is above", point(110, 50));
                const [associationElement] = visibleAssociationElements();

                grabAssociationFromArrowEnd(associationElement)
                    .hover(outlinerAbove.domElement());

                const [arrow] = visibleArrowElements();
                expect(arrow).toHaveClass("arrow-hidden");
            });

            test("the arrow is fully visible if the arrow is pointing to no outliner", () => {
                const inspectedObject = { x: 1, y: 2 };
                const outliner = openOutlinerFor(inspectedObject, point(10, 10));
                const _valueOutliner = openOutlinerFor(1, point(10, 50));
                outliner.inspectProperty("x");
                const [associationElement] = visibleAssociationElements();

                grabAssociationFromArrowEnd(associationElement)
                    .move(point(200, 200));

                const [arrow] = visibleArrowElements();
                expect(arrow).not.toHaveClass("arrow-hidden");
            });
        });

        test("while redirecting the association, the arrow moves with the cursor even when the view is scrolled", () => {
            scrollToBottomOfDocument();
            const inspectedObject = {x: 1, y: 2};
            const outliner = openOutlinerFor(inspectedObject);
            outliner.inspectProperty("x");
            const [associationElement] = visibleAssociationElements();

            grabAssociationFromArrowEnd(associationElement)
                .moveTo(asClientLocation(point(100, 100)));

            expect(arrowForAssociation(inspectedObject, "x").end().y).toBeGreaterThan(100);
        });

        test("can redirect an association from its source when the association is already visible", () => {
            const inspectedObject = { x: 1, y: 2 };
            const outliner = openOutlinerFor(inspectedObject);
            const newValueOutliner = openOutlinerFor(2, point(20, 200));
            outliner.inspectProperty("x");
            const [associationElement] = visibleAssociationElements();

            grabAssociationFromStartingPoint(outliner, "x")
                .dropInto(newValueOutliner.domElement());

            expect(inspectedObject.x).toEqual(2);
            expect(outliner.valueOfSlot("x")).toEqual("2");
            expect(arrowForAssociation(inspectedObject, "x").end()).toEqual(
                boundingPageBoxOf(newValueOutliner.domElement())
            );
            expect(newValueOutliner.domElement()).not.toHaveClass("hovered");
            expect(arrowEndHandleOf(associationElement)).not.toHaveClass("dragging");
        });

        test("while redirecting an association from its source, the association is marked as dragging", () => {
            const inspectedObject = { x: 1, y: 2 };
            const outliner = openOutlinerFor(inspectedObject);
            const _newValueOutliner = openOutlinerFor(2, point(20, 200));
            outliner.inspectProperty("x");
            const [associationElement] = visibleAssociationElements();

            grabAssociationFromStartingPoint(outliner, "x");

            expect(arrowEndHandleOf(associationElement)).toHaveClass("dragging");
        });

        test("can redirect an association from its source when the association is not already visible", () => {
            const inspectedObject = { x: 1, y: 2 };
            const outliner = openOutlinerFor(inspectedObject);
            const newValueOutliner = openOutlinerFor(2, point(20, 200));

            grabAssociationFromStartingPoint(outliner, "x")
                .dropInto(newValueOutliner.domElement());

            expect(inspectedObject.x).toEqual(2);
            expect(outliner.valueOfSlot("x")).toEqual("2");
            expect(arrowForAssociation(inspectedObject, "x").end()).toEqual(
                boundingPageBoxOf(newValueOutliner.domElement())
            );
            expect(newValueOutliner.domElement()).not.toHaveClass("hovered");
        });

        test("if redirecting a not visible association doesn't change the value of the property, the arrow should disappear", () => {
            const inspectedObject = function aFunction() {} as unknown as InspectableObject;
            const outliner = openOutlinerFor(inspectedObject);
            const targetValueOutliner = openOutlinerFor("Hola", point(20, 200));

            grabAssociationFromStartingPoint(outliner, "name")
                .dropInto(targetValueOutliner.domElement());

            expect(inspectedObject.name).toEqual("aFunction");
            expect(outliner.valueOfSlot("name")).toEqual("aFunction");
            expect(world().associationFor(inspectedObject, "name")).toBeUndefined();
        });

        test("if redirecting a visible association doesn't change the value of the property, the arrow should point to the unchanged value", () => {
            const inspectedObject = function aFunction() {} as unknown as InspectableObject;
            const outliner = openOutlinerFor(inspectedObject);
            outliner.inspectProperty("name");
            const currentValueOutliner = lastOutliner();

            const targetValueOutliner = openOutlinerFor("Hola", point(200, 300));

            grabAssociationFromStartingPoint(outliner, "name")
                .dropInto(targetValueOutliner.domElement());

            expect(arrowForAssociation(inspectedObject, "name").end()).toEqual(
                boundingPageBoxOf(currentValueOutliner.domElement())
            );
            expect(currentValueOutliner.domElement()).toHaveClass("shaking");
        });

        test("when the user scrolls while dragging an outliner, the position of the outliner follows the cursor", () => {
            const outlinerElement = openOutlinerFor({x: 1, y: 2}, point(0, 0));
            const dragInteraction = grabOutliner(outlinerElement);
            scrollToBottomOfDocument();

            dragInteraction.moveTo(asClientLocation(point(10, 10)));

            expect(clientPositionOfDomElement(outlinerElement.header())).toEqual(point(10, 10));
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

            expect(outlinerElement.valueOfSlot("x")).toEqual("2");
        });

        test("can inspect the result of a computation", () => {
            const anObject = { x: 1 };
            const outlinerElement = openOutlinerFor(anObject);

            outlinerElement.inspectIt("{ y: 5 }");

            const newOutliner = lastOutliner();
            expect(newOutliner.valueOfSlot("y")).toEqual("5");
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

    describe("special slots", () => {
        const prototypeSpecialSlotName = "🙋[[Prototype]]";

        test("all objects have a [[Prototype]] internal slot", () => {
            const outlinerElement = openOutlinerFor({});

            expect(outlinerElement.internalSlotsNames()).toEqual([prototypeSpecialSlotName]);
            expect(outlinerElement.valueOfSlot(prototypeSpecialSlotName)).toEqual("Object.prototype");
        });

        test("the toString representation of the prototype is ...", () => {
            expect(openOutlinerFor({ __proto__: Date.prototype }).valueOfSlot(prototypeSpecialSlotName)).toEqual("Date.prototype");
            expect(openOutlinerFor({ __proto__: {} }).valueOfSlot(prototypeSpecialSlotName)).toEqual("[object Object]");
            expect(openOutlinerFor({ __proto__: null }).valueOfSlot(prototypeSpecialSlotName)).toEqual("null");
        });

        test("the prototype can be changed", () => {
            const originalObject = new Date();
            const outlinerElement = openOutlinerFor(originalObject);
            const newPrototype = {};
            const newPrototypeOutlinerElement = openOutlinerFor(newPrototype, point(100, 100));

            grabAssociationFromStartingPoint(outlinerElement, prototypeSpecialSlotName)
                .dropInto(newPrototypeOutlinerElement.domElement());

            expect(outlinerElement.valueOfSlot(prototypeSpecialSlotName)).toEqual(String(newPrototype));
            expect(Reflect.getPrototypeOf(originalObject)).toBe(newPrototype);
            expect(visibleArrowElements().length).toEqual(1);
        });

        test("if setting the value of a slot causes an error, inspect the error", () => {
            const outlinerElement = openOutlinerFor(Object.prototype);
            const newPrototypeOutlinerElement = openOutlinerFor({}, point(100, 100));

            grabAssociationFromStartingPoint(outlinerElement, prototypeSpecialSlotName)
                .dropInto(newPrototypeOutlinerElement.domElement());

            const newOutliner = lastOutliner();
            expect(newOutliner.title()).toContain("TypeError");
            expect(visibleArrowElements().length).toEqual(0);
        });

        test("shows nothing as the writeable 'attribute' of the prototype internal slot", () => {
            expect(openOutlinerFor({}).attributesOf(prototypeSpecialSlotName)).toEqual([]);
        });

        test("shows a non-writeable indicator if the object is not extensible", () => {
            const inspectedObject = {};
            Object.preventExtensions(inspectedObject);

            expect(openOutlinerFor(inspectedObject).attributesOf(prototypeSpecialSlotName)).toEqual([
                "non-writeable"
            ]);
        });

        test("shows a non-writeable indicator if the object is an prototype immutable exotic object", () => {
            expect(openOutlinerFor(Object.prototype).attributesOf(prototypeSpecialSlotName)).toEqual([
                "non-writeable"
            ]);
        });

        test("updates the attribute indicator when the object is made not-extensible", () => {
            const inspectedObject = {};
            const outlinerElement = openOutlinerFor(inspectedObject);

            outlinerElement.doIt(`Object.preventExtensions(this)`);

            expect(outlinerElement.attributesOf(prototypeSpecialSlotName)).toEqual([
                "non-writeable"
            ]);
        });
    });

    function openOutliners() {
        return Array.from(worldDomElement().querySelectorAll<HTMLElement>(".outliner"))
            .map(domElement => new OutlinerFromDomElement(domElement));
    }

    function visibleArrowElements() {
        return visibleAssociationElements().map(associationElement => {
            return associationElement.querySelector<SVGSVGElement>("svg:has(.arrow)")!;
        });
    }

    function visibleAssociationElements() {
        return Array.from(worldDomElement().querySelectorAll<HTMLElement>(".association"));
    }

    function positionOf(domElement: HTMLElement) {
        return positionOfDomElement(domElement).map(Math.round);
    }

    function openOutlinerFor(anObject: unknown, position?: Position) {
        return new OutlinerFromDomElement(
            world().openOutliner(anObject, position).domElement()
        );
    }

    function updateOutliners() {
        world().updateOutliners();
    }

    function lastOutliner() {
        return openOutliners().pop()!;
    }

    function numberOfOpenOutliners() {
        return openOutliners().length;
    }

    function arrowForAssociation(inspectedObject: InspectableObject, propertyName: Selector) {
        return world().associationFor(inspectedObject, propertyName)!.arrow();
    }

    function grabAssociationFromArrowEnd(associationElement: HTMLElement) {
        return grab(arrowEndHandleOf(associationElement), point(0, 0));
    }

    function arrowEndHandleOf(associationElement: HTMLElement) {
        return associationElement.querySelector(".arrow-end-area")!;
    }

    function grabAssociationFromStartingPoint(outliner: OutlinerFromDomElement, propertyName: string) {
        const startingPointHandle = outliner.buttonToInspectProperty(propertyName);

        return grab(startingPointHandle, boundingPageBoxOf(startingPointHandle).centerOffset());
    }

    function grabOutliner(outliner: OutlinerFromDomElement) {
        const outlinerHeaderElement = outliner.header();

        return grab(outlinerHeaderElement, boundingPageBoxOf(outlinerHeaderElement).centerOffset());
    }

    function grab(anElement: Element, dragOffset: Position) {
        return new DragAndDropInteraction(anElement, dragOffset).start();
    }

    class DragAndDropInteraction {
        private readonly _draggedElement: Element;
        private readonly _dragOffset: Position;

        constructor(draggedElement: Element, dragOffset: Position) {
            this._draggedElement = draggedElement;
            this._dragOffset = dragOffset;
        }

        start() {
            fireMousePointerEventOn(this._draggedElement, "pointerDown", this._currentGrabPosition());

            // To confirm the drag interaction and capture the pointer
            fireMousePointerEventOn(this._draggedElement, "pointerOut", this._currentGrabPosition());

            return this;
        }

        hover(anotherElement: Element) {
            const positionDelta = this._currentCursorPagePosition()
                .deltaToReach(boundingPageBoxOf(anotherElement).center());

            return this.move(positionDelta);
        }

        private _currentCursorPagePosition() {
            return boundingPageBoxOf(this._draggedElement)
                .origin()
                .plus(this._dragOffset);
        }

        move(offsetLocation: Position) {
            const endLocation = this._toClientLocation(offsetLocation);
            return this.moveTo(endLocation);
        }

        moveTo(endLocation: ClientLocation) {
            fireMousePointerEventOn(
                this._draggedElement,
                "pointerMove",
                asClientLocation(asPosition(endLocation).plus(this._dragOffset))
            );

            return this;
        }

        drop() {
            fireMousePointerEventOn(this._draggedElement, "pointerUp", this._currentGrabPosition());
        }

        cancel() {
            fireMousePointerEventOn(this._draggedElement, "pointerCancel", this._currentGrabPosition());
        }

        dropInto(anotherElement: Element) {
            this.hover(anotherElement).drop();
        }

        private _currentGrabPosition() {
            return this._toClientLocation(this._dragOffset);
        }

        private _toClientLocation(offsetLocation: Position) {
            return offsetToClientLocation(offsetLocation, this._draggedElement);
        }
    }

    function createWorldInDomBeforeEach() {
        setupPointerCaptureSimulation();

        let currentWorld: World;
        let currentWorldDomElement: HTMLElement;

        beforeEach(() => {
            document.body.innerHTML = "";

            currentWorld = new World();
            currentWorldDomElement = currentWorld.domElement();
        });

        return {
            world: () => currentWorld,
            worldDomElement: () => currentWorldDomElement,
        };
    }
});
