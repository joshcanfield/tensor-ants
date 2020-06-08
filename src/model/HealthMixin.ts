/**
 * maintains health
 */

import {Mixin} from 'ts-mixer';

import EventMixin from "./EventMixin";

class HealthMixin extends Mixin(EventMixin) {
    private _maxHealth: number;
    private _health: number;

    public consumeHealth(points: number): void {
        const newHealth = this._health - points;
        if (newHealth <= 0) {
            this._health = 0;
            this.trigger(HealthMixin.Event.onDeath, newHealth);
        } else {
            this._health = newHealth;
        }
    }

    public restoreHealth(points: number): void {
        let startingHealth = this._health;
        this._health += points;
        if (this._health > this._maxHealth) {
            this._health = this._maxHealth;
        }
        if (startingHealth === 0 && points > 0) {
            this.trigger(HealthMixin.Event.onRevive, this._health);
        }
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

    get maxHealth(): number {
        return this._maxHealth;
    }

    set maxHealth(value: number) {
        this._maxHealth = value;
    }

    static construct(param: HealthMixin, health: number) {
        param._health = health;
        param._maxHealth = health;
    }
}

namespace HealthMixin {
    export enum Event {
        onDeath = 'DEATH',
        onRevive = 'REVIVE',
    }
}

export default HealthMixin;
