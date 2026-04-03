class Corridor extends GameObject3D {
  constructor(scene) {
    super(scene);
    this.name = 'Corridor';
    this.createMesh();
  }

  createMesh() {
    this.group = new THREE.Group();

    // Floor
    const floorGeo = new THREE.PlaneGeometry(14, 50);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -12.5);
    floor.receiveShadow = true;
    this.group.add(floor);

    // Floor tiles pattern
    for (let z = 0; z > -50; z -= 2) {
      for (let x = -6; x <= 6; x += 2) {
        const tileGeo = new THREE.PlaneGeometry(1.9, 1.9);
        const shade = ((Math.abs(x) + Math.abs(z)) % 4 < 2) ? 0x555555 : 0x3a3a3a;
        const tileMat = new THREE.MeshLambertMaterial({ color: shade });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x, 0.01, z);
        tile.receiveShadow = true;
        this.group.add(tile);
      }
    }

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(14, 50);
    const ceilMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 6, -12.5);
    this.group.add(ceil);

    // Walls
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x665555 });
    const wallGeo = new THREE.PlaneGeometry(50, 6);

    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-7, 3, -12.5);
    leftWall.receiveShadow = true;
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMat.clone());
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(7, 3, -12.5);
    rightWall.receiveShadow = true;
    this.group.add(rightWall);

    // Back wall (behind elevator)
    const backGeo = new THREE.PlaneGeometry(14, 6);
    const backMat = new THREE.MeshLambertMaterial({ color: 0x554444 });
    const backWall = new THREE.Mesh(backGeo, backMat);
    backWall.position.set(0, 3, -26);
    this.group.add(backWall);

    // Ceiling lights
    for (let z = -5; z > -30; z -= 8) {
      const lightGeo = new THREE.BoxGeometry(2, 0.1, 0.5);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
      const ceilLight = new THREE.Mesh(lightGeo, lightMat);
      ceilLight.position.set(0, 5.95, z);
      this.group.add(ceilLight);

      // Actual point light for each ceiling light
      const pl = new THREE.PointLight(0xffeecc, 0.6, 15);
      pl.position.set(0, 5.5, z);
      this.group.add(pl);
    }

    // Emergency light (red, pulsing)
    const emergencyGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const emergencyMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.emergencyLight = new THREE.Mesh(emergencyGeo, emergencyMat);
    this.emergencyLight.position.set(-6.9, 5, -5);
    this.group.add(this.emergencyLight);

    // Blood stains on walls (atmosphere)
    const stainGeo = new THREE.PlaneGeometry(1.5, 1);
    const stainMat = new THREE.MeshLambertMaterial({
      color: 0x330000,
      transparent: true,
      opacity: 0.5
    });
    const stain1 = new THREE.Mesh(stainGeo, stainMat);
    stain1.rotation.y = Math.PI / 2;
    stain1.position.set(-6.95, 2, -8);
    this.group.add(stain1);

    const stain2 = new THREE.Mesh(stainGeo, stainMat.clone());
    stain2.rotation.y = -Math.PI / 2;
    stain2.position.set(6.95, 1.5, -15);
    this.group.add(stain2);

    this.mesh = this.group;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(dt) {
    // Pulse emergency light
    if (this.emergencyLight) {
      const pulse = (Math.sin(Date.now() * 0.005) + 1) * 0.5;
      this.emergencyLight.material.opacity = 0.3 + pulse * 0.7;
    }
    super.update(dt);
  }
}