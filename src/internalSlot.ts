import {Slot} from "./slot.ts";
import {InspectableObject} from "./objectOutliner.ts";
import {Primitive} from "./primitiveOutliner.ts";
import {Outliner} from "./outliner.ts";
import {World} from "./world.ts";

export abstract class InternalSlot extends Slot {
    constructor(owner: InspectableObject | Primitive, outliner: Outliner, world: World) {
        super(Symbol(), owner, outliner, world);
    }

    protected isPresentInOwner(): boolean {
        return true;
    }

    protected _elementClassName(): string {
        return "internal-slot";
    }

    abstract name(): string;

    abstract currentValue(): unknown;

    abstract assign(newValue: unknown): void;
}

export class PrototypeInternalSlot extends InternalSlot {
    name(): string {
        return "🙋[[Prototype]]";
    }

    currentValue(): unknown {
        return Object.getPrototypeOf(this._owner);
    }

    protected _currentValueAsString(): string {
        const currentValue = this.currentValue();
        if (currentValue === null) return "null";

        return Object.prototype.toString.call(currentValue);
    }

    assign(newValue: unknown): void {
        Object.setPrototypeOf(
            this._owner,
            // @ts-expect-error
            newValue
        );
    }
}
