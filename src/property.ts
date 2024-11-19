import {createElement} from "./dom.ts";

export type Selector = string | symbol;

export class Property {
    private _key: Selector;
    private _owner: Record<string, unknown>;
    private _domElement: HTMLElement;
    private _propertyValueCell!: HTMLTableCellElement;

    constructor(key: Selector, owner: Record<string, unknown>) {
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