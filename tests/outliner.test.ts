import {beforeEach, describe, expect, test} from "vitest";
import {World} from "../src/world.ts";
import {Outliner} from "../src/outliner.ts";

describe("Outliners", () => {
    let world: World;

    beforeEach(() => {
        world = new World();
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

        test("shows the quoted value for strings", () => {
            expect(world.openOutliner("hola").title()).toEqual("\"hola\"");
        });
    });

    describe("from DOM element", () => {
        test("can get the outliner object from the DOM element", () => {
            const outliner = world.openOutliner({});
            const domElement = outliner.domElement();

            expect(Outliner.withDomElement(domElement)).toBe(outliner);
        });

        test("cannot get the outliner from other DOM elements", () => {
            const domElement = document.createElement("div");

            expect(() => Outliner.withDomElement(domElement))
                .toThrowError("The DOM element does not correspond to an outliner");
        });
    });
});
