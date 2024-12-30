import {Property, Selector} from "./property.ts";
import {Position} from "./position.ts";
import {World} from "./world.ts";
import {createElement} from "./dom.ts";
import {Outliner} from "./outliner.ts";
import {Association} from "./association.ts";

export type InspectableObject = Record<string | symbol, unknown>;

export class ObjectOutliner extends Outliner<InspectableObject> {
    private _internalSlotsSeparator: Element = this._content.lastElementChild!;
    private _properties: Map<Selector, Property> = new Map();
    private _associationStarts: Map<Selector, Association> = new Map();

    constructor(inspectedObject: InspectableObject, position: Position, world: World) {
        super(inspectedObject, position, world);

        this._refreshProperties();
    }

    type() {
        if (typeof this._inspectedValue === "function") return "function";
        if (this._inspectedValue instanceof Error) return "error";
        return "object";
    }

    override title() {
        const defaultString = this._asString(this._inspectedValue);

        if (defaultString !== "[object Object]") return defaultString;

        const inspectedObjectPrototype = Reflect.getPrototypeOf(this._inspectedValue);
        if (inspectedObjectPrototype === null) return "un objeto";

        return `un ${inspectedObjectPrototype.constructor.name}`;
    }

    private _asString(value: unknown) {
        if (typeof value === "function") return `función ${value.name}`;
        if (value instanceof Array) return `un Array`;

        try {
            return String(value);
        } catch (e) {
            if (e instanceof TypeError) {
                return Object.prototype.toString.bind(value)();
            }
            throw e;
        }
    }

    protected override _createDomElementContent() {
        return createElement("table", {title: "Slots"}, [
            createElement("tr", {}, [
                createElement("td", {colSpan: 3}, [
                    createElement("button", {
                        title: "Add property",
                        textContent: "➕ Nueva propiedad",
                        onclick: () => {
                            const newPropertyName = prompt("Nombre de la propiedad nueva");
                            if (newPropertyName === null) return;
                            this.createNewProperty(newPropertyName);
                        },
                    }),
                ]),
            ]),
        ]);
    }

    createNewProperty(newPropertyName: string) {
        if (Reflect.has(this._inspectedValue, newPropertyName)) return;

        this._inspectedValue[newPropertyName] = undefined;

        this._addProperty(newPropertyName);
    }

    private _addProperty(key: Selector) {
        const property = this._newProperty(key);
        this._internalSlotsSeparator.insertAdjacentElement("beforebegin", property.domElement());
    }

    private _newProperty(key: string | symbol) {
        const property = new Property(key, this._inspectedValue, this, this._world);
        this._properties.set(key, property);
        return property;
    };

    update() {
        this._refreshTitle();
        this._refreshType();
        this._refreshProperties();
    }

    private _refreshTitle() {
        const titleNode = this._header.firstChild as Text;
        titleNode.textContent = this.title();
    }

    private _refreshProperties() {
        const currentKeys = Reflect.ownKeys(this._inspectedValue);
        const newKeys = currentKeys.filter(key => !this._properties.has(key));

        for (const [key, property] of this._properties.entries()) {
            property.update();

            if (!currentKeys.includes(key)) this._properties.delete(key);
        }

        newKeys.forEach((newPropertyName) => {
            this._addProperty(newPropertyName);
        });
    }

    private _refreshType() {
        this._domElement.dataset.type = this.type();
    }

    registerAssociationStart(association: Association) {
        this._associationStarts.set(association.selector(), association);
    }

    removeAssociationStart(association: Association) {
        this._associationStarts.delete(association.selector());
    }

    hasVisibleAssociationFor(propertyToInspect: Property) {
        return !!this.associationFor(propertyToInspect.name());
    }

    associationFor(propertyName: Selector): Association | undefined {
        return this._associationStarts.get(propertyName);
    }

    protected _associations(): Set<Association> {
        return new Set([...super._associations(), ...this._associationStarts.values()]);
    }
}
