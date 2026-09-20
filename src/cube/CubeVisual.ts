import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FACE_COLORS } from './CubeConstants';

export class CubeVisual {
  public group: THREE.Group;
  public cubies: THREE.Mesh[] = [];

  private geometry: RoundedBoxGeometry;
  private materials: THREE.MeshStandardMaterial[];

  constructor() {
    this.group = new THREE.Group();

    // 0.96 size with 0.04 seam to prevent z-fighting and mimic real cube seams
    this.geometry = new RoundedBoxGeometry(0.96, 0.96, 0.96, 4, 0.04);

    // Create materials for the 6 faces + internal core
    const createStickerMat = (color: number) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.25,
        metalness: 0.05
      });

    const matRight = createStickerMat(FACE_COLORS.R);
    const matLeft = createStickerMat(FACE_COLORS.L);
    const matUp = createStickerMat(FACE_COLORS.U);
    const matDown = createStickerMat(FACE_COLORS.D);
    const matFront = createStickerMat(FACE_COLORS.F);
    const matBack = createStickerMat(FACE_COLORS.B);

    const matInternal = new THREE.MeshStandardMaterial({
      color: FACE_COLORS.INTERNAL,
      roughness: 0.65,
      metalness: 0.05
    });

    this.materials = [
      matRight,
      matLeft,
      matUp,
      matDown,
      matFront,
      matBack,
      matInternal
    ];

    this.createCubies(
      matRight,
      matLeft,
      matUp,
      matDown,
      matFront,
      matBack,
      matInternal
    );
  }

  private createCubies(
    matRight: THREE.Material,
    matLeft: THREE.Material,
    matUp: THREE.Material,
    matDown: THREE.Material,
    matFront: THREE.Material,
    matBack: THREE.Material,
    matInternal: THREE.Material
  ): void {
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // Skip internal unseen core cubie (0, 0, 0)
          if (x === 0 && y === 0 && z === 0) continue;

          // Three.js BoxGeometry face material order:
          // 0: +X (Right)
          // 1: -X (Left)
          // 2: +Y (Up)
          // 3: -Y (Down)
          // 4: +Z (Front)
          // 5: -Z (Back)
          const cubieMaterials: THREE.Material[] = [
            x === 1 ? matRight : matInternal,
            x === -1 ? matLeft : matInternal,
            y === 1 ? matUp : matInternal,
            y === -1 ? matDown : matInternal,
            z === 1 ? matFront : matInternal,
            z === -1 ? matBack : matInternal
          ];

          const mesh = new THREE.Mesh(this.geometry, cubieMaterials);
          mesh.position.set(x, y, z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          mesh.userData = {
            isCubie: true,
            origX: x,
            origY: y,
            origZ: z
          };

          this.cubies.push(mesh);
          this.group.add(mesh);
        }
      }
    }
  }

  /**
   * Resets all cubies back to default positions and identity rotations.
   */
  public resetVisuals(): void {
    this.cubies.forEach((mesh) => {
      const { origX, origY, origZ } = mesh.userData;
      mesh.position.set(origX, origY, origZ);
      mesh.rotation.set(0, 0, 0);
      mesh.quaternion.identity();
      mesh.updateMatrix();
    });
  }

  public dispose(): void {
    this.geometry.dispose();
    this.materials.forEach((m) => m.dispose());
  }
}
