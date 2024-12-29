import {beforeEach, describe, expect, test} from "vitest";
import {point, Position} from "../src/position.ts";
import {createElement, boundingPageBoxOf, positionOfDomElement, sizeOfDomElement} from "../src/dom.ts";
import {curveTo, moveTo, parsePath} from "./svg_path.ts";
import {Arrow, drawNewArrow, drawNewArrowToBox, svgDefinitions} from "../src/arrows.ts";
import "../styles.css";

describe("Arrows", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        document.body.append(svgDefinitions());
    });

    describe("to points", () => {
        test("draws arrows from point to point when the end point is 'greater' than the start", () => {
            const arrow = drawNewArrow(point(100, 100), point(200, 200), point(-3, -4));
            document.body.append(arrow.svgElement());

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(100, 100));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(0, 0)), curveTo(point(50, 0), point(40, 20), point(100, 100))
            ]);
        });

        test("draws arrows from point to point when the end point is 'smaller' than the start", () => {
            const arrow = drawNewArrow(point(200, 200), point(100, 100), point(3, -4));
            document.body.append(arrow.svgElement());

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(100, 100));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(100, 100)), curveTo(point(110, 100), point(60, -80), point(0, 0))
            ]);
        });

        test("updates arrow start", () => {
            const arrow = drawNewArrow(point(0, 0), point(200, 200), point(-3, -4));
            document.body.append(arrow.svgElement());

            arrow.updateStart(point(100, 100));

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(100, 100));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(0, 0)), curveTo(point(50, 0), point(40, 20), point(100, 100))
            ]);
        });

        test("updates arrow end", () => {
            const arrow = drawNewArrow(point(100, 100), point(10, 10), point(1, 2));
            document.body.append(arrow.svgElement());

            arrow.updateEndToPoint(point(200, 200), point(-3, -4));

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(100, 100));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(0, 0)), curveTo(point(50, 0), point(40, 20), point(100, 100))
            ]);
        });

        test("updates arrow from box to point", () => {
            const box = createBox(point(50, 50), point(10, 10));
            const arrow = drawNewArrowToBox(point(0, 0), boundingPageBoxOf(box));
            document.body.append(arrow.svgElement());

            arrow.updateEndToPoint(point(100, 100), point(3, -4));
            arrow.updateStart(point(200, 200));

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(100, 100));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(100, 100)), curveTo(point(110, 100), point(60, -80), point(0, 0))
            ]);
        });
    });

    describe("to boxes", () => {
        test("draws arrows to top-left corner of boxes", () => {
            const box = createBox(point(150, 100), point(100, 50));
            const arrow = drawNewArrowToBox(point(30, 40), boundingPageBoxOf(box));
            document.body.append(arrow.svgElement());

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(30, 40));
            expect(sizeOfDomElement(arrow.svgElement())).toEqual(point(120, 60));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(0, 0)), curveTo(point(60, 0), point(12.67, 33.17), point(120, 60))
            ]);
        });

        test("draws arrows to top-right corner of boxes", () => {
            const box = createBox(point(150, 100), point(100, 50));
            const arrow = drawNewArrowToBox(point(370, 40), boundingPageBoxOf(box));
            document.body.append(arrow.svgElement());

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(250, 40));
            expect(sizeOfDomElement(arrow.svgElement())).toEqual(point(120, 60));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(120, 0)), curveTo(point(130, 0), point(107.33, 33.17), point(0, 60))
            ]);
        });

        test("draws arrows to bottom-right corner of boxes", () => {
            const box = createBox(point(150, 100), point(100, 50));
            const arrow = drawNewArrowToBox(point(370, 210), boundingPageBoxOf(box));
            document.body.append(arrow.svgElement());

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(250, 150));
            expect(sizeOfDomElement(arrow.svgElement())).toEqual(point(120, 60));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(120, 60)), curveTo(point(130, 60), point(107.33, 26.83), point(0, 0))
            ]);
        });

        test("draws arrows to bottom-left corner of boxes", () => {
            const box = createBox(point(150, 100), point(100, 50));
            const arrow = drawNewArrowToBox(point(30, 210), boundingPageBoxOf(box));
            document.body.append(arrow.svgElement());

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(30, 150));
            expect(sizeOfDomElement(arrow.svgElement())).toEqual(point(120, 60));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(0, 60)), curveTo(point(60, 60), point(12.67, 26.83), point(120, 0))
            ]);
        });

        test("draws arrows to top of boxes", () => {
            const box = createBox(point(150, 100), point(100, 50));
            const arrow = drawNewArrowToBox(point(200, 100 - 90), boundingPageBoxOf(box));
            document.body.append(arrow.svgElement());

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(200, 10));
            expect(sizeOfDomElement(arrow.svgElement())).toEqual(point(1, 90));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(0, 0)), curveTo(point(10, 0), point(0, 0), point(0, 90))
            ]);
        });

        test("draws arrows to right of boxes", () => {
            const box = createBox(point(150, 100), point(100, 50));
            const arrow = drawNewArrowToBox(point(250 + 90, 125), boundingPageBoxOf(box));
            document.body.append(arrow.svgElement());

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(250, 125));
            expect(sizeOfDomElement(arrow.svgElement())).toEqual(point(90, 1));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(90, 0)), curveTo(point(100, 0), point(90, 0), point(0, 0))
            ]);
        });

        test("draws arrows to bottom of boxes", () => {
            const box = createBox(point(150, 100), point(100, 50));
            const arrow = drawNewArrowToBox(point(200, 150 + 90), boundingPageBoxOf(box));
            document.body.append(arrow.svgElement());

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(200, 150));
            expect(sizeOfDomElement(arrow.svgElement())).toEqual(point(1, 90));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(0, 90)), curveTo(point(10, 90), point(0, 90), point(0, 0))
            ]);
        });

        test("draws arrows to left of boxes", () => {
            const box = createBox(point(150, 100), point(100, 50));
            const arrow = drawNewArrowToBox(point(150 - 90, 125), boundingPageBoxOf(box));
            document.body.append(arrow.svgElement());

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(60, 125));
            expect(sizeOfDomElement(arrow.svgElement())).toEqual(point(90, 1));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(0, 0)), curveTo(point(45, 0), point(0, 0), point(90, 0))
            ]);
        });

        test("updates arrow start", () => {
            const box = createBox(point(150, 100), point(100, 50));
            const arrow = drawNewArrowToBox(point(0, 0), boundingPageBoxOf(box));
            document.body.append(arrow.svgElement());

            arrow.updateStart(point(150 - 90, 125));

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(60, 125));
            expect(sizeOfDomElement(arrow.svgElement())).toEqual(point(90, 1));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(0, 0)), curveTo(point(45, 0), point(0, 0), point(90, 0))
            ]);
        });

        test("updates arrow end", () => {
            const box = createBox(point(150, 100), point(100, 50));
            const arrow = drawNewArrow(point(150 - 90, 125), point(10, 10));
            document.body.append(arrow.svgElement());

            arrow.attachEndToBox(boundingPageBoxOf(box));

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(60, 125));
            expect(sizeOfDomElement(arrow.svgElement())).toEqual(point(90, 1));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(0, 0)), curveTo(point(45, 0), point(0, 0), point(90, 0))
            ]);
        });

        test("updates arrow start after updating arrow end", () => {
            const box = createBox(point(150, 100), point(100, 50));
            const arrow = drawNewArrow(point(0, 0), point(10, 10));
            document.body.append(arrow.svgElement());

            arrow.attachEndToBox(boundingPageBoxOf(box));
            arrow.updateStart(point(150 - 90, 125));

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(60, 125));
            expect(sizeOfDomElement(arrow.svgElement())).toEqual(point(90, 1));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(0, 0)), curveTo(point(45, 0), point(0, 0), point(90, 0))
            ]);
        });

        test("the box location is correct even if the document is scrolled", () => {
            scrollToBottomOfDocument();
            const box = createBox(point(150, 100), point(100, 50));
            const arrow = drawNewArrowToBox(point(200, 100 - 90), boundingPageBoxOf(box));
            document.body.append(arrow.svgElement());

            expect(positionOfDomElement(arrow.svgElement())).toEqual(point(200, 10));
            expect(sizeOfDomElement(arrow.svgElement())).toEqual(point(1, 90));
            expect(drawnPath(arrow)).toEqual([
                moveTo(point(0, 0)), curveTo(point(10, 0), point(0, 0), point(0, 90))
            ]);
        });

        function scrollToBottomOfDocument() {
            const longDiv = createElement("div", {style: {height: "200vh "}});
            const bottomDiv = createElement("div");
            document.body.append(longDiv, bottomDiv);
            bottomDiv.scrollIntoView(false);
        }
    });

    function createBox(position: Position, size: Position) {
        const box = createElement("div", {
            style: {
                backgroundColor: "blue",
                position: "absolute",
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.x}px`,
                height: `${size.y}px`,
            }
        });

        document.body.append(box);

        return box;
    }

    function drawnPath(arrow: Arrow) {
        const pathElements = arrow.svgElement().getElementsByTagName("path");
        expect(pathElements.length).toEqual(1);

        return parsePath(pathElements[0].getAttribute("d") ?? "");
    }
});

