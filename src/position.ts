export type Position = [number, number] & { __positionBrand__: any };

export function point(x: number, y: number) {
    return [x, y] as Position;
}

export function deltaBetween(startPosition: Position, endPosition: Position): Position {
    return point(
        endPosition[0] - startPosition[0],
        endPosition[1] - startPosition[1],
    );
}

export function sumOf(position1: Position, position2: Position): Position {
    return point(
        position2[0] + position1[0],
        position2[1] + position1[1],
    );
}