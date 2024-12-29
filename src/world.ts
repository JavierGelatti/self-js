import {point, Position} from "./position.ts";
import {InspectableObject, ObjectOutliner} from "./objectOutliner.ts";
import {Outliner} from "./outliner.ts";
import {Primitive, PrimitiveOutliner} from "./primitiveOutliner.ts";
import {Property} from "./property.ts";
import {createElement, positionOfDomElement} from "./dom.ts";

export class World {
    private _domElement: HTMLDivElement = createElement('div', { className: "world" });
    private _outliners: Map<unknown, Outliner<unknown>> = new Map();

    domElement() {
        return this._domElement;
    }

    openOutliner(anObject: unknown, position: Position = point(0, 0)) {
        if (this._outliners.has(anObject)) {
            const existingOutliner = this._outliners.get(anObject)!;
            existingOutliner.shake();
            return existingOutliner;
        }

        const outliner = this._createOutlinerFor(anObject, position);

        this._domElement.appendChild(outliner.domElement());
        this._outliners.set(anObject, outliner);

        return outliner;
    }

    private _createOutlinerFor(anObject: unknown, position: Position) {
        if ((typeof anObject === "object" && anObject !== null) || typeof anObject === "function") {
            return new ObjectOutliner(anObject as InspectableObject, position, this);
        } else {
            return new PrimitiveOutliner(anObject as Primitive, position, this);
        }
    }

    updateOutliners() {
        this._outliners.forEach(outliner => outliner.update());
    }

    closeOutliner(anOutliner: Outliner<unknown>) {
        this._domElement.removeChild(anOutliner.domElement());
        this._outliners.delete(anOutliner.inspectedValue());
    }

    openOutlinerForAssociation(propertyToInspect: Property) {
        const ownerOutliner = this._outliners.get(propertyToInspect.owner())!;
        const currentPosition = positionOfDomElement(propertyToInspect.associationElement());
        const valueOutliner = this.openOutliner(
            propertyToInspect.currentValue(),
            currentPosition.plus(point(50, 0))
        );

    }
}
