import {Selector} from "./slot.ts";
import {Position} from "./position.ts";
import {World} from "./world.ts";
import {createElement, createFragment, emojiIcon} from "./dom.ts";
import {Outliner} from "./outliner.ts";
import {Property} from "./property.ts";
import {createCodeViewElementWith} from "./codeEditor.ts";
import {withArticle} from "./article.ts";
import {isRevokedProxy} from "./metaprogramming.ts";

export type InspectableObject = Record<string | symbol, unknown>;

export class ObjectOutliner extends Outliner<InspectableObject> {
    declare private _internalSlotsSeparator: Element;
    declare private _addPropertyButton: HTMLButtonElement;
    private _properties: Map<Selector, Property> = new Map();

    constructor(inspectedObject: InspectableObject, position: Position, world: World) {
        super(inspectedObject, position, world);

        this._refreshProperties();
    }

    type() {
        if (isRevokedProxy(this._inspectedValue)) return "revoked-proxy";
        if (typeof this._inspectedValue === "function") return "function";
        if (this._inspectedValue instanceof Error) return "error";
        return "object";
    }

    override title() {
        if (isRevokedProxy(this._inspectedValue)) {
            return "a revoked Proxy";
        }

        if (this._inspectedObjectIsPrototype() && this._inspectedValue.constructor.name !== "") {
            return `${this._inspectedValue.constructor.name}.prototype`;
        }

        const defaultString = this._asString(this._inspectedValue);

        if (defaultString !== "[object Object]") return defaultString;

        const inspectedObjectPrototype = Reflect.getPrototypeOf(this._inspectedValue);
        if (inspectedObjectPrototype === null) return withArticle("object");

        return withArticle(inspectedObjectPrototype.constructor.name);
    }

    private _inspectedObjectIsPrototype() {
        try {
            return this._inspectedValue.constructor?.prototype === this._inspectedValue;
        } catch (error) {
            return false;
        }
    }

    private _asString(value: unknown) {
        if (typeof value === "function") return `function ${value.name}`;
        if (value instanceof Array) return withArticle("Array");

        try {
            return String(value);
        } catch (error1) {
            try {
                return Object.prototype.toString.call(value);
            } catch (error2) {
                return "???";
            }
        }
    }

    protected _createDetailsDomElement(): Node {
        return this._functionCodeElement() ?? createFragment();
    }

    protected override _createSlotsDomElement() {
        return createElement("table", {title: "Slots"}, [
            this._internalSlotsSeparator = createElement("tr", {}, [
                createElement("td", {colSpan: 3}, [
                    this._addPropertyButton = createElement("button", {
                        title: "Add property",
                        textContent: "➕ New property",
                        disabled: !this._isExtensible(),
                        onclick: () => {
                            const newPropertyName = prompt("New property name");
                            if (newPropertyName === null) return;
                            this.createNewProperty(newPropertyName);
                        },
                    }),
                ]),
            ]),
        ]);
    }

    private _functionCodeElement(): Node | undefined {
        const inspectedValue: unknown = this._inspectedValue;
        if (typeof inspectedValue !== "function") return;

        return createCodeViewElementWith(this._functionCode(inspectedValue));
    }

    private _functionCode(fn: Function) {
        if (isClass(fn)) {
            return `class ${fn.name === "" ? "" : fn.name + " "}{ ... }`
        }

        return String(fn);
    }

    createNewProperty(newPropertyName: string) {
        if (Object.hasOwn(this._inspectedValue, newPropertyName)) return;

        this._inspectedValue[newPropertyName] = undefined;

        this._addProperty(newPropertyName);

        // We have to do this because the new property name may change the size of the inspector...
        this._updateAssociationsPositions();
    }

    private _addProperty(key: Selector) {
        const property = new Property(key, this._inspectedValue, this, this._world);
        this._properties.set(key, property);
        this._internalSlotsSeparator.insertAdjacentElement("beforebegin", property.domElement());
    }

    protected _update() {
        this._refreshTitle();
        this._refreshType();
        this._refreshProperties();
        this._refreshAttributes();
    }

    private _refreshTitle() {
        const titleNode = this._header.firstChild as Text;
        titleNode.textContent = this.title();
    }

    private _refreshProperties() {
        const currentKeys = isRevokedProxy(this._inspectedValue) ? [] : Reflect.ownKeys(this._inspectedValue);
        const newKeys = currentKeys.filter(key => !this._properties.has(key));

        for (const [key, property] of this._properties.entries()) {
            property.update();

            if (currentKeys.includes(key)) {
                this.associationFor(key)?.update();
            } else {
                this._properties.delete(key);
                this.associationFor(key)?.remove();
            }
        }

        newKeys.forEach((newPropertyName) => {
            this._addProperty(newPropertyName);
        });

        // We have to do this because the updated key or value of an association may change the size of the inspector...
        this._updateAssociationsPositions();
    }

    private _refreshType() {
        this._domElement.dataset.type = this.type();
    }

    protected _attributesElements(): Node {
        if (isRevokedProxy(this._inspectedValue)) return createFragment();

        const extensible = this._isExtensible();
        const frozen = Object.isFrozen(this._inspectedValue);
        const sealed = Object.isSealed(this._inspectedValue);

        return createFragment([
            frozen ? emojiIcon("❄️", "frozen") : "",
            sealed ? emojiIcon("📦", "sealed") : "",
            !extensible ? emojiIcon("🔒", "non-extensible") : "",
        ]);
    }

    private _isExtensible() {
        if (isRevokedProxy(this._inspectedValue)) return false;

        return Object.isExtensible(this._inspectedValue);
    }

    private _refreshAttributes() {
        this._addPropertyButton.disabled = !this._isExtensible();
        this._attributesElement.replaceChildren(
            this._attributesElements()
        );
    }
}

const functionToString = Function.prototype.toString;

function isClass(fn: Function) {
    return /^\s*class\s+/.test(functionToString.call(fn));
}
