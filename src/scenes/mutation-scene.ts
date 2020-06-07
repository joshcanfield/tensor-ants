import Phaser from "phaser";
import Group = Phaser.GameObjects.Group;
import Text = Phaser.GameObjects.Text;
import Arc = Phaser.GameObjects.Arc;

import MutatingAntSprite from "../sprites/MutatingAntSprite";
import AntSprite from "../sprites/AntSprite";

import grassImg from '../assets/grass.jpg';
import holeImg from '../assets/hole.png';

import World from "../model/World";
import Ant from "../model/Ant";
import MutatingAnt from "../model/MutatingAnt";

import _ from 'lodash';
import FoodSprite from "../sprites/FoodSprite";

const matingPairs = 2; // 2 pairs = 4

/**
 * The Mutation Scene
 */
export default class MutationScene extends Phaser.Scene {
    world: World
    antGroup: Group;
    foodGroup: Group;

    public graphics: Phaser.GameObjects.Graphics;
    private scoreBoard: Text;
    private topScoresLabel: Text[] = [];
    private antenna: Arc[] = [];
    private lines: any [] = [];
    private lastScoreHash: number;
    private highScore: number = Number.MIN_VALUE;
    private highScoreGens: number[] = [];
    private highScoreAnt: MutatingAnt;

    constructor() {
        super('mutationScene');
        this.world = new World();
    }

