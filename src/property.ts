import {Slot} from "./slot.ts";
import {InspectableObject} from "./objectOutliner.ts";
import {createFragment} from "./dom.ts";

export class Property extends Slot<InspectableObject> {
    name() {
        return String(this._key);
    }

    protected isPresentInOwner() {
        return Reflect.has(this._owner, this._key);
    }

    currentValue() {
        return Reflect.get(this._owner, this._key);
    }

    assign(newValue: unknown) {
        Reflect.set(this._owner, this._key, newValue);
    }

    protected _elementClassName(): string {
        return "property";
    }

    protected _propertyAttributesElements(): Node {
        const propertyDescriptor = Reflect.getOwnPropertyDescriptor(this._owner, this._key);
        if (propertyDescriptor === undefined) return createFragment();

        const isData = propertyDescriptor.writable !== undefined;
        const hasGet = propertyDescriptor.get !== undefined;
        const hasSet = propertyDescriptor.set !== undefined;

        return createFragment([
            propertyDescriptor.configurable ? "" : this._toggleEmoji("⚙️", "configurable", false),
            propertyDescriptor.enumerable ? this._toggleEmoji("👁️", "enumerable", true) : "",
            isData ?
                (propertyDescriptor.writable ? "" : this._toggleEmoji("✏️", "writeable", false)) :
                this._toggleEmoji(
                    "💭",
                    "accessor:" + (hasGet ? " get" : "") + (hasSet ? " set" : ""),
                    true
                ),
        ]);
    }

    private _toggleEmoji(emoji: string, meaning: string, active: boolean) {
        return nodeFromHtmlSource(`<svg class="attribute-icon" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <title>${(active ? "" : "non-") + meaning}</title>
            <text x="50%" y="50%">${emoji}</text>
            ${active ? "" : '<line x1="90%" y1="10%" x2="10%" y2="90%" />'}
        </svg>`);
    }
}

function nodeFromHtmlSource(html: string) {
    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content;
}
