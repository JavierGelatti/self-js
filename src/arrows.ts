import {point, Position} from "./position.ts";
import {createSvgElement, PageBox} from "./dom.ts";

export class Arrow {
    // We use this to reduce the end of the arrow so that the linecap can occupy that space
    public static linecapSize: number = 0;

    private _start: Position;
    private _end: Position;
    private _normalizedEndControl: Position;
    private _endBox?: PageBox;
    private readonly _svgElement: SVGSVGElement;
    private _svgPath!: SVGPathElement;

    constructor(from: Position, to: PageBox)
    constructor(from: Position, to: Position, endControl?: Position)
    constructor(from: Position, to: Position | PageBox, endControl?: Position) {
        this._start = from;

        if (to instanceof Position) {
            this._end = to;
            this._normalizedEndControl = endControl?.normalized() ?? this._defaultEndControlFor(to);
        } else {
            this._endBox = to;
            this._end = this._endPointTargetingBox(this._endBox);
            this._normalizedEndControl = this._endControlPointTargetingBox(this._endBox);
        }

        this._svgElement = this._createSvgElement();
        this._updatePath();
    }

    svgElement() {
        return this._svgElement;
    }

    updateStart(newStart: Position) {
        this._start = newStart;
        if (this._endBox) {
            this._updateBoxEnd(this._endBox);
        }

        this._updatePath();
    }

    private _createSvgElement() {
        const svgElement = createSvgElement("svg");
        svgElement.style.position = "absolute";
        svgElement.style.top = "0";
        svgElement.style.left = "0";
        svgElement.style.overflow = "visible";

        const svgPath = createSvgElement("path");
        svgPath.classList.add("arrow");
        svgElement.append(svgPath);
        this._svgPath = svgPath;

        return svgElement;
    }

    private _updatePath() {
        const boundStart = this._start.min(this._end);
        const boundEnd = this._start.max(this._end);
        const boundExtent = boundStart.deltaToReach(boundEnd);

        const relativeFrom = boundStart.deltaToReach(this._start);
        const relativeTo = boundStart.deltaToReach(this._end);

        const p1 = relativeFrom;
        const c1 = relativeFrom.plus(point(this._start.x < this._end.x ? Math.max(10, boundExtent.x / 2) : 10, 0));
        const c2 = relativeTo.plus(this._normalizedEndControl.dot(boundExtent)).map(n => +n.toFixed(2));
        const p2 = relativeTo.plus(this._normalizedEndControl.map(n => n * Arrow.linecapSize));

        this._svgPath.setAttribute("d", `M ${p1.x},${p1.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`);
        this._svgElement.style.translate = `${boundStart.x}px ${boundStart.y}px`;
        this._svgElement.setAttribute("width", String(Math.max(1, boundExtent.x)));
        this._svgElement.setAttribute("height", String(Math.max(1, boundExtent.y)));
    }

    updateEndToPoint(newEnd: Position, newEndControl: Position = this._defaultEndControlFor(newEnd)) {
        this._end = newEnd;
        this._normalizedEndControl = newEndControl.normalized();
        this._endBox = undefined;
        this._updatePath();
    }

    private _defaultEndControlFor(endPosition: Position) {
        return endPosition.deltaToReach(this._start).normalized();
    }

    attachEndToBox(endBox: PageBox) {
        this._endBox = endBox;
        this._updateBoxEnd(this._endBox);
    }

    private _updateBoxEnd(endBox: PageBox) {
        this._end = this._endPointTargetingBox(endBox);
        this._normalizedEndControl = this._endControlPointTargetingBox(endBox);
        this._updatePath();
    }

    private _endControlPointTargetingBox(targetBox: PageBox) {
        return targetBox.center().deltaToReach(this._start).normalized();
    }

    private _endPointTargetingBox(targetBox: PageBox) {
        const lineToTargetCenter = new Line(this._start, targetBox.center());

        const diagonal1 = new Line(
            point(targetBox.left, targetBox.top),
            point(targetBox.right, targetBox.bottom)
        );
        const diagonal2 = new Line(
            point(targetBox.right, targetBox.top),
            point(targetBox.left, targetBox.bottom)
        );

        const startIsAboveDiagonal1 = diagonal1.isBelow(this._start);
        const startIsAboveDiagonal2 = diagonal2.isBelow(this._start);

        if (startIsAboveDiagonal1 && startIsAboveDiagonal2) {
            return lineToTargetCenter.pointAtY(targetBox.top);
        } else if (startIsAboveDiagonal1 && !startIsAboveDiagonal2) {
            return lineToTargetCenter.pointAtX(targetBox.right);
        } else if (startIsAboveDiagonal2) {
            return lineToTargetCenter.pointAtX(targetBox.left);
        } else {
            return lineToTargetCenter.pointAtY(targetBox.bottom);
        }
    }

    start() {
        return this._start;
    }

    end(): PageBox | Position {
        return this._endBox ?? this._end;
    }

    endPosition() {
        return this._end;
    }

    endControl() {
        return this._normalizedEndControl;
    }
}

class Line {
    private readonly _point: Position;
    private readonly _slope: number;

    constructor(p1: Position, p2: Position) {
        this._point = p1;

        const delta = p1.deltaToReach(p2);
        this._slope = delta.y/delta.x;
    }

    pointAtX(x: number) {
        return point(x, this.yFor(x));
    }

    pointAtY(y: number) {
        return point(this.xFor(y), y);
    }

    yFor(x: number) {
        return this._slope * (x - this._point.x) + this._point.y
    }

    xFor(y: number) {
        return 1 / this._slope * (y - this._point.y) + this._point.x;
    }

    isBelow(point: Position) {
        return this.yFor(point.x) > point.y;
    }
}

export function drawNewArrow(from: Position, to: Position, endControl?: Position) {
    return new Arrow(from, to, endControl);
}

export function drawNewArrowToBox(from: Position, to: PageBox) {
    return new Arrow(from, to);
}

export function svgDefinitions() {
    const svgElement = createSvgElement("svg");
    svgElement.innerHTML = `
        <defs>
            <marker id="arrow-start" refX="1.5" refY="1.5" markerWidth="10" markerHeight="10">
                <circle cx="1.5" cy="1.5" r="1.5"></circle>
            </marker>
            <marker id="arrow-end" refX="3" refY="3" markerWidth="3.5" markerHeight="10" orient="auto">
                <path d="M 1,1 L 3,3 L 1,5"></path>
            </marker>
        </defs>
    `;

    return svgElement;
}