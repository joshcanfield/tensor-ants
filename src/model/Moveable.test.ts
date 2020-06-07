import {expect, test} from "@jest/globals";
import {Mixin} from "ts-mixer";

import Moveable from "./Moveable";

class TestMoveable extends Mixin(Moveable) {
    private beforeMoveDistance: number;
    private afterMoveDistance: number;
    public static readonly MAX_DISTANCE = 1000;

    constructor(x: number, y: number) {
        super();
        this.x = x;
        this.y = y;

        this.on(Moveable.Event.beforeMove, (distance) => {
            this.beforeMoveDistance = distance;
            return distance < TestMoveable.MAX_DISTANCE;
        });

        this.on(Moveable.Event.afterMove, (distance) => {
            this.afterMoveDistance = distance;
            return distance < TestMoveable.MAX_DISTANCE;
        });
    }
}


test('is moveable', () => {
    let moveable = new TestMoveable(10, 20);
    expect(moveable.x).toEqual(10);
    expect(moveable.y).toEqual(20);
    moveable.setVelocity(1, 1);
    moveable.move();
    expect(moveable.x).toEqual(11);
    expect(moveable.y).toEqual(21);
})

test('beforeMove can cancel', () => {
    let moveable = new TestMoveable(10, 20);
    moveable.setVelocity(TestMoveable.MAX_DISTANCE+1, 1);
    expect(moveable.x).toEqual(10);
    expect(moveable.y).toEqual(20);
})

