---
project: "3D Web Rubik's Cube Game with Deep Reinforcement Learning Solver"
version: "1.0.0"
date: "2026-09-20"
format_target: "LLM / Autonomous Coding Agent"
status: "PLANNED"
phases:
  - id: 1
    name: "Interactive 3D Rubik's Cube Web App (Game & Controls)"
  - id: 2
    name: "Deep Reinforcement Learning (DeepCubeA / PyTorch Training & ONNX Export)"
  - id: 3
    name: "In-Browser Web Worker AI Solver (Batch Weighted A* + ONNX Runtime Web)"
---

# SYSTEM SPECIFICATION & IMPLEMENTATION PLAN

## 1. Executive Summary & Objective

Build an interactive, high-fidelity 3D Rubik's Cube web application capable of manual play, programmatic/command execution, and automated solving using Deep Reinforcement Learning (DeepCubeA architecture). 

The system is decoupled into two primary subsystems:
1. **Frontend Game Engine**: Three.js + TypeScript + Vite with smooth pivot-based rotations, pointer raycasting for drag twisting, orbit inspection, and Singmaster command parsing.
2. **AI Solver Engine**: Deep Approximate Value Iteration (DAVI) / Autodidactic Iteration (ADI) neural network cost-to-go estimator exported to ONNX and executed via WebGPU/WASM in a Web Worker running Batch Weighted A* Search (BWAS).

---

## 2. Directory & File Structure

```
/home/faran/Projects/Ruberiks Cube - Renforcement Learning/
├── IMPLEMENTATION_PLAN.md          # This reference document
├── package.json                    # Frontend dependencies (three, gsap, onnxruntime-web)
├── tsconfig.json                   # Strict TypeScript compiler configuration
├── vite.config.ts                  # Vite config with Web Worker & WebGPU asset handling
├── index.html                      # Single page application entry point
├── public/
│   ├── favicon.ico
│   └── models/
│       └── deepcubea_fp16.onnx     # Quantized trained model (~10MB)
├── src/
│   ├── main.ts                     # App bootstrapper
│   ├── scene/
│   │   ├── SceneSetup.ts           # Three.js scene, camera, ACES tone mapping, lights
│   │   └── Environment.ts          # Floor shadow, backdrop, studio lighting
│   ├── cube/
│   │   ├── CubeState.ts            # Logical 54-facelet representation & permutation engine
│   │   ├── CubeVisual.ts           # 26 cubies (RoundedBoxGeometry), materials, layout
│   │   ├── CubeAnimator.ts         # Pivot reparenting, GSAP tweening, coordinate snapping
│   │   └── CubeConstants.ts        # Face colors, standard indices, move permutations
│   ├── interaction/
│   │   ├── DragController.ts       # Raycasting, drag vector projection, axis cross product
│   │   ├── CommandInterface.ts     # Singmaster notation parser (U, R, F', U2, etc.)
│   │   └── KeyboardControls.ts     # Hotkey bindings for moves and camera reset
│   ├── solver/
│   │   ├── SolverBridge.ts         # Main thread orchestrator, UI communication
│   │   ├── SolverWorker.ts         # Dedicated Web Worker running BWAS
│   │   ├── PriorityQueue.ts        # Min-Heap implementation for A* open set
│   │   └── StateEncoder.ts         # 54-facelet to 324-dim one-hot vector converter
│   ├── ui/
│   │   ├── UIPanel.ts              # Controls HUD (scramble, solve, speed, undo, reset)
│   │   ├── MoveHistory.ts          # Move queue and step-by-step playback navigator
│   │   └── style.css               # Clean modern glassmorphism styling
│   └── types/
│       └── index.d.ts              # Shared TypeScript types and message contracts
└── rl/
    ├── requirements.txt            # Python dependencies (torch, onnx, onnxruntime, numpy)
    ├── cube_env.py                 # Vectorized 3x3 Rubik's Cube environment
    ├── model.py                    # DeepCubeA PyTorch residual neural network
    ├── train.py                    # Autodidactic Iteration (ADI) training loop
    ├── search.py                   # Python validation implementation of BWAS
    └── export_onnx.py              # Export and FP16 quantization script
```

---

## 3. Mathematical & Algorithmic Foundations

### 3.1 Rubik's Cube State Representation

