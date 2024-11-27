import {createElement} from "./dom.ts";
import {InspectableObject} from "./objectOutliner.ts";

export type Selector = string | symbol;

export class Property {
    private readonly _key: Selector;
    private readonly _owner: InspectableObject;
    private readonly _domElement: HTMLElement;
    private _propertyValueCell!: HTMLTableCellElement;

    constructor(key: Selector, owner: InspectableObject) {
        this._key = key;
        this._owner = owner;
        this._domElement = this._createDomElement();
    }

    private _createDomElement() {
        return createElement("tr", {className: "property"}, [
            createElement("td", {textContent: String(this._key)}),
            this._propertyValueCell = createElement("td", {textContent: this._currentValueAsString()}),
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
        return String(Reflect.get(this._owner, this._key));
    };
}