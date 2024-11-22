import {point, Position, sumOf} from "./position.ts";
import {clientPositionOf, createElement, makeDraggable} from "./dom.ts";
import {World} from "./world.ts";
import {CodeEditorElement, codeOn, createCodeEditorElement} from "./codeEditor.ts";

export abstract class Outliner<V> {
    protected _inspectedValue: V;
    protected _position: Position;
    protected _domElement: HTMLElement;
    protected _header!: HTMLElement;
    protected _content!: HTMLElement;
    protected _codeEditor!: CodeEditorElement;
    protected _world: World;
    protected _grab: (pointerId: number, grabPosition: Position) => void;

    protected constructor(inspectedObject: V, position: Position, world: World) {
        this._inspectedValue = inspectedObject;
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

    inspectedValue() {
        return this._inspectedValue;
    }

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
            this._codeEditor = createCodeEditorElement(),
            createElement("button", {
                title: "Do it",
                textContent: "Hacer 👉",
                onclick: () => {
                    this._evaluate(codeOn(this._codeEditor));
                }
            }),
            createElement("button", {
                title: "Inspect it",
                textContent: "Obtener 🫴",
                onpointerdown: event => {
                    const result = this._evaluate(codeOn(this._codeEditor));
                    const clickPosition = clientPositionOf(event);
                    const outliner = this._world.openOutliner(result, sumOf(clickPosition, point(-20, -20)));
                    outliner.grab(event.pointerId, clickPosition);
                }
            })
        ]);
    }

    protected abstract _createDomElementContent(): HTMLElement;

    abstract title(): string;

    protected _evaluate(codigoIngresado: string) {
        try {
            return (function () {
                return eval(`(${codigoIngresado})`);
            }).bind(this._inspectedValue)();
        } catch (error) {
            return error;
        } finally {
            this._world.updateOutliners();
        }
    }

    abstract update(): void;
}

