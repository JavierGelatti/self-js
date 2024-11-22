import {Outliner} from "./outliner.ts";
import {Position} from "./position.ts";
import {World} from "./world.ts";
import {createElement} from "./dom.ts";

export type Primitive = string | number | boolean | bigint | symbol | undefined | null;

export class PrimitiveOutliner extends Outliner<Primitive> {
    constructor(anObject: Primitive, position: Position, world: World) {
        super(anObject, position, world);
    }

    protected _createDomElementContent(): HTMLElement {
        return createElement("p", { className: 'stereotype', textContent: `«primitivo : ${typeof this._inspectedValue}»` });
    }

    type(): string {
        return "primitive";
    }

    title(): string {
        return String(this._inspectedValue);
    }

    update(): void {
        // Does nothing, since primitives are immutable
    }
}
