import { SingleMoveNotation } from '../types';
import { MOVE_PERMUTATIONS } from './CubeConstants';

export class CubeState {
  private state: Uint8Array;

  constructor(initialState?: Uint8Array) {
    this.state = new Uint8Array(54);
    if (initialState) {
      this.state.set(initialState);
    } else {
      this.reset();
    }
  }

  /**
   * Resets the cube to the solved state:
   * U (0..8)  = 0 (White)
   * R (9..17) = 1 (Red)
   * F (18..26)= 2 (Green)
   * D (27..35)= 3 (Yellow)
   * L (36..44)= 4 (Orange)
   * B (45..53)= 5 (Blue)
   */
  public reset(): void {
    for (let face = 0; face < 6; face++) {
      for (let i = 0; i < 9; i++) {
        this.state[face * 9 + i] = face;
      }
    }
  }

  /**
   * Applies a single standard move to the cube state.
   */
  public applyMove(move: SingleMoveNotation): void {
    const p = MOVE_PERMUTATIONS[move];
    if (!p) {
      throw new Error(`Unknown move notation: ${move}`);
    }

    const nextState = new Uint8Array(54);
    for (let i = 0; i < 54; i++) {
      nextState[i] = this.state[p[i]];
    }
    this.state = nextState;
  }

  /**
   * Applies a sequence of moves (e.g. ['R', 'U', "R'", "U'"] or "R U R' U'")
   */
  public applySequence(sequence: SingleMoveNotation[] | string): void {
    const moves: SingleMoveNotation[] =
      typeof sequence === 'string'
        ? (sequence.trim().split(/\s+/) as SingleMoveNotation[])
        : sequence;

    for (const move of moves) {
      if (move) {
        this.applyMove(move);
      }
    }
  }

  /**
   * Returns true if all 6 faces are monochromatic.
   */
  public isSolved(): boolean {
    for (let face = 0; face < 6; face++) {
      const centerColor = this.state[face * 9 + 4];
      for (let i = 0; i < 9; i++) {
        if (this.state[face * 9 + i] !== centerColor) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Returns a copy of the 54 facelet array.
   */
  public getFacelets(): Uint8Array {
    return new Uint8Array(this.state);
  }

  /**
   * Deep clone of this CubeState instance.
   */
  public clone(): CubeState {
    return new CubeState(this.state);
  }

  /**
   * Converts the 54 facelets into a 324-dimensional one-hot vector (54 * 6)
   * used for neural network inference.
   */
  public toOneHot324(): Float32Array {
    const oneHot = new Float32Array(324);
    for (let i = 0; i < 54; i++) {
      const color = this.state[i];
      if (color >= 0 && color < 6) {
        oneHot[i * 6 + color] = 1.0;
      }
    }
    return oneHot;
  }
}
