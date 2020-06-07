/**
 * maintains health
 */

import {Mixin} from 'ts-mixer';

import EventMixin from "./EventMixin";

class HealthMixin extends Mixin(EventMixin) {
    private _maxHealth: number;
    private _health: number;

    public consume(points: number): void {
        this.health = this.health - points;
    }

    public isAlive(): boolean {
        return this.health > 0;
    }

    public isDead(): boolean {
        return this.health === 0;
    }

    get health(): number {
        return this._health;
    }

    set health(value: number) {
        if (value <= 0) {
            this._health = 0;
            this.trigger(HealthMixin.Event.onDeath);
        } else {
            this._health = value;
        }
    }

    get maxHealth(): number {
        return this._maxHealth;
    }

    set maxHealth(value: number) {
        this._maxHealth = value;
    }

    static construct(param: HealthMixin, health: number) {
        param.health = health;
        param.maxHealth = health;
    }
}

namespace HealthMixin {
    export enum Event {
        onDeath = 'onDeath'
    }
}

export default HealthMixin;
