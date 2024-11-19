import {deltaBetween, Position, sumOf} from "./position.ts";
import {clientPositionOf, createElement} from "./dom.ts";

export class Outliner {
    private _inspectedObject: Record<string, unknown>;
    private _position: Position;
    private _domElement: HTMLElement;
    private _propertiesTable!: HTMLTableElement;
    private _internalSlotsSeparator!: HTMLTableRowElement;
    private _header!: HTMLElement;

    constructor(inspectedObject: Record<string, unknown>, position: Position) {
        this._inspectedObject = inspectedObject;
        this._position = position;
        this._domElement = this.createDomElement();
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

    createDomElement() {
        const propertyNames = Object.getOwnPropertyNames(this._inspectedObject);

        return createElement("div", {className: "outliner"}, [
            this._header = createElement("div", {role: "heading", textContent: "un Object"}),
            this._propertiesTable = createElement("table", {title: "Slots"}, [
                ...propertyNames.map((propertyName) => this._propertyRow(propertyName, this._inspectedObject)),
                this._internalSlotsSeparator = createElement("tr", {}, [
                    createElement("td", {colSpan: 2}, [
                        createElement("button", {
                            title: "Add property",
                            textContent: "+ Agregar propiedad",
                            onclick: event => {
                                const newPropertyName = prompt("Nombre de la propiedad nueva")!;
                                if (newPropertyName === null) return;
                                this.addProperty(newPropertyName);
                            },
                        }),
                    ]),
                ]),
            ]),
        ]);
    }

    private addProperty(newPropertyName: string) {
        if (Reflect.has(this._inspectedObject, newPropertyName)) return;

        this._inspectedObject[newPropertyName] = undefined;

        this._propertiesTable.insertBefore(
            this._propertyRow(newPropertyName, this._inspectedObject),
            this._internalSlotsSeparator,
        );
    }

    private _propertyRow(propertyName: string, anObject: Record<string, unknown>) {
        const propertyValue = String(Reflect.get(anObject, propertyName));

        return createElement("tr", {className: "property"}, [
            createElement("td", {textContent: propertyName}),
            createElement("td", {textContent: propertyValue}),
        ]);
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
