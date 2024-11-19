export type Position = [number, number] & { __positionBrand__: any };

export function point(x: number, y: number) {
    return [x, y] as Position;
}

export class World {
    private _domElement: HTMLDivElement = document.createElement('div');
    private _outliners: Map<unknown, Outliner> = new Map();

    domElement() {
        return this._domElement;
    }

    openOutliner(anObject: Record<string, unknown>, position: Position = point(0, 0)) {
        if (this._outliners.has(anObject)) return;

        const outliner = new Outliner(anObject, position);

        this._domElement.appendChild(outliner.domElement());
        this._outliners.set(anObject, outliner);
    }
}

function makeDraggable(draggableElement: HTMLElement, onDrag: (cursorPosition: Position, delta: Position) => void) {
    draggableElement.classList.add("draggable");
    draggableElement.addEventListener("pointerdown", (event: PointerEvent) => {
        event.preventDefault();
        draggableElement.setPointerCapture(event.pointerId);
        draggableElement.classList.add("dragging");
        const dragEnd = new AbortController();

        let lastPosition: Position = clientPositionOf(event);

        draggableElement.addEventListener("pointermove", (event: PointerEvent) => {
            const newPosition = clientPositionOf(event);
            const delta = deltaBetween(lastPosition, newPosition);

            onDrag(newPosition, delta);

            lastPosition = newPosition;
        }, {signal: dragEnd.signal});

        draggableElement.addEventListener("pointerup", () => {
            draggableElement.classList.remove("dragging");
            dragEnd.abort();
        }, {signal: dragEnd.signal});
    });
}

class Outliner {
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

        makeDraggable(this._header, (cursorPosition: Position, delta: Position) => {
            this._move(delta);
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

        return createElement("div", { className: "outliner" }, [
            this._header = createElement("div", { role: "heading", textContent: "un Object" }),
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
                            }
                        })
                    ])
                ])
            ])
        ]);
    }

    private addProperty(newPropertyName: string) {
        if (Reflect.has(this._inspectedObject, newPropertyName)) return;

        this._inspectedObject[newPropertyName] = undefined;

        this._propertiesTable.insertBefore(
            this._propertyRow(newPropertyName, this._inspectedObject),
            this._internalSlotsSeparator
        );
    }

    private _propertyRow(propertyName: string, anObject: Record<string, unknown>) {
        const propertyValue = String(Reflect.get(anObject, propertyName));

        return createElement("tr", { className: "property" }, [
            createElement("td", { textContent: propertyName }),
            createElement("td", { textContent: propertyValue})
        ]);
    }
}

function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K, properties: Partial<HTMLElementTagNameMap[K]> = {}, children: (Node | string)[] = []
) {
    const newElement = document.createElement(tagName);
    Object.assign(newElement, properties);
    newElement.append(...children);
    return newElement;
}

function clientPositionOf(event: PointerEvent): Position {
    return point(event.clientX, event.clientY);
}

function deltaBetween(startPosition: Position, endPosition: Position): Position {
    return point(
        endPosition[0] - startPosition[0],
        endPosition[1] - startPosition[1]
    );
}

function sumOf(position1: Position, position2: Position): Position {
    return point(
        position2[0] + position1[0],
        position2[1] + position1[1]
    );
}
