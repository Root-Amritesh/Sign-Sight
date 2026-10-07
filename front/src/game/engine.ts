import type { Bullet, Enemy, Player, PowerUpItem, Star, GameState, GameScoreEntry, PowerUpType } from './types';
import { generateWaveEnemies } from './waves';
import { sound } from './audio';
import { GameRenderer } from './render';
import { InputController } from './input';

export class GameEngine {
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private readonly fixedTimestep = 1000 / 60; // 60Hz fixed update

  private width = 800;
  private height = 600;

  private player: Player = {
    x: 400,
    y: 500,
    width: 24,
    height: 24,
    speed: 5.5,
    lives: 3,
    invulnerableTimer: 0,
    activePowerUp: null,
    powerUpTimer: 0,
  };

  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private powerUps: PowerUpItem[] = [];
  private stars: Star[] = [];

  private fireCooldown = 0;

  public state: GameState = {
    score: 0,
    wave: 1,
    comboMultiplier: 1,
    comboHits: 0,
    killsByFamily: { dos: 0, probe: 0, r2l: 0, u2r: 0, normal: 0 },
    isPaused: false,
    isGameOver: false,
    highScore: 0,
    lastRuns: [],
  };

  private renderer: GameRenderer;
  private input: InputController;

  private canvas: HTMLCanvasElement;
  private onStateChange: (state: GameState) => void;
  private onExit: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: GameState) => void,
    onExit: () => void
  ) {
    this.canvas = canvas;
    this.onStateChange = onStateChange;
    this.onExit = onExit;

    const ctx = canvas.getContext('2d')!;
    this.renderer = new GameRenderer(ctx);
    this.input = new InputController(canvas);

    this.loadHighScores();
    this.initStars();
    this.initWave(1);

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private loadHighScores() {
    try {
      const storedHi = localStorage.getItem('signsight_game_highscore');
      if (storedHi) this.state.highScore = parseInt(storedHi, 10);
      const storedRuns = localStorage.getItem('signsight_game_runs');
      if (storedRuns) this.state.lastRuns = JSON.parse(storedRuns);
    } catch {
      // Ignore
    }
  }

  private saveHighScore() {
    try {
      if (this.state.score > this.state.highScore) {
        this.state.highScore = this.state.score;
        localStorage.setItem('signsight_game_highscore', String(this.state.highScore));
      }
      const entry: GameScoreEntry = {
        date: new Date().toISOString().slice(0, 10),
        score: this.state.score,
        wave: this.state.wave,
      };
      const updatedRuns = [entry, ...this.state.lastRuns.slice(0, 4)];
      this.state.lastRuns = updatedRuns;
      localStorage.setItem('signsight_game_runs', JSON.stringify(updatedRuns));
    } catch {
      // Ignore
    }
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed: 0.3 + Math.random() * 0.8,
        size: Math.random() > 0.8 ? 2 : 1,
        brightness: 0.2 + Math.random() * 0.7,
      });
    }
  }

  private initWave(waveNum: number) {
    this.state.wave = waveNum;
    this.enemies = generateWaveEnemies(waveNum, this.width);
    this.bullets = [];
    this.powerUps = [];
  }

  public setDimensions(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.player.x = w / 2;
    this.player.y = h - 80;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public togglePause() {
    this.state.isPaused = !this.state.isPaused;
    this.onStateChange({ ...this.state });
  }

  public restart() {
    this.player = {
      x: this.width / 2,
      y: this.height - 80,
      width: 24,
      height: 24,
      speed: 5.5,
      lives: 3,
      invulnerableTimer: 0,
      activePowerUp: null,
      powerUpTimer: 0,
    };
    this.state.score = 0;
    this.state.comboMultiplier = 1;
    this.state.comboHits = 0;
    this.state.killsByFamily = { dos: 0, probe: 0, r2l: 0, u2r: 0, normal: 0 };
    this.state.isPaused = false;
    this.state.isGameOver = false;
    this.initWave(1);
    this.onStateChange({ ...this.state });
  }

  private handleVisibilityChange = () => {
    if (document.hidden && this.isRunning && !this.state.isGameOver) {
      this.state.isPaused = true;
      this.onStateChange({ ...this.state });
    }
  };

  private loop = (currentTime: number) => {
    if (!this.isRunning) return;

    const frameTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += Math.min(frameTime, 100);

    // Fixed timestep 60Hz update
    while (this.accumulator >= this.fixedTimestep) {
      this.update();
      this.accumulator -= this.fixedTimestep;
    }

    // Render
    this.renderer.render(
      this.width,
      this.height,
      this.stars,
      this.player,
      this.bullets,
      this.enemies,
      this.powerUps,
      this.state,
      sound.isEnabled()
    );

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update() {
    // Check input triggers
    if (this.input.state.pausePressed) {
      this.togglePause();
      this.input.resetTriggers();
    }
    if (this.input.state.exitPressed) {
      this.onExit();
      this.input.resetTriggers();
    }

    if (this.state.isPaused || this.state.isGameOver) return;

    // 1. Update starfield
    const starSpeedMul = this.player.activePowerUp === 'slow_time' ? 0.4 : 1.0;
    for (const star of this.stars) {
      star.y += star.speed * starSpeedMul;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }

    // 2. Update player movement
    const pSpeed = this.player.speed;
    if (this.input.state.touchX !== null) {
      // Touch drag interpolation
      const dx = this.input.state.touchX - this.player.x;
      this.player.x += dx * 0.2;
    } else {
      if (this.input.state.left) this.player.x -= pSpeed;
      if (this.input.state.right) this.player.x += pSpeed;
      if (this.input.state.up) this.player.y -= pSpeed;
      if (this.input.state.down) this.player.y += pSpeed;
    }

    // Clamp inside viewport
    this.player.x = Math.max(16, Math.min(this.width - 16, this.player.x));
    this.player.y = Math.max(24, Math.min(this.height - 24, this.player.y));

    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= 1;
    }

    // Powerup countdown
    if (this.player.activePowerUp && this.player.powerUpTimer > 0) {
      this.player.powerUpTimer -= 1;
      if (this.player.powerUpTimer <= 0) {
        this.player.activePowerUp = null;
      }
    }

    // 3. Firing logic
    if (this.fireCooldown > 0) this.fireCooldown -= 1;
    if (this.input.state.fire && this.fireCooldown <= 0) {
      this.firePlayerBullets();
      this.fireCooldown = 10; // 6 shots per second
      sound.playLaser();
    }

    // 4. Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      if (b.y < -10 || b.y > this.height + 10 || b.x < -10 || b.x > this.width + 10) {
        this.bullets.splice(i, 1);
      }
    }

    // 5. Update powerups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.y += p.vy;

      // Check collision with player
      const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (dist < p.radius + 14) {
        this.player.activePowerUp = p.type;
        this.player.powerUpTimer = 360; // 6 seconds
        sound.playPowerup();
        this.powerUps.splice(i, 1);
        continue;
      }

      if (p.y > this.height + 20) {
        this.powerUps.splice(i, 1);
      }
    }

    // 6. Update enemies
    const enemySpeedMul = this.player.activePowerUp === 'slow_time' ? 0.5 : 1.0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.x += e.vx * enemySpeedMul;
      e.y += e.vy * enemySpeedMul;

      // Bounce off lateral edges
      if (e.x < 10 || e.x + e.width > this.width - 10) {
        e.vx = -e.vx;
      }

      // R2L Phasing behavior
      if (e.family === 'r2l') {
        e.phaseTimer = (e.phaseTimer || 0) + 1;
        if (e.phaseTimer > 80) {
          e.phaseState = !e.phaseState;
          e.phaseTimer = 0;
        }
      }

      // Probe scout firing
      if (e.family === 'probe') {
        e.attackTimer = (e.attackTimer || 0) - 1;
        if (e.attackTimer <= 0) {
          this.bullets.push({
            x: e.x + e.width / 2,
            y: e.y + e.height,
            vx: 0,
            vy: 3.2,
            isPlayer: false,
            damage: 1,
            radius: 3,
          });
          e.attackTimer = 110;
        }
      }

      // U2R Boss firing multi-phase
      if (e.family === 'u2r') {
        e.attackTimer = (e.attackTimer || 0) - 1;
        if (e.attackTimer <= 0) {
          // Spread 3 bullets
          for (let angle = -0.3; angle <= 0.3; angle += 0.3) {
            this.bullets.push({
              x: e.x + e.width / 2,
              y: e.y + e.height,
              vx: Math.sin(angle) * 3,
              vy: Math.cos(angle) * 3,
              isPlayer: false,
              damage: 1,
              radius: 4,
            });
          }
          e.attackTimer = 75;
        }
      }

      // Screen overflow reset to top
      if (e.y > this.height + 30) {
        e.y = -40;
        e.x = 40 + Math.random() * (this.width - 80);
      }
    }

    // 7. Bullet-Enemy Collisions
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      if (!b.isPlayer) continue;

      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (e.family === 'r2l' && e.phaseState === false) continue; // Phased out

        if (
          b.x >= e.x &&
          b.x <= e.x + e.width &&
          b.y >= e.y &&
          b.y <= e.y + e.height
        ) {
          // Hit enemy
          this.bullets.splice(bi, 1);
          e.hp -= b.damage;
          sound.playHit();

          // Increment combo
          this.state.comboHits += 1;
          if (this.state.comboHits % 5 === 0 && this.state.comboMultiplier < 5) {
            this.state.comboMultiplier += 1;
          }

          if (e.hp <= 0) {
            // Kill enemy
            sound.playExplosion();
            this.state.score += e.scoreValue * this.state.comboMultiplier;
            this.state.killsByFamily[e.family] += 1;

            // Chance to drop power-up from R2L or Boss
            if (e.family === 'r2l' || e.family === 'u2r' || Math.random() < 0.08) {
              const types: PowerUpType[] = ['spread', 'shield', 'slow_time'];
              this.powerUps.push({
                id: `pup-${Date.now()}-${Math.random()}`,
                x: e.x + e.width / 2,
                y: e.y + e.height / 2,
                type: types[Math.floor(Math.random() * types.length)],
                vy: 1.5,
                radius: 10,
              });
            }

            this.enemies.splice(ei, 1);
          }
          break;
        }
      }
    }

    // 8. Player Collision (Enemy Bullets or Ship collision)
    if (this.player.invulnerableTimer <= 0) {
      let playerHit = false;

      // Check enemy bullets
      for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
        const b = this.bullets[bi];
        if (b.isPlayer) continue;

        if (Math.hypot(b.x - this.player.x, b.y - this.player.y) < b.radius + 10) {
          this.bullets.splice(bi, 1);
          playerHit = true;
          break;
        }
      }

      // Check enemy body collision
      if (!playerHit) {
        for (const e of this.enemies) {
          if (
            this.player.x >= e.x - 8 &&
            this.player.x <= e.x + e.width + 8 &&
            this.player.y >= e.y - 8 &&
            this.player.y <= e.y + e.height + 8
          ) {
            playerHit = true;
            break;
          }
        }
      }

      if (playerHit) {
        // Shield power-up absorbs one hit
        if (this.player.activePowerUp === 'shield') {
          this.player.activePowerUp = null;
          this.player.invulnerableTimer = 60; // 1s invulnerability
          sound.playHit();
        } else {
          this.player.lives -= 1;
          this.player.invulnerableTimer = 90; // 1.5s invulnerability
          this.state.comboMultiplier = 1; // Reset combo multiplier on hit
          this.state.comboHits = 0;
          sound.playExplosion();

          if (this.player.lives <= 0) {
            this.state.isGameOver = true;
            this.saveHighScore();
            this.onStateChange({ ...this.state });
          }
        }
      }
    }

    // 9. Wave Completion check
    if (this.enemies.length === 0) {
      this.initWave(this.state.wave + 1);
      this.onStateChange({ ...this.state });
    }
  }

  private firePlayerBullets() {
    if (this.player.activePowerUp === 'spread') {
      // 3-way spread
      this.bullets.push(
        { x: this.player.x, y: this.player.y - 12, vx: 0, vy: -9, isPlayer: true, damage: 1, radius: 2 },
        { x: this.player.x - 8, y: this.player.y - 6, vx: -2.5, vy: -8.5, isPlayer: true, damage: 1, radius: 2 },
        { x: this.player.x + 8, y: this.player.y - 6, vx: 2.5, vy: -8.5, isPlayer: true, damage: 1, radius: 2 }
      );
    } else {
      // Standard dual cannon
      this.bullets.push(
        { x: this.player.x - 5, y: this.player.y - 12, vx: 0, vy: -9, isPlayer: true, damage: 1, radius: 2 },
        { x: this.player.x + 5, y: this.player.y - 12, vx: 0, vy: -9, isPlayer: true, damage: 1, radius: 2 }
      );
    }
  }

  public destroy() {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.input.destroy();
  }
}
