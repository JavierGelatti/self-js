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

export function sumOf(...positions: Position[]): Position {
    let sum = point(0, 0);

    for (const position of positions) {
        sum = point(sum[0] + position[0], sum[1] + position[1]);
    }

    return sum;
}