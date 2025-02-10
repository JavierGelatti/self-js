import {Slot} from "./slot.ts";
import {InspectableObject} from "./objectOutliner.ts";
import {Primitive} from "./primitiveOutliner.ts";
import {Outliner} from "./outliner.ts";
import {World} from "./world.ts";
import {createFragment, toggleEmoji} from "./dom.ts";

export abstract class InternalSlot<Owner extends InspectableObject | Primitive = InspectableObject | Primitive> extends Slot<Owner> {
    constructor(owner: Owner, outliner: Outliner<Owner>, world: World) {
        super(Symbol(), owner, outliner, world);
    }

    protected isPresentInOwner(): boolean {
        return true;
    }

    protected _elementClassName(): string {
        return "internal-slot";
    }

    name() {
        return `${this._icon()}[[${this._name()}]]`;
    }

    protected _propertyAttributesElements(): Node {
        return createFragment();
    }

    protected abstract _name(): string;

    protected abstract _icon(): string;

    abstract currentValue(): unknown;

    abstract assign(newValue: unknown): void;
}

export class PrototypeInternalSlot extends InternalSlot {
    protected _name() {
        return "Prototype";
    }

    protected _icon(): string {
        return "🙋";
    }

    currentValue(): object | null {
        return Object.getPrototypeOf(this._owner);
    }

    protected _currentValueAsString(): string {
        const currentValue = this.currentValue();
        if (currentValue === null) return "null";

        if (currentValue.constructor?.prototype === currentValue && currentValue.constructor.name !== "") {
            return `${currentValue.constructor.name}.prototype`;
        }

        return Object.prototype.toString.call(currentValue);
    }

    assign(newValue: unknown): void {
        Object.setPrototypeOf(
            this._owner,
            // @ts-expect-error
            newValue
        );
    }

    protected _propertyAttributesElements(): Node {
        const fromExtensibleObject = Object.isExtensible(this._owner);
        const isImmutablePrototypeExoticObject = this._owner as unknown === window || this._owner === Object.prototype;

        return createFragment([
            fromExtensibleObject && !isImmutablePrototypeExoticObject ? "" : toggleEmoji("✏️", "writeable", false),
        ]);
    }
}

abstract class ReadonlyInternalSlot<Owner extends InspectableObject | Primitive> extends InternalSlot<Owner> {
    private _currentValue: unknown;

    protected constructor(initialValue: unknown, owner: Owner, outliner: Outliner<Owner>, world: World) {
        super(owner, outliner, world);
        this._currentValue = initialValue;
        this.update();
    }

    currentValue(): unknown {
        return this._currentValue;
    }

    assign(_newValue: unknown): void {
        throw new Error("This is a readonly slot");
    }

    protected _changeValue(newValue: unknown) {
        this._currentValue = newValue;
        this.update();
    }
}

export class PromiseStateInternalSlot extends ReadonlyInternalSlot<InspectableObject> {
    constructor(owner: Promise<unknown>, outliner: Outliner<Promise<unknown> & InspectableObject>, world: World) {
        super("⏳ pending", owner as Promise<unknown> & InspectableObject, outliner, world);

        owner.then(() => {
            this._changeValue("🟢 fulfilled");
        }).catch(() => {
            this._changeValue("🔴 rejected");
        });
    }

    protected _name() {
        return "PromiseState";
    }

    protected _icon(): string {
        return "⚡";
    }
}

export class PromiseResultInternalSlot extends ReadonlyInternalSlot<InspectableObject> {
    constructor(owner: Promise<unknown>, outliner: Outliner<Promise<unknown> & InspectableObject>, world: World) {
        super(undefined, owner as Promise<unknown> & InspectableObject, outliner, world);

        owner.then(result => {
            this._changeValue(result);
        }).catch(result => {
            this._changeValue(result);
        });
    }

    protected _name() {
        return "PromiseResult";
    }

    protected _icon(): string {
        return "⚡";
    }

    assign(_newValue: unknown): void {
        throw new Error("This is a readonly internal slot");
    }
}
