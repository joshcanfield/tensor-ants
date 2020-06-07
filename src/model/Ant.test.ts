import {expect, test} from "@jest/globals";
import Ant from "./Ant";
import Direction from "./Direction";
import Activity = Ant.Activity;

// verifies the mixins are working
test('ant health', () => {
    let ant = new Ant(Activity.ATTACK, Direction.DOWN, 100);
    ant.health -= 10;
    expect(ant.health).toBe(90);
})

test('ant death goes to dead activity', () => {
    let ant = new Ant(Activity.ATTACK, Direction.DOWN, 100);
    ant.health -= 100;
    expect(ant.health).toBe(0);
    expect(ant.activity).toBe(Activity.CRIT_DIE);
    expect(ant.isAlive()).toBe(false);
})

test('ant moves', () => {
    let ant = new Ant(Activity.ATTACK, Direction.DOWN, 100);
    expect(ant.x).toBe(0);
    expect(ant.y).toBe(0);
    ant.setVelocity(1,2);
    ant.move();
    ant.move();
    expect(ant.x).toBe(2);
    expect(ant.y).toBe(4);
})