import _ from "lodash";
import EventMixin from "./EventMixin";
import {Mixin} from "ts-mixer";


class Moveable extends Mixin(EventMixin) {
    private _moveable: boolean = true;
    private _headingRadians: number = 0;
    private _x: number = 0;
    private _y: number = 0;
    private _vx: number = 0;
    private _vy: number = 0;
    private _speed: number = 0;

    public move() {
        let distance = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        // is moving ok?
        if (!this.moveable || !this.trigger(Moveable.Event.beforeMove, distance)) {
            return;
        }

        this.x = this.x + this.vx;
        this.y = this.y + this.vy;

        if (!_.isFinite(this.x) || !_.isFinite(this.y)) {
            console.log('bad x/y');
            debugger
        }

        this.trigger(Moveable.Event.afterMove, distance);
    }

    public setVelocity(vx: number, vy: number) {
        this.vx = vx;
        this.vy = vy;
        if (!_.isFinite(this.vx) || !_.isFinite(this.vy)) {
            console.log('bad x/y');
            debugger
        }
    }

    get speed(): number {
        return this._speed;
    }

    set speed(value: number) {
        this._speed = value;
    }

    get vy(): number {
        return this._vy;
    }

    set vy(value: number) {
        this._vy = value;
    }

    get vx(): number {
        return this._vx;
    }

    set vx(value: number) {
        this._vx = value;
    }

    get y(): number {
        return this._y;
    }

    set y(value: number) {
        if (this.moveable) {
            this._y = value;
        }
    }

    get x(): number {
        return this._x;
    }

    set x(value: number) {
        if (this.moveable) {
            this._x = value;
        }
    }

    get headingRadians(): number {
        return this._headingRadians;
    }

    get moveable(): boolean {
        return this._moveable;
    }

    set moveable(value: boolean) {
        this._moveable = value;
    }

    set headingRadians(value: number) {
        if (this.moveable) {
            this._headingRadians = value;
        }
    }
}

namespace Moveable {
    export enum Event {
        beforeMove = 'beforeMove',
        afterMove = 'beforeMove',
    }
}

export default Moveable
