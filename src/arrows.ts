import {point, Position} from "./position.ts";
import {createSvgElement} from "./dom.ts";

export class Arrow {
    private _from: Position;
    private _to: Position;
    private _endControl: Position;
    private _endBox?: DOMRect;
    private readonly _svgElement: SVGSVGElement;
    private _svgPath!: SVGPathElement;

    constructor(from: Position, to: DOMRect)
    constructor(from: Position, to: Position, endControl?: Position)
    constructor(from: Position, to: Position | DOMRect, endControl?: Position) {
        this._from = from;

        if (to instanceof Position) {
            this._to = to;
            this._endControl = endControl ?? this.defaultEndControlFor(to);
        } else {
            this._endBox = to;
            const [endPoint, endControl] = this.endPointTargetingBox(this._endBox);

            this._to = endPoint;
            this._endControl = endControl;
        }

        this._svgElement = this.createSvgElement();
        this.updatePath();
    }

    svgElement() {
        return this._svgElement;
    }

    updateStart(newStart: Position) {
        this._from = newStart;
        if (this._endBox) {
            this.updateEndToBox(this._endBox);
        }

        this.updatePath();
    }

    private createSvgElement() {
        const svgElement = createSvgElement("svg");
        svgElement.style.position = "absolute";
        svgElement.style.top = "0";
        svgElement.style.left = "0";
        svgElement.style.overflow = "visible";

        const svgPath = createSvgElement("path", {
            pathLength: 100
        });
        svgPath.classList.add("arrow");
        svgElement.append(svgPath);
        this._svgPath = svgPath;

        return svgElement;
    }

    private updatePath() {
        const normalizedEndControl = this._endControl.normalized();
        const boundStart = this._from.min(this._to);
        const boundEnd = this._from.max(this._to);
        const boundExtent = boundStart.deltaToReach(boundEnd);

        const relativeFrom = boundStart.deltaToReach(this._from);
        const relativeTo = boundStart.deltaToReach(this._to);

        const p1 = relativeFrom;
        const c1 = relativeFrom.plus(point(this._from.x < this._to.x ? Math.max(10, boundExtent.x / 2) : 10, 0));
        const c2 = relativeTo.plus(normalizedEndControl.dot(boundExtent)).map(n => +n.toFixed(2));
        const p2 = relativeTo;

        this._svgPath.setAttribute("d", `M ${p1.x},${p1.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`);
        this._svgElement.style.translate = `${boundStart.x}px ${boundStart.y}px`;
        this._svgElement.setAttribute("width", String(Math.max(1, boundExtent.x)));
        this._svgElement.setAttribute("height", String(Math.max(1, boundExtent.y)));
    }

    updateEndToPoint(newEnd: Position, newEndControl: Position = this.defaultEndControlFor(newEnd)) {
        this._to = newEnd;
        this._endControl = newEndControl;
        this._endBox = undefined;
        this.updatePath();
    }

    private defaultEndControlFor(endPosition: Position) {
        return endPosition.deltaToReach(this._from);
    }

    attachEndToBox(endBox: DOMRect) {
        this._endBox = endBox;
        this.updateEndToBox(this._endBox);
    }

    private updateEndToBox(endBox: DOMRect) {
        const [endPoint, endControlPoint] = this.endPointTargetingBox(endBox);

        this.updateEndToPoint(endPoint, endControlPoint);
    }

    private endPointTargetingBox(endBox: DOMRect) {
        const endCenter = point(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2);

        const aspectRatio = endBox.height / endBox.width;
        const diagonal1 = (x: number) => +aspectRatio * (x - endBox.x) + endBox.y;
        const diagonal2 = (x: number) => -aspectRatio * (x - endBox.x) + endBox.y + endBox.height;

        const aboveDiagonal1 = diagonal1(this._from.x) > this._from.y;
        const aboveDiagonal2 = diagonal2(this._from.x) > this._from.y;

        let endPoint;
        let endControlPoint = endCenter.deltaToReach(this._from);
        if (aboveDiagonal1 && aboveDiagonal2) {
            // Top
            endPoint = pointInLineAtY(this._from, endCenter, endBox.top);
        } else if (!aboveDiagonal1 && aboveDiagonal2) {
            // Left
            endPoint = pointInLineAtX(this._from, endCenter, endBox.left);
        } else if (aboveDiagonal1) {
            // Right
            endPoint = pointInLineAtX(this._from, endCenter, endBox.right);
        } else {
            // Bottom
            endPoint = pointInLineAtY(this._from, endCenter, endBox.bottom);
        }
        return [endPoint, endControlPoint];
    }
}

function pointInLineAtX(p1: Position, p2: Position, x: number) {
    const delta = p1.deltaToReach(p2);
    const slope = delta.y/delta.x;

    return point(x, -slope * (p2.x - x) + p2.y);
}

function pointInLineAtY(p1: Position, p2: Position, y: number) {
    const delta = p1.deltaToReach(p2);
    const slope = delta.y/delta.x;

    return point(-1/slope * (p2.y - y) + p2.x, y);
}

export function drawNewArrow(from: Position, to: Position, endControl?: Position) {
    return new Arrow(from, to, endControl);
}

export function drawNewArrowToBox(from: Position, to: DOMRect) {
    return new Arrow(from, to);
}

export function svgDefinitions() {
    const svgElement = createSvgElement("svg");
    svgElement.innerHTML = `
        <defs>
            <marker
                id="arrow-end"
                refX="10" refY="5"
                markerUnits="strokeWidth"
                markerWidth="10"
                markerHeight="10"
                orient="auto">
              <path d="M 0,0 L 10,5 L 0,10 z" fill="#f00"></path>
            </marker>
        </defs>
    `;

    return svgElement;
}