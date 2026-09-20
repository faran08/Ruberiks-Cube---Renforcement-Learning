import confetti from 'canvas-confetti';
import { CommandInterface } from '../interaction/CommandInterface';
import { CubeAnimator } from '../cube/CubeAnimator';
import { CubeState } from '../cube/CubeState';
import { SceneSetup } from '../scene/SceneSetup';
import { SingleMoveNotation } from '../types';

export class UIPanel {
  private commandInterface: CommandInterface;
  private cubeAnimator: CubeAnimator;
  private cubeState: CubeState;
  private sceneSetup: SceneSetup;

  private moveCount = 0;
  private startTime: number | null = null;
  private timerInterval: number | null = null;

  // DOM Elements
  private statusBadge!: HTMLElement;
  private moveCountEl!: HTMLElement;
  private timerEl!: HTMLElement;
  private notationInput!: HTMLInputElement;

  constructor(
    commandInterface: CommandInterface,
    cubeAnimator: CubeAnimator,
    cubeState: CubeState,
    sceneSetup: SceneSetup
  ) {
    this.commandInterface = commandInterface;
    this.cubeAnimator = cubeAnimator;
    this.cubeState = cubeState;
    this.sceneSetup = sceneSetup;

    this.render();
    this.bindEvents();
  }

  private render(): void {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'ui-root';
    uiContainer.innerHTML = `
      <!-- Top Left Header -->
      <div class="glass-panel top-header">
        <span class="brand-title">Rubik's 3D</span>
        <span id="status-badge" class="status-badge">SOLVED</span>
      </div>

      <!-- Top Right Metrics -->
      <div class="glass-panel metrics-panel">
        <div class="metric-item">
          <span class="metric-label">Moves</span>
          <span id="metric-moves" class="metric-value">0</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Time</span>
          <span id="metric-time" class="metric-value">00:00.0</span>
        </div>
      </div>

      <!-- Algorithm Drawer / Notation Bar -->
      <div class="glass-panel command-drawer">
        <input 
          id="notation-input" 
          type="text" 
          class="command-input" 
          placeholder="Notation (e.g. R U R' U' R' F R2 U')"
          spellcheck="false"
          autocomplete="off"
        />
        <button id="btn-run-algo" class="btn-action btn-primary">Run</button>
        <div class="presets-bar">
          <button class="preset-chip" data-algo="R U R' U'">Sexy</button>
          <button class="preset-chip" data-algo="R U R' U' R' F R2 U' R' U' R U R' F'">T-Perm</button>
          <button class="preset-chip" data-algo="R U R' U R U2 R'">Sune</button>
          <button class="preset-chip" data-algo="U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2">Superflip</button>
        </div>
      </div>

      <!-- Bottom Controls -->
      <div class="glass-panel bottom-controls">
        <button id="btn-scramble" class="btn-action btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 3 21 3 21 8"></polyline>
            <line x1="4" y1="20" x2="21" y2="3"></line>
            <polyline points="21 16 21 21 16 21"></polyline>
            <line x1="15" y1="15" x2="21" y2="21"></line>
            <line x1="4" y1="4" x2="9" y2="9"></line>
          </svg>
          Scramble
        </button>

        <button id="btn-reset" class="btn-action btn-danger">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
          Reset
        </button>

        <button id="btn-camera" class="btn-action">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          Center View
        </button>
      </div>

      <!-- Speed Slider Panel -->
      <div class="glass-panel speed-panel">
        <span>Speed</span>
        <input 
          id="speed-slider" 
          type="range" 
          class="speed-slider" 
          min="0.05" 
          max="0.6" 
          step="0.02" 
          value="0.22"
        />
      </div>

      <!-- Keyboard Shortcuts Badge -->
      <div class="glass-panel hint-badge">
        <span>Hotkeys:</span>
        <span class="kbd-tag">U</span>
        <span class="kbd-tag">D</span>
        <span class="kbd-tag">L</span>
        <span class="kbd-tag">R</span>
        <span class="kbd-tag">F</span>
        <span class="kbd-tag">B</span>
        <span>(+Shift = Inverse)</span>
        <span class="kbd-tag">Space</span>
        <span>= Scramble</span>
      </div>
    `;

    document.body.appendChild(uiContainer);

    this.statusBadge = document.getElementById('status-badge')!;
    this.moveCountEl = document.getElementById('metric-moves')!;
    this.timerEl = document.getElementById('metric-time')!;
    this.notationInput = document.getElementById('notation-input') as HTMLInputElement;
  }

  private bindEvents(): void {
    // 1. Scramble button
    document.getElementById('btn-scramble')?.addEventListener('click', async () => {
      this.statusBadge.textContent = 'SCRAMBLING';
      this.statusBadge.className = 'status-badge turning';
      this.startTimer();
      await this.commandInterface.scramble(20);
      this.updateStatus();
    });

    // 2. Reset button
    document.getElementById('btn-reset')?.addEventListener('click', () => {
      this.commandInterface.reset();
      this.resetMetrics();
      this.updateStatus();
    });

    // 3. Camera reset button
    document.getElementById('btn-camera')?.addEventListener('click', () => {
      this.sceneSetup.resetCamera();
    });

    // 4. Algorithm Run button & Enter key
    const runAlgo = async () => {
      const seq = this.notationInput.value.trim();
      if (!seq) return;
      this.startTimer();
      this.statusBadge.textContent = 'RUNNING';
      this.statusBadge.className = 'status-badge turning';
      await this.commandInterface.executeSequence(seq);
      this.updateStatus();
    };

    document.getElementById('btn-run-algo')?.addEventListener('click', runAlgo);
    this.notationInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        runAlgo();
      }
    });

    // 5. Preset chips
    document.querySelectorAll('.preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const algo = chip.getAttribute('data-algo');
        if (algo) {
          this.notationInput.value = algo;
          runAlgo();
        }
      });
    });

    // 6. Speed slider
    const slider = document.getElementById('speed-slider') as HTMLInputElement;
    slider?.addEventListener('input', () => {
      const speed = parseFloat(slider.value);
      this.cubeAnimator.setSpeed(speed);
    });
  }

  public recordMove(_move: SingleMoveNotation, isScramble: boolean): void {
    if (!isScramble) {
      this.moveCount++;
      this.moveCountEl.textContent = this.moveCount.toString();
      this.startTimer();
    }
    this.updateStatus();
  }

  public updateStatus(): void {
    const isSolved = this.cubeState.isSolved();

    if (isSolved) {
      this.statusBadge.textContent = 'SOLVED';
      this.statusBadge.className = 'status-badge';
      if (this.moveCount > 0 && this.timerInterval) {
        this.stopTimer();
        this.celebrate();
      }
    } else {
      this.statusBadge.textContent = 'SCRAMBLED';
      this.statusBadge.className = 'status-badge scrambled';
    }
  }

  private celebrate(): void {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  private startTimer(): void {
    if (this.startTime !== null) return;
    this.startTime = Date.now();
    this.timerInterval = window.setInterval(() => {
      if (!this.startTime) return;
      const elapsed = Date.now() - this.startTime;
      const totalSeconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const tenths = Math.floor((elapsed % 1000) / 100);

      this.timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(
        seconds
      ).padStart(2, '0')}.${tenths}`;
    }, 100);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private resetMetrics(): void {
    this.moveCount = 0;
    this.moveCountEl.textContent = '0';
    this.stopTimer();
    this.startTime = null;
    this.timerEl.textContent = '00:00.0';
  }
}
