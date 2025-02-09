import {point, Position} from "./position.ts";
import {InspectableObject, ObjectOutliner} from "./objectOutliner.ts";
import {Outliner} from "./outliner.ts";
import {Primitive, PrimitiveOutliner} from "./primitiveOutliner.ts";
import {Selector, Slot} from "./slot.ts";
import {createElement} from "./dom.ts";
import {Association} from "./association.ts";

export class World {
    private readonly _domElement: HTMLDivElement = createElement('div', { className: "world" });
    private readonly _outliners: Map<unknown, Outliner> = new Map();

    domElement() {
        return this._domElement;
    }

    openOutliner(anObject: unknown, position: Position = point(0, 0)) {
        if (this.hasOutlinerFor(anObject)) {
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

    closeOutliner(anOutliner: Outliner) {
        this._outliners.delete(anOutliner.inspectedValue());
        anOutliner.remove();
    }

    openOutlinerForAssociation(slotToInspect: Slot, ownerOutliner: Outliner, position: Position) {
        if (ownerOutliner.hasVisibleAssociationFor(slotToInspect)) return;

        try {
            const valueOutliner = this.openOutliner(slotToInspect.currentValue(), position);
            new Association(slotToInspect, ownerOutliner, valueOutliner, this);
        } catch (error) {
            this.openOutliner(error, position.plus(point(20, 20)));
        }
    }

    associationFor(anObject: InspectableObject, propertyName: Selector): Association | undefined {
        const outliner = this._outliners.get(anObject);

        if (outliner instanceof ObjectOutliner) {
            return outliner.associationFor(propertyName);
        }
    }

    hasOutlinerFor(anObject: unknown) {
        return this._outliners.has(anObject);
    }
}
