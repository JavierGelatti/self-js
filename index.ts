import {World} from "./src/world";
import {Arrow, svgDefinitions} from "./src/arrows";
import {point} from "./src/position";

Arrow.linecapSize = 2;

const world = new World();

document.body.append(
    world.domElement(),
    svgDefinitions()
);

class Punto {
    private readonly _x: number;
    private readonly _y: number;

    constructor(x: number, y: number) {
        this._x = x;
        this._y = y;
    }

    x() {
        return this._x;
    }

    y() {
        return this._y;
    }

    mas(otroPunto: Punto) {
        return new Punto(this._x + otroPunto.x(), this._y + otroPunto.y());
    }
}

type Executor<T> = {
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: any) => void
    promise?: Promise<T>
};

// @ts-ignore
window.createPromise = function () {
    let executor!: Executor<unknown>;
    // noinspection UnnecessaryLocalVariableJS
    const promise: Promise<unknown> = new Promise((resolve, reject) => {
        executor = { resolve, reject };
    });
    executor.promise = promise;
    return executor;
}

world.openOutliner(new Punto(1, 2), point(10, 10));
