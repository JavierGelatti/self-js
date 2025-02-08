import {Slot} from "./slot.ts";

export class Property extends Slot {
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
}