    // noinspection JSUnusedGlobalSymbols
    preload(): void {
        MutatingAntSprite.preload(this);
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
        MutatingAntSprite.init(this);

        this.foodGroup = this.add.group({classType: AntSprite, runChildUpdate: true});

        for (let i = 0; i < this.FOOD; ++i) {
            let food = new FoodSprite(this, 300, 300);
            this.world.food.push(food.ant);
            MutationScene.placeRandomly(food);
            this.foodGroup.add(food, true);
            food.setDepth(10);
            food.setActive(true);
        }

        const CREATURES = 30;
        this.antGroup = this.add.group({classType: MutatingAntSprite, runChildUpdate: true});

        // create all the creatures
        for (let i = 0; i < CREATURES; ++i) {

            // get spawn point
            let startX = 400;
            let startY = 300;

            let ant = new MutatingAntSprite(this, {
                x: startX,
                y: startY,
                texture: i == 0 ? AntSprite.Skin.ICE_ANT : AntSprite.Skin.FIRE_ANT
            });
            this.antGroup.add(ant, true);

            ant.setDepth(CREATURES - i);
            ant.setActive(true);

            this.antenna[2 * i] = this.add.circle(400, 300, 5, 0xFF0000, .3);
            this.antenna[2 * i].setDepth(CREATURES + 1);

            this.antenna[2 * i + 1] = this.add.circle(100, 100, 5, 0x00FF00, .3);
            this.antenna[2 * i + 1].setDepth(CREATURES + 1);

            this.lines[i] = this.add.line(0, 0, 100, 100, 200, 200, 0xB3FFCC, .3);
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
    static maxGenerationTime = 60_000;
    static currentGenerationTime = 0;
    static maxScoreStaleTime = 2000;
    static currentScoreStaleTime = 0;
    static generationCount = 1;

    static scoreboardUpdateInterval = 500;
    static scoreboardIntervalTime = 0;
    static consumedFood: Set<FoodSprite> = new Set<FoodSprite>();

    update(time: number, delta: number): void {
        // score the children, pick best one replace the others brain with mutated
        let mutatingAnts = <MutatingAntSprite[]>this.antGroup.getChildren();

        // visualize the antenna
        for (let i = 0; i < mutatingAnts.length; i++) {
            let antSprite = mutatingAnts[i];
            let antennaPositions = antSprite.ant.getSensors();
            let nearestFood = this.getNearestFood(antSprite);

            this.lines[i].setTo(
                nearestFood.food.x + 64, nearestFood.food.y + 64,
                antSprite.x + 64, antSprite.y + 64
            );
            if (nearestFood.distance > 500) {
                this.lines[i].setStrokeStyle(5, 0xFF0000, .3);
            } else {
                this.lines[i].setStrokeStyle(5, 0xFFFF00, .3);
            }

            this.antenna[2 * i].x = antennaPositions[0].x;
            this.antenna[2 * i].y = antennaPositions[0].y;
            this.antenna[2 * i + 1].x = antennaPositions[1].x;
            this.antenna[2 * i + 1].y = antennaPositions[1].y;
        }

        let scoredSprites: MutatingAntSprite[] = _.sortBy(mutatingAnts, ['score']).reverse()

        MutationScene.scoreboardIntervalTime += delta;
        if (MutationScene.scoreboardIntervalTime > MutationScene.scoreboardUpdateInterval) {
            let scoreHash = scoredSprites.slice(0, 5).map((ant) => ant.score).reduce((p, c) => p + c);
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
            this.updateScoreboard(scoredSprites);

            for (let i = 0; i < this.topScoresLabel.length; ++i) {
                this.topScoresLabel[i].x = scoredSprites[i].x;
                this.topScoresLabel[i].y = scoredSprites[i].y;
            }
        }
        MutationScene.consumedFood.forEach((ant) => {
            MutationScene.placeRandomly(ant);
        })
        MutationScene.consumedFood.clear();

        MutationScene.currentGenerationTime += delta;
        if (MutationScene.currentGenerationTime >= MutationScene.maxGenerationTime) {
            ++MutationScene.generationCount;
            MutationScene.currentGenerationTime = 0;
            // move the food
            let food = <FoodSprite[]>this.foodGroup.getChildren();
            food.forEach(food => {
                MutationScene.placeRandomly(food);
                food.setActive(true);
                food.setVisible(true);
            })
            // kill all the creatures
            mutatingAnts.forEach((ant) => ant.setActive(false));

            // breed the top scorers (make babies)
            // create a new generation using mutations of the baby brains

            if (scoredSprites[0].score > this.highScore) {
                this.highScoreAnt = scoredSprites[0].ant.clone();
                this.highScore = scoredSprites[0].score;
                this.highScoreGens.unshift(MutationScene.generationCount - 1);
                if (this.highScoreGens.length > 10) {
                    this.highScoreGens.pop();
                }
            } else {
                console.log("keeping high score brain!");
                scoredSprites.unshift(<MutatingAntSprite>{score: this.highScore, ant: this.highScoreAnt});
            }
            console.log(scoredSprites.map((ant) => ant.score));

            // clone the breeders so we can clean up the existing ants
            let breederAnts: MutatingAnt[] = scoredSprites.slice(0, matingPairs * 2).map((scored => {
                if (scored.ant === undefined) {
                    debugger
                }
                return scored.ant.clone();
            }));
            // A little brain surgery
            mutatingAnts.forEach((antSprite, i) => {
                // don't leak any memory
                antSprite.ant.dispose();
                // choose a strategy for mutating the ant
                if (i === 0) {
                    // always keep the high score intact
                    antSprite.ant = breederAnts[0].mutate(0.0);
                    console.log('high score brain');
                } else if (i < matingPairs * 2) {
                    // lower mutation of top score brains
                    antSprite.ant = breederAnts[i].mutate(0.3);
                    console.log('breeder brain');
                } else if (Math.random() < .1) { // 10% random
                    // use a completely random brain
                    antSprite.ant = MutatingAnt.create();
                    console.log('random brain');
                } else {
                    // grab a random baby brain
                    let sample1: MutatingAnt = _.sample(breederAnts);
                    let sample2: MutatingAnt = _.sample(breederAnts);
                    let child = sample1.breedWith(sample2);
                    antSprite.ant = child.mutate(.3);
                    child.dispose();
                    console.log('bred brain');
                }
                MutationScene.spawnAnt(antSprite);
            })

            // breeders don't get used
            breederAnts.forEach((ant: MutatingAnt) => ant.dispose());
        }
    }

    private static placeRandomly(food: FoodSprite) {
        food.relocate(_.random(0, 800), _.random(0, 600))
    }

    private updateScoreboard(scored: any[]) {
        function formatScore(antSprite: MutatingAntSprite) {
            let id = antSprite.ant.id.toString();
            let score = antSprite.score;
            let health = antSprite.ant.health;
            return `${id.padStart(5, ' ')}:  ${score.toFixed(2)} (${health.toFixed(2)})`;
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

    getNearestFood(ant: MutatingAntSprite) {
        let d = Number.MAX_VALUE;
        let children = this.foodGroup.getChildren();
        let closest;
        for (let i = 0; i < children.length; ++i) {
            let c = <FoodSprite>children[i]
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
                ant.ant.health += 50;
            }
        }
        return {food: closest, distance: d};
    }

    private static spawnAnt(ant: MutatingAntSprite) {
        ant.reset();
        ant.setActive(true);
    }
}

