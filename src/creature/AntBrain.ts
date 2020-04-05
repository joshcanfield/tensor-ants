import * as tf from '@tensorflow/tfjs';

class AntBrain {
    private model: tf.Sequential;

    constructor() {
        this.createModel();
    }

    /**
     * Creates network with 2 inputs, 3 memory layers and 2 output values
     */
    private createModel() {
        let lstmLayerSizes = [5, 5, 5];

        this.model = tf.sequential();
        for (let i = 0; i < lstmLayerSizes.length; ++i) {
            const lstmLayerSize = lstmLayerSizes[i];
            this.model.add(tf.layers.lstm({
                units: lstmLayerSize,
                returnSequences: i < lstmLayerSizes.length - 1,
                inputShape: i === 0 ? [1, 1] : undefined,
                kernelInitializer: "randomNormal",
                biasInitializer: "randomNormal"
            }));
        }
        // output
        this.model.add(
            tf.layers.dense({
                units: 2,
                activation: 'sigmoid',
                biasInitializer: "randomNormal",
                kernelInitializer: "randomNormal",
            }));

        this.model.compile({
            loss: 'meanSquaredError',
            optimizer: 'sgd'
        });
    }

    // mutate
    /*
    model.weights.forEach(w => {
      const newVals = tf.randomNormal(w.shape);
      // w.val is an instance of tf.Variable
      w.val.assign(newVals);
    });
     */

    public async think(input: AntBrain.Input): Promise<AntBrain.Output> {
        let _this = this;
        return new Promise<AntBrain.Output>((resolve) => {
            // make it async
            setTimeout(function () {
                const inputBuffer = new tf.TensorBuffer([1, 1, 1], "float32");
                inputBuffer.set(input.food, 0, 0, 0);
                let t = inputBuffer.toTensor();
                // Predict!
                let data = Array.from((<tf.Tensor>_this.model.predict(t)).dataSync());

                let output = new AntBrain.Output();
                output.left = data[0];
                output.right = data[1];

                resolve(output);
            }, 0);
        });
    }

    public async breed(mate: AntBrain): Promise<AntBrain> {
        return new Promise<AntBrain>((resolve) => {
            setTimeout(function() {
                // cross over
                // random mutations
                resolve(new AntBrain());
            })
        });
    }

    public async dispose() {
        this.model.dispose();
    }

}

namespace AntBrain {
    export class Input {
        food: number
    }

    export class Output {
        left: number
        right: number
    }
}

export default AntBrain;