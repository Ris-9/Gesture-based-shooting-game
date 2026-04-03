/**
 * Zombie Entity
 * 
 * BALANCE VARIABLES (tweak these):
 * - BASE_SPEED: Starting speed (floor 1)
 * - SPEED_SCALE_PER_FLOOR: Additional speed per floor
 * - ODD_FLOOR_SPEED_BONUS: Extra speed on even-numbered floors of each pair
 * - BASE_BODY_HP: Base body hit points
 * - HP_SCALE_PER_FLOOR: Additional HP per floor
 * - HEAD_HITBOX_RATIO: How much of the zombie height counts as head (0.0-1.0, from top)
 * - SPAWN_SPREAD: How far apart zombies spawn horizontally
 * - CHARGE_DISTANCE: How far zombies start from the player
 */
class Zombie extends GameObject3D {
  // ===== BALANCE KNOBS =====
  static BASE_SPEED = 4.0;
  static SPEED_SCALE_PER_FLOOR = 0.5;
  static ODD_FLOOR_SPEED_BONUS = 1.5; // bonus on second floor of each pair
  static BASE_BODY_HP = 2;
  static HP_SCALE_PER_FLOOR = 0.5;
  static HEAD_HITBOX_RATIO = 0.25; // top 25% of zombie is head
  static SPAWN_SPREAD = 3.0;
  static CHARGE_DISTANCE = 25;
  static REACH_DISTANCE = 1.5;
  // =========================

  constructor(scene, floor, index, totalZombies) {
    super(scene);
    this.name = 'Zombie';
    this.floor = floor;
    this.index = index;
    this.alive = true;
    this.dying = false;
    this.dyingTimer = 0;
    this.reachedPlayer = false;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.swaySpeed = 3 + Math.random() * 2;

    // Is this the harder floor of the pair? (floors 2,4,6,8,10)
    const isHarderFloor = (floor % 2 === 0);

    // Calculate speed
    this.speed = Zombie.BASE_SPEED + (floor - 1) * Zombie.SPEED_SCALE_PER_FLOOR;
    if (isHarderFloor) this.speed += Zombie.ODD_FLOOR_SPEED_BONUS;
    // Add slight random variation
    this.speed *= (0.85 + Math.random() * 0.3);

    // Calculate HP
    this.maxHp = Math.floor(Zombie.BASE_BODY_HP + (floor - 1) * Zombie.HP_SCALE_PER_FLOOR);
    if (isHarderFloor) this.maxHp += 1;
    this.hp = this.maxHp;

    // Spawn position
    const spread = Zombie.SPAWN_SPREAD;
    let xOffset = 0;
    if (totalZombies > 1) {
      xOffset = (index - (totalZombies - 1) / 2) * spread;
    }
    // Add slight random offset
    xOffset += (Math.random() - 0.5) * 1.0;

    this.position.set(xOffset, 0, -Zombie.CHARGE_DISTANCE);

    // Stagger spawn timing
    this.spawnDelay = index * 0.3 + Math.random() * 0.2;
    this.spawned = false;
    this.spawnTimer = 0;

    this.createMesh();
  }

