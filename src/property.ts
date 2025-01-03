import {createElement} from "./dom.ts";
import {InspectableObject, ObjectOutliner} from "./objectOutliner.ts";
import {World} from "./world.ts";

export type Selector = string | symbol;

export class Property {
    private readonly _key: Selector;
    private readonly _owner: InspectableObject;
    private readonly _world: World;
    private readonly _outliner: ObjectOutliner;
    private readonly _domElement: HTMLElement;
    private _propertyValueCell!: HTMLTableCellElement;
    private _inspectPropertyButton!: HTMLButtonElement;

    constructor(key: Selector, owner: InspectableObject, outliner: ObjectOutliner, world: World) {
        this._outliner = outliner;
        this._key = key;
        this._owner = owner;
        this._world = world;
        this._domElement = this._createDomElement();
    }

    private _createDomElement() {
        return createElement("tr", {className: "property"}, [
            createElement("td", {textContent: String(this._key)}),
            this._propertyValueCell = createElement("td", {textContent: this._currentValueAsString()}),
            createElement("td", {}, [
                this._inspectPropertyButton = createElement("button", {
                    title: "Inspeccionar valor",
                    textContent: ">",
                    onclick: () => {
                        const currentAssociation = this._outliner.associationFor(this._key);
                        if (currentAssociation) {
                            currentAssociation.remove();
                        } else {
                            this._world.openOutlinerForAssociation(this, this._outliner);
                        }
                    }
                })
            ]),
        ]);
    }

    domElement(): HTMLElement {
        return this._domElement;
    }

    update() {
        if (Reflect.has(this._owner, this._key)) {
            this._propertyValueCell.textContent = this._currentValueAsString();
        } else {
            this._domElement.remove();
        }
    }

    private _currentValueAsString = () => {
        return String(this.currentValue());
    };

    currentValue() {
        return Reflect.get(this._owner, this._key);
    }

    associationElement(): Element {
        return this._inspectPropertyButton;
    }

    name() {
        return this._key;
    }

    assign(newValue: unknown) {
        Reflect.set(this._owner, this._key, newValue);
    }
}