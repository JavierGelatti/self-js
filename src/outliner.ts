import {point, Position} from "./position.ts";
import {clientPositionOf, createElement, makeDraggable} from "./dom.ts";
import {World} from "./world.ts";
import {CodeEditorElement, codeOn, createCodeEditorElement} from "./codeEditor.ts";
import {Association} from "./association.ts";
import {Selector, Slot} from "./slot.ts";
import {InternalSlot, PrototypeInternalSlot} from "./internalSlot.ts";
import {InspectableObject} from "./objectOutliner.ts";
import {Primitive} from "./primitiveOutliner.ts";

export abstract class Outliner<V extends InspectableObject | Primitive = InspectableObject | Primitive> {
    private static outlinerObject = Symbol("outlinerObject");

    protected _inspectedValue: V;
    protected _position: Position;
    protected _domElement: HTMLElement;
    protected _header!: HTMLElement;
    protected _slotsDomElement!: HTMLTableElement;
    protected _codeEditor!: CodeEditorElement;
    private _doItButton!: HTMLButtonElement;
    private _inspectItButton!: HTMLButtonElement;
    protected _world: World;
    protected _grab: (pointerId: number, grabPosition: Position) => void;

    private readonly _internalSlots: Set<InternalSlot> = new Set();

    protected readonly _associationStarts: Map<Selector, Association> = new Map();
    private readonly _associationEnds: Set<Association> = new Set();

    protected constructor(inspectedObject: V, position: Position, world: World) {
        this._inspectedValue = inspectedObject;
        this._world = world;
        this._position = position;

        this._domElement = this._createDomElement();
        this._domElement.dataset.type = this.type();
        this._setPosition(this._position);

        if (this._inspectedValue !== undefined && this._inspectedValue !== null)
            this._addPrototypeInternalSlot();

        this._grab = makeDraggable(this._header, () => {
            this._onDragStart();

            return ({
                grabbedElement: this._header,
                onDrag: (_, delta) => this._move(delta),
                onDrop: () => this._domElement.classList.remove("moving"),
            });
        });
    }

    private _addPrototypeInternalSlot() {
        const internalSlot = new PrototypeInternalSlot(this._inspectedValue, this, this._world);
        this._internalSlots.add(internalSlot);
        this._slotsDomElement.append(internalSlot.domElement());
    }

    protected _onDragStart() {
        this._domElement.classList.add("moving");
        this._domElement.parentElement?.append(this._domElement);
        this._updateAssociationsPositions();

        this._associationStarts.forEach(association => {
            association.domElement().parentElement?.append(association.domElement());
        });
    }

    abstract type(): string;

    inspectedValue() {
        return this._inspectedValue;
    }

    grab(pointerId: number, grabPosition: Position) {
        this._moveTo(grabPosition.plus(point(-50, -10)));
        this._grab(pointerId, grabPosition);
    }

    protected _move(delta: Position) {
        this._moveTo(this._position.plus(delta));
    }

    private _moveTo(position: Position) {
        this._setPosition(position);
        this._updateAssociationsPositions();
    }

    private _setPosition(position: Position) {
        this._domElement.style.translate = `${(position.x)}px ${(position.y)}px`;
        this._position = position;
    }

    protected _updateAssociationsPositions() {
        this._associations().forEach(association => {
            association.updatePosition();
        });
    }

    domElement() {
        return this._domElement;
    }

    private _createDomElement() {
        return createElement("div", {className: "outliner", [Outliner.outlinerObject]: this }, [
            this._header = createElement("div", {role: "heading"}, [
                createElement("span", {
                    textContent: this.title(),
                }),
                createElement("button", {
                    title: "Close",
                    textContent: "X",
                    onclick: () => this._world.closeOutliner(this)
                })
            ]),
            this._createDetailsDomElement(),
            this._slotsDomElement = this._createSlotsDomElement(),
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
            this._world.openOutliner(error, currentPosition.plus(point(20, 20)));
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

    protected abstract _createDetailsDomElement(): Node;

    protected abstract _createSlotsDomElement(): HTMLTableElement;

    abstract title(): string;

    update(): void {
        this._internalSlots.forEach(slot => {
            slot.update();
            this.associationFor(slot.selector())?.update();
        });
        this._update();
        this._updateAssociationsPositions()
    }

    protected abstract _update(): void;

    shake() {
        this._domElement.classList.add("shaking");
        this._domElement.addEventListener("animationend", () => {
            this._domElement.classList.remove("shaking");
        }, { once: true });
    }

    registerAssociationEnd(association: Association) {
        this._associationEnds.add(association);
    }

    removeAssociationEnd(association: Association) {
        this._associationEnds.delete(association);
    }

    registerAssociationStart(association: Association) {
        this._associationStarts.set(association.selector(), association);
    }

    removeAssociationStart(association: Association) {
        this._associationStarts.delete(association.selector());
    }

    protected _associations(): Set<Association> {
        return new Set([...this._associationEnds, ...this._associationStarts.values()]);
    }

    associationFor(propertyName: Selector) {
        return this._associationStarts.get(propertyName);
    }

    remove() {
        this._domElement.remove();
        this._associations().forEach(association => {
            association.remove();
        });
    }

    static withDomElement(domElement: Element) {
        if (!(this.outlinerObject in domElement)) {
            throw new Error("The DOM element does not correspond to an outliner");
        }

        // @ts-ignore
        return domElement[this.outlinerObject] as Outliner;
    }

    isAt(aPosition: Position) {
        return this._position.equals(aPosition);
    }

    numberOfAssociations() {
        return this._associationEnds.size + this._associationStarts.size;
    }

    hasVisibleAssociationFor(slotToInspect: Slot) {
        return !!this.associationFor(slotToInspect.selector());
    }
}

