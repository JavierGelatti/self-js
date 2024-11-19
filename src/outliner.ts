import {Position, sumOf} from "./position.ts";
import {createElement, makeDraggable} from "./dom.ts";
import {Property, Selector} from "./property.ts";
import {World} from "./world.ts";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/github.css";

hljs.registerLanguage('javascript', javascript);

export class Outliner {
    private _inspectedObject: Record<string, unknown>;
    private _position: Position;
    private _domElement: HTMLElement;
    private _internalSlotsSeparator!: HTMLTableRowElement;
    private _header!: HTMLElement;
    private _properties: Map<Selector, Property> = new Map();
    private _code!: HTMLElement;
    private _world: World;

    constructor(inspectedObject: Record<string, unknown>, position: Position, world: World) {
        this._world = world;
        this._inspectedObject = inspectedObject;
        this._position = position;
        this._domElement = this._createDomElement();
        this._moveTo(this._position);

        makeDraggable(this._header, {
            onDragStart: () => {
                this._domElement.classList.add("moving");
                this._domElement.parentElement?.append(this._domElement);
            },
            onDrag: (_, delta) => this._move(delta),
            onDragEnd: () => this._domElement.classList.remove("moving"),
        });
    }

    private _move(delta: Position) {
        this._moveTo(sumOf(this._position, delta));
    }

    private _moveTo(position: Position) {
        this._domElement.style.translate = `${position[0]}px ${position[1]}px`;
        this._position = position;
    }

    domElement() {
        return this._domElement;
    }

    private _createDomElement() {
        const propertyNames = Reflect.ownKeys(this._inspectedObject);

        return createElement("div", {className: "outliner"}, [
            this._header = createElement("div", {role: "heading", textContent: "un Object"}),
            createElement("table", {title: "Slots"}, [
                ...propertyNames.map((propertyName) => {
                    return this._newProperty(propertyName).domElement()
                }),
                this._internalSlotsSeparator = createElement("tr", {}, [
                    createElement("td", {colSpan: 2}, [
                        createElement("button", {
                            title: "Add property",
                            textContent: "+ Agregar propiedad",
                            onclick: event => {
                                const newPropertyName = prompt("Nombre de la propiedad nueva")!;
                                if (newPropertyName === null) return;
                                this.createNewProperty(newPropertyName);
                            },
                        }),
                    ]),
                ]),
            ]),
            this._code = createElement("pre", {
                role: "textbox",
                contentEditable: "true",
                className: "javascript",
                oninput: () => this._highlightCode()
            }),
            createElement("button", {
                title: "Do it",
                textContent: "Hacer!",
                onclick: () => {
                    const codigoIngresado = this._code.textContent;

                    try {
                        return (function () {
                            return eval(`(${codigoIngresado})`);
                        }).bind(this._inspectedObject)();
                    } finally {
                        this._world.updateOutliners();
                    }
                }
            })
        ]);
    }

    private _highlightCode() {
        const charactersBeforeAnchor = this._getSelectionOffset();

        delete this._code.dataset.highlighted;
        this._code.textContent = String(this._code.textContent);
        hljs.highlightElement(this._code);

        this._restoreSelectionFromOffset(charactersBeforeAnchor);
    }

    private _getSelectionOffset(): number | undefined {
        const selection = window.getSelection();
        const anchorNode = selection?.anchorNode;
        const anchorOffset = selection?.anchorOffset;
        if (!anchorNode || !anchorOffset) return undefined;

        let charactersBeforeAnchor = anchorOffset;
        let currentNode = anchorNode.parentElement === this._code ?
                anchorNode.previousSibling :
                anchorNode.parentElement!.previousSibling;

        while (currentNode) {
            charactersBeforeAnchor += currentNode.textContent?.length || 0;
            currentNode = currentNode.previousSibling;
        }

        return charactersBeforeAnchor;
    }

    private _restoreSelectionFromOffset(charactersBeforeAnchor: number | undefined) {
        if (charactersBeforeAnchor === undefined) return;

        let leftToConsume = charactersBeforeAnchor;
        let currentNode = this._code.firstChild;
        while (currentNode) {
            const nodeTextLength = currentNode.textContent?.length || 0;
            if (leftToConsume <= nodeTextLength) break;
            leftToConsume -= nodeTextLength;
            currentNode = currentNode.nextSibling;
        }

        if (!(currentNode instanceof Text)) {
            currentNode = currentNode?.firstChild ?? null;
        }

        if (currentNode === null) {
            // Shouldn't happen...
            return;
        }

        window.getSelection()?.setBaseAndExtent(currentNode, leftToConsume, currentNode, leftToConsume);
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

    private _newProperty = (key: string | symbol) => {
        const property = new Property(key, this._inspectedObject);
        this._properties.set(key, property);
        return property;
    };

    update() {
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
}

