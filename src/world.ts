import {point, Position} from "./position.ts";
import {Outliner} from "./outliner.ts";

export class World {
    private _domElement: HTMLDivElement = document.createElement('div');
    private _outliners: Map<unknown, Outliner> = new Map();

    domElement() {
        return this._domElement;
    }

    openOutliner(anObject: Record<string, unknown>, position: Position = point(0, 0)) {
        if (this._outliners.has(anObject)) return this._outliners.get(anObject)!;

        const outliner = new Outliner(anObject, position, this);

        this._domElement.appendChild(outliner.domElement());
        this._outliners.set(anObject, outliner);

        return outliner;
    }

    updateOutliners() {
        this._outliners.forEach(outliner => outliner.update());
    }

    closeOutliner(anOutliner: Outliner) {
        this._domElement.removeChild(anOutliner.domElement());
        this._outliners.delete(anOutliner.inspectedObject());
    }
}
