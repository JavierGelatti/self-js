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
    private _doItButton!: HTMLButtonElement;
    private _inspectItButton!: HTMLButtonElement;
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
        this._moveTo(sumOf(grabPosition, point(-50, -10)));
        this._grab(pointerId, grabPosition);
    }

    protected _move(delta: Position) {
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
        return createElement("div", {className: "outliner"}, [
            this._header = createElement("div", {role: "heading", textContent: this.title()}, [
                createElement("button", {
                    title: "Close",
                    textContent: "X",
                    onclick: () => this._world.closeOutliner(this)
                })
            ]),
            this._content = this._createDomElementContent(),
            this._codeEditor = createCodeEditorElement({
                onChange: () => {
                    this._doItButton.disabled = this._inspectItButton.disabled = this._codeIsBlank();
                }
            }),
            this._doItButton = createElement("button", {
                title: "Do it",
                textContent: "Hacer 👉",
                disabled: true,
                onclick: event => this._evaluateCodeAndDo(clientPositionOf(event), () => { /* nothing */})
            }),
            this._inspectItButton = createElement("button", {
                title: "Inspect it",
                className: "draggable",
                textContent: "Obtener 🫴",
                disabled: true,
                onpointerdown: event => {
                    if (this._inspectItButton.disabled) return;

                    this._evaluateCodeAndDo(clientPositionOf(event), result => {
                        const clickPosition = clientPositionOf(event);
                        const outliner = this._world.openOutliner(result);
                        outliner.grab(event.pointerId, clickPosition);
                    });
                }
            })
        ]);
    }

    private _codeIsBlank() {
        return this._currentCode().trim().length === 0;
    }

    private _evaluateCodeAndDo(currentPosition: Position, action: (result: unknown) => void) {
        try {
            action(this._evalExpression(this._currentCode()));
        } catch (error) {
            this._world.openOutliner(error, sumOf(currentPosition, point(20, 20)));
        } finally {
            this._world.updateOutliners();
        }
    }

    private _currentCode() {
        return codeOn(this._codeEditor);
    }

    private _evalExpression(inputCode: string) {
        return (function () {
            return eval(`(${inputCode})`);
        }).bind(this._inspectedValue)();
    }

    protected abstract _createDomElementContent(): HTMLElement;

    abstract title(): string;

    abstract update(): void;

    shake() {
        this._domElement.classList.add("shaking");
        this._domElement.addEventListener("animationend", () => {
            this._domElement.classList.remove("shaking");
        }, { once: true });
    }
}

