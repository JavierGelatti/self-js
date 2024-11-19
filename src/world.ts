import {point, Position} from "./position.ts";
import {Outliner} from "./outliner.ts";

export class World {
    private _domElement: HTMLDivElement = document.createElement('div');
    private _outliners: Map<unknown, Outliner> = new Map();

    domElement() {
        return this._domElement;
    }

    openOutliner(anObject: Record<string, unknown>, position: Position = point(0, 0)) {
        if (this._outliners.has(anObject)) return;

        const outliner = new Outliner(anObject, position);

        this._domElement.appendChild(outliner.domElement());
        this._outliners.set(anObject, outliner);
    }
}
