class GameObject3D {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Euler();
    this.velocity = new THREE.Vector3();
    this.name = 'GameObject3D';
  }

  update(dt) {
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.rotation.copy(this.rotation);
    }
  }

  getBounds() {
    if (!this.mesh) return null;
    return new THREE.Box3().setFromObject(this.mesh);
  }

  destroy() {
    if (this.mesh) this.scene.remove(this.mesh);
  }
}