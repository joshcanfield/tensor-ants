import {expect, test} from "@jest/globals";
import * as tf from '@tensorflow/tfjs';
import AntBrain from "./AntBrain";
import Output = AntBrain.Output;
import Input = AntBrain.Input;

let antBrain: AntBrain;
jest.setTimeout(60000);

beforeEach(() => antBrain = new AntBrain(5))

// TODO check for leaks
afterEach(() => {
    if (!antBrain.isDisposed()) {
        return antBrain.dispose();
    }
});

test('predicts from input', () => {
    let input = new AntBrain.Input();
    input.antennaRight = .5;
    input.antennaLeft = .5;
    return antBrain.think(input).then((data) => {
        expect(data.left).not.toBe(0);
        expect(data.right).not.toBe(0);
    });
})

test('input varies up to memory size', async () => {
    let input = new AntBrain.Input();
    input.antennaRight = .3;
    input.antennaLeft = .5;
    let output: Output[] = [];
    for (let i = 0; i < antBrain.memorySize; ++i) {
        let thinkResult = await antBrain.think(input);
        expect(output).not.toContainEqual(thinkResult);
        output.push(thinkResult);
    }

    // after memory limit the inputs are the same and we get the same prediction
    let thinkResult = await antBrain.think(input);
    expect(output).toContainEqual(thinkResult);
})

test('mutate with rate 0 is different with same values', () => {
    let tensors = extractTensors(antBrain);
    let antBrain2 = antBrain.mutate(0);
    let tensors2 = extractTensors(antBrain2);

    // the objects are not the same
    expect(tensors).not.toEqual(tensors2)
    // the values are the same
    expect(extractValues(tensors)).toEqual(extractValues(tensors2));

    antBrain2.dispose()
})

test('mutate with rate .5 changes about 50%', () => {
    function changedBy(tensors: tf.Tensor[], tensors2: tf.Tensor[]) {
        let v1 = extractValues(tensors);
        let v2 = extractValues(tensors2);
        expect(v1.length).toEqual(v2.length);
        let changed = 0;
        for (let i = 0; i < v1.length; ++i) {
            if (v1[i] != v2[i]) {
                ++changed;
            }
        }
        return changed / v1.length;
    }

    let changedAmount = 0;
    // mutation is random, do it enough to get a good sample
    for (let i = 0; i < 10; ++i) {
        let tensors = extractTensors(antBrain);
        let antBrain2 = antBrain.mutate(.5);
        let tensors2 = extractTensors(antBrain2);

        changedAmount += changedBy(tensors, tensors2);
        antBrain2.dispose()
    }
    changedAmount = changedAmount / 10;

    // it's random, allow for some variance
    expect(changedAmount).toBeCloseTo(.5, 1)
})

test('breed contains both parents', () => {
    let parent2 = new AntBrain(5);
    let childBrain = antBrain.breed(parent2);

    let p1 = extractValues(extractTensors(antBrain))
    let p2 = extractValues(extractTensors(parent2))
    let c = extractValues(extractTensors(childBrain))

    expect(p1).not.toEqual(p2);
    expect(c).not.toEqual(p2);
    expect(c).not.toEqual(p1);

    expect(p1.length).toBe(p2.length)
    expect(c.length).toBe(p2.length)

    let countP1 = 0;
    let countP2 = 0;
    for (let i = 0; i < c.length; ++i) {
        if (c[i] === p1[i]) {
            ++countP1;
        }
        if (c[i] === p2[i]) {
            ++countP2;
        }
    }
    expect(countP1).toBeGreaterThan(0)
    expect(countP2).toBeGreaterThan(0)
    expect(countP1 + countP2).toEqual(p1.length);
})

test('disposed brains do not think', () => {
    antBrain.dispose();
    expect.assertions(1);
    return antBrain.think(new Input())
        .catch((e) => expect(e).toEqual('disposed'))
})

function extractTensors(brain: AntBrain) {
    let tensors: tf.Tensor[] = [];
    brain.model.getWeights().forEach((t) => {
        tensors.push(t);
    });
    return tensors;
}

function extractValues(tensors: tf.Tensor[]) {
    let map = tensors.map((t) => Array.from(t.dataSync()));
    let values = map.reduce((previousValue, currentValue) => previousValue.concat(currentValue), [])
    return values;
}
