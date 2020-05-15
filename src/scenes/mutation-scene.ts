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

const matingPairs = 2; // 2 pairs = 4
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
    private topScoresLabel: Text[] = [];
    private antenna: Arc[] = [];
    private lines: any [] = [];
    private lastScoreHash: number;
    private highScore: number = 0;
    private highScoreGens: number[] = [];
    private highScoreBrain: AntBrain;

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
    private readonly FOOD = 10;

    create(): void {
        // this.physics.startSystem(Phaser.Physics.ARCADE);

        this.graphics = this.add.graphics();
        this.graphics.setDepth(10);
        this.graphics.lineStyle(2, 0xffff00, 1);

        this.cameras.main.setBackgroundColor('#207621');
        let background = this.add.tileSprite(0, 0, 1600, 1200, 'background');
        background.setDepth(0);

        this.add.image(400, 300, "hole");
        Ant.init(this);

        this.foodGroup = this.add.group({classType: Ant, runChildUpdate: true});

        for (let i = 0; i < this.FOOD; ++i) {
            let food = new Ant(this, 300, 300, Ant.Skin.FIRE_ANT);
            this.placeRandomly(food);
            this.foodGroup.add(food, true);
            food.setActivity(Ant.Activity.CRIT_DIE);
            food.setDepth(10);
            food.setActive(true);
        }

        const CREATURES = 30;
        this.antGroup = this.add.group({classType: MutatingAnt, runChildUpdate: true});

        // create all the creatures
        for (let i = 0; i < CREATURES; ++i) {

            // get spawn point
            let startX = 400;
            let startY = 300;

            let ant = new MutatingAnt(this, {x: startX, y: startY, texture: Ant.Skin.FIRE_ANT});
            this.antGroup.add(ant, true);

            ant.setDepth(CREATURES - i);
            ant.setActive(true);

            this.antenna[2 * i] = this.add.circle(400, 300, 5, 0xFF0000);
            this.antenna[2 * i].setDepth(CREATURES + 1);

            this.antenna[2 * i + 1] = this.add.circle(100, 100, 5, 0x00FF00);
            this.antenna[2 * i + 1].setDepth(CREATURES + 1);

            this.lines[i] = this.add.line(0, 0, 100, 100, 200, 200, 0xB3FFCC);
            this.lines[i].setDepth(CREATURES + 1);
        }


        this.scoreBoard = this.add.text(10, 0, 'Progress: 0%', {color: '#0f0'});
        this.scoreBoard.setDepth(CREATURES + 1);

        for (let i = 0; i < 5; ++i) {
            this.topScoresLabel[i] = this.add.text(100, 100, '' + (i + 1));
            this.topScoresLabel[i].setDepth(CREATURES + 1);
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
    static maxScoreStaleTime = 2000;
    static currentScoreStaleTime = 0;
    static generationCount = 1;

    static scoreboardUpdateInterval = 500;
    static scoreboardIntervalTime = 0;
    static consumedFood: Set<Ant> = new Set<Ant>();

    update(time: number, delta: number): void {
        // score the children, pick best one replace the others brain with mutated
        let mutatingAnts = <MutatingAnt[]>this.antGroup.getChildren();

        // visualize the antenna
        for (let i = 0; i < mutatingAnts.length; i++) {
            let ant = mutatingAnts[i];
            let antennaPositions = ant.getAntennaPositions();
            let nearestFood = this.getNearestFood(ant);

            this.lines[i].setTo(
                nearestFood.food.x + 64, nearestFood.food.y + 64,
                ant.x + 64, ant.y + 64
            );
            if ( nearestFood.distance > 500 ) {
                this.lines[i].setFillStyle(0xFF0000);
            } else {
                this.lines[i].setFillStyle(0xFFFF00);
            }

            this.antenna[2 * i].x = antennaPositions.right.x;
            this.antenna[2 * i].y = antennaPositions.right.y;
            this.antenna[2 * i + 1].x = antennaPositions.left.x;
            this.antenna[2 * i + 1].y = antennaPositions.left.y;
        }

        let scored: any[] = _.sortBy(mutatingAnts, ['score']).reverse();

        MutationScene.scoreboardIntervalTime += delta;
        if (MutationScene.scoreboardIntervalTime > MutationScene.scoreboardUpdateInterval) {
            let scoreHash = scored.slice(0, 5).map((ant) => ant.score).reduce((p, c) => p + c);
            if (scoreHash === this.lastScoreHash) {
                MutationScene.currentScoreStaleTime += delta;
                if (MutationScene.currentScoreStaleTime > MutationScene.maxScoreStaleTime) {
                    MutationScene.currentScoreStaleTime = 0;
                    MutationScene.currentGenerationTime = Number.MAX_VALUE;
                    console.log("Resetting due to no progress");
                }
            } else {
                MutationScene.currentScoreStaleTime = 0;
                this.lastScoreHash = scoreHash;
            }
            // update scoreboard
            this.updateScoreboard(scored);

            for (let i = 0; i < this.topScoresLabel.length; ++i) {
                this.topScoresLabel[i].x = scored[i].x;
                this.topScoresLabel[i].y = scored[i].y;
            }
        }
        MutationScene.consumedFood.forEach((ant) => {
            this.placeRandomly(ant);
            // ant.setActive(false);
            // ant.setVisible(false);
        })
        MutationScene.consumedFood.clear();

        MutationScene.currentGenerationTime += delta;
        if (MutationScene.currentGenerationTime >= MutationScene.maxGenerationTime) {
            ++MutationScene.generationCount;
            MutationScene.currentGenerationTime = 0;
            // move the food
            let food = <Ant[]>this.foodGroup.getChildren();
            food.forEach(food => {
                this.placeRandomly(food);
                food.setActive(true);
                food.setVisible(true);
            })
            // kill all the creatures
            mutatingAnts.forEach((ant) => ant.setActive(false));

            // breed the top scorers (make babies)
            // create a new generation using mutations of the baby brains

            if (scored[0].score > this.highScore) {
                this.highScoreBrain = scored[0].brain.mutate(0);
                this.highScore = scored[0].score;
                this.highScoreGens.unshift(MutationScene.generationCount - 1);
                if (this.highScoreGens.length > 10) {
                    this.highScoreGens.pop();
                }
            } else {
                console.log("keeping high score brain!");
                scored.unshift({score: this.highScore, brain: this.highScoreBrain});
            }
            console.log(scored.map((ant) => ant.score));

            let archetypeBabyBrains: AntBrain[] = [];
            // randomly pull pairs to mate and create archetype baby brains
            let shuffled = _.shuffle(scored.slice(0, matingPairs * 2));
            while (shuffled.length >= 2) {
                let mom = <MutatingAnt>shuffled.shift();
                let dad = <MutatingAnt>shuffled.shift();
                archetypeBabyBrains.push(mom.brain.breed(dad.brain));
            }

            // A little brain surgery
            mutatingAnts.forEach((ant, i) => {
                if (i === 0) {
                    // always keep the high score
                    ant.replaceBrain(this.highScoreBrain.mutate(0));
                    console.log('high score brain');
                } else if (i < matingPairs * 2) {
                    // lower mutation of top score brains
                    ant.replaceBrain(scored[i].brain.mutate(.1));
                    console.log('mating Pair brain');
                } else if (Math.random() < .1) { // 10% random
                    // use a completely random brain
                    ant.replaceBrain(new AntBrain())
                    console.log('random brain');
                } else {
                    // grab a random baby brain
                    let sample = _.sample(archetypeBabyBrains);
                    ant.replaceBrain(sample.mutate(.3));
                    // ant.replaceBrain(this.highScoreBrain.mutate(.3));
                    console.log('bred brain');
                }
                this.spawnAnt(ant);
            })

            // baby brains don't get used
            archetypeBabyBrains.forEach((brain: AntBrain) => brain.dispose());
        }
    }

    private placeRandomly(food: Ant) {
        food.x = _.random(0, 800);
        food.y = _.random(0, 600);
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
            `High Score: ${this.highScore.toFixed(2)} - ${this.highScoreGens}`,
            `Top Scores: ${topScores[0]} \n` + topScores,
            `Bottom: ${topScores[topScores.length - 1]} \n` + formatScore(scored[scored.length - 1])
        ];

        this.scoreBoard.setText(debug);
    }

    getNearestFood(ant: MutatingAnt) {
        let d = Number.MAX_VALUE;
        let children = this.foodGroup.getChildren();
        let closest;
        for (let i = 0; i < children.length; ++i) {
            let c = <Ant>children[i]
            if (!c.active) {
                continue;
            }
            let dist = Phaser.Math.Distance.Between(ant.x, ant.y, c.x, c.y);
            if (dist < d) {
                d = dist;
                closest = c;
            }
            if (dist < 30) {
                MutationScene.consumedFood.add(c);
                ant.score += 100;
            }
        }
        return {food: closest, distance: d};
    }

    private spawnAnt(ant: MutatingAnt) {
        ant.x = 400;
        ant.y = 300;
        ant.reset();
        ant.setActive(true);
    }
}
