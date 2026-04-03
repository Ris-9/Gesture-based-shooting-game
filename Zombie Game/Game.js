/**
 * ZOMBIE ELEVATOR - Main Game Controller
 *
 * ===== FILE STRUCTURE =====
 * index.html   - Entry point, UI layer, importmap
 * style.css    - All styling (HUD, screens, effects)
 * GameObject3D.js - Base entity class
 * Zombie.js    - Zombie entity with hit zones & balance knobs
 * ElevatorDoor.js - 3D elevator door
 * Corridor.js  - 3D corridor environment
 * InputManager.js - Mouse/keyboard + external gesture API
 * UIManager.js - DOM-based UI management
 * Game.js      - Main game controller (this file)
 *
 * ===== BALANCE VARIABLES =====
 * Zombie count per floor: Game.ZOMBIE_COUNT_TABLE
 * Zombie speed/HP: See Zombie.js static properties
 * Weapon progression: Game.HEADSHOT_DAMAGE_BONUS, Game.BODY_KILL_DAMAGE_BONUS
 * Player health: Game.MAX_HEALTH, Game.ZOMBIE_DAMAGE
 * Scoring: Game.SCORE_HEADSHOT, Game.SCORE_BODY_KILL, Game.SCORE_COMBO_MULTIPLIER
 *
 * ===== GESTURE BACKEND HOOK =====
 * See InputManager.js for window.gestureInput API.
 * Connect from Python/external:
 *   window.gestureInput.updateAim(x, y)  // normalized 0-1
 *   window.gestureInput.shoot()           // fire
 *   window.gestureInput.setTracking(true) // show indicator
 *   window.gestureInput.getState()        // read state
 */
class Game {
  // ===== BALANCE KNOBS =====
  static MAX_FLOORS = 10;
  // Zombie count: index = floor-1
  static ZOMBIE_COUNT_TABLE = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
  static MAX_HEALTH = 100;
  static ZOMBIE_DAMAGE = 25; // Damage per zombie that reaches player
  static BASE_WEAPON_DAMAGE = 1;
  static HEADSHOT_DAMAGE_BONUS = 0.4; // Weapon damage bonus per headshot
  static BODY_KILL_DAMAGE_BONUS = 0.15; // Weapon damage bonus per body kill
  static FLOOR_CLEAR_DAMAGE_BONUS = 0.2; // Bonus per floor cleared
  static SCORE_HEADSHOT = 200;
  static SCORE_BODY_KILL = 100;
  static SCORE_BODY_HIT = 25;
  static SCORE_COMBO_MULTIPLIER = 50;
  static SCORE_FLOOR_CLEAR = 500;
  static COMBO_TIMEOUT = 2.0; // seconds
  static FIRE_COOLDOWN = 0.2; // seconds between shots
  // =========================

  constructor() {
    window.game = this;

    this.entities = [];
    this.zombies = [];
    this.currentFloor = 1;
    this.score = 0;
    this.playerHealth = Game.MAX_HEALTH;
    this.maxHealth = Game.MAX_HEALTH;
    this.weaponDamage = Game.BASE_WEAPON_DAMAGE;
    this.combo = 0;
    this.comboTimer = 0;
    this.totalShots = 0;
    this.totalHits = 0;
    this.totalHeadshots = 0;
    this.floorShots = 0;
    this.floorHits = 0;
    this.floorHeadshots = 0;
    this.floorKills = 0;
    this.floorScore = 0;
    this.fireCooldown = 0;

    this.isRunning = false;
    this.isPlaying = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.isVictory = false;
    this.inElevator = false;
    this.inReward = false;
    this.floorActive = false;

    this.clock = new THREE.Clock();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);
    this.scene.fog = new THREE.Fog(0x111111, 15, 45);

