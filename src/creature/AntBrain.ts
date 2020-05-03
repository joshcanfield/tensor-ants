import * as tf from '@tensorflow/tfjs';
import _ from 'lodash';

class AntBrain {
    private model: tf.Sequential;
    private disposed = false;

    constructor() {
        this.createModel();
    }

    /**
     * Creates network with 2 inputs, 3 memory layers and 2 output values
     */
    private createModel() {
        let lstmLayerSizes = [7, 7, 7, 7];

        this.model = tf.sequential();
        for (let i = 0; i < lstmLayerSizes.length; ++i) {
            const lstmLayerSize = lstmLayerSizes[i];
            // if you don't tidy then you leak tensors when you dispose
            tf.tidy(() => {
                this.model.add(tf.layers.lstm({
                    units: lstmLayerSize,
                    useBias: true,
                    returnSequences: i < lstmLayerSizes.length - 1,
                    inputShape: i === 0 ? [2, 1] : undefined,
                    kernelInitializer: "randomNormal",
                    biasInitializer: "randomNormal"
                }));
            });
        }
        // if you don't tidy then you leak tensors when you dispose
        tf.tidy(() => {
            // output
            this.model.add(
                tf.layers.dense({
                    units: 2,
                    useBias: true,
                    activation: 'sigmoid',
                    kernelInitializer: "randomNormal",
                    biasInitializer: "randomNormal",
                }));
        });
        const optimizer = tf.train.rmsprop(1e-2);
        this.model.compile({optimizer: optimizer, loss: 'categoricalCrossentropy'});

        // this.model.compile({
        //     loss: 'meanSquaredError',
        //     optimizer: 'sgd'
        // });
    }

    public async think(input: AntBrain.Input): Promise<AntBrain.Output> {
        let _this = this;
        return new Promise<AntBrain.Output>((resolve, reject) => {
            // user web workers to be truly async
            setTimeout(function () {
                tf.tidy(() => {
                    if (_this.isDisposed()) {
                        // don't think if we've already been disposed
                        reject();
                        return;
                    }
                    const inputBuffer = new tf.TensorBuffer([1, 2, 1], "float32");
                    inputBuffer.set(input.antennaLeft, 0, 0, 0);
                    inputBuffer.set(input.antennaRight, 0, 0, 1);
                    let inputTensor = inputBuffer.toTensor();

                    // Predict!
                    let data = Array.from((<tf.Tensor>_this.model.predict(inputTensor)).dataSync());

                    let output = new AntBrain.Output();
                    output.left = data[0];
                    output.right = data[1];

                    // do something with the output
                    resolve(output);
                })
            }, 0);
        });
    }

    /*
      model.weights.forEach(w => {
        const newVals = tf.randomNormal(w.shape);
        // w.val is an instance of tf.Variable
        w.val.assign(newVals);
      });
   */
    public breed(mate: AntBrain): AntBrain {
        console.log('breed:', tf.memory());
        let antBrain = new AntBrain();
        tf.tidy(() => {
            let p1 = this.model.weights;
            let p2 = mate.model.weights;

            let dest = antBrain.model.weights;

            let start = _.random(p1.length);
            let end = _.random(start, p1.length);
            for (let i = 0; i < p1.length; ++i) {
                if (i > start && i < end) {
                    dest[i].write(p2[i].read());
                } else {
                    dest[i].write(p1[i].read());
                }
            }
        });
        return antBrain;
    }

    /**
     * Creates a brain mutated from this brain.
     * @param mutationRate how much should we mutate? between 0 (none) and 1 (everything)
     */
    public mutate(mutationRate: number): AntBrain {
        let antBrain = new AntBrain();

        let b1Weights = this.model.weights;
        let b2Weights = antBrain.model.weights;

        let mutationCount = 0;

        tf.tidy(() => {
            for (let i = 0; i < b1Weights.length; ++i) {
                let number = Math.random();
                // 0 - everything is copied
                // 1 - nothing is copied
                // .5 - ~ half
                // .1 - ~ 10%
                if (number > mutationRate) {
                    // just use the existing value
                    b2Weights[i].write(b1Weights[i].read());
                } else {
                    let tensor = b1Weights[i].read();
                    let newVal = tf.tidy(() =>
                        tensor.add(tf.randomNormal(tensor.shape, 0, 1)).mul(tf.scalar(.5)))
                    b2Weights[i].write(newVal);
                    ++mutationCount;
                }
            }
        });
        console.debug(`Mutation Rate: ${mutationRate}; total weights: ${b1Weights.length}; mutated: ${mutationCount}`);
        return antBrain;
    }

    public dispose() {
        this.disposed = true;
        this.model.dispose();
    }

    public isDisposed(): boolean {
        return this.disposed;
    }

}

namespace AntBrain {

    export class Input {
        antennaRight: number
        antennaLeft: number
    }

    export class Output {
        left: number
        right: number
    }
}

export default AntBrain;