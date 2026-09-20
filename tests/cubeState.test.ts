import { describe, it, expect, beforeEach } from 'vitest';
import { CubeState } from '../src/cube/CubeState';
import { SingleMoveNotation } from '../src/types';

describe('CubeState Permutations and Mathematical Invariants', () => {
  let cube: CubeState;

  beforeEach(() => {
    cube = new CubeState();
  });

  it('should initialize to a solved state', () => {
    expect(cube.isSolved()).toBe(true);
    const facelets = cube.getFacelets();
    expect(facelets.length).toBe(54);
    for (let face = 0; face < 6; face++) {
      for (let i = 0; i < 9; i++) {
        expect(facelets[face * 9 + i]).toBe(face);
      }
    }
  });

  it('should verify that all center stickers are invariant under all 18 moves', () => {
    const centers = [4, 13, 22, 31, 40, 49];
    const moves: SingleMoveNotation[] = [
      'U', "U'", 'U2',
      'R', "R'", 'R2',
      'F', "F'", 'F2',
      'D', "D'", 'D2',
      'L', "L'", 'L2',
      'B', "B'", 'B2'
    ];

    for (const move of moves) {
      cube.reset();
      cube.applyMove(move);
      const facelets = cube.getFacelets();
      for (let i = 0; i < 6; i++) {
        expect(facelets[centers[i]]).toBe(i);
      }
    }
  });

  it('should satisfy X * X\' = I and X\' * X = I for all 6 faces', () => {
    const faces = ['U', 'R', 'F', 'D', 'L', 'B'] as const;

    for (const face of faces) {
      // X then X'
      cube.reset();
      cube.applyMove(face);
      expect(cube.isSolved()).toBe(false);
      cube.applyMove(`${face}'` as SingleMoveNotation);
      expect(cube.isSolved()).toBe(true);

      // X' then X
      cube.reset();
      cube.applyMove(`${face}'` as SingleMoveNotation);
      expect(cube.isSolved()).toBe(false);
      cube.applyMove(face);
      expect(cube.isSolved()).toBe(true);
    }
  });

  it('should satisfy X^4 = I for all 6 faces', () => {
    const faces = ['U', 'R', 'F', 'D', 'L', 'B'] as const;

    for (const face of faces) {
      cube.reset();
      for (let i = 1; i <= 4; i++) {
        cube.applyMove(face);
        if (i < 4) {
          expect(cube.isSolved()).toBe(false);
        }
      }
      expect(cube.isSolved()).toBe(true);
    }
  });

  it('should satisfy X * X = X2 and X2 * X2 = I', () => {
    const faces = ['U', 'R', 'F', 'D', 'L', 'B'] as const;

    for (const face of faces) {
      // X * X equals X2
      const c1 = new CubeState();
      c1.applyMove(face);
      c1.applyMove(face);

      const c2 = new CubeState();
      c2.applyMove(`${face}2` as SingleMoveNotation);

      expect(c1.getFacelets()).toEqual(c2.getFacelets());

      // X2 * X2 = I
      c2.applyMove(`${face}2` as SingleMoveNotation);
      expect(c2.isSolved()).toBe(true);
    }
  });

  it('should verify the Sexy Move: (R U R\' U\')^6 = I', () => {
    for (let i = 1; i <= 6; i++) {
      cube.applySequence("R U R' U'");
      if (i < 6) {
        expect(cube.isSolved()).toBe(false);
      }
    }
    expect(cube.isSolved()).toBe(true);
  });

  it('should verify T-Permutation order 2: (T-Perm)^2 = I', () => {
    const tPerm = "R U R' U' R' F R2 U' R' U' R U R' F'";
    cube.applySequence(tPerm);
    expect(cube.isSolved()).toBe(false);

    cube.applySequence(tPerm);
    expect(cube.isSolved()).toBe(true);
  });

  it('should verify Sune order 6: (R U R\' U R U2 R\')^6 = I', () => {
    const sune = "R U R' U R U2 R'";
    for (let i = 1; i <= 6; i++) {
      cube.applySequence(sune);
      if (i < 6) {
        expect(cube.isSolved()).toBe(false);
      }
    }
    expect(cube.isSolved()).toBe(true);
  });

  it('should verify Superflip involution: Superflip^2 = I', () => {
    const superflip = "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2";
    cube.applySequence(superflip);
    expect(cube.isSolved()).toBe(false);

    // In a superflip, all 8 corners are in their solved positions and orientations,
    // while all 12 edges are flipped.
    const facelets = cube.getFacelets();
    // Check corners: 0, 2, 6, 8 for U, etc.
    expect(facelets[0]).toBe(0);
    expect(facelets[2]).toBe(0);
    expect(facelets[6]).toBe(0);
    expect(facelets[8]).toBe(0);

    cube.applySequence(superflip);
    expect(cube.isSolved()).toBe(true);
  });

  it('should encode correctly to 324-dimensional one-hot array', () => {
    const oneHot = cube.toOneHot324();
    expect(oneHot.length).toBe(324);
    const sum = oneHot.reduce((acc, val) => acc + val, 0);
    expect(sum).toBe(54); // Exactly 54 ones, one for each facelet
  });
});
