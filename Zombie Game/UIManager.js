class UIManager {
  constructor() {
    this.crosshair = document.getElementById('crosshair');
    this.muzzleFlash = document.getElementById('muzzle-flash');
    this.dangerOverlay = document.getElementById('danger-overlay');
    this.damageTexts = document.getElementById('damage-texts');
    this.hitEffects = document.getElementById('hit-effects');
    this.gameContainer = document.getElementById('gameContainer');
  }

  updateCrosshair(x, y) {
    // Clamp within viewport
    x = Math.max(20, Math.min(window.innerWidth - 20, x));
    y = Math.max(20, Math.min(window.innerHeight - 20, y));
    this.crosshair.style.left = x + 'px';
    this.crosshair.style.top = y + 'px';
  }

  updateHUD(game) {
    document.getElementById('floor-num').textContent = game.currentFloor;
    document.getElementById('score-num').textContent = game.score;
    document.getElementById('combo-num').textContent = game.combo;
    document.getElementById('dmg-num').textContent = game.weaponDamage.toFixed(1);

    const healthPct = Math.max(0, game.playerHealth / game.maxHealth * 100);
    document.getElementById('health-bar-fill').style.width = healthPct + '%';

    // Update weapon name based on damage level
    const dmg = game.weaponDamage;
    let weaponName = 'PISTOL';
    if (dmg >= 5) weaponName = 'DESTROYER';
    else if (dmg >= 4) weaponName = 'SHOTGUN';
    else if (dmg >= 3) weaponName = 'SMG';
    else if (dmg >= 2) weaponName = 'MAGNUM';
    document.getElementById('weapon-name').textContent = weaponName;
  }

  showMuzzleFlash() {
    this.muzzleFlash.classList.add('active');
    setTimeout(() => this.muzzleFlash.classList.remove('active'), 80);
  }

  showDangerOverlay(active) {
    this.dangerOverlay.classList.toggle('active', active);
  }

  screenShake(heavy) {
    const cls = heavy ? 'screen-shake-heavy' : 'screen-shake';
    this.gameContainer.classList.add(cls);
    setTimeout(() => this.gameContainer.classList.remove(cls), heavy ? 300 : 150);
  }

  crosshairHit(isHeadshot) {
    const cls = isHeadshot ? 'hit-head' : 'hit-body';
    this.crosshair.classList.add(cls);
    setTimeout(() => this.crosshair.classList.remove(cls), 150);
  }

  showDamageText(x, y, text, type) {
    const el = document.createElement('div');
    el.className = 'damage-text ' + type;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    this.damageTexts.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  showHitEffect(x, y, isBlood) {
    const count = isBlood ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      spark.className = 'hit-spark ' + (isBlood ? 'blood' : 'spark');
      const ox = (Math.random() - 0.5) * 40;
      const oy = (Math.random() - 0.5) * 40;
      spark.style.left = (x + ox) + 'px';
      spark.style.top = (y + oy) + 'px';
      this.hitEffects.appendChild(spark);
      setTimeout(() => spark.remove(), 400);
    }
  }

  pulseCombo() {
    const combo = document.getElementById('combo-display');
    combo.classList.add('pulse');
    setTimeout(() => combo.classList.remove('pulse'), 150);
  }

  showElevator(floor, callback) {
    const overlay = document.getElementById('elevator-overlay');
    const leftDoor = document.getElementById('elevator-door-left');
    const rightDoor = document.getElementById('elevator-door-right');
    const floorNum = document.getElementById('elevator-floor-num');
    const floorDisplay = document.getElementById('elevator-floor-display');

    overlay.classList.add('active');
    overlay.style.display = 'flex';
    leftDoor.classList.remove('open');
    rightDoor.classList.remove('open');
    floorDisplay.style.display = 'block';
    floorNum.textContent = floor;

    // Animate floor counting up
    let displayFloor = Math.max(1, floor - 2);
    const countInterval = setInterval(() => {
      displayFloor++;
      floorNum.textContent = displayFloor;
      if (displayFloor >= floor) {
        clearInterval(countInterval);
      }
    }, 400);

    // After arriving, open doors
    setTimeout(() => {
      floorDisplay.style.display = 'none';
      leftDoor.classList.add('open');
      rightDoor.classList.add('open');

      // After doors open
      setTimeout(() => {
        if (callback) callback();
      }, 1200);
    }, 1500);
  }

  hideElevator() {
    const overlay = document.getElementById('elevator-overlay');
    overlay.classList.remove('active');
    overlay.style.display = 'none';
  }

  showStartScreen() {
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('start-screen').style.display = 'flex';
  }

  hideStartScreen() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('start-screen').style.display = 'none';
  }

  showRewardScreen(stats) {
    const screen = document.getElementById('reward-screen');
    screen.classList.remove('hidden');
    screen.style.display = 'flex';

    // Fill stats
    const statsEl = document.getElementById('reward-stats');
    statsEl.innerHTML = `
      <div><span class="stat-label">Zombies Killed:</span> <span class="stat-value">${stats.killed}</span></div>
      <div><span class="stat-label">Headshots:</span> <span class="stat-headshot">${stats.headshots} 💀</span></div>
      <div><span class="stat-label">Accuracy:</span> <span class="stat-value">${stats.accuracy}%</span></div>
      <div><span class="stat-label">Floor Score:</span> <span class="stat-value">+${stats.floorScore}</span></div>
    `;

    // Fill upgrades
    const upgradesEl = document.getElementById('reward-upgrades');
    upgradesEl.innerHTML = '';
    if (stats.upgrades && stats.upgrades.length > 0) {
      stats.upgrades.forEach(u => {
        const item = document.createElement('div');
        item.className = 'upgrade-item';
        item.innerHTML = `<span class="upgrade-label">${u.label}</span><span class="upgrade-value">${u.value}</span>`;
        upgradesEl.appendChild(item);
      });
    }
  }

  hideRewardScreen() {
    const screen = document.getElementById('reward-screen');
    screen.classList.add('hidden');
    screen.style.display = 'none';
  }

  showGameOver(floor, score) {
    const screen = document.getElementById('gameover-screen');
    screen.classList.remove('hidden');
    screen.style.display = 'flex';
    document.getElementById('gameover-floor').textContent = `You reached Floor ${floor}`;
    document.getElementById('gameover-score').textContent = `Final Score: ${score}`;
  }

  hideGameOver() {
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('gameover-screen').style.display = 'none';
  }

  showVictory(score, accuracy, headshots) {
    const screen = document.getElementById('victory-screen');
    screen.classList.remove('hidden');
    screen.style.display = 'flex';
    document.getElementById('victory-score').textContent = `Final Score: ${score}`;
    document.getElementById('victory-accuracy').textContent = `Accuracy: ${accuracy}%`;
    document.getElementById('victory-headshots').textContent = `Headshots: ${headshots}`;
  }

  hideVictory() {
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('victory-screen').style.display = 'none';
  }

  showPause() {
    document.getElementById('pause-screen').classList.remove('hidden');
    document.getElementById('pause-screen').style.display = 'flex';
  }

  hidePause() {
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('pause-screen').style.display = 'none';
  }
}