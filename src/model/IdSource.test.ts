import {expect, test} from "@jest/globals";
import IdSource from "./IdSource";

test('starts with 0', () => {
    expect(IdSource.nextId('test start')).toEqual(0);
})

test('increments by 1', () => {
    expect(IdSource.nextId('test inc')).toEqual(0);
    expect(IdSource.nextId('test inc')).toEqual(1);
    expect(IdSource.nextId('test inc')).toEqual(2);
})

test('track multiple names', () => {
    expect(IdSource.nextId('test multiple 1')).toEqual(0);
    expect(IdSource.nextId('test multiple 2')).toEqual(0);

    expect(IdSource.nextId('test multiple 1')).toEqual(1);
    expect(IdSource.nextId('test multiple 2')).toEqual(1);

    expect(IdSource.nextId('test multiple 1')).toEqual(2);
    expect(IdSource.nextId('test multiple 2')).toEqual(2);
})