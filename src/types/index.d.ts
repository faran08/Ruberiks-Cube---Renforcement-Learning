export type FaceName = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export type SingleMoveNotation =
  | 'U' | "U'" | 'U2'
  | 'R' | "R'" | 'R2'
  | 'F' | "F'" | 'F2'
  | 'D' | "D'" | 'D2'
  | 'L' | "L'" | 'L2'
  | 'B' | "B'" | 'B2';

export type MoveNotation = SingleMoveNotation;

export type CubeColorName = 'white' | 'red' | 'green' | 'yellow' | 'orange' | 'blue';

export interface MoveEvent {
  move: MoveNotation;
  state: Uint8Array;
  isSolved: boolean;
}

export type Axis = 'x' | 'y' | 'z';

export interface DragIntersection {
  cubieIndex: number;
  faceNormal: { x: number; y: number; z: number };
  point: { x: number; y: number; z: number };
}