#### The 54-Facelet Model (Kociemba / WCA Order)
The cube surface is indexed into 54 facelets (0..53):
```
             | U0 U1 U2 |
             | U3 U4 U5 |
             | U6 U7 U8 |
  -----------+----------+-----------+-----------
  | L0 L1 L2 | F0 F1 F2 | R0 R1 R2  | B0 B1 B2 |
  | L3 L4 L5 | F3 F4 F5 | R3 R4 R5  | B3 B4 B5 |
  | L6 L7 L8 | F6 F7 F8 | R6 R7 R8  | B6 B7 B8 |
  -----------+----------+-----------+-----------
             | D0 D1 D2 |
             | D3 D4 D5 |
             | D6 D7 D8 |
```
- Face indexing:
  - `0..8`: Up (U) — White (`0xFFFFFF`)
  - `9..17`: Right (R) — Red (`0xB71234`)
  - `18..26`: Front (F) — Green (`0x009B48`)
  - `27..35`: Down (D) — Yellow (`0xFFD500`)
  - `36..44`: Left (L) — Orange (`0xFF5800`)
  - `45..53`: Back (B) — Blue (`0x0046AD`)

#### Move Permutation
Moves are static integer permutation arrays of length 54:
$$s' = \text{permute}(s, P) \implies s'[i] = s[P[i]]$$
Execution cost is $O(54)$ operations, enabling $>100,000$ state transitions/sec in JavaScript.

#### Quarter-Turn Metric (QTM) Action Set (12 Actions)
$$\mathcal{A} = \{U, U', D, D', L, L', R, R', F, F', B, B'\}$$
*(Half turns $U2, D2, \dots$ are represented as two identical quarter turns or handled in HTM expansion)*.

### 3.2 Deep Reinforcement Learning Architecture (DeepCubeA)

#### Cost-to-Go Function
Let $v^*(s)$ be the shortest path distance (in moves) from state $s$ to the solved state $s_{goal}$.
By Bellman's optimality equation:
$$v^*(s) = \min_{a \in \mathcal{A}} \left( 1 + v^*(A(s, a)) \right), \quad \text{with } v^*(s_{goal}) = 0$$

#### Autodidactic Iteration (ADI) Training
1. **Reverse Scramble**: Sample scramble depth $k \sim \text{Uniform}(1, 30)$. Start at $s_{goal}$, apply $k$ random moves to generate $s$.
2. **One-Step Lookahead Target**:
   $$y(s) = \min_{a \in \mathcal{A}} \left( 1 + v_\theta(A(s, a)) \right)$$
3. **Loss Function**: Mean Squared Error (MSE) / Huber Loss:
   $$\mathcal{L}(\theta) = \frac{1}{|B|} \sum_{s \in B} \left( v_\theta(s) - y(s) \right)^2$$
4. **Input Encoding**: 324-dimensional one-hot vector (54 stickers $\times$ 6 colors).

#### Neural Network Topology (PyTorch)
```
Input: [batch_size, 324] (Float32)
  │
  ├──► Linear(324, 5000) ──► BatchNorm1d ──► ReLU
  │
  ├──► Linear(5000, 1000) ──► BatchNorm1d ──► ReLU
  │
  ├──► ResBlock 1: [Linear(1000,1000) ──► BN ──► ReLU ──► Linear(1000,1000) ──► BN] + Skip ──► ReLU
  ├──► ResBlock 2: [Linear(1000,1000) ──► BN ──► ReLU ──► Linear(1000,1000) ──► BN] + Skip ──► ReLU
  ├──► ResBlock 3: [Linear(1000,1000) ──► BN ──► ReLU ──► Linear(1000,1000) ──► BN] + Skip ──► ReLU
  ├──► ResBlock 4: [Linear(1000,1000) ──► BN ──► ReLU ──► Linear(1000,1000) ──► BN] + Skip ──► ReLU
  │
  └──► Linear(1000, 1) ──► Cost-to-Go scalar v_θ(s)
```

### 3.3 Batch Weighted A* Search (BWAS)

At inference time in the browser Web Worker:
- Evaluation function: $f(s) = \lambda \cdot g(s) + h(s)$
  - $g(s)$: Move count from start
  - $h(s) = v_\theta(s)$: Cost-to-go predicted by the neural network
  - $\lambda \in [0.6, 1.0]$: Weight parameter (balances optimality vs search speed)
- **Batch Evaluation**: Instead of calling the ONNX session per node, collect up to $B = 64 \dots 128$ child states across open nodes, construct a single tensor `[B, 324]`, and run one forward pass on WebGPU/WASM.

---

## 4. Detailed Component Specifications

### 4.1 Phase 1: 3D Game & Interaction Engine

