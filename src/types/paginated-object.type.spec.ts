import type { PaginatedObject } from './paginated-object.type';

import { PaginatedCollection } from '../models/paginated-collection';

// The shapes a consumer actually writes. A `type` alias always satisfied the
// constraint, so it is the least useful guard here; the interface and the
// class are the ones that regressed (#20).
interface InterfaceRow {
  id: number;
  name: string;
}

class ClassRow {
  constructor(public readonly id: number) {}
}

type AliasRow = { id: number };

describe('PaginatedObject', () => {
  it('accepts an interface row', () => {
    expectTypeOf<InterfaceRow>().toExtend<PaginatedObject>();
  });

  it('accepts a class row', () => {
    expectTypeOf<ClassRow>().toExtend<PaginatedObject>();
  });

  it('accepts a type-alias row', () => {
    expectTypeOf<AliasRow>().toExtend<PaginatedObject>();
  });

  it('rejects primitives', () => {
    expectTypeOf<string>().not.toExtend<PaginatedObject>();
    expectTypeOf<number>().not.toExtend<PaginatedObject>();
    expectTypeOf<null>().not.toExtend<PaginatedObject>();
  });

  it('carries an interface row through the generic constraint and normalize()', () => {
    const collection = new PaginatedCollection<InterfaceRow>([{ id: 7, name: 'seven' }], 1);

    expect(collection.normalize()).toEqual({ 1: [7] });
    expect(collection.normalize((row) => row.name)).toEqual({ 1: ['seven'] });
  });

  it('carries a class row through the generic constraint and normalize()', () => {
    const collection = new PaginatedCollection<ClassRow>([new ClassRow(9)], 2);

    expect(collection.normalize()).toEqual({ 2: [9] });
  });
});
