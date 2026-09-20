import { ALL_MOVES } from '../cube/CubeConstants';
import { CubeState } from '../cube/CubeState';
import { CubeVisual } from '../cube/CubeVisual';
import { CubeAnimator } from '../cube/CubeAnimator';
import { SingleMoveNotation } from '../types';

export class CommandInterface {
  private cubeState: CubeState;
  private cubeVisual: CubeVisual;
  private cubeAnimator: CubeAnimator;

  public onMoveExecuted?: (move: SingleMoveNotation, isScramble: boolean) => void;

  constructor(cubeState: CubeState, cubeVisual: CubeVisual, cubeAnimator: CubeAnimator) {
    this.cubeState = cubeState;
    this.cubeVisual = cubeVisual;
    this.cubeAnimator = cubeAnimator;
  }

  /**
   * Parses standard Singmaster notation strings (e.g., "R U R' U'", "F2, L, D'").
   */
  public parseNotation(sequence: string): SingleMoveNotation[] {
    const rawTokens = sequence
      .replace(/[,;]/g, ' ')
      .trim()
      .split(/\s+/);

    const validMoves: SingleMoveNotation[] = [];
    const validSet = new Set<string>(ALL_MOVES);

    for (let token of rawTokens) {
      token = token.trim();
      if (!token) continue;

      // Normalize apostrophe / prime notation (e.g. `’` or `‘` -> `'`)
      token = token.replace(/[\u2018\u2019`]/g, "'");

      if (validSet.has(token)) {
        validMoves.push(token as SingleMoveNotation);
      } else {
        console.warn(`Unrecognized move ignored: ${token}`);
      }
    }

    return validMoves;
  }

  /**
   * Executes a single move with visual animation and state update.
   */
  public async executeMove(move: SingleMoveNotation, customDuration?: number): Promise<void> {
    this.cubeState.applyMove(move);
    await this.cubeAnimator.animateMove(move, customDuration);
    if (this.onMoveExecuted) {
      this.onMoveExecuted(move, false);
    }
  }

  /**
   * Executes an algorithm sequence sequentially.
   */
  public async executeSequence(sequence: string, customDuration?: number): Promise<void> {
    const moves = this.parseNotation(sequence);
    for (const move of moves) {
      await this.executeMove(move, customDuration);
    }
  }

  /**
   * Generates a random scramble of length `moveCount` (default 20),
   * ensuring consecutive moves on the same face are avoided.
   */
  public generateScrambleSequence(moveCount = 20): SingleMoveNotation[] {
    const faces = ['U', 'D', 'L', 'R', 'F', 'B'] as const;
    const suffixes = ['', "'", '2'] as const;
    const scrambleMoves: SingleMoveNotation[] = [];

    let lastFace = '';
    let secondLastFace = '';

    for (let i = 0; i < moveCount; i++) {
      let face: string;
      do {
        face = faces[Math.floor(Math.random() * faces.length)];
      } while (
        face === lastFace ||
        (face === secondLastFace && this.areOppositeFaces(face, lastFace))
      );

      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      const move = `${face}${suffix}` as SingleMoveNotation;

      scrambleMoves.push(move);
      secondLastFace = lastFace;
      lastFace = face;
    }

    return scrambleMoves;
  }

  private areOppositeFaces(f1: string, f2: string): boolean {
    return (
      (f1 === 'U' && f2 === 'D') ||
      (f1 === 'D' && f2 === 'U') ||
      (f1 === 'L' && f2 === 'R') ||
      (f1 === 'R' && f2 === 'L') ||
      (f1 === 'F' && f2 === 'B') ||
      (f1 === 'B' && f2 === 'F')
    );
  }

  /**
   * Executes a scramble on the cube.
   */
  public async scramble(moveCount = 20, fastSpeed = 0.08): Promise<SingleMoveNotation[]> {
    const moves = this.generateScrambleSequence(moveCount);
    for (const move of moves) {
      this.cubeState.applyMove(move);
      await this.cubeAnimator.animateMove(move, fastSpeed);
      if (this.onMoveExecuted) {
        this.onMoveExecuted(move, true);
      }
    }
    return moves;
  }

  /**
   * Instant hard reset back to solved state.
   */
  public reset(): void {
    this.cubeAnimator.resetQueue();
    this.cubeState.reset();
    this.cubeVisual.resetVisuals();
  }
}
