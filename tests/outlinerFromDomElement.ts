import {fireEvent, within} from "@testing-library/dom";
import {vi} from "vitest";
import {boundingPageBoxOf, positionOfDomElement} from "../src/dom.ts";
import {fireMousePointerEventOn, fireMousePointerEventOver, offsetToClientLocation} from "./dom_event_simulation.ts";
import {point, Position} from "../src/position.ts";

export class OutlinerFromDomElement {
    private readonly _domElement: HTMLElement;

    constructor(domElement: HTMLElement) {
        this._domElement = domElement;
    }

    type() {
        return this._domElement.dataset.type;
    }

    title(): string | undefined {
        return this.header().firstChild?.textContent ?? undefined;
    }

    stereotype() {
        return this._domElement.querySelector(".stereotype")!.textContent;
    }

    header() {
        return within(this._domElement).getByRole("heading");
    }

    createNewProperty(newPropertyName: string | null) {
        vi.spyOn(window, "prompt").mockImplementationOnce(() => newPropertyName);

        const addPropertyButton = within(this._domElement)
            .getByRole("button", {description: "Add property"});

        addPropertyButton.click();
    };

    propertyNames() {
        return this._propertyRows()
            .map(row => this._slotNameOn(row));
    }

    valueOfSlot(propertyName: string) {
        return this._slotValueOn(this._slotRowFor(propertyName));
    }

    private _slotRowFor(slotName: string) {
        const slotRow = [...this._propertyRows(), ...this._internalSlotsRows()]
            .find(row => this._slotNameOn(row) === slotName);

        if (slotRow === undefined) throw new Error(`Cannot find slot '${slotName}' on outliner`);

        return slotRow;
    }

    private _slotNameOn(row: HTMLElement) {
        return within(row).getAllByRole("cell")[0].textContent ?? "";
    }

    private _slotValueOn(row: HTMLElement) {
        return within(row).getAllByRole("cell")[1].textContent;
    }

    numberOfProperties() {
        return this._propertyRows().length;
    }

    private _propertyRows() {
        return within(this._domElement)
            .queryAllByRole("row", {})
            .filter(row => row.classList.contains("property"));
    }

    internalSlotsNames() {
        return this._internalSlotsRows()
            .map(row => this._slotNameOn(row));
    }

    private _internalSlotsRows() {
        return within(this._domElement)
            .queryAllByRole("row", {})
            .filter(row => row.classList.contains("internal-slot"));
    }

    position() {
        return positionOfDomElement(this._domElement).map(Math.round);
    }

    closeButton() {
        return within(this.header()).getByRole("button", {description: "Close"});
    }

    close() {
        this.closeButton().click();
    }

    private _doItButton(): HTMLButtonElement {
        return within(this._domElement).getByRole("button", {description: "Do it"});
    }

    doIt(code: string) {
        this.inputCode(code);

        this._doItButton().click();
    }

    canDoIt() {
        return !this._doItButton().disabled;
    }

    inspectItButton(): HTMLButtonElement {
        return within(this._domElement).getByRole("button", {description: "Inspect it"});
    }

    inspectIt(code: string) {
        this.inputCode(code);

        fireMousePointerEventOver(this.inspectItButton(), "pointerDown", point(1, 1));
    }

    canInspectIt() {
        return !this.inspectItButton().disabled;
    }

    inputCode(code: string) {
        const evaluator = within(this._domElement).getByRole("textbox");
        fireEvent.input(evaluator, {target: {textContent: code}});
    }

    isMoving() {
        return this._domElement.classList.contains("moving");
    }

    inspectProperty(propertyName: string) {
        this.buttonToInspectProperty(propertyName).click();
    }

    buttonToInspectProperty(propertyName: string) {
        const row = this._slotRowFor(propertyName);
        return within(row).getByTitle("Inspeccionar valor");
    }

    domElement() {
        return this._domElement;
    }

    move(positionDelta: Position) {
        const header = this.header();
        const offsetLocation = point(1, 1);
        const startLocation = offsetToClientLocation(offsetLocation, header);
        const endLocation = offsetToClientLocation(offsetLocation.plus(positionDelta), header);

        fireMousePointerEventOn(header, "pointerDown", startLocation);
        fireMousePointerEventOn(header, "pointerMove", endLocation);
        fireMousePointerEventOn(header, "pointerUp",   endLocation);
    }

    boundingBox() {
        return boundingPageBoxOf(this._domElement);
    }

    functionCode() {
        return this._domElement.querySelector("tr:first-of-type pre")?.textContent ?? "";
    }
}