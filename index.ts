import {World} from "./src/world";
import {Arrow, svgDefinitions} from "./src/arrows";
import {point} from "./src/position";

Arrow.linecapSize = 2;

const world = new World();

document.body.append(
    world.domElement(),
    svgDefinitions()
);

world.openOutliner(point(1, 2), point(10, 10));
