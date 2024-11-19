import {World} from "./src/world";

const world = new World();

document.body.append(world.domElement());

world.openOutliner({});
