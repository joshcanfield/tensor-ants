import Phaser from "phaser";

import MutatingAntSprite from "../sprites/MutatingAntSprite";
import AntSprite from "../sprites/AntSprite";

import grassImg from '../assets/grass.jpg';
import holeImg from '../assets/hole.png';

import World from "../model/World";
import MutatingAnt from "../model/MutatingAnt";

import _ from 'lodash';
import FoodSprite from "../sprites/FoodSprite";
import Ant from "../model/Ant";
import Group = Phaser.GameObjects.Group;
import Text = Phaser.GameObjects.Text;

const matingPairs = 2; // 2 pairs = 4

const CREATURE_LAYER = 500;
const FOOD_LAYER = 499;
const FOOD_COUNT = 10;
const ANT_COUNT = 10;
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
    private highScore: number = Number.MIN_VALUE;
    private highScoreGens: { 'gen': number, 'score': number }[] = [];
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

        for (let i = 0; i < FOOD_COUNT; ++i) {
            let food = new FoodSprite(this, 300, 300);
            this.foodGroup.add(food, true);
            this.world.food.push(food.ant);

            MutationScene.placeRandomly(food);
            food.setDepth(FOOD_LAYER);
            food.setActive(true);
        }

        this.antGroup = this.add.group({classType: MutatingAntSprite, runChildUpdate: true});

        // create all the ants
        for (let i = 0; i < ANT_COUNT; ++i) {

            // get spawn point
            let startX = 400;
            let startY = 300;

            let ant = new MutatingAntSprite(this, {
                x: startX,
                y: startY,
                texture: i == 0 ? AntSprite.Skin.ICE_ANT : AntSprite.Skin.ANT_LION
            });
            this.antGroup.add(ant, true);
            ant.setDepth(CREATURE_LAYER);
            ant.setActive(true);
        }


        this.scoreBoard = this.add.text(10, 0, 'Progress: 0%', {color: '#0f0'});
        this.scoreBoard.setDepth(CREATURE_LAYER);

        for (let i = 0; i < 5; ++i) {
            this.topScoresLabel[i] = this.add.text(100, 100, '' + (i + 1));
            this.topScoresLabel[i].setDepth(CREATURE_LAYER);
        }
    }

    private static readonly maxGenerationTime = 60_000;
    static currentGenerationTime = 0;
    static generationCount = 1;

    private static readonly scoreboardUpdateInterval = 500;
    static scoreboardIntervalTime = 0;

    update(time: number, delta: number): void {
        // score the children, pick best one replace the others brain with mutated
        let mutatingAnts = <MutatingAntSprite[]>this.antGroup.getChildren();
        let scoredSprites: MutatingAntSprite[] = _.sortBy(mutatingAnts, ['score']).reverse()

        this.updateScoreboard(delta, scoredSprites);
        this.resetFood((a) => a.isDead());
        this.updateGeneration(delta, mutatingAnts, scoredSprites);
    }

    private updateGeneration(delta: number, mutatingAnts: MutatingAntSprite[], scoredSprites: MutatingAntSprite[]) {
        MutationScene.currentGenerationTime += delta;

        // Only wait to end the generation if there are living ants
        let activeAnt: MutatingAntSprite = mutatingAnts.find((a) => a.active);
        if (activeAnt && MutationScene.currentGenerationTime < MutationScene.maxGenerationTime) {
            return;
        }

        this.resetFood(() => true);

        ++MutationScene.generationCount;
        MutationScene.currentGenerationTime = 0;
        mutatingAnts.forEach((ant) => ant.setActive(false));
        if (scoredSprites[0].score > this.highScore) {
            this.highScoreAnt = scoredSprites[0].ant.clone();
            this.highScore = scoredSprites[0].score;
            this.highScoreGens.unshift({'gen': MutationScene.generationCount - 1, 'score': this.highScore});
            if (this.highScoreGens.length > 10) {
                this.highScoreGens.pop();
            }
        } else {
            console.log("keeping high score brain!");
            scoredSprites.unshift(<MutatingAntSprite>{score: this.highScore, ant: this.highScoreAnt});
        }
        console.log(scoredSprites.map((ant) => ant.score));
        let breederAnts: MutatingAnt[] = scoredSprites.slice(0, matingPairs * 2).map((scored => {
            if (scored.ant === undefined) {
                debugger
            }
            return scored.ant.clone();
        }));
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
        breederAnts.forEach((ant: MutatingAnt) => ant.dispose());
    }

    private resetFood(filter: (ant: Ant) => boolean) {
        // move the food
        let food = <FoodSprite[]>this.foodGroup.getChildren();
        food.forEach(food => {
            if (filter(food.ant)) {
                // can't move a dead ant so make it alive
                food.ant.restoreHealth(food.ant.maxHealth);

                MutationScene.placeRandomly(food);
                food.setActive(true);
                food.setVisible(true);
            }
        })
    }

    private updateScoreboard(delta: number, scoredSprites: MutatingAntSprite[]) {
        MutationScene.scoreboardIntervalTime += delta;
        if (MutationScene.scoreboardIntervalTime <= MutationScene.scoreboardUpdateInterval) {
            return;
        }

        this.formatScoreboard(scoredSprites);
        for (let i = 0; i < this.topScoresLabel.length; ++i) {
            this.topScoresLabel[i].x = scoredSprites[i].x;
            this.topScoresLabel[i].y = scoredSprites[i].y;
        }
    }

    private static placeRandomly(food: FoodSprite) {
        food.relocate(_.random(0, 800), _.random(0, 600))
    }

    private formatScoreboard(scored: any[]) {
        function formatScore(antSprite: MutatingAntSprite) {
            let id = antSprite.ant.id.toString();
            let score = antSprite.score;
            let health = antSprite.ant.health;
            return `${id.padStart(3, ' ')}:  ${score.toFixed(2)} (${health.toFixed(2)})`;
        }

        let topAnts = scored.slice(0, 5);
        let topScores = topAnts.map(formatScore).join("\n");
        let timeRemaining = (MutationScene.maxGenerationTime - MutationScene.currentGenerationTime) / 1000;
        let highScores = this.highScoreGens.map((s) => `${s.gen}:${s.score.toFixed(2)}`).join(' | ');
        const debug = [
            `Time Remaining: ${timeRemaining.toFixed(2)}; Generation: ${MutationScene.generationCount}`,
            `High Score: ${this.highScore.toFixed(2)} - ${highScores}`,
            `Top Scores:\n${topScores}`,
            `Bottom:\n${formatScore(scored[scored.length - 1])}`
        ];

        this.scoreBoard.setText(debug);
    }

    private static spawnAnt(ant: MutatingAntSprite) {
        ant.reset();
        ant.setActive(true);
    }
}

