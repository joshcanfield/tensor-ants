import Ant from "./Ant";
import AntBrain from "./AntBrain";
import World from "./World";

export default class MutatingAnt extends Ant {
    public brain: AntBrain;

    public static create() {
        return new MutatingAnt(true);
    }

    private constructor(withBrain: boolean) {
        super();
        if (withBrain) {
            this.brain = new AntBrain(5);
        }
    }

    public async think(world: World): Promise<void> {
        super.think(world);
        this.brain = new AntBrain(5);

        // capture the values from the world
        let antenna = this.getSensors();

        // TODO: Leaky Brains? Maybe ant.think(world);
        // TODO: and translate world into inputs
        let input = new AntBrain.Input();

        // TODO: Entity has an array of sensors at a given positions
        // TODO: Calculate intensity per sensor
        let intensity = world.calcIntensity(antenna);
        // I happen to know that the ant has 2 senor "antenna"
        input.antennaRight = intensity[0];
        input.antennaLeft = intensity[1];

        return new Promise<void>((resolve, reject) => {
            this.brain.think(input)
                .then(this.handleThinkOutput)
                .then(resolve)
                .catch(reject)
        })
    }

    /**
     * keeping `this` context by using 'private fn = () => {}' format
     */
    private handleThinkOutput = (output: AntBrain.Output) => {
        let adjustRadians = this.calculateDirection(output);
        let speed = this.speed * (1 + (output.left + output.right) / 2);

        this.headingRadians += adjustRadians;
        if (this.headingRadians < 0) {
            this.headingRadians = 2 * Math.PI + this.headingRadians;
        }
        while (this.headingRadians > 2 * Math.PI) {
            this.headingRadians -= 2 * Math.PI;
        }

        this.setVelocity(
            Math.floor(speed * Math.cos(this.headingRadians)),
            -Math.floor(speed * Math.sin(this.headingRadians))
        )
    }

    private calculateDirection(output: AntBrain.Output) {
        let leftScale = output.left;
        let rightScale = output.right;
        if (leftScale > rightScale) {
            return Math.PI / 4;
        }
        return -Math.PI / 4;

        // cos(θ) = adjacent/hypotenuse = x / radius = x / 1
        // let cosTheta = leftScale - rightScale; // lifting more left turns more right
        // return (Math.PI / 2) - Math.acos(cosTheta);
    }

    /**
     * Return an ant that is mutated from this ant at the given rate
     * @param rate - number between 0 and 1
     */
    mutate(rate: number): MutatingAnt {
        return this._clone(this.brain.mutate(rate));
    }

    /**
     * Do cross over breeding with another ant
     * @param ant
     */
    breedWith(ant: MutatingAnt): MutatingAnt {
        return this._clone(this.brain.breed(ant.brain));
    }

    clone(): MutatingAnt {
        let brain = this.brain.clone();
        return this._clone(brain);
    }

    private _clone(brain?: AntBrain): MutatingAnt {
        let mutatingAnt = new MutatingAnt(false);
        if (brain) {
            mutatingAnt.brain = brain;
        }
        return mutatingAnt;
    }

    dispose() {
        this.brain.dispose();
    }
}
