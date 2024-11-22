import {point, Position, sumOf} from "./position.ts";
import {clientPositionOf, createElement, makeDraggable} from "./dom.ts";
import {World} from "./world.ts";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/github.css";

hljs.registerLanguage('javascript', javascript);

export abstract class Outliner<V> {
    protected _inspectedObject: V;
    protected _position: Position;
    protected _domElement: HTMLElement;
    protected _header!: HTMLElement;
    protected _content!: HTMLElement;
    protected _code!: HTMLElement;
    protected _world: World;
    protected _grab: (pointerId: number, grabPosition: Position) => void;

    protected constructor(inspectedObject: V, position: Position, world: World) {
        this._inspectedObject = inspectedObject;
        this._world = world;
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

    abstract type(): string;

    abstract inspectedObject(): Record<string, any>;

    grab(pointerId: number, grabPosition: Position) {
        this._grab(pointerId, grabPosition);
    }

    protected _move(delta: Position) {
        this._moveTo(sumOf(this._position, delta));
    }

    protected _moveTo(position: Position) {
        this._domElement.style.translate = `${position[0]}px ${position[1]}px`;
        this._position = position;
    }

    domElement() {
        return this._domElement;
    }

    protected _createDomElement() {
        return createElement("div", {className: "outliner"}, [
            this._header = createElement("div", {role: "heading", textContent: this.title()}, [
                createElement("button", {
                    title: "Close",
                    textContent: "X",
                    onclick: () => this._world.closeOutliner(this)
                })
            ]),
            this._content = this._createDomElementContent(),
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
                    const inputCode = this._code.textContent ?? '';
                    this._evaluate(inputCode);
                }
            }),
            createElement("button", {
                title: "Inspect it",
                textContent: "Obtener 🫴",
                onpointerdown: event => {
                    const inputCode = this._code.textContent ?? '';
                    const result = this._evaluate(inputCode);
                    const clickPosition = clientPositionOf(event);
                    const outliner = this._world.openOutliner(result, sumOf(clickPosition, point(-20, -20)));
                    outliner.grab(event.pointerId, clickPosition);
                }
            })
        ]);
    }

    protected abstract _createDomElementContent(): HTMLElement;

    title() {
        const defaultString = this._asString(this.inspectedObject());

        if (defaultString !== "[object Object]") return defaultString;

        const inspectedObjectPrototype = Reflect.getPrototypeOf(this.inspectedObject());
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

    protected _evaluate(codigoIngresado: string) {
        try {
            return (function () {
                return eval(`(${codigoIngresado})`);
            }).bind(this.inspectedObject())();
        } catch (error) {
            return error;
        } finally {
            this._world.updateOutliners();
        }
    }

    protected _highlightCode() {
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

    abstract update(): void;
}

