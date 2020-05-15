import * as tf from '@tensorflow/tfjs';
import AntBrain from "./AntBrain";
import {expect, test} from "@jest/globals";

let antBrain: AntBrain;

beforeEach(() => antBrain = new AntBrain())

// TODO check for leaks
afterEach(() => antBrain.dispose());
test('model expects 2 inputs', () => {
    expect(antBrain.model.inputs[0].shape).toEqual([null, 2, 1]);
})

test('predicts 2 outputs', () => {
    let tensor = tf.tensor3d([.5, .5], [1, 2, 1]);
    let predict = <tf.Tensor>antBrain.model.predict(tensor);
    expect(predict.dataSync().length).toEqual(2);
})

test('predictions vary', () => {
    let tensors = [
        tf.tensor3d([.1, .2], [1, 2, 1]),
        tf.tensor3d([.3, .4], [1, 2, 1]),
        tf.tensor3d([.5, .6], [1, 2, 1])
    ];

    let out = [];
    for (let i = 0; i < 10; ++i) {
        let predict = <tf.Tensor>antBrain.model.predict(tensors[i%3]);
        out.push(predict.dataSync());
    }
    console.log(`predictions: ${out}`);
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
    let tensors = extractTensors(antBrain);
    let antBrain2 = antBrain.mutate(.5);
    let tensors2 = extractTensors(antBrain2);

    // the values are the same
    let v1 = extractValues(tensors);
    let v2 = extractValues(tensors2);
    expect(v1.length).toEqual(v2.length);
    let changed = 0;
    for (let i = 0; i < v1.length; ++i) {
        if (v1[i] != v2[i]) {
            ++changed;
        }
    }
    let changedAmount = changed / v1.length;
    expect(changedAmount).toBeCloseTo(.50)
    antBrain2.dispose()
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
