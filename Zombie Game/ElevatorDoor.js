class ElevatorDoor extends GameObject3D {
  constructor(scene) {
    super(scene);
    this.name = 'ElevatorDoor';
    this.isOpen = false;
    this.openProgress = 0;
    this.targetOpen = 0;
    this.doorWidth = 5;
    this.doorHeight = 5;
    this.doorDepth = 0.3;
    this.createMesh();
  }

  createMesh() {
    this.group = new THREE.Group();

    // Door frame
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x555555 });

    // Top frame
    const topGeo = new THREE.BoxGeometry(this.doorWidth + 1, 0.5, this.doorDepth + 0.2);
    const topFrame = new THREE.Mesh(topGeo, frameMat);
    topFrame.position.set(0, this.doorHeight + 0.25, -25);
    topFrame.castShadow = true;
    this.group.add(topFrame);

    // Side frames
    const sideGeo = new THREE.BoxGeometry(0.5, this.doorHeight + 0.5, this.doorDepth + 0.2);
    const leftFrame = new THREE.Mesh(sideGeo, frameMat);
    leftFrame.position.set(-(this.doorWidth / 2 + 0.25), this.doorHeight / 2, -25);
    leftFrame.castShadow = true;
    this.group.add(leftFrame);
    const rightFrame = new THREE.Mesh(sideGeo, frameMat);
    rightFrame.position.set(this.doorWidth / 2 + 0.25, this.doorHeight / 2, -25);
    rightFrame.castShadow = true;
    this.group.add(rightFrame);

    // Floor indicator above door
    const indicatorGeo = new THREE.BoxGeometry(1.5, 0.6, 0.1);
    const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x220000 });
    this.floorIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
    this.floorIndicator.position.set(0, this.doorHeight + 0.8, -24.85);
    this.group.add(this.floorIndicator);

    // Left door
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const doorGeo = new THREE.BoxGeometry(this.doorWidth / 2, this.doorHeight, this.doorDepth);
    this.leftDoor = new THREE.Mesh(doorGeo, doorMat.clone());
    this.leftDoor.position.set(-this.doorWidth / 4, this.doorHeight / 2, -25);
    this.leftDoor.castShadow = true;
    this.group.add(this.leftDoor);

    // Right door
    this.rightDoor = new THREE.Mesh(doorGeo, doorMat.clone());
    this.rightDoor.position.set(this.doorWidth / 4, this.doorHeight / 2, -25);
    this.rightDoor.castShadow = true;
    this.group.add(this.rightDoor);

    // Add metallic lines on doors
    const lineGeo = new THREE.BoxGeometry(0.05, this.doorHeight - 0.5, 0.01);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const line1 = new THREE.Mesh(lineGeo, lineMat);
    line1.position.set(-this.doorWidth / 4, this.doorHeight / 2, -24.83);
    this.group.add(line1);
    const line2 = new THREE.Mesh(lineGeo, lineMat);
    line2.position.set(this.doorWidth / 4, this.doorHeight / 2, -24.83);
    this.group.add(line2);

    this.mesh = this.group;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  open() {
    this.targetOpen = 1;
  }

  close() {
    this.targetOpen = 0;
  }

  update(dt) {
    // Animate door opening/closing
    const speed = 1.5;
    if (this.openProgress < this.targetOpen) {
      this.openProgress = Math.min(this.openProgress + dt * speed, 1);
    } else if (this.openProgress > this.targetOpen) {
      this.openProgress = Math.max(this.openProgress - dt * speed, 0);
    }

    const offset = this.openProgress * (this.doorWidth / 2 + 0.3);
    this.leftDoor.position.x = -this.doorWidth / 4 - offset;
    this.rightDoor.position.x = this.doorWidth / 4 + offset;

    this.isOpen = this.openProgress > 0.95;

    super.update(dt);
  }
}