  createMesh() {
    this.group = new THREE.Group();

    // Zombie body colors based on floor
    const skinHue = 0.25 + (this.floor * 0.01);
    const skinColor = new THREE.Color().setHSL(skinHue, 0.3, 0.25);
    const darkSkin = new THREE.Color().setHSL(skinHue, 0.4, 0.15);

    // Body (torso)
    const bodyGeo = new THREE.BoxGeometry(1.0, 1.6, 0.6);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a3a2a });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.y = 1.2;
    this.bodyMesh.castShadow = true;
    this.group.add(this.bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: skinColor });
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.position.y = 2.35;
    this.headMesh.castShadow = true;
    this.group.add(this.headMesh);

    // Eyes (glowing red)
    const eyeGeo = new THREE.SphereGeometry(0.06, 6, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 2.4, 0.3);
    this.group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 2.4, 0.3);
    this.group.add(rightEye);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.25, 1.2, 0.25);
    const armMat = new THREE.MeshLambertMaterial({ color: darkSkin });
    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.7, 1.5, 0.3);
    this.leftArm.rotation.x = -0.8;
    this.leftArm.castShadow = true;
    this.group.add(this.leftArm);
    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(0.7, 1.5, 0.3);
    this.rightArm.rotation.x = -0.8;
    this.rightArm.castShadow = true;
    this.group.add(this.rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.25, 0.4, 0);
    leftLeg.castShadow = true;
    this.group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.25, 0.4, 0);
    rightLeg.castShadow = true;
    this.group.add(rightLeg);

    // Initially hidden
    this.group.visible = false;

    this.mesh = this.group;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(dt) {
    if (!this.alive && !this.dying) return;

    // Handle spawn delay
    if (!this.spawned) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnDelay) {
        this.spawned = true;
        this.group.visible = true;
      } else {
        return;
      }
    }

    // Dying animation
    if (this.dying) {
      this.dyingTimer += dt;
      this.group.rotation.x += dt * 3;
      this.group.position.y -= dt * 2;
      const s = Math.max(0, 1 - this.dyingTimer * 2);
      this.group.scale.set(s, s, s);
      if (this.dyingTimer > 0.6) {
        this.alive = false;
        this.dying = false;
        this.group.visible = false;
      }
      return;
    }

    // Move toward player (z=0)
    this.position.z += this.speed * dt;

    // Sway animation
    const sway = Math.sin(Date.now() * 0.005 * this.swaySpeed + this.swayOffset) * 0.15;
    this.group.rotation.z = sway;

    // Arm swing
    const armSwing = Math.sin(Date.now() * 0.008 * this.swaySpeed + this.swayOffset) * 0.3;
    if (this.leftArm) this.leftArm.rotation.x = -0.8 + armSwing;
    if (this.rightArm) this.rightArm.rotation.x = -0.8 - armSwing;

    // Check if reached player
    if (this.position.z >= -Zombie.REACH_DISTANCE) {
      this.reachedPlayer = true;
    }

    super.update(dt);
  }

  /**
   * Check if a screen-space hit (from raycaster) counts as head or body.
   * Returns: { hit: true/false, headshot: true/false, worldPos: Vector3 }
   */
  checkHit(raycaster) {
    if (!this.alive || this.dying || !this.spawned) return { hit: false };

    const meshes = [];
    this.group.traverse(child => {
      if (child.isMesh) meshes.push(child);
    });

    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0) return { hit: false };

    const hitPoint = intersects[0].point;
    const hitObject = intersects[0].object;

    // Determine headshot - hit the head mesh or hit high enough on the zombie
    const isHeadshot = (hitObject === this.headMesh) ||
      (hitPoint.y > this.position.y + 2.0);

    return {
      hit: true,
      headshot: isHeadshot,
      worldPos: hitPoint
    };
  }

  takeDamage(amount, isHeadshot) {
    if (!this.alive || this.dying) return false;

    if (isHeadshot) {
      // Headshot = instant kill
      this.hp = 0;
    } else {
      this.hp -= amount;
    }

    // Flash red
    this.group.traverse(child => {
      if (child.isMesh && child.material) {
        const origColor = child.material.color.clone();
        child.material.color.set(0xff0000);
        setTimeout(() => {
          if (child.material) child.material.color.copy(origColor);
        }, 100);
      }
    });

    if (this.hp <= 0) {
      this.dying = true;
      this.dyingTimer = 0;
      return true; // killed
    }
    return false;
  }

  getScreenPosition(camera) {
    if (!this.mesh || !this.spawned) return null;
    const pos = new THREE.Vector3();
    pos.copy(this.position);
    pos.y += 1.5;
    pos.project(camera);
    if (pos.z > 1) return null;
    return {
      x: (pos.x * 0.5 + 0.5) * window.innerWidth,
      y: (-pos.y * 0.5 + 0.5) * window.innerHeight
    };
  }
}