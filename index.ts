import {World} from "./src/world";
import {Arrow, svgDefinitions} from "./src/arrows";

Arrow.linecapSize = 2;

const world = new World();

document.body.append(
    world.domElement(),
    svgDefinitions()
);

world.openOutliner({});
world.openOutliner({ x: 1, y: 2 });
