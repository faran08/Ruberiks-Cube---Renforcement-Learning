import { SingleMoveNotation } from '../types';

export const FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;

export const FACE_COLORS = {
  U: 0xffffff, // White
  R: 0xb71234, // Red
  F: 0x009b48, // Green
  D: 0xffd500, // Yellow
  L: 0xff5800, // Orange
  B: 0x0046ad, // Blue
  INTERNAL: 0x141414 // Internal ABS plastic
} as const;

export const COLOR_NAMES = [
  'White',
  'Red',
  'Green',
  'Yellow',
  'Orange',
  'Blue'
] as const;

export const FACE_INDEX: Record<string, number> = {
  U: 0,
  R: 1,
  F: 2,
  D: 3,
  L: 4,
  B: 5
};

// Creates an identity permutation [0, 1, 2, ..., 53]
function createIdentityPermutation(): Uint8Array {
  const p = new Uint8Array(54);
  for (let i = 0; i < 54; i++) {
    p[i] = i;
  }
  return p;
}

// 4-cycle: a -> b -> c -> d -> a
// Meaning: new b gets a, new c gets b, new d gets c, new a gets d
function cycle4(p: Uint8Array, a: number, b: number, c: number, d: number): void {
  p[b] = a;
  p[c] = b;
  p[d] = c;
  p[a] = d;
}

// Compose two permutations: R[i] = P1[P2[i]] (applying P2 then P1, or P^2)
function composePermutations(p1: Uint8Array, p2: Uint8Array): Uint8Array {
  const res = new Uint8Array(54);
  for (let i = 0; i < 54; i++) {
    res[i] = p2[p1[i]];
  }
  return res;
}

function rotateFaceClockwise(p: Uint8Array, offset: number): void {
  // Corners: 0 -> 2 -> 8 -> 6 -> 0
  cycle4(p, offset + 0, offset + 2, offset + 8, offset + 6);
  // Edges: 1 -> 5 -> 7 -> 3 -> 1
  cycle4(p, offset + 1, offset + 5, offset + 7, offset + 3);
}

// Generate base 6 clockwise moves: U, R, F, D, L, B
function createBaseMoves(): Record<'U' | 'R' | 'F' | 'D' | 'L' | 'B', Uint8Array> {
  // 1. U move
  const U = createIdentityPermutation();
  rotateFaceClockwise(U, 0);
  cycle4(U, 45, 9, 18, 36);
  cycle4(U, 46, 10, 19, 37);
  cycle4(U, 47, 11, 20, 38);

  // 2. R move
  const R = createIdentityPermutation();
  rotateFaceClockwise(R, 9);
  cycle4(R, 8, 45, 35, 26);
  cycle4(R, 5, 48, 32, 23);
  cycle4(R, 2, 51, 29, 20);

  // 3. F move
  const F = createIdentityPermutation();
  rotateFaceClockwise(F, 18);
  cycle4(F, 6, 9, 29, 44);
  cycle4(F, 7, 12, 28, 41);
  cycle4(F, 8, 15, 27, 38);

  // 4. D move
  const D = createIdentityPermutation();
  rotateFaceClockwise(D, 27);
  cycle4(D, 24, 15, 51, 42);
  cycle4(D, 25, 16, 52, 43);
  cycle4(D, 26, 17, 53, 44);

  // 5. L move
  const L = createIdentityPermutation();
  rotateFaceClockwise(L, 36);
  cycle4(L, 0, 18, 27, 53);
  cycle4(L, 3, 21, 30, 50);
  cycle4(L, 6, 24, 33, 47);

  // 6. B move
  const B = createIdentityPermutation();
  rotateFaceClockwise(B, 45);
  cycle4(B, 2, 36, 33, 17);
  cycle4(B, 1, 39, 34, 14);
  cycle4(B, 0, 42, 35, 11);

  return { U, R, F, D, L, B };
}

const baseMoves = createBaseMoves();

export const MOVE_PERMUTATIONS: Record<SingleMoveNotation, Uint8Array> = {} as Record<
  SingleMoveNotation,
  Uint8Array
>;

// Build all 18 moves: M, M2, M'
(['U', 'R', 'F', 'D', 'L', 'B'] as const).forEach((face) => {
  const m = baseMoves[face];
  const m2 = composePermutations(m, m);
  const mPrime = composePermutations(m2, m);

  MOVE_PERMUTATIONS[face] = m;
  MOVE_PERMUTATIONS[`${face}2` as SingleMoveNotation] = m2;
  MOVE_PERMUTATIONS[`${face}'` as SingleMoveNotation] = mPrime;
});

export const ALL_MOVES: SingleMoveNotation[] = [
  'U', "U'", 'U2',
  'R', "R'", 'R2',
  'F', "F'", 'F2',
  'D', "D'", 'D2',
  'L', "L'", 'L2',
  'B', "B'", 'B2'
];

export const INVERSE_MOVES: Record<SingleMoveNotation, SingleMoveNotation> = {
  'U': "U'", "U'": 'U', 'U2': 'U2',
  'R': "R'", "R'": 'R', 'R2': 'R2',
  'F': "F'", "F'": 'F', 'F2': 'F2',
  'D': "D'", "D'": 'D', 'D2': 'D2',
  'L': "L'", "L'": 'L', 'L2': 'L2',
  'B': "B'", "B'": 'B', 'B2': 'B2'
};
