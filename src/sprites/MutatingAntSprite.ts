import MutationScene from "../scenes/mutation-scene";
import AntSprite from "./AntSprite";

import Direction from "../model/Direction";
import MutatingAnt from "../model/MutatingAnt";
import World from "../model/World"
import IdSource from "../model/IdSource";
import Phaser from "phaser";
import Arc = Phaser.GameObjects.Arc;
import Line = Phaser.GameObjects.Line;

/**
 * MutatingAntSprite
 *
 * Has a brain - the brain controls activity
 *
 * MutatingAntSprite.spawn(n: number);
 *
 */
let DEBUG = true;

export default class MutatingAntSprite extends AntSprite<MutatingAnt> {
    private readonly id: number = IdSource.nextId(MutatingAntSprite.constructor.name);
    private updateDeltaAccum = 0;
    private thinkingStartMs: number

    private fadeTween: Phaser.Tweens.Tween;
    private readonly antenna: Arc[] = [];
    private readonly nearestFoodLine: Line;


    public score: number = 0;
    private lastPoints: number = 0;

    private world: World;
    private config: MutatingAntConfig;

    constructor(scene: MutationScene, config: MutatingAntConfig) {
        super(scene, config.x, config.y, config.texture);
        this.ant = MutatingAnt.create();
        this.nearestFoodLine = scene.add.line(0, 0, config.x, config.y, 200, 200, 0xB3FFCC, .3);
        this.nearestFoodLine.setDepth(this.depth);
        this.antenna[0] = scene.add.circle(100, 100, 5, 0xFF0000, .3);
        this.antenna[1] = scene.add.circle(100, 100, 5, 0x00FF00, .3);

        this.fadeTween = scene.tweens.add({
            targets: [this, this.antenna[0], this.antenna[1], this.nearestFoodLine],
            alpha: {from: 1, to: 0},
            ease: 'Linear',       // 'Cubic', 'Elastic', 'Bounce', 'Back'
            duration: 1000,
            delay: 500,
            repeat: 0,            // -1: infinity
            yoyo: false,
            onComplete: () => {
               this.setActive(false);
            }
        });

        this.config = config;
        this.reset();

        // Save for later
        this.world = scene.world;
        // We're always moving! Get it started
        this.play();
    }

    reset() {
        this.fadeTween.restart()
        this.fadeTween.pause();

        this.score = 0;
        this.lastPoints = 0;

        this.updateDeltaAccum = 0;
        this.thinkingStartMs = 0;

        // movement
        // 0 is pointing right
        this.ant.headingRadians = 0;
        this.ant.vx = 0;
        this.ant.vy = 0;
        this.ant.x = this.config.x;
        this.ant.y = this.config.y;
        this.ant.speed = 5;

        this.setRotation(this.ant.headingRadians);
    }

    protected preUpdate(time: number, delta: number): void {
        this.play();
        super.update(time, delta);
        if (this.ant.isDead() && this.fadeTween.isPaused()) {
            this.fadeTween.play();
        }

        this.updateDeltaAccum += delta;
        if (this.updateDeltaAccum <= 100) {
            return;
        }

        // think()
        if (!this.thinkingStartMs) {
            this.thinkingStartMs = window.performance.now();

            let values: number[] = this.world.calcIntensity([{x: this.ant.x, y: this.ant.y}]);
            let points = values[0] * 100;

            // The best ants move toward food
            // punish by removing points if they move away from food
            this.score += points - this.lastPoints;
            this.lastPoints = points;

            this.ant.think(this.world)
                .then(() => {
                    // Point the sprite in the right direction
                    this.updateDirection(this.ant.headingRadians);
                    this.ant.move();
                    this.thinkingStartMs = 0
                })
                .catch(() => this.debug('rejected'))
                .finally(() => {
                    // reset the update so we'll think again later
                    this.updateDeltaAccum = 0;
                })
            ;

        } else {
            // console.log("Still thinking!" + (window.performance.now() - this.thinkingStartMs) + "ms");
            this.ant.move();
            // TODO: How does this 'move' deal with interactive with the world (physical ?
        }
        this.adjustDebugObjects();
    }

    private adjustDebugObjects() {
        let nearestFood = this.getNearestFood(this);
        // TBD: Understand these x/y offsets?
        this.nearestFoodLine.setTo(
            nearestFood.food.x + 100, nearestFood.food.y + 64,
            this.x + 100, this.y + 50
        );

        if (nearestFood.distance > 500) {
            this.nearestFoodLine.setStrokeStyle(5, 0xFF0000, .3);
        } else {
            this.nearestFoodLine.setStrokeStyle(5, 0xFFFF00, .3);
        }

        let sensors = this.ant.getSensors();
        this.antenna[0].x = sensors[0].x;
        this.antenna[0].y = sensors[0].y;
        this.antenna[1].x = sensors[1].x;
        this.antenna[1].y = sensors[1].y;
    }

    public getNearestFood(ant: MutatingAntSprite) {
        let d = Number.MAX_VALUE;
        let closest;
        for (let i = 0; i < this.world.food.length; ++i) {
            let c = this.world.food[i]
            if (!c.isAlive()) {
                continue;
            }
            let dist = Phaser.Math.Distance.Between(this.x, this.y, c.x, c.y);
            if (dist < d) {
                d = dist;
                closest = c;
            }
            // TODO: Add real collision detection
            if (dist < 30) {
                const consume = 25;
                c.consumeHealth(consume);
                ant.ant.restoreHealth(consume);
                ant.score += consume;
                console.log(`${c.id}(${c.x},${c.y}) touched by ${this.id}(${this.x},${this.y})`, c.health)
            }
        }
        return {food: closest, distance: d};
    }

    getScore(): number {
        return this.score;
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

    private updateDirection(radians: integer) {
        let found = MutatingAntSprite.radiansToDirection[0];
        for (let i = 0; i < MutatingAntSprite.radiansToDirection.length; ++i) {
            let check = MutatingAntSprite.radiansToDirection[i];
            if (radians >= check.radians - MutatingAntSprite.PI_OVER_8 &&
                radians <= check.radians + MutatingAntSprite.PI_OVER_8) {
                found = check;
                break;
            }
        }
        let adjusted = found.radians - radians;

        this.setDirection(found.dir);
        this.setRotation(adjusted);
    }

    // TODO: Need a logger
    private debug(...args: any[]) {
        if (DEBUG && this.id == 1) {
            console.log('id: ' + this.id, args);
        }
    }
}

export class MutatingAntConfig {
    x: number;
    y: number;
    texture: AntSprite.Skin
}

