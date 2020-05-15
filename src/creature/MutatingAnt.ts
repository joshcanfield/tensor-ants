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
    public brain: AntBrain;
    public score: number = 0;

    private lastPoints: number = 0;
    private deltaAccum = 0;
    private thinkingStartMs: number

    private angleRad = 0;
    private vx: number = 0;
    private vy: number = 0;
    private speed = 5;

    private static antennaAngleRadians = .5;
    private static antennaLenFromCenter = 25;

    private world: MutationScene;

    constructor(scene: MutationScene, config: MutatingAntConfig) {
        super(scene, config.x, config.y, config.texture);
        // Save for later
        this.world = scene;
        this.brain = new AntBrain();


        // We're always moving! Get it started
        this.play();
    }

    reset() {
        this.score = 0;
        this.lastPoints = 0;
        this.deltaAccum = 0;
        this.angleRad = 0;
        this.thinkingStartMs = 0;
        this.vx = 0;
        this.vy = 0;

        this.setRotation(0);
    }

    protected preUpdate(time: number, delta: number): void {
        super.update(time, delta);
        this.deltaAccum += delta;
        if (this.deltaAccum <= 100) {
            return;
        }

        let input = new AntBrain.Input();
        let nearestFood = this.world.getNearestFood(this);

        // TODO - "The World" should own the intensity of a detection
        // given the location of this ant calculate the intensity of "sense" value that it has

        let distance = nearestFood.distance;
        let points = this.calcIntensity(distance) * 10;

        // you only get points if you're moving toward the food.
        // if (points > this.lastPoints) {
            this.score += points - this.lastPoints;
        // }
        this.lastPoints = points;
        let antenna = this.getAntennaPositions();

        // TODO: Apply the scoring
        input.antennaRight = this.calcIntensity(
            Phaser.Math.Distance.Between(antenna.right.x, antenna.right.y, nearestFood.food.x, nearestFood.food.y));
        input.antennaLeft = this.calcIntensity(
            Phaser.Math.Distance.Between(antenna.left.x, antenna.left.y, nearestFood.food.x, nearestFood.food.y));

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

    private calcIntensity(distance: number) {
        let foodStrength = 500; // TODO: should come from the food.. maybe decline over time?
        let points = 0;
        /**
         * https://www.desmos.com/calculator/3fisjexbvp
         * y=-\frac{\left(x-100\right)^{3}}{100^{2}}
         */
        if (distance < foodStrength) {
            points = Math.max(0, (
                -Math.pow(distance - foodStrength, 3) / Math.pow(foodStrength, 2))
            );
        }
        return points / foodStrength;
    }

    public getAntennaPositions() {
        let len = MutatingAnt.antennaLenFromCenter;
        let angleRadians = MutatingAnt.antennaAngleRadians;
        return {
            right: {
                x: this.x + len * Math.cos(angleRadians - this.angleRad),
                y: this.y + len * Math.sin(angleRadians - this.angleRad)
            },
            left: {
                x: this.x + len * Math.cos(-angleRadians - this.angleRad),
                y: this.y + len * Math.sin(-angleRadians - this.angleRad)
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
        let adjustRadians = this.calculateDirection(output);
        let speed = this.speed * (1 + (output.left + output.right) / 2);

        this.deltaAccum = 0;
        this.angleRad += adjustRadians;
        if (this.angleRad < 0) {
            this.angleRad = 2 * Math.PI + this.angleRad;
        }
        while (this.angleRad > 2 * Math.PI) {
            this.angleRad -= 2 * Math.PI;
        }
        this.pickDirection(this.angleRad);
        this.vx = Math.floor(speed * Math.cos(this.angleRad));
        this.vy = -Math.floor(speed * Math.sin(this.angleRad));
        this.move();

    }

    private calculateDirection(output: AntBrain.Output) {
        const turnRadians = Math.PI / 8;
        if ( output.left > output.right ) {
           return turnRadians;
        } else {
            return -turnRadians;
        }

        /*
        let leftScale = output.left;
        let rightScale = output.right;
        // cos(θ) = adjacent/hypotenuse = x / radius = x / 1
        let cosTheta = leftScale - rightScale; // lifting more left turns more right
        let adjustRadians = (Math.PI / 2) - Math.acos(cosTheta);
        return {leftScale, rightScale, adjustRadians};
     */
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