#### Visual Architecture (`CubeVisual.ts` & `CubeAnimator.ts`)
- **Cubie Geometry**: `RoundedBoxGeometry(0.96, 0.96, 0.96, 4, 0.04)` from `three/addons/geometries/RoundedBoxGeometry.js`.
- **Spacing**: Grid step $= 1.0$, creating an intentional $0.04$ seam to prevent z-fighting and replicate real cube plastic gaps.
- **Materials**: 6 color sticker materials (`roughness: 0.25, metalness: 0.02`) + 1 dark interior plastic (`roughness: 0.60, metalness: 0.05, color: 0x141414`).
- **Pivot Layer Rotation Algorithm**:
  1. Determine axis ($X, Y, \text{ or } Z$) and coordinate index ($-1, 0, \text{ or } 1$).
  2. Filter all 26 meshes: `mesh.position[axis]` matching target slice ($\pm 0.1$).
  3. `pivot.attach(mesh)`: Reparents meshes while maintaining world transform.
  4. Tween pivot rotation via GSAP:
     ```typescript
     gsap.to(pivot.rotation, {
       [axis]: targetAngle,
       duration: animSpeed, // default 0.25s
       ease: "power2.out",
       onComplete: () => {
         // Reparent back
         meshes.forEach(m => cubeContainer.attach(m));
         // Precision coordinate snap to avoid floating-point drift:
         m.position.set(Math.round(m.position.x), Math.round(m.position.y), Math.round(m.position.z));
         m.rotation.set(
           Math.round(m.rotation.x / (Math.PI / 2)) * (Math.PI / 2),
           Math.round(m.rotation.y / (Math.PI / 2)) * (Math.PI / 2),
           Math.round(m.rotation.z / (Math.PI / 2)) * (Math.PI / 2)
         );
         m.updateMatrix();
         pivot.rotation.set(0, 0, 0);
       }
     });
     ```

#### Pointer Drag Controller (`DragController.ts`)
1. Raycast mouse/touch on `pointerdown`.
2. If hit on cubie:
   - Disable `OrbitControls`.
   - Store `intersectedCubie`, `hitPoint`, and `faceNormalWorld = face.normal.clone().applyQuaternion(cubie.quaternion).round()`.
3. On `pointermove`:
   - Calculate screen drag displacement $\vec{\Delta} = (x - x_0, y - y_0)$.
   - If $|\vec{\Delta}| < 8\text{px}$, ignore (click deadband).
   - Convert screen drag to camera world direction $\vec{D}$.
   - Compute layer rotation axis:
     $$\vec{A}_{\text{raw}} = \vec{N}_{\text{face}} \times \vec{D}$$
   - Snap $\vec{A}_{\text{raw}}$ to dominant cardinal axis $( \pm 1, 0, 0 )$, $( 0, \pm 1, 0 )$, or $( 0, 0, \pm 1 )$.
   - Slice coordinate $= \text{round}(\text{cubie.position} \cdot \vec{A})$.
   - Trigger layer animation and update `CubeState`.
4. On `pointerup`:
   - Re-enable `OrbitControls`.

#### Programmatic Command Interface (`CommandInterface.ts`)
- Accepts standard Singmaster notation:
  - Single moves: `U`, `U'`, `U2`, `D`, `D'`, `D2`, `L`, `L'`, `L2`, `R`, `R'`, `R2`, `F`, `F'`, `F2`, `B`, `B'`, `B2`
  - Sequence strings: `"R U R' U' R' F R2 U' R' U' R U R' F'"`
- Method signatures:
  ```typescript
  executeMove(move: MoveNotation): Promise<void>;
  executeSequence(moves: string, speedMultiplier?: number): Promise<void>;
  scramble(moveCount?: number): Promise<string[]>;
  reset(): void;
  ```

---

### 4.2 Phase 2: Offline PyTorch Training Pipeline

#### Scramble & Target Generation (`rl/train.py`)
```python
def generate_training_batch(batch_size=1024, max_scramble=30):
    states = []
    targets = []
    # Vectorized scramble generation
    for _ in range(batch_size):
        k = np.random.randint(1, max_scramble + 1)
        cube = RubiksCube()
        cube.random_scramble(k)
        
        # 1-step lookahead across all 12 QTM moves
        child_values = []
        for action in ALL_12_ACTIONS:
            next_state = cube.peek_move(action)
            if next_state.is_solved():
                child_values.append(0.0)
            else:
                encoded = encode_state_324(next_state)
                child_values.append(model.predict(encoded))
        
        y = 1.0 + min(child_values)
        states.append(encode_state_324(cube.state))
        targets.append(y)
        
    return torch.tensor(states, dtype=torch.float32), torch.tensor(targets, dtype=torch.float32)
```

#### Export to ONNX (`rl/export_onnx.py`)
```python
import torch
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

dummy_input = torch.randn(1, 324, dtype=torch.float32)
torch.onnx.export(
    model,
    dummy_input,
    "public/models/deepcubea.onnx",
    input_names=["input"],
    output_names=["cost_to_go"],
    dynamic_axes={"input": {0: "batch_size"}, "cost_to_go": {0: "batch_size"}},
    opset_version=17
)

# Quantize to FP16 / INT8 to reduce bundle size from ~40MB to ~10MB
quantize_dynamic(
    "public/models/deepcubea.onnx",
    "public/models/deepcubea_fp16.onnx",
    weight_type=QuantType.QUInt8
)
```

