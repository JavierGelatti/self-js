import {Property} from "./property.ts";
import {Outliner} from "./outliner.ts";
import {Arrow, drawNewArrowToBox} from "./arrows.ts";
import {ObjectOutliner} from "./objectOutliner.ts";
import {boundingPageBoxOf} from "./dom.ts";

export class Association {
    private _property: Property;
    private _ownerOutliner: ObjectOutliner;
    private _valueOutliner: Outliner<unknown>;
    private readonly _arrow: Arrow;

    constructor(property: Property, ownerOutliner: ObjectOutliner, valueOutliner: Outliner<unknown>) {
        this._property = property;
        this._ownerOutliner = ownerOutliner;
        this._valueOutliner = valueOutliner;
        this._arrow = drawNewArrowToBox(this._arrowStartPosition(), this._arrowEndBox());
    }

    arrow() {
        return this._arrow;
    }

    update() {
        this._arrow.updateStart(this._arrowStartPosition());
        this._arrow.attachEndToBox(this._arrowEndBox());
    }

    private _arrowStartPosition() {
        return boundingPageBoxOf(this._property.associationElement()).center();
    }

    private _arrowEndBox() {
        return boundingPageBoxOf(this._valueOutliner.domElement());
    }

    domElement(): Element {
        return this._arrow.svgElement();
    }

    remove() {
        this.domElement().remove();
        this._ownerOutliner.removeAssociationStart(this);
        this._valueOutliner.removeAssociationEnd(this);
    }

    selector() {
        return this._property.name();
    }
}