    // Camera - FPS view
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 2.5, 2);
    this.camera.lookAt(0, 2, -25);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    document.getElementById('gameContainer').prepend(this.renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0x555566, 1.2);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x888899, 0x332211, 0.6);
    this.scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    dirLight.position.set(5, 15, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.002;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    this.scene.add(dirLight);

    // Red accent light from elevator direction
    const redLight = new THREE.PointLight(0xff2200, 0.5, 30);
    redLight.position.set(0, 4, -20);
    this.scene.add(redLight);
    this.redLight = redLight;

    // Raycaster for shooting
    this.raycaster = new THREE.Raycaster();

    // Input & UI
    this.input = new InputManager();
    this.ui = new UIManager();

    // Create environment
    this.corridor = new Corridor(this.scene);
    this.entities.push(this.corridor);

    this.elevatorDoor = new ElevatorDoor(this.scene);
    this.entities.push(this.elevatorDoor);

    // Gun model (simple)
    this.createGunModel();

    // Setup button handlers
    this.setupButtons();

    // Resize
    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    // Show start screen
    this.ui.showStartScreen();
  }

  createGunModel() {
    this.gunGroup = new THREE.Group();

    // Gun body
    const bodyGeo = new THREE.BoxGeometry(0.15, 0.15, 0.6);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0, -0.1);
    this.gunGroup.add(body);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.4, 8);
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, -0.5);
    this.gunGroup.add(barrel);

    // Handle
    const handleGeo = new THREE.BoxGeometry(0.1, 0.25, 0.12);
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x442200 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, -0.15, 0.05);
    handle.rotation.x = 0.2;
    this.gunGroup.add(handle);

    this.gunGroup.position.set(0.35, -0.3, -0.6);
    this.camera.add(this.gunGroup);
    this.scene.add(this.camera);

    this.gunRecoilOffset = 0;
  }

  setupButtons() {
    document.getElementById('start-btn').addEventListener('click', () => {
      this.ui.hideStartScreen();
      this.startGame();
    });

    document.getElementById('reward-continue-btn').addEventListener('click', () => {
      this.ui.hideRewardScreen();
      this.inReward = false;
      this.nextFloor();
    });

    document.getElementById('gameover-restart-btn').addEventListener('click', () => {
      this.ui.hideGameOver();
      this.restartGame();
    });

    document.getElementById('victory-restart-btn').addEventListener('click', () => {
      this.ui.hideVictory();
      this.restartGame();
    });

    document.getElementById('pause-resume-btn').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('pause-restart-btn').addEventListener('click', () => {
      this.ui.hidePause();
      this.isPaused = false;
      this.restartGame();
    });
  }

  startGame() {
    this.currentFloor = 1;
    this.score = 0;
    this.playerHealth = Game.MAX_HEALTH;
    this.weaponDamage = Game.BASE_WEAPON_DAMAGE;
    this.combo = 0;
    this.comboTimer = 0;
    this.totalShots = 0;
    this.totalHits = 0;
    this.totalHeadshots = 0;
    this.isPlaying = true;
    this.isRunning = true;
    this.isGameOver = false;
    this.isVictory = false;
    this.isPaused = false;

    this.startFloor(this.currentFloor);
  }

  restartGame() {
    // Clean up zombies
    this.clearZombies();
    this.ui.hideGameOver();
    this.ui.hideVictory();
    this.ui.hideRewardScreen();
    this.ui.hidePause();
    this.ui.hideElevator();
    this.startGame();
  }

  startFloor(floor) {
    this.floorActive = false;
    this.inElevator = true;
    this.floorShots = 0;
    this.floorHits = 0;
    this.floorHeadshots = 0;
    this.floorKills = 0;
    this.floorScore = 0;

    // Close elevator door
    this.elevatorDoor.close();

    // Show elevator transition
    this.ui.showElevator(floor, () => {
      // Elevator arrived, open 3D doors too
      this.elevatorDoor.open();
      this.inElevator = false;

      // Spawn zombies after a brief delay
      setTimeout(() => {
        this.spawnZombies(floor);
        this.floorActive = true;
        this.ui.hideElevator();
      }, 500);
    });
  }

  spawnZombies(floor) {
    this.clearZombies();

    const count = Game.ZOMBIE_COUNT_TABLE[floor - 1] || 1;

    for (let i = 0; i < count; i++) {
      const zombie = new Zombie(this.scene, floor, i, count);
      this.zombies.push(zombie);
      this.entities.push(zombie);
    }
  }

  clearZombies() {
    for (const z of this.zombies) {
      z.destroy();
      const idx = this.entities.indexOf(z);
      if (idx >= 0) this.entities.splice(idx, 1);
    }
    this.zombies = [];
  }

  nextFloor() {
    this.currentFloor++;
    if (this.currentFloor > Game.MAX_FLOORS) {
      this.victory();
      return;
    }
    this.startFloor(this.currentFloor);
  }

  handleShooting(dt) {
    // Fire cooldown
    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    }

    if (this.input.consumeFire() && this.fireCooldown <= 0) {
      this.fireCooldown = Game.FIRE_COOLDOWN;
      this.fire();
    }
  }

  fire() {
    this.totalShots++;
    this.floorShots++;

    // Visual feedback
    this.ui.showMuzzleFlash();
    this.ui.screenShake(false);
    this.gunRecoilOffset = 0.15;

    // Raycast from screen position
    const mouseNDC = new THREE.Vector2(
      (this.input.aimX / window.innerWidth) * 2 - 1,
      -(this.input.aimY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouseNDC, this.camera);

    let hitAny = false;

    // Check all zombies
    for (const zombie of this.zombies) {
      if (!zombie.alive || zombie.dying) continue;

      const result = zombie.checkHit(this.raycaster);
      if (result.hit) {
        hitAny = true;
        this.totalHits++;
        this.floorHits++;

        const screenPos = zombie.getScreenPosition(this.camera);
        const sx = screenPos ? screenPos.x : this.input.aimX;
        const sy = screenPos ? screenPos.y : this.input.aimY;

        if (result.headshot) {
          // HEADSHOT - instant kill
          this.totalHeadshots++;
          this.floorHeadshots++;

          const killed = zombie.takeDamage(9999, true);
          this.floorKills++;

          // Score
          const pts = Game.SCORE_HEADSHOT + this.combo * Game.SCORE_COMBO_MULTIPLIER;
          this.score += pts;
          this.floorScore += pts;

          // Combo
          this.combo++;
          this.comboTimer = Game.COMBO_TIMEOUT;

          // Weapon upgrade from headshot
          this.weaponDamage += Game.HEADSHOT_DAMAGE_BONUS;

          // UI feedback
          this.ui.crosshairHit(true);
          this.ui.showDamageText(sx, sy - 30, '💀 HEADSHOT!', 'headshot');
          this.ui.showDamageText(sx + 30, sy, '+' + pts, 'kill');
          this.ui.showHitEffect(sx, sy, true);
          this.ui.screenShake(true);
          this.ui.pulseCombo();

        } else {
          // BODY SHOT
          const killed = zombie.takeDamage(this.weaponDamage, false);

          if (killed) {
            this.floorKills++;
            const pts = Game.SCORE_BODY_KILL + this.combo * Game.SCORE_COMBO_MULTIPLIER;
            this.score += pts;
            this.floorScore += pts;

            this.weaponDamage += Game.BODY_KILL_DAMAGE_BONUS;

            this.combo++;
            this.comboTimer = Game.COMBO_TIMEOUT;

            this.ui.showDamageText(sx, sy - 20, 'KILLED!', 'kill');
            this.ui.showDamageText(sx + 20, sy + 10, '+' + pts, 'bodyshot');
            this.ui.showHitEffect(sx, sy, true);
            this.ui.screenShake(true);
            this.ui.pulseCombo();
          } else {
            const pts = Game.SCORE_BODY_HIT;
            this.score += pts;
            this.floorScore += pts;

            this.combo++;
            this.comboTimer = Game.COMBO_TIMEOUT;

            this.ui.crosshairHit(false);
            this.ui.showDamageText(sx, sy, `-${this.weaponDamage.toFixed(1)}`, 'bodyshot');
            this.ui.showHitEffect(sx, sy, false);
            this.ui.pulseCombo();
          }
        }

        // Only hit one zombie per shot
        break;
      }
    }

    if (!hitAny) {
      // Miss - reset combo
      this.combo = 0;
    }
  }

  checkFloorComplete() {
    if (!this.floorActive) return;

    // Check if any zombies reached the player
    for (const z of this.zombies) {
      if (z.reachedPlayer && z.alive) {
        z.alive = false;
        z.dying = true;
        z.dyingTimer = 0;
        this.playerHealth -= Game.ZOMBIE_DAMAGE;
        this.ui.screenShake(true);
        this.ui.showDangerOverlay(true);
        setTimeout(() => this.ui.showDangerOverlay(false), 500);

        if (this.playerHealth <= 0) {
          this.playerHealth = 0;
          this.gameOver();
          return;
        }
      }
    }

    // Check if all zombies are dead or gone
    const allDone = this.zombies.every(z => !z.alive && !z.dying);
    const allSpawned = this.zombies.every(z => z.spawned);

    if (allDone && allSpawned && this.zombies.length > 0) {
      this.floorActive = false;
      this.elevatorDoor.close();

      // Floor clear bonus
      const clearBonus = Game.SCORE_FLOOR_CLEAR;
      this.score += clearBonus;
      this.floorScore += clearBonus;

      // Weapon progression bonus
      this.weaponDamage += Game.FLOOR_CLEAR_DAMAGE_BONUS;

      // Show reward screen after a brief delay
      setTimeout(() => {
        this.showReward();
      }, 800);
    }
  }

  showReward() {
    this.inReward = true;

    const accuracy = this.floorShots > 0
      ? Math.round(this.floorHits / this.floorShots * 100)
      : 0;

    const upgrades = [];

    // Headshot bonus
    if (this.floorHeadshots > 0) {
      upgrades.push({
        label: 'HEADSHOT BONUS',
        value: `+${(this.floorHeadshots * Game.HEADSHOT_DAMAGE_BONUS).toFixed(1)} DMG`
      });
    }

    // Accuracy bonus
    if (accuracy >= 80) {
      const accBonus = 0.3;
      this.weaponDamage += accBonus;
      upgrades.push({
        label: 'ACCURACY BONUS',
        value: `+${accBonus.toFixed(1)} DMG`
      });
    }

    // Floor clear
    upgrades.push({
      label: 'FLOOR CLEARED',
      value: `+${Game.FLOOR_CLEAR_DAMAGE_BONUS.toFixed(1)} DMG`
    });

    this.ui.showRewardScreen({
      killed: this.floorKills,
      headshots: this.floorHeadshots,
      accuracy: accuracy,
      floorScore: this.floorScore,
      upgrades: upgrades
    });
    
    // Auto-continue to next floor after 2 seconds
    setTimeout(() => {
      if (this.inReward) {  // Only if still in reward state
        this.ui.hideRewardScreen();
        this.inReward = false;
        this.nextFloor();
      }
    }, 2000);
  }

  gameOver() {
    this.isGameOver = true;
    this.isPlaying = false;
    this.floorActive = false;
    this.ui.showGameOver(this.currentFloor, this.score);
  }

  victory() {
    this.isVictory = true;
    this.isPlaying = false;
    this.floorActive = false;

    const accuracy = this.totalShots > 0
      ? Math.round(this.totalHits / this.totalShots * 100)
      : 0;

    this.ui.showVictory(this.score, accuracy, this.totalHeadshots);
  }

  togglePause() {
    if (!this.isPlaying || this.isGameOver || this.isVictory) return;

    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.ui.showPause();
    } else {
      this.ui.hidePause();
    }
  }

  update() {
    const dt = this.clock.getDelta();

    // Check for pause/restart keys
    if (this.input.isKeyJustPressed('KeyP')) {
      this.togglePause();
    }
    if (this.input.isKeyJustPressed('KeyR')) {
      if (this.isGameOver || this.isVictory) {
        this.restartGame();
      }
    }

    // Update crosshair always
    this.ui.updateCrosshair(this.input.aimX, this.input.aimY);

    // Always update HUD
    this.ui.updateHUD(this);

    if (!this.isRunning || !this.isPlaying || this.isPaused || this.isGameOver || this.isVictory) return;

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // Gun recoil recovery
    if (this.gunRecoilOffset > 0) {
      this.gunRecoilOffset = Math.max(0, this.gunRecoilOffset - dt * 1.5);
    }
    if (this.gunGroup) {
      this.gunGroup.position.z = -0.6 + this.gunRecoilOffset;
      this.gunGroup.rotation.x = -this.gunRecoilOffset * 0.5;
    }

    // Slight camera sway for atmosphere
    const sway = Math.sin(Date.now() * 0.001) * 0.003;
    this.camera.rotation.z = sway;

    // Red light pulse based on danger
    if (this.redLight) {
      const closestZ = this.zombies.reduce((min, z) => {
        if (z.alive && z.spawned && !z.dying) return Math.max(min, z.position.z);
        return min;
      }, -30);
      const danger = Math.max(0, (closestZ + 25) / 25);
      this.redLight.intensity = 0.3 + danger * 1.5;
      this.ui.showDangerOverlay(danger > 0.7 && this.floorActive);
    }

    // Handle shooting during active floor
    if (this.floorActive && !this.inElevator && !this.inReward) {
      this.handleShooting(dt);
    }

    // Update entities
    for (const entity of this.entities) {
      entity.update(dt);
    }

    // Check floor completion
    if (this.floorActive) {
      this.checkFloorComplete();
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  getObjectAt(screenX, screenY) {
    const mouse = new THREE.Vector2(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const meshes = this.entities.map(e => e.mesh).filter(m => m);
    const intersects = raycaster.intersectObjects(meshes, true);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      return this.entities.find(e => {
        if (!e.mesh) return false;
        if (e.mesh === hit) return true;
        let parent = hit.parent;
        while (parent) { if (parent === e.mesh) return true; parent = parent.parent; }
        return false;
      });
    }
    return null;
  }

  start() {
    const gameLoop = () => {
      requestAnimationFrame(gameLoop);
      this.update();
      this.render();
    };
    gameLoop();
  }
}