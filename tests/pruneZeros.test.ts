import pruneZeros from '../src/utils/pruneZeros';

describe('pruneZeros utility', () => {
  test('removes numeric zeros and null/undefined', () => {
    const input = {
      a: 0,
      b: 1,
      c: null,
      d: undefined,
      e: 'text',
    };
    const out = pruneZeros(input);
    expect(out).toEqual({ b: 1, e: 'text' });
  });

  test('removes NaN and string "null"/"nan"/empty', () => {
    const input = {
      n1: NaN,
      n2: 'null',
      n3: 'NaN',
      n4: '',
      keep: 'ok',
    };
    const out = pruneZeros(input);
    expect(out).toEqual({ keep: 'ok' });
  });

  test('prunes arrays and nested objects', () => {
    const input = {
      arr: [0, null, 'null', 5, { x: 0, y: 'good', z: null }],
      obj: {
        inner: {
          a: 0,
          b: 'ok',
        },
        emptyObj: { a: 0 },
      },
    };
    const out = pruneZeros(input);
    expect(out).toEqual({ arr: [5, { y: 'good' }], obj: { inner: { b: 'ok' } } });
  });

  test('returns undefined for fully pruned values', () => {
    const input = { a: 0, b: null, c: 'null' };
    const out = pruneZeros(input);
    expect(out).toBeUndefined();
  });
});
