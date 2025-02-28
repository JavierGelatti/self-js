import {boundingPageBoxOf, createElement, makeDraggable, positionOfDomElement} from "./dom.ts";
import {InspectableObject} from "./objectOutliner.ts";
import {World} from "./world.ts";
import {point} from "./position.ts";
import {Outliner} from "./outliner.ts";
import {Association} from "./association.ts";
import {Primitive} from "./primitiveOutliner.ts";
import {isRevokedProxy} from "./metaprogramming.ts";

export type Selector = string | symbol;

export abstract class Slot<Owner extends InspectableObject | Primitive = InspectableObject | Primitive> {
    protected readonly _key: Selector;
    protected readonly _owner: Owner;
    private readonly _world: World;
    private readonly _outliner: Outliner<Owner>;
    private readonly _domElement: HTMLElement;
    private _propertyValueCell!: HTMLTableCellElement;
    private _inspectPropertyButton!: HTMLButtonElement;
    private _propertyAttributesElement!: HTMLElement;

    constructor(key: Selector, owner: Owner, outliner: Outliner<Owner>, world: World) {
        this._outliner = outliner;
        this._key = key;
        this._owner = owner;
        this._world = world;
        this._domElement = this._createDomElement();

        makeDraggable(this.arrowStartDomElement(), pageGrabPosition => {
            const currentAssociation = this.currentAssociation();
            if (currentAssociation) {
                return currentAssociation.dragHandler();
            } else {
                return new Association(
                    this, this._outliner, pageGrabPosition.plus(point(30, 0)), this._world
                ).dragHandler();
            }
        });
    }

    protected _currentValueAsString() {
        let currentValue;
        try {
            currentValue = this.currentValue();
        } catch (error) {
            return "???";
        }

        if (currentValue === this._owner) return "this";
        if (typeof currentValue === "function") return "<function>";

        try {
            return String(currentValue);
        } catch (error) {
            return "[object ???]";
        }
    };

    private _createDomElement() {
        return createElement("tr", {className: this._elementClassName()}, [
            createElement("td", {textContent: this.name()}),
            this._propertyValueCell = createElement("td", {textContent: this._currentValueAsString()}),
            createElement("td", {}, [
                this._propertyAttributesElement = createElement("span", { title: "Attributes", style: { display: "contents" } }, [
                    this._propertyAttributesElements()
                ]),
                this._inspectPropertyButton = createElement("button", {
                    title: "Inspect value",
                    textContent: ">",
                    onclick: () => {
                        const currentAssociation = this.currentAssociation();
                        if (currentAssociation) {
                            const valueOutliner = currentAssociation.valueOutliner();
                            if (this._isOpenAtDefaultPositionWithoutAnyOtherAssociations(valueOutliner)) {
                                this._world.closeOutliner(valueOutliner!);
                            } else {
                                currentAssociation.remove();
                            }
                        } else {
                            this._world.openOutlinerForAssociation(
                                this,
                                this._outliner,
                                this._valueOutlinerDefaultPosition(),
                            );
                        }
                    },
                }),
            ]),
        ]);
    }

    protected abstract _elementClassName(): string;

    private _isOpenAtDefaultPositionWithoutAnyOtherAssociations(valueOutliner: Outliner | undefined) {
        return valueOutliner !== undefined &&
            valueOutliner.isAt(this._valueOutlinerDefaultPosition()) &&
            valueOutliner.numberOfAssociations() === 1;
    }

    private currentAssociation() {
        return this._outliner.associationFor(this.selector());
    }

    private _valueOutlinerDefaultPosition() {
        return positionOfDomElement(this._inspectPropertyButton).plus(point(50, 0));
    }

    domElement(): HTMLElement {
        return this._domElement;
    }

    update() {
        if (!isRevokedProxy(this._owner) && this.isPresentInOwner()) {
            this._propertyValueCell.textContent = this._currentValueAsString();
            this._propertyAttributesElement.replaceChildren(this._propertyAttributesElements());
        } else {
            this._domElement.remove();
        }
    }

    arrowStartPosition() {
        return boundingPageBoxOf(this._inspectPropertyButton).center();
    }

    arrowStartDomElement(): HTMLElement {
        return this._inspectPropertyButton;
    }

    selector() {
        return this._key;
    }

    abstract name(): string;

    protected abstract isPresentInOwner(): boolean;

    abstract currentValue(): unknown;

    abstract assign(newValue: unknown): void;

    protected abstract _propertyAttributesElements(): Node
}
