import {expect, test} from "@jest/globals";
import HealthMixin from "./HealthMixin";
import EventMixin from "./EventMixin";
import {Mixin} from "ts-mixer";

class TestHealthMixin extends Mixin(HealthMixin, EventMixin) {
    public deathTriggered: boolean = false

    constructor(health: number) {
        super();
        HealthMixin.construct(this, health);
        this.on(HealthMixin.Event.onDeath, () => {
            this.deathTriggered = true
            return true;
        })
    }
}

test('tracks health', () => {
    let testClass = new TestHealthMixin(100);
    testClass.consumeHealth(90);
    expect(testClass.health).toEqual(10);
    expect(testClass.isAlive()).toBe(true);
    expect(testClass.isDead()).toBe(false);
    expect(testClass.deathTriggered).toBe(false);
})

test('0 health triggers death ', () => {
    let testClass = new TestHealthMixin(100);
    testClass.consumeHealth(100);
    expect(testClass.health).toEqual(0);
    expect(testClass.isAlive()).toBe(false);
    expect(testClass.isDead()).toBe(true);
    // check that the callback ran
    expect(testClass.deathTriggered).toBe(true);
})

test('negative health triggers death and sets health to zero', () => {
    let testClass = new TestHealthMixin(100);
    testClass.consumeHealth(110);
    expect(testClass.health).toEqual(0);
    expect(testClass.isAlive()).toBe(false);
    expect(testClass.isDead()).toBe(true);
    // check that the callback ran
    expect(testClass.deathTriggered).toBe(true);
})
