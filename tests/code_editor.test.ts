import {beforeEach, describe, expect, Mock, test, vitest} from "vitest";
import {userEvent} from "@vitest/browser/context";
import {CodeEditorElement, createCodeEditorElement} from "../src/codeEditor.ts";

describe("Code editor", () => {
    let codeEditor: CodeEditorElement;
    let onChange: Mock<() => void>;

    beforeEach(() => {
        document.body.innerHTML = "";

        onChange = vitest.fn();
        codeEditor = createCodeEditorElement({ onChange });
        document.body.append(codeEditor);
    });

    test("the contents of the element are editable and highlighted, and it notifies about each change", async () => {
        codeEditor.focus();
        await userEvent.keyboard("this");

        expect(onChange).toHaveBeenCalledTimes(4);
        expect(codeEditor.textContent).toEqual("this");
        expect(codeEditor.childElementCount).toEqual(1);
        expect(codeEditor.firstElementChild).toHaveClass("hljs-variable");
        expect(currentSelection().anchorNode).toBe(lastNestedChildOf(codeEditor));
        expect(currentSelection().anchorOffset).toBe(4);
    });

    test("the contents of the element can change and be re-highlighted going back", async () => {
        codeEditor.focus();
        await userEvent.keyboard("ths");

        const selection = currentSelection();
        selection.setPosition(selection.anchorNode, selection.anchorOffset - 1);
        await userEvent.keyboard("i");

        expect(codeEditor.textContent).toEqual("this");
        expect(codeEditor.childElementCount).toEqual(1);
        expect(codeEditor.firstElementChild).toHaveClass("hljs-variable");
        expect(currentSelection().anchorNode).toBe(lastNestedChildOf(codeEditor));
        expect(currentSelection().anchorOffset).toBe(3);
    });

    test("the selection is preserved when a nested element was added at the end by the highlighter", async () => {
        codeEditor.focus();
        await userEvent.keyboard("this.prototype");

        expect(codeEditor.textContent).toEqual("this.prototype");
        expect(currentSelection().anchorNode).toBe(lastNestedChildOf(codeEditor));
        expect(currentSelection().anchorOffset).toEqual(9);
    });

    test("the selection is preserved when a nested element is removed from the end by the highlighter", async () => {
        codeEditor.focus();
        await userEvent.keyboard("this.prototype(");

        expect(codeEditor.textContent).toEqual("this.prototype(");
        expect(currentSelection().anchorNode).toBe(lastNestedChildOf(codeEditor));
        expect(currentSelection().anchorOffset).toEqual(1);
    });

    function lastNestedChildOf(node: Node) {
        if (!node.hasChildNodes()) return node;

        return lastNestedChildOf(node.lastChild!);
    }

    function currentSelection() {
        return window.getSelection()!;
    }
});
