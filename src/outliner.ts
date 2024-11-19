import {deltaBetween, point, Position, sumOf} from "./position.ts";
import {clientPositionOf, createElement, makeDraggable} from "./dom.ts";
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
    private _grab: (pointerId: number, grabPosition: Position) => void;

    constructor(inspectedObject: Record<string, unknown>, position: Position, world: World) {
        this._world = world;
        this._inspectedObject = inspectedObject;
        this._position = position;
        this._domElement = this._createDomElement();
        this._domElement.dataset.type = this.type();
        this._moveTo(this._position);

        this._grab = makeDraggable(this._header, {
            onDragStart: () => {
                this._domElement.classList.add("moving");
                this._domElement.parentElement?.append(this._domElement);
            },
            onDrag: (_, delta) => this._move(delta),
            onDragEnd: () => this._domElement.classList.remove("moving"),
        });
    }

    private type() {
        if (typeof this._inspectedObject === "function") return "function";
        if (this._inspectedObject instanceof Error) return "error";

        return "object";
    }

    inspectedObject() {
        return this._inspectedObject;
    }

    grab(pointerId: number, grabPosition: Position) {
        this._grab(pointerId, grabPosition);
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
            this._header = createElement("div", {role: "heading", textContent: this.title()}, [
                createElement("button", {
                    title: "Close",
                    textContent: "X",
                    onclick: event => {
                        this._world.closeOutliner(this);
                    }
                })
            ]),
            createElement("table", {title: "Slots"}, [
                ...propertyNames.map((propertyName) => {
                    return this._newProperty(propertyName).domElement()
                }),
                this._internalSlotsSeparator = createElement("tr", {}, [
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
            ]),
            this._code = createElement("pre", {
                role: "textbox",
                contentEditable: "true",
                className: "javascript",
                oninput: () => this._highlightCode()
            }),
            createElement("button", {
                title: "Do it",
                textContent: "Hacer 👉",
                onclick: () => {
                    const inputCode = this._code.textContent;
                    this._evaluate(inputCode);
                }
            }),
            createElement("button", {
                title: "Inspect it",
                textContent: "Obtener 🫴",
                onpointerdown: event => {
                    const inputCode = this._code.textContent;
                    const result = this._evaluate(inputCode);
                    const clickPosition = clientPositionOf(event);
                    const outliner = this._world.openOutliner(result, sumOf(clickPosition, point(-20, -20)));
                    outliner.grab(event.pointerId, clickPosition);
                }
            })
        ]);
    }

    title() {
        const defaultString = this._asString(this._inspectedObject);

        if (defaultString !== "[object Object]") return defaultString;

        const inspectedObjectPrototype = Reflect.getPrototypeOf(this._inspectedObject);
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

    private _evaluate(codigoIngresado: string | null) {
        try {
            return (function () {
                return eval(`(${codigoIngresado})`);
            }).bind(this._inspectedObject)();
        } finally {
            this._world.updateOutliners();
        }
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

