import {describe, expect, test} from "vitest";
import {point} from "../src/position.ts";
import {curveTo, moveTo, parsePath} from "./svg_path.ts";

describe("SVG path parsing", () => {
    test("empty path", () => {
        expect(parsePath("")).toEqual([]);
    });

    test("single move-to instruction", () => {
        expect(parsePath("M 100 200")).toEqual([moveTo(point(100, 200))]);
    });

    test("absolute cubic bézier curve instruction", () => {
        expect(parsePath("C 1 2 3 4 5 6")).toEqual([curveTo(point(1, 2), point(3, 4), point(5, 6))]);
    });

    test("with commas as separators", () => {
        expect(parsePath("M 100,200")).toEqual([moveTo(point(100, 200))]);
    });

    test("with floating-point arguments", () => {
        expect(parsePath("M 1.02,2.01")).toEqual([moveTo(point(1.02, 2.01))]);
    });

    test("with negative arguments", () => {
        expect(parsePath("M -1 -2.01")).toEqual([moveTo(point(-1, -2.01))]);
    });

    test("without space between instruction name and first argument", () => {
        expect(parsePath("M100,200")).toEqual([moveTo(point(100, 200))]);
    });

    test("multiple commands", () => {
        expect(parsePath("M 100,200 M 300,400")).toEqual([moveTo(point(100, 200)), moveTo(point(300, 400))]);
    });

    test("multiple commands without repeating the command letter", () => {
        expect(parsePath("M 100,200 300,400")).toEqual([
            moveTo(point(100, 200)),
            moveTo(point(300, 400))
        ]);
        expect(parsePath("C 1 2 3 4 5 6 9 8 7 6 5 4")).toEqual([
            curveTo(point(1, 2), point(3, 4), point(5, 6)),
            curveTo(point(9, 8), point(7, 6), point(5, 4))
        ]);
    });
});