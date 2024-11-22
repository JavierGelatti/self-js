import {Property, Selector} from "./property.ts";
import {Position} from "./position.ts";
import {World} from "./world.ts";
import {createElement} from "./dom.ts";
import {Outliner} from "./outliner.ts";

export class ObjectOutliner extends Outliner<Record<string, unknown>> {
    private _internalSlotsSeparator: Element = this._content.lastElementChild!;
    private _properties: Map<Selector, Property> = new Map();

    constructor(inspectedObject: Record<string, unknown>, position: Position, world: World) {
        super(inspectedObject, position, world);

        this._refreshProperties();
    }

    type() {
        if (typeof this._inspectedObject === "function") return "function";
        if (this._inspectedObject instanceof Error) return "error";
        return "object";
    }

    inspectedObject() {
        return this._inspectedObject;
    }

    protected override _createDomElementContent() {
        return createElement("table", {title: "Slots"}, [
            createElement("tr", {}, [
                createElement("td", {colSpan: 2}, [
                    createElement("button", {
                        title: "Add property",
                        textContent: "➕ Nueva propiedad",
                        onclick: event => {
                            const newPropertyName = prompt("Nombre de la propiedad nueva")!;
                            if (newPropertyName === null) return;
                            this.createNewProperty(newPropertyName);
                        },
                    }),
                ]),
            ]),
        ]);
    }

    createNewProperty(newPropertyName: string) {
        if (Reflect.has(this._inspectedObject, newPropertyName)) return;

        this._inspectedObject[newPropertyName] = undefined;

        this._addProperty(newPropertyName);
    }

    private _addProperty(key: Selector) {
        const property = this._newProperty(key);
        this._internalSlotsSeparator.insertAdjacentElement("beforebegin", property.domElement());
    }

    private _newProperty(key: string | symbol) {
        const property = new Property(key, this._inspectedObject);
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
        const currentKeys = Reflect.ownKeys(this._inspectedObject);
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
}
