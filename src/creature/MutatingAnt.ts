import Ant, {Direction} from "../sprites/Ant";
import _ from "lodash";
import MutationScene from "../scenes/mutation-scene";
import AntBrain from "./AntBrain";

/**
 * MutatingAnt
 *
 * Has a brain - the brain controls activity
 *
 * MutatingAnt.spawn(n: number);
 *
 */
export default class MutatingAnt extends Ant {
    brain: AntBrain

    private world: MutationScene;

    constructor(scene: MutationScene, config: MutatingAntConfig) {
        super(scene, config.x, config.y, config.texture);
        // Save for later
        this.world = scene;
        this.brain = new AntBrain();
    }

    deltaAccum = 0;
    _angleRad = 0;

    thinkingStartMs: number
    speed = 5;

    protected preUpdate(time: number, delta: number): void {
        super.update(time, delta);
        this.deltaAccum += delta;
        if (this.deltaAccum <= 150) {
            return;
        }

        let input = new AntBrain.Input();
        input.food = 100; // world.getNearestFood();
        if (!this.thinkingStartMs) {
            this.thinkingStartMs = window.performance.now();
            this.brain.think(input).then(this.handleThinkOutput);
        } else {
            // console.log("Still thinking!" + (window.performance.now() - this.thinkingStartMs) + "ms");
        }
        this.setFrameRate(_.random(2, 10));
    }

    /**
     * Odd format to keep `this` context
     * private fn = () => {}
     */
    private handleThinkOutput = (output: AntBrain.Output) => {
        let adjustRadians = Math.PI * (output.left - output.right);

        this.deltaAccum = 0;
        this._angleRad += adjustRadians;
        if (this._angleRad < 0) {
            this._angleRad = 2 * Math.PI + this._angleRad;
        }
        while (this._angleRad > 2 * Math.PI) {
            this._angleRad -= 2 * Math.PI;
        }
        this.pickDirection(this._angleRad);
        let vx = Math.floor(this.speed * Math.cos(this._angleRad));
        let vy = -Math.floor(this.speed * Math.sin(this._angleRad));
        this.x = this.x + vx;
        this.y = this.y + vy;

        this.thinkingStartMs = 0;
    }

    // 45 degrees
    private static PI_OVER_4 = Math.PI / 4;
    private static PI_OVER_8 = Math.PI / 8;

    private static radiansToDirection = [
        {radians: 0, dir: Direction.RIGHT},
        {radians: MutatingAnt.PI_OVER_4, dir: Direction.UP_RIGHT},
        {radians: Math.PI / 2, dir: Direction.UP},
        {radians: 3 * Math.PI / 4, dir: Direction.UP_LEFT},
        {radians: Math.PI, dir: Direction.LEFT},
        {radians: 5 * Math.PI / 4, dir: Direction.DOWN_LEFT},
        {radians: 3 * Math.PI / 2, dir: Direction.DOWN},
        {radians: 7 * Math.PI / 4, dir: Direction.DOWN_RIGHT},
        {radians: 2 * Math.PI, dir: Direction.RIGHT},
    ];

    private pickDirection(radians: integer) {
        let found = MutatingAnt.radiansToDirection[0];
        for (let i = 0; i < MutatingAnt.radiansToDirection.length; ++i) {
            let check = MutatingAnt.radiansToDirection[i];
            if (radians >= check.radians - MutatingAnt.PI_OVER_8 &&
                radians <= check.radians + MutatingAnt.PI_OVER_8) {
                found = check;
                break;
            }
        }
        this.setDirection(found.dir);
        let adjusted = radians - found.radians;
        this.setRotation(-adjusted);
    }
}

export class MutatingAntConfig {
    x: number;
    y: number;
    texture: Ant.Skin
}