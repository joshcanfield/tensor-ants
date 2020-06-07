import AntSprite from "./AntSprite";
import Ant from "../model/Ant";
import Direction from "../model/Direction";
import Activity = Ant.Activity;

export default class FoodSprite extends AntSprite<Ant> {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, AntSprite.Skin.FIRE_ANT, 0);
        this.ant = new Ant(Activity.CRIT_DIE, Direction.RIGHT, 100);
        this.ant.x = x;
        this.ant.y = y;
        this.play();
    }

}
