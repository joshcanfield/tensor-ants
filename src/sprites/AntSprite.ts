import 'phaser'
import Scene = Phaser.Scene;

// https://opengameart.org/content/antlion
import antLionImg from '../assets/antlion_0.png';
import fireAntImg from '../assets/fire_ant.png';
import iceAntImg from '../assets/ice_ant.png';

import Ant from "../model/Ant";
import Direction from "../model/Direction";

import _ from 'lodash';

/**
 * Manage rendering the ant model
 */
export abstract class AntSprite<T extends Ant> extends Phaser.GameObjects.Sprite {

    get ant(): T {
        return this._ant;
    }

    set ant(value: T) {
        if (!(value instanceof Ant)) {
            debugger
        }
        this._ant = value;
    }

    private _ant: T;
    private readonly skin: AntSprite.Skin;

    protected constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | integer) {
        super(scene, x, y, texture, frame);
        this.setDisplayOrigin(64, 84);

        if (Object.keys(AntSprite.Skin).indexOf(texture)) {
            this.skin = <any>texture;
        } else {
            this.skin = AntSprite.Skin.ANT_LION;
            console.error("Unknown texture " + texture + ". Default to " + this.skin);
        }
    }

    update(time: any, delta: any): void {
        // move with the ant
        this.x = this.ant.x;
        this.y = this.ant.y;

        super.update(time, delta);
        this.anims.update(time, delta);
    }

    public setFrameRate(frameRate: number): void {
        this.anims.msPerFrame = 1000 / frameRate;
    }

    public play(): AntSprite<T> {
        let key = AntSprite.buildAnimKey(this.skin, this._ant.direction, this._ant.activity);
        let currentKey = this.anims?.currentAnim?.key;
        if (currentKey != key) {
            super.play(key);
        }
        return this;
    }

    public setDirection(dir: Direction) {
        if (this._ant.direction == dir) {
            return;
        }
        this._ant.direction = dir;
        this.play();
    }

    public getActivity(): Ant.Activity {
        return this._ant.activity;
    }

    public setActivity(newActivity: Ant.Activity) {
        if (this._ant.activity == newActivity) {
            return;
        }
        this._ant.activity = newActivity;
        this.play();
    }

    static preload(scene: Scene) {
        let antFrameConfig = {frameWidth: 128, frameHeight: 128};
        scene.load.spritesheet(AntSprite.Skin.ANT_LION, antLionImg, antFrameConfig);
        scene.load.spritesheet(AntSprite.Skin.FIRE_ANT, fireAntImg, antFrameConfig);
        scene.load.spritesheet(AntSprite.Skin.ICE_ANT, iceAntImg, antFrameConfig);
    }

    static init(scene: Scene) {
        // create animation for each skin, direction and activity
        Object.values(AntSprite.Skin).forEach((skinValue) => {
            let skin: AntSprite.Skin = <any>skinValue;
            Object.values(Direction).filter(isFinite).forEach((dirValue) => {
                let dir: Direction = <any>dirValue;
                Object.values(Ant.Activity).forEach((activityValue) => {
                    let activity: Ant.Activity = <any>activityValue;
                    let animKey = AntSprite.buildAnimKey(skin, dir, activity);
                    scene.anims.create(
                        {
                            key: animKey,
                            frames: scene.anims.generateFrameNumbers(skin, AntSprite.spriteOffset(activity, dir)),
                            frameRate: 6, // play with this for running
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
    static buildAnimKey(skin: AntSprite.Skin, dir: Direction, activity: Ant.Activity) {
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

    protected log(message: string) {
        console.log('id:' + this._ant.id + ':', message);
    }

    relocate(x: number, y: number) {
        this.ant.x = x;
        this.ant.y = y;
        this.x = x;
        this.y = y;
    }

}

export namespace AntSprite {
    export enum Skin {
        ANT_LION = 'ant-lion',
        FIRE_ANT = 'fire-ant',
        ICE_ANT = 'ice-ant',
    }
}

export default AntSprite;
