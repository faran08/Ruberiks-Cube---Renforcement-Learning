import * as THREE from 'three';
import gsap from 'gsap';
import { Axis, SingleMoveNotation } from '../types';
import { CubeVisual } from './CubeVisual';

interface MoveSpec {
  axis: Axis;
  sliceCoord: number;
  angle: number;
}

export class CubeAnimator {
  private cubeVisual: CubeVisual;
  private pivot: THREE.Group;
  private isAnimating = false;
  private animDuration = 0.22; // Seconds
  private moveQueue: Array<() => Promise<void>> = [];

  constructor(cubeVisual: CubeVisual) {
    this.cubeVisual = cubeVisual;
    this.pivot = new THREE.Group();
    this.pivot.name = 'CubeRotationPivot';
    this.cubeVisual.group.add(this.pivot);
  }

  public setSpeed(durationSeconds: number): void {
    this.animDuration = Math.max(0.04, Math.min(1.5, durationSeconds));
  }

  public getSpeed(): number {
    return this.animDuration;
  }

  public getIsAnimating(): boolean {
    return this.isAnimating;
  }

  /**
   * Translates a Singmaster move notation into an axis, slice coordinate, and radian angle.
   */
  public parseMoveToSpec(move: SingleMoveNotation): MoveSpec {
    const face = move[0] as 'U' | 'D' | 'R' | 'L' | 'F' | 'B';
    const isPrime = move.includes("'");
    const isDouble = move.includes('2');

    let axis: Axis = 'y';
    let sliceCoord = 1;
    let baseAngle = -Math.PI / 2;

    switch (face) {
      case 'U':
        axis = 'y';
        sliceCoord = 1;
        baseAngle = -Math.PI / 2;
        break;
      case 'D':
        axis = 'y';
        sliceCoord = -1;
        baseAngle = Math.PI / 2;
        break;
      case 'R':
        axis = 'x';
        sliceCoord = 1;
        baseAngle = -Math.PI / 2;
        break;
      case 'L':
        axis = 'x';
        sliceCoord = -1;
        baseAngle = Math.PI / 2;
        break;
      case 'F':
        axis = 'z';
        sliceCoord = 1;
        baseAngle = -Math.PI / 2;
        break;
      case 'B':
        axis = 'z';
        sliceCoord = -1;
        baseAngle = Math.PI / 2;
        break;
    }

    let angle = baseAngle;
    if (isPrime) {
      angle = -baseAngle;
    } else if (isDouble) {
      angle = baseAngle * 2;
    }

    return { axis, sliceCoord, angle };
  }

  /**
   * Enqueues and executes a layer rotation move.
   */
  public animateMove(move: SingleMoveNotation, customDuration?: number): Promise<void> {
    const spec = this.parseMoveToSpec(move);
    return this.enqueueAnimation(() =>
      this.executeLayerRotation(spec.axis, spec.sliceCoord, spec.angle, customDuration ?? this.animDuration)
    );
  }

  /**
   * Direct rotation by slice coordinate and angle (for drag controls).
   */
  public animateSlice(
    axis: Axis,
    sliceCoord: number,
    angle: number,
    customDuration?: number
  ): Promise<void> {
    return this.enqueueAnimation(() =>
      this.executeLayerRotation(axis, sliceCoord, angle, customDuration ?? this.animDuration)
    );
  }

  private enqueueAnimation(task: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.moveQueue.push(async () => {
        try {
          await task();
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isAnimating || this.moveQueue.length === 0) return;

    this.isAnimating = true;
    const nextTask = this.moveQueue.shift()!;
    try {
      await nextTask();
    } finally {
      this.isAnimating = false;
      this.processQueue();
    }
  }

  /**
   * Core pivot reparenting & GSAP tweening with precision drift snapping.
   */
  private executeLayerRotation(
    axis: Axis,
    sliceCoord: number,
    angle: number,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      // 1. Reset pivot transform
      this.pivot.rotation.set(0, 0, 0);
      this.pivot.position.set(0, 0, 0);
      this.pivot.updateMatrixWorld(true);

      // 2. Identify 9 slice cubies matching the coordinate threshold (+/- 0.15)
      const sliceCubies = this.cubeVisual.cubies.filter((mesh) => {
        const val = mesh.position[axis];
        return Math.abs(val - sliceCoord) < 0.15;
      });

      // 3. Attach matching cubies to pivot
      sliceCubies.forEach((cubie) => {
        this.pivot.attach(cubie);
      });

      // 4. GSAP smooth tweening
      const targetRotation = { [axis]: angle };

      gsap.to(this.pivot.rotation, {
        ...targetRotation,
        duration: Math.max(0.01, duration),
        ease: 'power2.out',
        onComplete: () => {
          // 5. Reparent back to cube root group
          sliceCubies.forEach((cubie) => {
            this.cubeVisual.group.attach(cubie);

            // 6. Coordinate drift snap to clean integer coordinates
            cubie.position.set(
              Math.round(cubie.position.x),
              Math.round(cubie.position.y),
              Math.round(cubie.position.z)
            );

            // 7. Snap rotation to exact multiples of pi/2
            const snapAngle = (r: number) =>
              Math.round(r / (Math.PI / 2)) * (Math.PI / 2);

            cubie.rotation.set(
              snapAngle(cubie.rotation.x),
              snapAngle(cubie.rotation.y),
              snapAngle(cubie.rotation.z)
            );
            cubie.updateMatrix();
          });

          // 8. Clean reset pivot
          this.pivot.rotation.set(0, 0, 0);
          this.pivot.updateMatrix();

          resolve();
        }
      });
    });
  }

  /**
   * Clears queue and cancels running animations (useful on reset).
   */
  public resetQueue(): void {
    this.moveQueue = [];
    gsap.killTweensOf(this.pivot.rotation);
    this.cubeVisual.cubies.forEach((cubie) => {
      this.cubeVisual.group.attach(cubie);
    });
    this.pivot.rotation.set(0, 0, 0);
    this.isAnimating = false;
  }
}
