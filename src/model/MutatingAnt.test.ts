import {expect, test} from "@jest/globals";
import * as tf from '@tensorflow/tfjs';
import MutatingAnt from "./MutatingAnt";

let ant: MutatingAnt;
beforeEach(() => {
    ant = MutatingAnt.create()
});
afterEach(() => {
    // don't leak
    ant.dispose();
    let memoryInfo = tf.memory();
    console.log(memoryInfo);
})

test('ant has a brain', () => {
    expect(ant.brain).not.toBeUndefined();
})

test('ant has health', () => {
    expect(ant.health).not.toBeUndefined();
})

test('mutate creates new brain', () => {
    let mutated = ant.mutate(.5);
    expect(mutated).not.toBe(ant);
    expect(mutated.brain).not.toBe(ant.brain);
    mutated.dispose();
})

test('breedWith creates new ant/brain', () => {
    let toBreed = MutatingAnt.create();
    let bred = ant.breedWith(toBreed);

    expect(bred).not.toBe(ant);
    expect(bred).not.toBe(toBreed);
    expect(bred.brain).not.toBe(ant.brain);
    expect(bred.brain).not.toBe(toBreed.brain);
    toBreed.dispose();
    bred.dispose();
})

test('cloned ants health trigger still fires', () => {
    let ant = MutatingAnt.create();
    let mutant = ant.mutate(10);
    expect(mutant.moveable).toBeTruthy()
    mutant.consumeHealth(mutant.maxHealth);
    expect(mutant.moveable).toBeFalsy()
})