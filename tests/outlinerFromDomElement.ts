import {fireEvent, within} from "@testing-library/dom";
import {vi} from "vitest";
import {positionOfDomElement} from "../src/dom.ts";
import {fireMousePointerEventOver} from "./dom_event_simulation.ts";
import {point, Position} from "../src/position.ts";

export class OutlinerFromDomElement {
    private _domElement: HTMLElement;

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
            .map(row => this._propertyNameOn(row));
    }

    valueOfProperty(propertyName: string) {
        return within(this._propertyRowFor(propertyName)).getAllByRole("cell")[1].textContent;
    }

    private _propertyRowFor(propertyName: string) {
        const propertyRow = this._propertyRows()
            .find(row => this._propertyNameOn(row) === propertyName);

        if (propertyRow === undefined) throw new Error(`Cannot find property '${propertyName}' on outliner`);

        return propertyRow;
    }

    private _propertyNameOn(row: HTMLElement) {
        return within(row).getAllByRole("cell")[0].textContent ?? "";
    }

    numberOfProperties() {
        return this._propertyRows().length;
    }

    private _propertyRows() {
        return within(this._domElement)
            .queryAllByRole("row", {})
            .filter(row => row.classList.contains("property"));
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
        const row = this._propertyRowFor(propertyName);
        return within(row).getByTitle("Inspeccionar valor");
    }

    domElement() {
        return this._domElement;
    }

    move(positionDelta: Position) {
        fireMousePointerEventOver(this.header(), "pointerDown", point(1, 1));
        fireMousePointerEventOver(this.header(), "pointerMove", point(1, 1).plus(positionDelta));
        fireMousePointerEventOver(this.header(), "pointerUp",   point(1, 1));
    }
}