import {Slot} from "./slot.ts";
import {InspectableObject} from "./objectOutliner.ts";
import {createFragment, emojiIcon, toggleEmoji} from "./dom.ts";

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
            propertyDescriptor.configurable ? "" : toggleEmoji("⚙️", "configurable", false),
            propertyDescriptor.enumerable ? toggleEmoji("👁️", "enumerable", true) : "",
            isData ?
                (propertyDescriptor.writable ? "" : toggleEmoji("✏️", "writeable", false)) :
                emojiIcon("💭", `accessor:${hasGet ? " get" : ""}${hasSet ? " set" : ""}`),
        ]);
    }
}
