import {Property} from "./property.ts";
import {Outliner} from "./outliner.ts";
import {Arrow, drawNewArrowToBox} from "./arrows.ts";
import {ObjectOutliner} from "./objectOutliner.ts";
import {boundingPageBoxOf, createElement, makeDraggable} from "./dom.ts";
import {World} from "./world.ts";

export class Association {
    private readonly _property: Property;
    private readonly _ownerOutliner: ObjectOutliner;
    private _valueOutliner: Outliner<unknown>;
    private readonly _arrow: Arrow;
    private readonly _world: World;
    private readonly _domElement: Element;
    private _arrowEndArea!: HTMLDivElement;

    constructor(property: Property, ownerOutliner: ObjectOutliner, valueOutliner: Outliner<unknown>, world: World) {
        this._property = property;
        this._ownerOutliner = ownerOutliner;
        this._valueOutliner = valueOutliner;
        this._world = world;
        this._arrow = drawNewArrowToBox(this._arrowStartPosition(), this._arrowEndBox());
        this._domElement = this._createDomElement();

        let currentTargetOutliner: Outliner<unknown> | undefined;
        makeDraggable(this._arrowEndArea, {
            onDrag: (cursorPosition, _delta) => {
                const targetOutlinerElement = document.elementsFromPoint(cursorPosition.x, cursorPosition.y)
                    .find(element => element.classList.contains("outliner"));

                if (targetOutlinerElement) {
                    const newTargetOutliner = Outliner.withDomElement(targetOutlinerElement)!;
                    if (newTargetOutliner === currentTargetOutliner) return;

                    currentTargetOutliner?.domElement()?.classList?.remove("hovered");
                    currentTargetOutliner = newTargetOutliner;
                    currentTargetOutliner.domElement().classList.add("hovered");
                    this._arrow.attachEndToBox(boundingPageBoxOf(targetOutlinerElement));
                } else {
                    currentTargetOutliner?.domElement()?.classList?.remove("hovered");
                    currentTargetOutliner = undefined;
                    this._arrow.updateEndToPoint(cursorPosition);
                }
                this._updateArrowDrawing();
            },
            onDrop: () => {
                if (currentTargetOutliner) {
                    this._property.assign(currentTargetOutliner.inspectedValue());
                    this._ownerOutliner.update();
                    currentTargetOutliner.domElement().classList.remove("hovered");
                    currentTargetOutliner = undefined;
                } else {
                    this.updatePosition();
                }
            },
            onCancel: () => {
                currentTargetOutliner?.domElement()?.classList?.remove("hovered");
                currentTargetOutliner = undefined;
                this.updatePosition();
            }
        });

        this._updateArrowDrawing();
    }

    arrow() {
        return this._arrow;
    }

    updatePosition() {
        this._arrow.updateStart(this._arrowStartPosition());
        this._arrow.attachEndToBox(this._arrowEndBox());
        this._updateArrowDrawing();
    }

    private _updateArrowDrawing() {
        this._updateArrowEndAreaPosition();
        this._updateArrowMode();
    }

    private _updateArrowEndAreaPosition() {
        const boundStart = this._arrow.endPosition().plus(this._arrow.endControl().times(10));
        this._arrowEndArea.style.translate = `${boundStart.x}px ${boundStart.y}px`;
    }

    private _updateArrowMode() {
        const ownerOutlinerElement = this._ownerOutliner.domElement();
        const valueOutlinerElement = this._valueOutliner.domElement();
        const arrowClassList = this._arrow.svgElement().classList;

        if (this._valueOutliner === this._ownerOutliner) return;
        if (ownerOutlinerElement.compareDocumentPosition(valueOutlinerElement) === Node.DOCUMENT_POSITION_FOLLOWING) {
            arrowClassList.remove("arrow-faded");
            arrowClassList.toggle(
                "arrow-hidden",
                boundingPageBoxOf(valueOutlinerElement).contains(this._arrow.start()),
            );
        } else {
            arrowClassList.remove("arrow-hidden");
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
        return this._domElement;
    }

    private _createDomElement() {
        return createElement("div", { className: "association" }, [
            this._arrow.svgElement(),
            this._arrowEndArea = createElement("div", { className: "arrow-end-area" }),
        ]);
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