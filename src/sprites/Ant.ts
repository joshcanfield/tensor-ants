import 'phaser'
// https://opengameart.org/content/antlion
import antLionImg from '../assets/antlion_0.png';
import fireAntImg from '../assets/fire_ant.png';
import iceAntImg from '../assets/ice_ant.png';
import _ from 'lodash';
import Scene = Phaser.Scene;


export class Ant extends Phaser.GameObjects.Sprite {
    private readonly skin: Ant.Skin;

    private activity = Ant.Activity.STAND;
    private direction = Direction.LEFT;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | integer) {
        super(scene, x, y, texture, frame);
        if (Object.keys(Ant.Skin).indexOf(texture)) {
            this.skin = <any>texture;
        } else {
            this.skin = Ant.Skin.ANT_LION;
            console.error("Unknown texture " + texture + ". Default to " + this.skin);
        }

        // We're always moving! Get it started
        this.play();
    }

    update(time: any, delta: any): void {
        super.update(time, delta);
        this.anims.update(time, delta);
    }

    public play(): Ant {
        super.play(Ant.buildAnimKey(this.skin, this.direction, this.activity));
        return this;
    }

    public getDirection(): Direction {
        return this.direction;
    }

    public setDirection(dir: Direction) {
        if (this.direction != dir) {
            this.direction = dir;
            this.play();
        }
    }

    public getActivity(): Ant.Activity {
        return this.activity;
    }

    public setActivity(newActivity: Ant.Activity) {
        if (this.activity != newActivity) {
            this.activity = newActivity;
            this.play();
        }
    }

    static preload(scene: Scene) {
        let antFrameConfig = {frameWidth: 128, frameHeight: 128};
        scene.load.spritesheet(Ant.Skin.ANT_LION, antLionImg, antFrameConfig);
        scene.load.spritesheet(Ant.Skin.FIRE_ANT, fireAntImg, antFrameConfig);
        scene.load.spritesheet(Ant.Skin.ICE_ANT, iceAntImg, antFrameConfig);
    }

    static init(scene: Scene) {
        // create animation for each skin, direction and activity
        Object.values(Ant.Skin).forEach((skinValue) => {
            let skin: Ant.Skin = <any>skinValue;
            Object.values(Direction).filter(isFinite).forEach((dirValue) => {
                let dir: Direction = <any>dirValue;
                Object.values(Ant.Activity).forEach((activityValue) => {
                    let activity: Ant.Activity = <any>activityValue;
                    let animKey = Ant.buildAnimKey(skin, dir, activity);
                    scene.anims.create(
                        {
                            key: animKey,
                            frames: scene.anims.generateFrameNumbers(skin, Ant.spriteOffset(activity, dir)),
                            frameRate: 8, // play with this for running
                            yoyo: activity === Ant.Activity.ATTACK,
                            repeat: activity === Ant.Activity.WALK || activityValue === Ant.Activity.STAND ? -1 : 0,
                        }
                    );
                })
            })
        });
    }

    /**
     * Build the animation key for the specific skin, direction and activity
     */
    static buildAnimKey(skin: Ant.Skin, dir: Direction, activity: Ant.Activity) {
        return skin + '_' + activity + '_' + dir;
    }

    static spriteOffset(activity: Ant.Activity, direction: Direction): any {
        function animOffset(start: number, length: number) {
            return {'start': start, 'end': start + length - 1};
        }

        /**
         0-3   standing
         4-11  walking
         12-15 attack
         16-17 block
         18-23 hit/die
         24-31 critdie
         */
        switch (activity) {
            case Ant.Activity.STAND:
                return animOffset(+direction * 32, 4);
            case Ant.Activity.WALK:
                return animOffset(+direction * 32 + 4, 8);
            case Ant.Activity.ATTACK:
                return animOffset(+direction * 32 + 12, 4);
            case Ant.Activity.BLOCK:
                return animOffset(+direction * 32 + 16, 2);
            case Ant.Activity.HIT_DIE:
                return animOffset(+direction * 32 + 18, 6);
            case Ant.Activity.CRIT_DIE:
                return animOffset(+direction * 32 + 24, 8);
            default:
                return animOffset(+direction * 32, 4);
        }
    }
}

export enum Direction {
    LEFT = 0,
    UP_LEFT,
    UP,
    UP_RIGHT,
    RIGHT,
    DOWN_RIGHT,
    DOWN,
    DOWN_LEFT,
}

export namespace Ant {
    export enum Skin {
        ANT_LION = 'ant-lion',
        FIRE_ANT = 'fire-ant',
        ICE_ANT = 'ice-ant',
    }

    export enum Activity {
        STAND = 'stand',
        WALK = 'walk',
        ATTACK = 'attack',
        BLOCK = 'block',
        HIT_DIE = 'hit-die',
        CRIT_DIE = 'crit-die',
    }
}

export default Ant;
