import * as tf from '@tensorflow/tfjs';
import _ from 'lodash';

class AntBrain {

    private _model: tf.Sequential;
    private inputs: number[][] = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
    private disposed = false;

    constructor() {
        this.createModel();
    }

    /**
     * Creates network with 2 inputs, 3 memory layers and 2 output values
     */
    private createModel() {
        // if you don't tidy then you leak tensors when you dispose
        tf.tidy(() => {
            this._model = tf.sequential();
            // hidden
            this._model.add(
                tf.layers.dense({
                    units: 8, // neurons
                    inputShape: [1, 5, 2], // input matrix
                    useBias: true,
                    trainable: false,
                    activation: 'sigmoid',
                    kernelInitializer: "randomNormal",
                    biasInitializer: "randomNormal",
                }));
            // output
            this._model.add(
                tf.layers.dense({
                    units: 2,
                    useBias: true,
                    trainable: false,
                    activation: 'softmax',
                    kernelInitializer: "randomNormal",
                    biasInitializer: "randomNormal",
                }));
        });
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
                    let items = [input.antennaLeft, input.antennaRight];
                    _this.inputs.unshift(items);
                    _this.inputs.pop();
                    let inputTensor = tf.tensor4d([[_this.inputs]], [1, 1, 5, 2]);

                    // Predict!
                    let data = Array.from((<tf.Tensor>_this._model.predict(inputTensor)).dataSync());
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

        let antBrain = new AntBrain();
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
        if (false) {
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