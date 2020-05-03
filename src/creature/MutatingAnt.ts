import Ant, {Direction} from "../sprites/Ant";
import _ from "lodash";
import MutationScene from "../scenes/mutation-scene";
import AntBrain from "./AntBrain";
import Phaser from "phaser";

/**
 * MutatingAnt
 *
 * Has a brain - the brain controls activity
 *
 * MutatingAnt.spawn(n: number);
 *
 */
export default class MutatingAnt extends Ant {
    /**
     *  where we do the thinking
     */
    brain: AntBrain;

    /**
     *
     */
    health = 100;
    /**
     *
     */
    score: number = 0;
    lastPoints: number = 0;

    private static antennaAngleRadians = .5;
    private static antennaLenFromCenter = 15;

    private world: MutationScene;
    private vx: number = 0;
    private vy: number = 0;

    constructor(scene: MutationScene, config: MutatingAntConfig) {
        super(scene, config.x, config.y, config.texture);
        // Save for later
        this.world = scene;
        this.brain = new AntBrain();

        // We're always moving! Get it started
        this.play();
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
        let nearestFood = this.world.getNearestFood(this);

        // TODO - "The World" should own the intensity of a detection
        // given the location of this ant calculate the intensity of "sense" value that it has
        let foodStrength = 1000;

        let points = 0;
        if (nearestFood.distance < foodStrength) {
            points = Math.max(0, (
                -Math.pow(nearestFood.distance - foodStrength, 3) / Math.pow(foodStrength, 2)) + foodStrength
            );
        }
        // you only get points if you're moving toward the food.
        if (points > this.lastPoints) {
            this.score += Math.floor(points);
        }
        this.lastPoints = points;
        let antenna = this.getAntennaPositions();

        // TODO: Apply the scoring
        input.antennaRight = Phaser.Math.Distance.Between(antenna.right.x, antenna.right.y, nearestFood.food.x, nearestFood.food.y);
        input.antennaLeft = Phaser.Math.Distance.Between(antenna.left.x, antenna.left.y, nearestFood.food.x, nearestFood.food.y);

        if (!this.thinkingStartMs) {
            this.thinkingStartMs = window.performance.now();
            this.brain.think(input)
                .then(this.handleThinkOutput, () => console.log('rejected'))
                .then(() => this.thinkingStartMs = 0); // reset timer
        } else {
            // console.log("Still thinking!" + (window.performance.now() - this.thinkingStartMs) + "ms");
            this.move();
        }
        this.setFrameRate(_.random(2, 10));
    }

    public getAntennaPositions() {
        return {
            right: {
                x: MutatingAnt.antennaLenFromCenter * Math.cos(MutatingAnt.antennaAngleRadians - this._angleRad),
                y: MutatingAnt.antennaLenFromCenter * Math.sin(MutatingAnt.antennaAngleRadians - this._angleRad)
            },
            left: {
                x: MutatingAnt.antennaLenFromCenter * Math.cos(-MutatingAnt.antennaAngleRadians - this._angleRad),
                y: MutatingAnt.antennaLenFromCenter * Math.sin(-MutatingAnt.antennaAngleRadians - this._angleRad)
            }
        };
    }

    private move() {
        if (_.isFinite(this.vx) && _.isFinite(this.vy)) {
            this.x = this.x + this.vx;
            this.y = this.y + this.vy;
        } else {
            console.log('bad vx/vy');
            debugger
        }
        if (!_.isFinite(this.x) || !_.isFinite(this.y)) {
            console.log('bad x/y');
            debugger
        }
    }

    getScore(): number {
        return this.score;
    }

    /**
     * keeping `this` context by using 'private fn = () => {}' format
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
        this.vx = Math.floor(this.speed * Math.cos(this._angleRad));
        this.vy = -Math.floor(this.speed * Math.sin(this._angleRad));
        this.move();

    }

    // 45 degrees
    private static PI_OVER_8 = Math.PI / 8;

    private static radiansToDirection = [
        {radians: 0, dir: Direction.RIGHT},
        {radians: Math.PI / 4, dir: Direction.UP_RIGHT},
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
        let adjusted = found.radians - radians;
        this.setRotation(adjusted);
    }

    replaceBrain(brain: AntBrain) {
        // clean up the brain
        this.brain.dispose();
        this.brain = brain;
    }
}

export class MutatingAntConfig {
    x: number;
    y: number;
    texture: Ant.Skin
}