---

### 4.3 Phase 3: In-Browser Web Worker AI Solver

#### Web Worker Message Protocol (`src/types/index.d.ts`)
```typescript
export type WorkerInMessage = 
  | { type: 'INIT_MODEL'; modelUrl: string }
  | { type: 'SOLVE'; state: Uint8Array; maxTimeMs?: number; lambda?: number }
  | { type: 'CANCEL' };

export type WorkerOutMessage = 
  | { type: 'MODEL_LOADED'; backend: 'webgpu' | 'wasm' }
  | { type: 'SEARCH_PROGRESS'; nodesExpanded: number; currentDepth: number; heuristic: number }
  | { type: 'SOLUTION_FOUND'; moves: string[]; solveTimeMs: number; nodesExpanded: number }
  | { type: 'ERROR'; message: string };
```

#### Web Worker Execution Pipeline (`src/solver/SolverWorker.ts`)
1. On `INIT_MODEL`:
   ```typescript
   session = await ort.InferenceSession.create(modelUrl, {
     executionProviders: ['webgpu', 'wasm'],
     graphOptimizationLevel: 'all'
   });
   ```
2. On `SOLVE`:
   - Initialize `PriorityQueue<SearchNode>` (Min-heap ordered by $f(s) = \lambda \cdot g(s) + h(s)$).
   - Initialize `visitedStates = new Set<bigint>()` using a 64-bit compact state hash.
   - Batch evaluation loop:
     - Pop up to $N = 32$ best nodes from queue.
     - For each node, generate all 12 valid child states.
     - If any child is solved $\implies$ reconstruct path via parent pointers and post `SOLUTION_FOUND`.
     - Filter out already visited children.
     - Construct batched Float32Array tensor `[numChildren, 324]`.
     - Run `session.run({ input: batchTensor })`.
     - Insert children into PriorityQueue with updated $f, g, h$.

---

## 5. UI/UX Specification

### Visual Styling
- Theme: Minimalist futuristic dark mode (`background: #0d0f12`).
- Canvas: Full viewport `100vw x 100vh` responsive Three.js canvas.
- Overlays: Floating glassmorphism cards with `backdrop-filter: blur(16px)` and subtle glowing borders (`rgba(255, 255, 255, 0.08)`).

### HUD Elements
1. **Header**: Cube state status ("SOLVED", "SCRAMBLED", "SOLVING...")
2. **Control Bar** (Bottom Center):
   - `Scramble` button (with move count selector: 5, 10, 20 moves)
   - `Solve (AI)` button with pulse animation when available
   - `Reset` button
   - `Undo` / `Redo` buttons
3. **Metrics Bar** (Top Right):
   - Move counter
   - Timer (starts on first manual move or scramble)
   - Solver metrics (Solve time, Nodes expanded, Solution length)
4. **Command Prompt / Drawer** (Collapsible):
   - Text input for custom notation sequences (`R U R' U'...`)
   - Speed slider (0.1x to 5.0x animation speed)

---

## 6. Execution Roadmap & Verification Milestones

### Milestone 1: Core 3D Interactive Cube (Phase 1)
- [ ] Initialize Vite + TypeScript environment
- [ ] Implement `CubeState.ts` (54-facelet representation + 18 move permutation cycles)
- [ ] Unit test `CubeState`: verify $X \cdot X^{-1} = I$ for all 6 faces, verify known sequences (e.g. sexy move $(R U R' U') \times 6 = I$)
- [ ] Implement `CubeVisual.ts` with `RoundedBoxGeometry` and materials
- [ ] Implement `CubeAnimator.ts` with pivot reparenting and drift snapping
- [ ] Implement `DragController.ts` with raycast, normal projection, and axis cross products
- [ ] Add HUD for Scramble, Reset, and Notation Input

### Milestone 2: RL Environment & Model Export (Phase 2)
- [ ] Build `rl/cube_env.py` and verify parity with TypeScript `CubeState.ts`
- [ ] Construct PyTorch DeepCubeA network in `rl/model.py`
- [ ] Script Autodidactic Iteration loop in `rl/train.py`
- [ ] Implement ONNX export and quantization script `rl/export_onnx.py`
- [ ] Bundle pre-trained / exported `.onnx` model into `public/models/`

### Milestone 3: AI Solver Integration & Polish (Phase 3)
- [ ] Implement Web Worker `SolverWorker.ts` with `onnxruntime-web`
- [ ] Implement Batched Weighted A* Search with min-heap priority queue
- [ ] Implement `SolverBridge.ts` for worker-to-UI message synchronization
- [ ] Wire up the "Solve" button to trigger search and step-by-step playback
- [ ] Polish UI, responsive mobile touch handling, lighting, and shadow effects
