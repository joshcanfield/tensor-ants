import 'phaser'
import Ant from "../sprites/Ant";
import grassImg from '../assets/grass.jpg';
import holeImg from '../assets/hole.png';
import Group = Phaser.GameObjects.Group;
import MutatingAnt from "../creature/MutatingAnt";
import Rectangle = Phaser.Geom.Rectangle;

/**
 * The Mutation Scene
 *
 *
 */
export default class MutationScene extends Phaser.Scene {
    antGroup: Group;

    public graphics: Phaser.GameObjects.Graphics;

    constructor() {
        super('mutationScene');
    }

    // noinspection JSUnusedGlobalSymbols
    preload(): void {
        Ant.preload(this)
        this.load.image('background', grassImg);
        this.load.image('hole', holeImg);
    }

    // noinspection JSUnusedGlobalSymbols
    create(): void {
        // this.physics.startSystem(Phaser.Physics.ARCADE);

        this.graphics = this.add.graphics();
        this.graphics.setDepth(10);
        this.graphics.lineStyle(2, 0xffff00, 1);

        this.cameras.main.setBackgroundColor('#207621');
        let background = this.add.tileSprite(0, 0, 1600, 1200, 'background');
        background.setDepth(0);

        this.add.image(100, 100, "hole");

        Ant.init(this);

        const CREATURES = 10;
        this.antGroup = this.add.group({classType: MutatingAnt, runChildUpdate: true});

        // create all the creatures
        for (let i = 0; i < CREATURES; ++i) {
            // get spawn point
            let startX = 100
            let startY = 100

            let ant = new MutatingAnt(this, {x:startX, y:startY, texture: Ant.Skin.FIRE_ANT});
            this.antGroup.add(ant, true);

            ant.setDepth(CREATURES - i);
            ant.setActive(true);
        }
    }

    /**
     * Update the scene
     * -- stats
     * -- leader board
     * -- clock
     */
    _lastUpdate: number
    update(time: number, delta: number): void {
        // control how often creatures get to think
        // accumulate delta
        const _this = this;
        this.antGroup.getChildren().forEach(function (ant: MutatingAnt) {
           // score the ant

        })
    }
}
