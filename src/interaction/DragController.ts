import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Axis, SingleMoveNotation } from '../types';
import { CubeVisual } from '../cube/CubeVisual';
import { CubeAnimator } from '../cube/CubeAnimator';
import { CubeState } from '../cube/CubeState';

export class DragController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private controls: OrbitControls;
  private cubeVisual: CubeVisual;
  private cubeAnimator: CubeAnimator;
  private cubeState: CubeState;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private isPointerDown = false;
  private hasTriggeredMove = false;
  private startScreenPos = new THREE.Vector2();
  private hitCubie: THREE.Mesh | null = null;
  private hitNormalWorld = new THREE.Vector3();

  public onMoveExecuted?: (move: SingleMoveNotation) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    controls: OrbitControls,
    cubeVisual: CubeVisual,
    cubeAnimator: CubeAnimator,
    cubeState: CubeState
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.controls = controls;
    this.cubeVisual = cubeVisual;
    this.cubeAnimator = cubeAnimator;
    this.cubeState = cubeState;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('pointercancel', this.onPointerUp.bind(this));
  }

  private onPointerDown(event: PointerEvent): void {
    if (this.cubeAnimator.getIsAnimating()) return;

    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cubeVisual.cubies, false);

    if (intersects.length > 0 && intersects[0].face) {
      const hit = intersects[0];
      this.isPointerDown = true;
      this.hasTriggeredMove = false;
      this.startScreenPos.set(event.clientX, event.clientY);
      this.hitCubie = hit.object as THREE.Mesh;

      // Compute face normal in world coordinates
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(this.hitCubie.matrixWorld);
      this.hitNormalWorld.copy(hit.face!.normal).applyMatrix3(normalMatrix).normalize();

      // Round to nearest cardinal normal
      this.hitNormalWorld.x = Math.round(this.hitNormalWorld.x);
      this.hitNormalWorld.y = Math.round(this.hitNormalWorld.y);
      this.hitNormalWorld.z = Math.round(this.hitNormalWorld.z);

      // Temporarily disable OrbitControls so dragging manipulates the cube
      this.controls.enabled = false;
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isPointerDown || this.hasTriggeredMove || !this.hitCubie) return;

    const deltaX = event.clientX - this.startScreenPos.x;
    const deltaY = event.clientY - this.startScreenPos.y;
    const distanceSq = deltaX * deltaX + deltaY * deltaY;

    // Minimum drag threshold: 12px
    if (distanceSq < 144) return;

    // 1. Calculate camera space drag direction in world coordinates
    const camRight = new THREE.Vector3();
    const camUp = new THREE.Vector3();
    this.camera.matrixWorld.extractBasis(camRight, camUp, new THREE.Vector3());

    const dragWorld = new THREE.Vector3()
      .addScaledVector(camRight, deltaX)
      .addScaledVector(camUp, -deltaY)
      .normalize();

    // 2. Cross product: Axis = FaceNormal x DragWorld
    const axisRaw = new THREE.Vector3().crossVectors(this.hitNormalWorld, dragWorld);

    // 3. Find dominant rotation axis (X, Y, or Z)
    const absX = Math.abs(axisRaw.x);
    const absY = Math.abs(axisRaw.y);
    const absZ = Math.abs(axisRaw.z);

    let axis: Axis = 'x';
    let dir = 1;

    if (absX >= absY && absX >= absZ) {
      axis = 'x';
      dir = Math.sign(axisRaw.x);
    } else if (absY >= absX && absY >= absZ) {
      axis = 'y';
      dir = Math.sign(axisRaw.y);
    } else {
      axis = 'z';
      dir = Math.sign(axisRaw.z);
    }

    // 4. Identify slice coordinate from the hit cubie
    let sliceCoord = Math.round(this.hitCubie.position[axis]);

    // If a center cubie was dragged along middle slice, prefer outer layer towards drag
    if (sliceCoord === 0) {
      sliceCoord = 1;
    }

    const angle = dir * (Math.PI / 2);
    const move = this.mapRotationToMove(axis, sliceCoord, angle);

    if (move) {
      this.hasTriggeredMove = true;
      this.cubeState.applyMove(move);
      this.cubeAnimator.animateMove(move);
      if (this.onMoveExecuted) {
        this.onMoveExecuted(move);
      }
    }
  }

  private onPointerUp(): void {
    this.isPointerDown = false;
    this.hitCubie = null;
    this.controls.enabled = true;
  }

  private mapRotationToMove(
    axis: Axis,
    sliceCoord: number,
    angle: number
  ): SingleMoveNotation | null {
    if (axis === 'y') {
      if (sliceCoord === 1) return angle < 0 ? 'U' : "U'";
      if (sliceCoord === -1) return angle > 0 ? 'D' : "D'";
    } else if (axis === 'x') {
      if (sliceCoord === 1) return angle < 0 ? 'R' : "R'";
      if (sliceCoord === -1) return angle > 0 ? 'L' : "L'";
    } else if (axis === 'z') {
      if (sliceCoord === 1) return angle < 0 ? 'F' : "F'";
      if (sliceCoord === -1) return angle > 0 ? 'B' : "B'";
    }
    return null;
  }
}
