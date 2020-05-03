import 'phaser'
import Ant from "../sprites/Ant";
import grassImg from '../assets/grass.jpg';
import holeImg from '../assets/hole.png';
import MutatingAnt from "../creature/MutatingAnt";
import Phaser from "phaser";
import _ from 'lodash';
import AntBrain from "../creature/AntBrain";
import Group = Phaser.GameObjects.Group;
import Text = Phaser.GameObjects.Text;
import Arc = Phaser.GameObjects.Arc;

/**
 * The Mutation Scene
 *
 *
 */
export default class MutationScene extends Phaser.Scene {
    antGroup: Group;
    foodGroup: Group;

    public graphics: Phaser.GameObjects.Graphics;
    private scoreBoard: Text;
    private topFiveLabels: Text[] = [];
    private antenna: Arc[] = [];

    constructor() {
        super('mutationScene');
    }

    // noinspection JSUnusedGlobalSymbols
    preload(): void {
        Ant.preload(this);
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

        this.foodGroup = this.add.group({classType: Ant, runChildUpdate: true});

        for (let i = 0; i < 5; ++i) {
            let food = new Ant(this, 300, 300, Ant.Skin.FIRE_ANT);
            this.placeRandomly(food);
            this.foodGroup.add(food, true);
            food.setActivity(Ant.Activity.CRIT_DIE);
            food.setDepth(10);
            food.setActive(true);

        }

        const CREATURES = 20;
        this.antGroup = this.add.group({classType: MutatingAnt, runChildUpdate: true});

        // create all the creatures
        for (let i = 0; i < CREATURES; ++i) {

            // get spawn point
            let startX = 100;
            let startY = 100;

            let ant = new MutatingAnt(this, {x: startX, y: startY, texture: Ant.Skin.FIRE_ANT});
            this.antGroup.add(ant, true);

            ant.setDepth(CREATURES - i);
            ant.setActive(true);

            this.antenna[2 * i] = this.add.circle(100, 100, 5, 0xFF0000);
            this.antenna[2 * i].setDepth(CREATURES + 1);

            this.antenna[2 * i + 1] = this.add.circle(100, 100, 5, 0x00FF00);
            this.antenna[2 * i + 1].setDepth(CREATURES + 1);
        }


        this.scoreBoard = this.add.text(10, 0, 'Progress: 0%', {color: '#0f0'});
        this.scoreBoard.setDepth(CREATURES + 1);

        for (let i = 0; i < 5; ++i) {
            this.topFiveLabels[i] = this.add.text(100, 100, '' + (i + 1));
            this.topFiveLabels[i].setDepth(CREATURES + 1);
        }
    }

    /**
     * Update the scene
     * -- stats
     * -- leader board
     * -- clock
     */
    static maxGenerationTime = 20_000;
    static currentGenerationTime = 0;
    static generationCount = 1;

    static scoreboardUpdateInterval = 500;
    static scoreboardIntervalTime = 0;
    static consumedFood: Set<Ant> = new Set<Ant>();

    update(time: number, delta: number): void {
        let scored: any[] = [];
        // score the children, pick best one replace the others brain with mutated
        let mutatingAnts = <MutatingAnt[]>this.antGroup.getChildren();

        // visualize the antenna
        for (let i = 0; i < mutatingAnts.length; i++) {
            let ant = mutatingAnts[i];
            let antennaPositions = ant.getAntennaPositions();

            this.antenna[2 * i].x = ant.x + antennaPositions.right.x;
            this.antenna[2 * i].y = ant.y + antennaPositions.right.y;
            this.antenna[2 * i + 1].x = ant.x + antennaPositions.left.x;
            this.antenna[2 * i + 1].y = ant.y + antennaPositions.left.y;
        }

        scored = _.sortBy(mutatingAnts, ['score']).reverse();

        MutationScene.scoreboardIntervalTime += delta;
        if (MutationScene.scoreboardIntervalTime > MutationScene.scoreboardUpdateInterval) {
            // update scoreboard
            this.updateScoreboard(scored);

            for (let i = 0; i < this.topFiveLabels.length; ++i) {
                this.topFiveLabels[i].x = scored[i].x;
                this.topFiveLabels[i].y = scored[i].y;
            }
        }
        MutationScene.consumedFood.forEach((ant) => {
            this.placeRandomly(ant);
        })
        MutationScene.consumedFood.clear();

        MutationScene.currentGenerationTime += delta;
        if (MutationScene.currentGenerationTime > MutationScene.maxGenerationTime) {
            ++MutationScene.generationCount;
            MutationScene.currentGenerationTime = 0;
            // move the food
            let food = <Ant[]>this.foodGroup.getChildren();
            food.forEach(food => {
                this.placeRandomly(food);
            })
            // kill all the creatures
            mutatingAnts.forEach((ant) => ant.setActive(false));

            // breed the top scorers (make babies)
            // create a new generation using mutations of the baby brains

            let bestBrain = scored[0].brain;
            let archetypeBabyBrains: AntBrain[] = [];
            // randomly pull pairs to mate and create archetype baby brains
            let shuffled = _.shuffle(scored.slice(0, 2));
            while (shuffled.length >= 2) {
                let mom = <MutatingAnt>shuffled.shift();
                let dad = <MutatingAnt>shuffled.shift();
                archetypeBabyBrains.push(mom.brain.breed(dad.brain));
            }

            // A little brain surgery
            mutatingAnts.forEach((ant, i) => {
                if (i == 0) {
                    // get a copy of the best brain
                    ant.replaceBrain(bestBrain.mutate(0));
                } else if (i == 0) {
                    // use a completely random brain
                    ant.replaceBrain(new AntBrain())
                } else {
                    // grab a random baby brain
                    let sample = _.sample(archetypeBabyBrains);
                    ant.replaceBrain(sample.mutate(.3));
                }
                this.spawnAnt(ant);
            })

            // baby brains don't get used
            archetypeBabyBrains.forEach((brain: AntBrain) => brain.dispose());
        }
    }

    private placeRandomly(food: Ant) {
        food.x = _.random(200, 800);
        food.y = _.random(200, 600);
    }

    private updateScoreboard(scored: any[]) {
        function formatScore(ant: MutatingAnt) {
            return ("" + ant.id).padStart(5, ' ') + ": " + ant.score.toFixed(2);
        }

        let topAnts = scored.slice(0, 5);
        let topScores = topAnts.map(formatScore).join("\n");
        let timeRemaining = (MutationScene.maxGenerationTime - MutationScene.currentGenerationTime) / 1000;
        const debug = [
            `Time Remaining: ${timeRemaining.toFixed(2)}; Generation: ${MutationScene.generationCount}`,
            `Top Scores: ${topScores[0]} \n` + topScores,
            `Bottom: ${topScores[topScores.length - 1]} \n` + formatScore(scored[scored.length - 1])
        ];

        this.scoreBoard.setText(debug);
    }

    getNearestFood(ant: Ant) {
        let d = Number.MAX_VALUE;
        let children = this.foodGroup.getChildren();
        let closest;
        for (let i = 0; i < children.length; ++i) {
            let c = <Ant>children[i]
            let dist = Phaser.Math.Distance.Between(ant.x, ant.y, c.x, c.y);
            if (dist < d) {
                d = dist;
                closest = c;
            }
            if (dist < 30){
                MutationScene.consumedFood.add(c);
            }
        }
        return {food: closest, distance: d};
    }

    private spawnAnt(ant: MutatingAnt) {
        ant.x = 100;
        ant.y = 100;
        ant.score = 0;

        ant.setActive(true);
    }
}
