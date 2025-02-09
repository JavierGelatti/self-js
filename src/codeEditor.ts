import {createElement} from "./dom.ts";
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
    const charactersBeforeAnchor = getSelectionOffset(codeElement);

    delete codeElement.dataset.highlighted;
    codeElement.textContent = String(codeElement.textContent);
    hljs.highlightElement(codeElement);

    restoreSelectionFromOffset(charactersBeforeAnchor, codeElement);
}

function getSelectionOffset(codeElement: CodeEditorElement) {
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    const anchorOffset = selection?.anchorOffset;
    if (!anchorNode || !anchorOffset) return undefined;

    let charactersBeforeAnchor = anchorOffset;
    let currentNode = anchorNode.parentElement === codeElement ?
        anchorNode.previousSibling :
        anchorNode.parentElement!.previousSibling;

    while (currentNode) {
        charactersBeforeAnchor += currentNode.textContent?.length || 0;
        currentNode = currentNode.previousSibling;
    }

    return charactersBeforeAnchor;
}

function restoreSelectionFromOffset(charactersBeforeAnchor: number | undefined, codeElement: CodeEditorElement) {
    if (charactersBeforeAnchor === undefined) return;

    let leftToConsume = charactersBeforeAnchor;
    let currentNode = codeElement.firstChild;
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

export function codeOn(codeElement: CodeEditorElement) {
    return codeElement.textContent ?? "";
}