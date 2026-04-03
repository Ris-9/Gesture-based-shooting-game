/**
 * InputManager - Handles mouse, keyboard, and external gesture input.
 *
 * EXTERNAL GESTURE BACKEND INTEGRATION:
 * Connect your Python/OpenCV/MediaPipe backend using window.gestureInput:
 *
 *   // From Python (via websocket/JS bridge):
 *   window.gestureInput.updateAim(normalizedX, normalizedY); // 0-1 range
 *   window.gestureInput.shoot(); // fire one shot
 *   window.gestureInput.setTracking(true); // show tracking indicator
 *   const state = window.gestureInput.getState(); // get game state
 */
class InputManager {
  constructor() {
    this.aimX = window.innerWidth / 2;
    this.aimY = window.innerHeight / 2;
    this.shouldFire = false;
    this.mouseActive = true;
    this.gestureTracking = false;
    this.keys = {};
    this.lastGestureShotSequence = 0;
    this.lastGrenadeSequence = 0;
    this.gesturePollingEnabled = true;

    // Mouse events
    document.addEventListener('mousemove', (e) => {
      if (this.mouseActive) {
        this.aimX = e.clientX;
        this.aimY = e.clientY;
      }
    });

    document.addEventListener('click', (e) => {
      // Don't fire if clicking UI buttons
      if (e.target.tagName === 'BUTTON') return;
      this.shouldFire = true;
    });

    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        this.shouldFire = true;
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Expose gesture API globally
    this.setupGestureAPI();
    this.startGesturePolling();
  }

  setupGestureAPI() {
    const self = this;

    /**
     * EXTERNAL GESTURE INPUT API
     * 
     * Usage from Python/external backend:
     *   window.gestureInput.updateAim(0.5, 0.5)  // center screen
     *   window.gestureInput.shoot()               // fire
     *   window.gestureInput.setTracking(true)     // show indicator
     *   window.gestureInput.getState()            // read game state
     */
    window.gestureInput = {
      /**
       * updateAim(x, y)
       * @param {number} x - Normalized 0.0 (left) to 1.0 (right)
       * @param {number} y - Normalized 0.0 (top) to 1.0 (bottom)
       */
      updateAim(x, y) {
        // Clamp to 0-1
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));
        self.aimX = x * window.innerWidth;
        self.aimY = y * window.innerHeight;
        self.mouseActive = false; // Disable mouse when gesture is active
      },

      /**
       * shoot()
       * Fires one shot at the current aim position.
       */
      shoot() {
        self.shouldFire = true;
      },

      /**
       * throwGrenade()
       * Throws a grenade (kills nearest zombie, floor 3+).
       */
      throwGrenade() {
        if (window.game) window.game.throwGrenade();
      },

      /**
       * setTracking(active)
       * @param {boolean} active - Show/hide gesture tracking indicator
       */
      setTracking(active) {
        self.gestureTracking = !!active;
        const indicator = document.getElementById('tracking-indicator');
        if (indicator) {
          indicator.classList.toggle('active', self.gestureTracking);
        }
        if (!active) {
          self.mouseActive = true; // Re-enable mouse when gesture disconnects
        }
      },

      /**
       * getState()
       * @returns {object} Current game state for the backend
       */
      getState() {
        const g = window.game;
        if (!g) return { error: 'Game not initialized' };
        return {
          floor: g.currentFloor,
          score: g.score,
          health: g.playerHealth,
          maxHealth: g.maxHealth,
          weaponDamage: g.weaponDamage,
          zombiesAlive: g.zombies ? g.zombies.filter(z => z.alive || z.dying).length : 0,
          zombiesTotal: g.zombies ? g.zombies.length : 0,
          isGameOver: g.isGameOver,
          isVictory: g.isVictory,
          isPaused: g.isPaused,
          isPlaying: g.isPlaying,
          combo: g.combo,
          accuracy: g.totalShots > 0 ? (g.totalHits / g.totalShots) : 0
        };
      }
    };
  }

  startGesturePolling() {
    const poll = async () => {
      if (!this.gesturePollingEnabled) {
        setTimeout(poll, 50);
        return;
      }

      try {
        const response = await fetch('/api/gesture-state', { 
          cache: 'no-store',
          signal: AbortSignal.timeout(20) // Timeout after 20ms to prevent hanging
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const state = await response.json();

        if (state.tracking) {
          window.gestureInput.setTracking(true);
          window.gestureInput.updateAim(state.aimX ?? 0.5, state.aimY ?? 0.5);

          if ((state.shotSequence ?? 0) > this.lastGestureShotSequence) {
            this.lastGestureShotSequence = state.shotSequence;
            window.gestureInput.shoot();
          }

          if ((state.grenadeSequence ?? 0) > this.lastGrenadeSequence) {
            this.lastGrenadeSequence = state.grenadeSequence;
            window.gestureInput.throwGrenade();
          }

          // Switch gun/grenade model based on hold gesture
          if (window.game) {
            window.game.setGrenadeHolding(state.gestureName === 'grenade-hold');
          }
        } else {
          window.gestureInput.setTracking(false);
          this.lastGestureShotSequence = state.shotSequence ?? this.lastGestureShotSequence;
          if (window.game) window.game.setGrenadeHolding(false);
        }
      } catch (_error) {
        window.gestureInput.setTracking(false);
      } finally {
        setTimeout(poll, 16); // ~60Hz polling for better responsiveness
      }
    };

    poll();
  }

  consumeFire() {
    if (this.shouldFire) {
      this.shouldFire = false;
      return true;
    }
    return false;
  }

  isKeyPressed(code) {
    return !!this.keys[code];
  }

  isKeyJustPressed(code) {
    if (this.keys[code]) {
      this.keys[code] = false;
      return true;
    }
    return false;
  }
}
