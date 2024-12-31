import {Property} from "./property.ts";
import {Outliner} from "./outliner.ts";
import {Arrow, drawNewArrowToBox} from "./arrows.ts";
import {ObjectOutliner} from "./objectOutliner.ts";
import {boundingPageBoxOf} from "./dom.ts";
import {World} from "./world.ts";

export class Association {
    private readonly _property: Property;
    private readonly _ownerOutliner: ObjectOutliner;
    private _valueOutliner: Outliner<unknown>;
    private readonly _arrow: Arrow;
    private readonly _world: World;

    constructor(property: Property, ownerOutliner: ObjectOutliner, valueOutliner: Outliner<unknown>, world: World) {
        this._property = property;
        this._ownerOutliner = ownerOutliner;
        this._valueOutliner = valueOutliner;
        this._world = world;
        this._arrow = drawNewArrowToBox(this._arrowStartPosition(), this._arrowEndBox());
        this._updateArrowMode();
    }

    arrow() {
        return this._arrow;
    }

    updatePosition() {
        this._arrow.updateStart(this._arrowStartPosition());
        this._arrow.attachEndToBox(this._arrowEndBox());
        this._updateArrowMode();
    }

    private _updateArrowMode() {
        const ownerOutlinerElement = this._ownerOutliner.domElement();
        const valueOutlinerElement = this._valueOutliner.domElement();
        const arrowClassList = this._arrow.svgElement().classList;
        arrowClassList.remove("arrow-faded", "arrow-hidden");
        if (ownerOutlinerElement.compareDocumentPosition(valueOutlinerElement) === Node.DOCUMENT_POSITION_FOLLOWING) {
            arrowClassList.toggle(
                "arrow-hidden",
                boundingPageBoxOf(valueOutlinerElement).contains(this._arrow.start()),
            );
        } else {
            arrowClassList.toggle(
                "arrow-faded",
                boundingPageBoxOf(ownerOutlinerElement).contains(this._arrow.endPosition()),
            );
        }
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

    update() {
        const propertyValue = this._property.currentValue();

        if (this._targetValueAlreadyIs(propertyValue)) return;

        if (this._world.hasOutlinerFor(propertyValue)) {
            this._redirectTo(this._world.openOutliner(propertyValue));
            this.updatePosition();
        } else {
            this.remove();
        }
    }

    private _redirectTo(newTarget: Outliner<unknown>) {
        this._valueOutliner.removeAssociationEnd(this);
        this._valueOutliner = newTarget;
        this._valueOutliner.registerAssociationEnd(this);
    }

    private _targetValueAlreadyIs(propertyValue: unknown) {
        return this._valueOutliner.inspectedValue() === propertyValue;
    }
}