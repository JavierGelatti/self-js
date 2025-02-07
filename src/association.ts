import {Property} from "./property.ts";
import {Outliner} from "./outliner.ts";
import {Arrow, drawNewArrow, drawNewArrowToBox} from "./arrows.ts";
import {ObjectOutliner} from "./objectOutliner.ts";
import {boundingPageBoxOf, createElement, DragHandler, makeDraggable} from "./dom.ts";
import {World} from "./world.ts";
import {Position} from "./position.ts";

export class Association {
    private readonly _property: Property;
    private readonly _ownerOutliner: ObjectOutliner;
    private _valueOutliner: Outliner<unknown> | undefined;
    private readonly _arrow: Arrow;
    private readonly _world: World;
    private readonly _domElement: Element;
    private _arrowEndArea!: HTMLDivElement;

    constructor(property: Property, ownerOutliner: ObjectOutliner, valueOutliner: Outliner<unknown>, world: World)
    constructor(property: Property, ownerOutliner: ObjectOutliner, arrowEndPosition: Position, world: World)
    constructor(property: Property, ownerOutliner: ObjectOutliner, valueOutlinerOrArrowEndPosition: Outliner<unknown> | Position, world: World) {
        this._property = property;
        this._ownerOutliner = ownerOutliner;
        this._world = world;

        if (valueOutlinerOrArrowEndPosition instanceof Position) {
            const arrowEndPosition = valueOutlinerOrArrowEndPosition;
            this._arrow = drawNewArrow(this._arrowStartPosition(), arrowEndPosition);
        } else {
            this._valueOutliner = valueOutlinerOrArrowEndPosition;
            this._arrow = drawNewArrowToBox(this._arrowStartPosition(), boundingPageBoxOf(this._valueOutliner.domElement()));
        }

        this._domElement = this._createDomElement();

        makeDraggable(this._arrowEndArea, () => this.dragHandler());

        this._updateArrowDrawing(this._valueOutliner);
    }

    dragHandler(): DragHandler {
        let currentTargetOutliner: Outliner<unknown> | undefined;
        return {
            grabbedElement: this._arrowEndArea,
            onDrag: (cursorPosition: Position, _delta: Position) => {
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
                this._updateArrowDrawing(currentTargetOutliner);
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
            },
        };
    }

    arrow() {
        return this._arrow;
    }

    updatePosition() {
        if (this._valueOutliner === undefined) return this.remove();

        this._arrow.updateStart(this._arrowStartPosition());
        this._arrow.attachEndToBox(
            boundingPageBoxOf(this._valueOutliner.domElement())
        );
        this._updateArrowDrawing(this._valueOutliner);
    }

    private _updateArrowDrawing(targetOutliner: Outliner<unknown> | undefined) {
        this._updateArrowEndAreaPosition();
        this._updateArrowModeTargeting(targetOutliner);
    }

    private _updateArrowEndAreaPosition() {
        const boundStart = this._arrow.endPosition().plus(this._arrow.endControl().times(10));
        this._arrowEndArea.style.translate = `${boundStart.x}px ${boundStart.y}px`;
    }

    private _updateArrowModeTargeting(targetOutliner: Outliner<unknown> | undefined) {
        const arrowClassList = this._arrow.svgElement().classList;

        if (targetOutliner === undefined) {
            arrowClassList.remove("arrow-faded", "arrow-hidden");
            return;
        }

        const ownerOutlinerElement = this._ownerOutliner.domElement();
        const valueOutlinerElement = targetOutliner.domElement();

        if (targetOutliner === this._ownerOutliner) return;
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
        return this._property.arrowStartPosition();
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
        this._valueOutliner?.removeAssociationEnd(this);
    }

    selector() {
        return this._property.name();
    }

    update() {
        const propertyValue = this._property.currentValue();

        if (this._valueOutliner !== undefined && this._valueOutliner.inspectedValue() === propertyValue) return;

        if (this._world.hasOutlinerFor(propertyValue)) {
            this._redirectTo(this._world.openOutliner(propertyValue));
            this.updatePosition();
        } else {
            this.remove();
        }
    }

    private _redirectTo(newTarget: Outliner<unknown>) {
        this._valueOutliner?.removeAssociationEnd(this);
        this._valueOutliner = newTarget;
        this._valueOutliner.registerAssociationEnd(this);
    }

    valueOutliner() {
        return this._valueOutliner;
    }
}