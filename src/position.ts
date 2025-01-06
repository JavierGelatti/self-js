export class Position {
    constructor(
        public readonly x: number,
        public readonly y: number
    ) {}

    deltaToReach(anotherPosition: Position) {
        return anotherPosition.minus(this);
    }

    plus(anotherPosition: Position) {
        return this._zipWith(anotherPosition, (a, b) => a + b);
    }

    minus(anotherPosition: Position) {
        return this._zipWith(anotherPosition, (a, b) => a - b);
    }

    max(anotherPosition: Position) {
        return this._zipWith(anotherPosition, Math.max);
    }

    min(anotherPosition: Position) {
        return this._zipWith(anotherPosition, Math.min);
    }

    dot(anotherPosition: Position) {
        return this._zipWith(anotherPosition, (a, b) => a * b);
    }

    private _zipWith(anotherPosition: Position, combiner: (leftCoordinate: number, rightCoordinate: number) => number) {
        return point(
            combiner(this.x, anotherPosition.x),
            combiner(this.y, anotherPosition.y),
        )
    }

    map(transformation: (coordinate: number) => number) {
        return point(
            transformation(this.x),
            transformation(this.y),
        );
    }

    normalized() {
        const magnitude = this.magnitude();
        return this.map(coordinate => coordinate / magnitude);
    }

    magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }

    times(number: number) {
        return this.map(coordinate => coordinate * number);
    }

    equals(anotherPosition: Position) {
        return this.x === anotherPosition.x && this.y === anotherPosition.y;
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
