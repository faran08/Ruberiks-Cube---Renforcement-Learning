import * as THREE from 'three';

export class Environment {
  public scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initLighting();
    this.initFloor();
  }

  private initLighting(): void {
    // 1. Balanced Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // 2. Key Light (Top-Front-Right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(6, 10, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    // 3. Fill Light (Cool bluish tone from opposite side)
    const fillLight = new THREE.DirectionalLight(0xa0c4ff, 0.8);
    fillLight.position.set(-8, 5, -6);
    this.scene.add(fillLight);

    // 4. Rim / Back Light (Warm accent)
    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.6);
    rimLight.position.set(0, -6, -8);
    this.scene.add(rimLight);
  }

  private initFloor(): void {
    // Subtle shadow-receiving floor disc
    const floorGeometry = new THREE.CircleGeometry(6, 64);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0c0f,
      roughness: 0.85,
      metalness: 0.1,
      transparent: true,
      opacity: 0.6
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.8;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }
}
