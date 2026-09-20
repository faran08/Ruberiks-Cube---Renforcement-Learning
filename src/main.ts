import { SceneSetup } from './scene/SceneSetup';
import { Environment } from './scene/Environment';
import { CubeVisual } from './cube/CubeVisual';
import { CubeAnimator } from './cube/CubeAnimator';
import { CubeState } from './cube/CubeState';
import { DragController } from './interaction/DragController';
import { CommandInterface } from './interaction/CommandInterface';
import { KeyboardControls } from './interaction/KeyboardControls';
import { UIPanel } from './ui/UIPanel';
import { SingleMoveNotation } from './types';

function initApp(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    throw new Error('Canvas container #canvas-container not found.');
  }

  // 1. Scene, Camera, Renderer, OrbitControls
  const sceneSetup = new SceneSetup(container);

  // 2. Studio Lighting & Floor Shadow
  new Environment(sceneSetup.scene);

  // 3. 3D Visual Cube
  const cubeVisual = new CubeVisual();
  sceneSetup.scene.add(cubeVisual.group);

  // 4. Layer Animator & Permutation State
  const cubeAnimator = new CubeAnimator(cubeVisual);
  const cubeState = new CubeState();

  // 5. Command & Notation Interface
  const commandInterface = new CommandInterface(cubeState, cubeVisual, cubeAnimator);

  // 6. Interactive Drag Twisting
  const dragController = new DragController(
    sceneSetup.camera,
    container,
    sceneSetup.controls,
    cubeVisual,
    cubeAnimator,
    cubeState
  );

  // 7. Keyboard Shortcuts (U, D, L, R, F, B, Space, Esc)
  new KeyboardControls(commandInterface, sceneSetup);

  // 8. Glassmorphism HUD & Telemetry
  const uiPanel = new UIPanel(
    commandInterface,
    cubeAnimator,
    cubeState,
    sceneSetup
  );

  // Wire move events to UI metrics
  const onMove = (move: SingleMoveNotation, isScramble = false) => {
    uiPanel.recordMove(move, isScramble);
  };

  dragController.onMoveExecuted = (move) => onMove(move, false);
  commandInterface.onMoveExecuted = (move, isScramble) => onMove(move, isScramble);

  // 9. Continuous 60fps Render Loop
  function renderLoop(): void {
    requestAnimationFrame(renderLoop);
    sceneSetup.render();
  }
  renderLoop();
}

window.addEventListener('DOMContentLoaded', initApp);
