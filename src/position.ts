export class Position {
    constructor(
        public readonly x: number,
        public readonly y: number
    ) {}

    deltaToReach(anotherPosition: Position) {
        return anotherPosition.minus(this);
    }

    plus(anotherPosition: Position) {
        return point(
            anotherPosition.x + this.x,
            anotherPosition.y + this.y,
        );
    }

    minus(anotherPosition: Position) {
        return point(
            this.x - anotherPosition.x,
            this.y - anotherPosition.y,
        );
    }

    map(transformation: (coordinate: number) => number) {
        return point(
            transformation(this.x),
            transformation(this.y),
        );
    }
}

export function point(x: number, y: number) {
    return new Position(x, y);
}

export function sumOf(...positions: Position[]): Position {
    let sum = point(0, 0);

    for (const position of positions) {
        sum = sum.plus(position);
    }

    return sum;
}
