import {Outliner} from "./outliner.ts";
import {Position} from "./position.ts";
import {World} from "./world.ts";
import {createElement, createFragment} from "./dom.ts";

export type Primitive = string | number | boolean | bigint | symbol | undefined | null;

export class PrimitiveOutliner extends Outliner<Primitive> {
    constructor(anObject: Primitive, position: Position, world: World) {
        super(anObject, position, world);
    }

    protected _createDetailsDomElement(): Node {
        return createFragment([
            createElement("p", {
                className: 'stereotype',
                textContent: `«primitivo : ${typeof this._inspectedValue}»`
            }),
            this._stringDetailsElement() ?? createFragment()
        ]);
    }

    protected _createSlotsDomElement() {
        return createElement("table", { title: "Special slots" });
    }

    type(): string {
        return "primitive";
    }

    title(): string {
        if (typeof this._inspectedValue === "string") {
            return JSON.stringify(this._inspectedValue);
        }

        return String(this._inspectedValue);
    }

    protected _update(): void {
        // Does nothing, since primitives are immutable
    }

    private _stringDetailsElement(): Node | undefined {
        if (typeof this._inspectedValue !== "string") return;

        return createElement("pre", {
            textContent: this._inspectedValue,
        });
    }

    protected _attributesElements(): Node {
        return createFragment();
    }
}
