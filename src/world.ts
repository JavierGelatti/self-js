import {point, Position} from "./position.ts";
import {InspectableObject, ObjectOutliner} from "./objectOutliner.ts";
import {Outliner} from "./outliner.ts";
import {Primitive, PrimitiveOutliner} from "./primitiveOutliner.ts";
import {Property, Selector} from "./property.ts";
import {createElement, positionOfDomElement} from "./dom.ts";
import {Association} from "./association.ts";

export class World {
    private readonly _domElement: HTMLDivElement = createElement('div', { className: "world" });
    private readonly _outliners: Map<unknown, Outliner<unknown>> = new Map();
    private readonly _associations: Association[] = [];

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
        const associationsToRemove = [
            ...this.associationsFrom(anOutliner.inspectedValue()),
            ...this.associationsTo(anOutliner.inspectedValue())
        ];
        associationsToRemove.forEach(association => {
            this._associations.splice(this._associations.indexOf(association), 1);
            association.domElement().remove();
        });

        this._outliners.delete(anOutliner.inspectedValue());
        anOutliner.domElement().remove();
    }

    openOutlinerForAssociation(propertyToInspect: Property) {
        if (this._associationAlreadyVisibleFor(propertyToInspect)) return;

        const ownerOutliner = this._outliners.get(propertyToInspect.owner())!;
        const currentPosition = positionOfDomElement(propertyToInspect.associationElement());
        const valueOutliner = this.openOutliner(
            propertyToInspect.currentValue(),
            currentPosition.plus(point(50, 0))
        );

        const association = new Association(propertyToInspect, ownerOutliner, valueOutliner);
        this._domElement.append(association.domElement());
        this._associations.push(association);

        ownerOutliner.registerAssociationStart(association);
        valueOutliner.registerAssociationEnd(association);
    }

    private _associationAlreadyVisibleFor(propertyToInspect: Property) {
        return this._associations.some(association => association.isForProperty(propertyToInspect));
    }

    associationFor(anObject: InspectableObject, propertyName: Selector) {
        return this._associations.find(association => association.isFor(anObject, propertyName));
    }

    associationsFrom(anObject: unknown) {
        return this._associations.filter(association => association.isOwnedBy(anObject));
    }

    associationsTo(anObject: unknown) {
        return this._associations.filter(association => association.targetIs(anObject));
    }
}
