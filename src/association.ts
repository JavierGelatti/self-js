import {Property, Selector} from "./property.ts";
import {Outliner} from "./outliner.ts";
import {Arrow, drawNewArrowToBox} from "./arrows.ts";
import {InspectableObject} from "./objectOutliner.ts";
import {centerOf} from "./dom.ts";

export class Association {
    private _property: Property;
    private _ownerOutliner: Outliner<unknown>;
    private _valueOutliner: Outliner<unknown>;
    private readonly _arrow: Arrow;

    constructor(property: Property, ownerOutliner: Outliner<unknown>, valueOutliner: Outliner<unknown>) {
        this._property = property;
        this._ownerOutliner = ownerOutliner;
        this._valueOutliner = valueOutliner;
        this._arrow = drawNewArrowToBox(this._arrowStartPosition(), this._arrowEndBox());
    }

    isFor(anObject: InspectableObject, propertyName: Selector) {
        return this._ownerOutliner.inspectedValue() === anObject && this._property.isNamed(propertyName);
    }

    arrow() {
        return this._arrow;
    }

    updateArrowStart() {
        this._arrow.updateStart(this._arrowStartPosition());
    }

    private _arrowStartPosition() {
        return centerOf(this._property.associationElement().getBoundingClientRect());
    }

    updateArrowEnd() {
        this._arrow.attachEndToBox(this._arrowEndBox());
    }

    private _arrowEndBox() {
        return this._valueOutliner.domElement().getBoundingClientRect();
    }

    domElement(): Element {
        return this._arrow.svgElement();
    }
}