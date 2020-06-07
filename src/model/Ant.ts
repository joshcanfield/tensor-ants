import IdSource from "./IdSource";
import Direction from "./Direction";
import Moveable from "./Moveable";
import HealthMixin from "./HealthMixin";
import EventMixin from "./EventMixin";
import {Mixin} from "ts-mixer";
import World from "./World";

// How are the antenna sensors located?
const antennaAngleRadians = .5;
const antennaLenFromCenter = 25;

class Ant extends Mixin(Moveable, HealthMixin, EventMixin) {
    readonly id: number = IdSource.nextId(this.constructor.name);
    private _activity = Ant.Activity.STAND;
    private _direction = Direction.LEFT;

    constructor(
        activity: Ant.Activity = Ant.Activity.STAND,
        direction: Direction = Direction.RIGHT,
        health: number = 100
    ) {
        super();
        HealthMixin.construct(this, health);
        this.activity = activity
        this.direction = direction
    }

    /**
     * The interface between the world and the creature is a sensor.
     * Sensors provide inputs to the brain.
     *
     * Ants have antenna positioned relative to the ants body.
     * TODO: Sensor types ?
     * Chemical (smell/taste), Physical (sound/vibration/touch)
     */
    public getSensors(): { x: number, y: number }[] {
        let len = antennaLenFromCenter;
        let angleRadians = antennaAngleRadians;
        return [
            {
                x: this.x + len * Math.cos(angleRadians - this.headingRadians),
                y: this.y + len * Math.sin(angleRadians - this.headingRadians)
            },
            {
                x: this.x + len * Math.cos(-angleRadians - this.headingRadians),
                y: this.y + len * Math.sin(-angleRadians - this.headingRadians)
            }
        ];
    }

    public think(world: World) {
        // I don't think
    }

    get activity(): Ant.Activity {
        return this._activity;
    }

    set activity(value: Ant.Activity) {
        this._activity = value;
    }

    get direction(): Direction {
        return this._direction;
    }

    set direction(value: Direction) {
        this._direction = value;
    }
}

namespace Ant {
    Ant.register(HealthMixin.Event.onDeath, (_self) => {
        _self.activity = Ant.Activity.CRIT_DIE;
        _self.moveable = false;
        return true;
    });

    Ant.register(Moveable.Event.afterMove, (_self, distance) => {
        _self.consume(distance / 10);
        return true;
    })

    export enum Activity {
        STAND = 'stand',
        WALK = 'walk',
        ATTACK = 'attack',
        BLOCK = 'block',
        HIT_DIE = 'hit-die',
        CRIT_DIE = 'crit-die',
    }
}

export default Ant;