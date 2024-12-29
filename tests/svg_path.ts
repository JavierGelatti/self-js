import {point, Position} from "../src/position.ts";

type SvgPathInstruction = MoveTo | AbsoluteCubicBezier;

class MoveTo {
    constructor(
        public position: Position,
    ) {}
}

class AbsoluteCubicBezier {
    constructor(
        public startControlPoint: Position,
        public endControlPoint: Position,
        public endPosition: Position,
    ) {}
}

export function parsePath(svgPath: string): SvgPathInstruction[] {
    const normalizedSvgPath = svgPath
        .replaceAll(/,/g, " ")
        .replaceAll(/ +/g, " ")
        .trim();

    if (normalizedSvgPath.length === 0) return [];

    const instructionRegex = /[a-zA-Z]( *-?\d*\.?\d+)*/g;
    return [...normalizedSvgPath.matchAll(instructionRegex)]
        .flatMap(regexMatch => parseInstruction(regexMatch[0]));
}

function parseInstruction(match: string): SvgPathInstruction[] {
    const identifier = match[0];
    const args = match.substring(1).trimStart().split(" ").map(c => Number(c));

    switch (identifier) {
        case "M":
            return takeBy(2, args)
                .map(([x, y]) => moveTo(point(x, y)));
        case "C":
            return takeBy(6, args)
                .map(([x1, y1, x2, y2, x, y]) => curveTo(point(x1, y1), point(x2, y2), point(x, y)));
        default:
            throw new Error();
    }
}

function takeBy<E>(numberOfElements: number, list: E[]): E[][] {
    if (list.length === 0) return [];

    return [list.toSpliced(numberOfElements), ...takeBy(numberOfElements, list.toSpliced(0, numberOfElements))];
}

export function moveTo(point: Position) {
    return new MoveTo(point);
}

export function curveTo(startControl: Position, endControl: Position, end: Position) {
    return new AbsoluteCubicBezier(startControl, endControl, end);
}