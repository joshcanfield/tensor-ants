import * as tf from '@tensorflow/tfjs';
import _ from 'lodash';

const DEBUG_WEIGHTS = false;

class AntBrain {
    private _model: tf.Sequential;

    /**
     * How many input iterations should we remember and pass into the model?
     * TODO: Should this vary by mutation/breeding?
     */
    readonly memorySize: number;

    /**
     * Holds a copy of the memories. New values are rotated in.
     */
    private inputMemory: number[][];

    private disposed = false;

    constructor(memorySize: number) {
        this.memorySize = memorySize;
        this.inputMemory = [];

        // Memory needs to be populated before we start
        const defaultInput = new AntBrain.Input().toArray();
        for (let i = 0; i < memorySize; ++i) {
            this.inputMemory.push(defaultInput);
        }

        this.createModel();
    }

    /**
     * Creates network based on the size of AntBrain.Input and AntBrain.Output
     */
    private createModel() {
        let _this = this;
        // if you don't tidy then you leak tensors when you dispose
        tf.tidy(() => {
            let inputShape = [_this.memorySize * AntBrain.Input.size];

            this._model = tf.sequential();

            // hidden
            this._model.add(tf.layers.dense({
                units: 8, // neurons
                inputShape: inputShape, // input matrix
                useBias: true,
                trainable: false,
                activation: 'sigmoid',
                kernelInitializer: "randomNormal",
                biasInitializer: "randomNormal",
            }));
            // output
            this._model.add(tf.layers.dense({
                units: AntBrain.Output.size,
                batchSize: 1,
                useBias: true,
                trainable: false,
                activation: 'softmax',
                kernelInitializer: "randomNormal",
                biasInitializer: "randomNormal",
            }));

            // this._model.summary();
        });
    }

    public async think(input: AntBrain.Input): Promise<AntBrain.Output> {
        let _this = this;
        return this.doAsync(function (resolve, reject) {
            tf.tidy(() => {
                if (_this.isDisposed()) {
                    // don't think if we've already been disposed
                    reject('disposed');
                    return;
                }
                _this.inputMemory.unshift(input.toArray());
                _this.inputMemory.pop();

                // flatten the inputs
                let values = [].concat(..._this.inputMemory);
                // Predict!
                let tensor = tf.tensor2d(values, [1, _this.memorySize * AntBrain.Input.size]);
                let prediction = <tf.Tensor>_this._model.predict(tensor, {batchSize: 1});

                let data = Array.from(prediction.dataSync());

                let output = new AntBrain.Output();
                output.left = data[0];
                output.right = data[1];

                // do something with the output
                resolve(output);
            })
        });
    }

    // TODO: user web workers to be truly async
    private doAsync<T>(func: (resolve: (args?: any) => any, reject: (args?: any) => any) => void): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            // schedule it to run later...
            setTimeout(func, 0, resolve, reject);
        });
    }

    public breed(mate: AntBrain): AntBrain {
        console.log('breed:', tf.memory());
        let antBrain = new AntBrain(this.memorySize);
        tf.tidy(() => {
            let p1 = this._model.getWeights();
            let p2 = mate._model.getWeights();
            let p3 = [];
            for (let i = 0; i < p1.length; ++i) {
                let v1 = p1[i].dataSync().slice();
                let v2 = p2[i].dataSync().slice();
                let shape = p1[i].shape;

                let dest = [];
                let start = _.random(v1.length);
                let end = _.random(start, v1.length);
                for (let j = 0; j < v1.length; ++j) {
                    if (j > start && j < end) {
                        dest[j] = v2[j];
                    } else {
                        dest[j] = v1[j];
                    }
                }
                p3[i] = tf.tensor(dest, shape);
            }
            antBrain._model.setWeights(p3);
        });
        this.logWeights('breed this', this);
        this.logWeights('breed mate', mate);
        this.logWeights('breed result', antBrain);
        return antBrain;
    }

    /**
     * Creates a brain mutated from this brain.
     * @param mutationRate how much should we mutate? between 0 (none) and 1 (everything)
     */
    public mutate(mutationRate: number): AntBrain {

        let antBrain = new AntBrain(this.memorySize);
        tf.tidy(() => {
            let weights = this._model.getWeights();
            let weightCount = 0;
            let mutatedWeights: tf.Tensor[] = [];
            let mutationCount = 0;
            for (let i = 0; i < weights.length; ++i) {
                let v1 = weights[i].dataSync().slice();
                let v2 = [];
                for (let j = 0; j < v1.length; ++j) {
                    if (Math.random() > mutationRate) {
                        // just use the existing value
                        v2[j] = v1[j];
                    } else {
                        v2[j] = v1[j] + AntBrain.randomAround0();
                        ++mutationCount;
                    }
                    ++weightCount;
                }
                mutatedWeights[i] = tf.tensor(v2, weights[i].shape);
            }
            antBrain._model.setWeights(mutatedWeights);
            console.debug(`Mutation Rate: ${mutationRate}; weights: ${weightCount}; mutated: ${mutationCount}`);
            this.logWeights('before mutation ', this);
            this.logWeights('after mutation', antBrain);
        });
        return antBrain;
    }

    private static randomAround0() {
        return (
            (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random()) - 3
        ) / 3;
    }

    private logWeights(tag: string, antBrain: AntBrain) {
        if (DEBUG_WEIGHTS) {
            for (let i = 0; i < antBrain._model.weights.length; ++i) {
                let out: string[] = [];
                let w = antBrain._model.weights[i];
                let dataSync = w.read().dataSync();
                dataSync.forEach((d: number) => {
                    out.unshift(d.toFixed(4));
                })
                console.log(tag, antBrain._model.name, out);
            }
        }
    }

    public dispose() {
        this.disposed = true;
        this._model.dispose();
    }

    public isDisposed(): boolean {
        return this.disposed;
    }

    get model(): tf.Sequential {
        return this._model;
    }

    public clone(): AntBrain {
        // Copy the brain with no mutation
        return this.mutate(0);
    }
}

namespace AntBrain {
    // configure TensorFlow
    tf.setBackend('cpu').catch((reason) => {
        console.log(reason);
    });

    export class Input {
        // TODO: Some better way to determine this size...
        static size = 2;

        // Sensor<>
        antennaRight: number = 0;
        antennaLeft: number = 0;

        // TODO: add inputs
        // health: number

        toArray(): number[] {
            return [this.antennaLeft, this.antennaRight];
        }
    }

    /**
     * The brain's output
     */
    export class Output {
        static size = 2;

        left: number
        right: number
    }
}

export default AntBrain;