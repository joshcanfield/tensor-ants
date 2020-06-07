import 'phaser'
import AntSprite from "../sprites/AntSprite";
import grassImg from '../assets/grass.jpg';
import holeImg from '../assets/hole.png';
import Group = Phaser.GameObjects.Group;
import Ant from "../model/Ant";

/**
 * The Demo Scene
 *
 * A place to demonstrate experiments
 */
export default class DemoScene extends Phaser.Scene {
    antGroup: Group;

    constructor() {
        super('demoScene');
    }

    // noinspection JSUnusedGlobalSymbols
    preload(): void {
        AntSprite.preload(this)
        this.load.image('background', grassImg);
        this.load.image('hole', holeImg);
    }

    // noinspection JSUnusedGlobalSymbols
    create(): void {
        let backgroundSprite = this.add.tileSprite(0, 0, 1600, 1200, 'background');

        this.add.image(260, 120, "hole");
        this.add.image(550, 350, "hole");


        AntSprite.init(this);

        const CREATURES = 10;
        this.cameras.main.setBackgroundColor('#207621');
        this.antGroup = this.add.group({classType: AntSprite, runChildUpdate: false});

        // create all the creatures
        for (let i = 0; i < CREATURES; ++i) {
            // get spawn point
            let startX = 100 + (i % 5 * 80);
            let startY = 100 + (Math.floor(i / 5) * 80);

            let ant = <AntSprite<Ant>>this.antGroup.get(startX, startY, AntSprite.Skin.FIRE_ANT, 0, true);

            let activities = Object.values(Ant.Activity);

            let activity = <any>activities[i % activities.length];
            const that = this;
            ant.setActivity(activity);
            ant.setInteractive({draggable: true}).on('pointerdown', function () {
                if (ant.getActivity() !== Ant.Activity.CRIT_DIE) {
                    ant.setActivity(Ant.Activity.CRIT_DIE);
                    that.time.delayedCall(3000, function () {
                        that.tweens.add({
                            targets: ant,
                            alpha: 0,
                            duration: 2000,
                            ease: 'Power2'
                        });
                    })
                } else {
                    ant.setActivity(Ant.Activity.WALK);
                }
            });


            ant.setDepth(CREATURES - i);
            ant.setActive(true);
        }
    }
}
