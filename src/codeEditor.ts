import {createElement, textContentLengthOf} from "./dom.ts";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/github.css";

hljs.registerLanguage('javascript', javascript);

export type CodeEditorElement = HTMLElement & { __codeElementBrand__: any };

export function createCodeEditorElement(options: { onChange?: () => void } = {}) {
    const codeElement: HTMLElement = createElement("pre", {
        role: "textbox",
        contentEditable: "true",
        className: "javascript",
        autocapitalize: "off",
        ariaAutoComplete: "none",
        spellcheck: false,
        oninput: () => {
            highlightCode(codeElement as CodeEditorElement);
            options.onChange?.();
        },
    });

    return codeElement as CodeEditorElement;
}

export function createCodeViewElementWith(code: string) {
    const codeElement: HTMLElement = createElement("pre", {
        className: "javascript",
        textContent: code,
    });

    hljs.highlightElement(codeElement);

    return codeElement as CodeEditorElement;
}

function highlightCode(codeElement: CodeEditorElement) {
    const charactersBeforeAnchor = getSelectionOffset(codeElement) ?? 0;

    delete codeElement.dataset.highlighted;
    codeElement.textContent = String(codeElement.textContent);
    hljs.highlightElement(codeElement);

    restoreSelectionFromOffset(charactersBeforeAnchor, codeElement);
}

function getSelectionOffset(codeElement: CodeEditorElement) {
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode ?? undefined;
    const anchorOffset = selection?.anchorOffset;
    if (anchorNode === undefined || anchorOffset === undefined) return undefined;
    if (!codeElement.contains(anchorNode)) return undefined;

    let charactersBeforeAnchor = anchorOffset;
    let currentNode = previousNode(anchorNode, codeElement);

    while (currentNode !== undefined) {
        charactersBeforeAnchor += textContentLengthOf(currentNode);
        currentNode = previousNode(currentNode, codeElement);
    }

    return charactersBeforeAnchor;
}

function previousNode(currentNode: Node, rootElement: HTMLElement): Node | undefined {
    if (currentNode === rootElement) return undefined;

    const previousSibling = currentNode.previousSibling;

    if (previousSibling === null) {
        const parentNode = currentNode.parentNode;
        if (parentNode === null) throw new Error("Node outside the root element; shouldn't have happened");
        return previousNode(parentNode, rootElement);
    }

    return previousSibling;
}

function restoreSelectionFromOffset(charactersBeforeAnchor: number, codeElement: CodeEditorElement) {
    const [anchor, offset] = selectionFromOffset(charactersBeforeAnchor, codeElement);

    window.getSelection()?.setBaseAndExtent(anchor, offset, anchor, offset);
}

function selectionFromOffset(charactersBeforeAnchor: number, currentNode: Node): readonly [Node, number] {
    let leftToConsume = charactersBeforeAnchor;

    while (leftToConsume > textContentLengthOf(currentNode)) {
        leftToConsume -= textContentLengthOf(currentNode);
        currentNode = currentNode.nextSibling!;
    }

    if (currentNode.hasChildNodes()) return selectionFromOffset(leftToConsume, currentNode.firstChild!);

    return [currentNode, leftToConsume];
}

export function codeOn(codeElement: CodeEditorElement) {
    return codeElement.textContent ?? "";
}