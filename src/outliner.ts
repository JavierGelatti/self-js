import {deltaBetween, Position, sumOf} from "./position.ts";
import {clientPositionOf, createElement} from "./dom.ts";

type Selector = string | symbol;

export class Outliner {
    private _inspectedObject: Record<string, unknown>;
    private _position: Position;
    private _domElement: HTMLElement;
    private _internalSlotsSeparator!: HTMLTableRowElement;
    private _header!: HTMLElement;
    private _properties: Map<Selector, Property> = new Map();

    constructor(inspectedObject: Record<string, unknown>, position: Position) {
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

function makeDraggable(
    draggableElement: HTMLElement,
    { onDragStart, onDrag, onDragEnd }: {
        onDragStart?: () => void,
        onDrag?: (cursorPosition: Position, delta: Position) => void,
        onDragEnd?: () => void,
    }
) {
    draggableElement.classList.add("draggable");
    draggableElement.addEventListener("pointerdown", (event: PointerEvent) => {
        onDragStart?.();
        event.preventDefault();
        draggableElement.setPointerCapture(event.pointerId);
        draggableElement.classList.add("dragging");

        const dragEnd = new AbortController();

        let lastPosition: Position = clientPositionOf(event);

        draggableElement.addEventListener("pointermove", (event: PointerEvent) => {
            const newPosition = clientPositionOf(event);
            const delta = deltaBetween(lastPosition, newPosition);

            onDrag?.(newPosition, delta);

            lastPosition = newPosition;
        }, {signal: dragEnd.signal});

        const endDrag = () => {
            onDragEnd?.();
            draggableElement.classList.remove("dragging");
            dragEnd.abort();
        };

        draggableElement.addEventListener("pointerup", endDrag, {signal: dragEnd.signal});
        draggableElement.addEventListener("pointercancel", endDrag, {signal: dragEnd.signal});
    });
}

class Property {
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
