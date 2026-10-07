import type { Bullet, Enemy, Player, PowerUpItem, Star, GameState } from './types';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public render(
    width: number,
    height: number,
    stars: Star[],
    player: Player,
    bullets: Bullet[],
    enemies: Enemy[],
    powerUps: PowerUpItem[],
    state: GameState,
    soundEnabled: boolean
  ) {
    const { ctx } = this;

    // 1. Background (near-black, tinted #0A0B0C)
    ctx.fillStyle = '#0A0B0C';
    ctx.fillRect(0, 0, width, height);

    // 2. Starfield (2 depth layers of tiny dots)
    for (const star of stars) {
      ctx.fillStyle = `rgba(230, 232, 227, ${star.brightness})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // 3. Power-ups
    for (const p of powerUps) {
      ctx.strokeStyle = '#B6FF3B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#B6FF3B';
      ctx.font = '10px "JetBrains Mono"';
      ctx.textAlign = 'center';
      const label = p.type === 'spread' ? 'SPD' : p.type === 'shield' ? 'SHD' : 'SLW';
      ctx.fillText(label, p.x, p.y + 3);
    }

    // 4. Bullets
    for (const b of bullets) {
      if (b.isPlayer) {
        ctx.strokeStyle = '#B6FF3B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - 4);
        ctx.lineTo(b.x, b.y + 4);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#FF4D3D';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - 3);
        ctx.lineTo(b.x, b.y + 3);
        ctx.stroke();
      }
    }

    // 5. Enemies (Render using matching AttackMark vector geometry)
    for (const e of enemies) {
      // If R2L is phased out, skip or render faint outline
      if (e.family === 'r2l' && e.phaseState === false) {
        ctx.strokeStyle = 'rgba(242, 193, 78, 0.2)';
        ctx.strokeRect(e.x, e.y, e.width, e.height);
        continue;
      }

      ctx.save();
      ctx.translate(e.x + e.width / 2, e.y + e.height / 2);

      if (e.family === 'dos') {
        // DoS: Stacked converging arrows (critical red)
        ctx.strokeStyle = '#FF4D3D';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-8, -6);
        ctx.lineTo(0, -1);
        ctx.lineTo(8, -6);
        ctx.moveTo(-8, -1);
        ctx.lineTo(0, 4);
        ctx.lineTo(8, -1);
        ctx.moveTo(-8, 4);
        ctx.lineTo(0, 9);
        ctx.lineTo(8, 4);
        ctx.stroke();
      } else if (e.family === 'probe') {
        // Probe: Scout circle with radial tick (high orange)
        ctx.strokeStyle = '#FF9A1F';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.moveTo(0, 0);
        ctx.lineTo(7, -7);
        ctx.stroke();
        ctx.fillStyle = '#FF9A1F';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.family === 'r2l') {
        // R2L: Intruder door with broken latch (medium gold)
        ctx.strokeStyle = '#F2C14E';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-9, -11, 18, 22);
        ctx.beginPath();
        ctx.moveTo(-3, -2);
        ctx.lineTo(3, 2);
        ctx.moveTo(3, -2);
        ctx.lineTo(-3, 2);
        ctx.stroke();
      } else if (e.family === 'u2r') {
        // U2R: Large privilege climb chevron over bar (boss)
        ctx.strokeStyle = '#FF4D3D';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-20, 2);
        ctx.lineTo(0, -16);
        ctx.lineTo(20, 2);
        ctx.moveTo(-14, 10);
        ctx.lineTo(0, -4);
        ctx.lineTo(14, 10);
        ctx.moveTo(-22, 16);
        ctx.lineTo(22, 16);
        ctx.stroke();

        // Boss HP Bar
        ctx.fillStyle = 'rgba(255, 77, 61, 0.2)';
        ctx.fillRect(-24, -26, 48, 4);
        ctx.fillStyle = '#FF4D3D';
        ctx.fillRect(-24, -26, (e.hp / e.maxHp) * 48, 4);
      }

      ctx.restore();
    }

    // 6. Player Ship (Vector lime craft)
    if (!state.isGameOver) {
      const isBlinking = player.invulnerableTimer > 0 && Math.floor(player.invulnerableTimer / 4) % 2 === 0;
      if (!isBlinking) {
        ctx.save();
        ctx.translate(player.x, player.y);

        ctx.strokeStyle = '#B6FF3B';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, -14); // Nose
        ctx.lineTo(12, 12);  // Right wing
        ctx.lineTo(4, 8);    // Right thruster notch
        ctx.lineTo(-4, 8);   // Left thruster notch
        ctx.lineTo(-12, 12); // Left wing
        ctx.closePath();
        ctx.stroke();

        // Cockpit crosshair
        ctx.fillStyle = '#B6FF3B';
        ctx.fillRect(-1.5, -4, 3, 4);

        // Shield bubble if active
        if (player.activePowerUp === 'shield') {
          ctx.strokeStyle = 'rgba(77, 163, 255, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // 7. Heads Up Display (HUD)
    this.renderHUD(width, height, player, state, soundEnabled);
  }

  private renderHUD(width: number, _height: number, player: Player, state: GameState, soundEnabled: boolean) {
    const { ctx } = this;
    ctx.font = '12px "JetBrains Mono"';
    ctx.textAlign = 'left';

    // Top Left: Score & Wave
    ctx.fillStyle = '#E6E8E3';
    ctx.fillText(`SCORE: ${state.score.toLocaleString()}`, 20, 28);
    ctx.fillStyle = '#8A918C';
    ctx.fillText(`WAVE: ${state.wave}`, 20, 46);

    // Multiplier
    if (state.comboMultiplier > 1) {
      ctx.fillStyle = '#B6FF3B';
      ctx.fillText(`COMBO x${state.comboMultiplier}`, 20, 64);
    }

    // Top Right: Shields / Lives
    ctx.textAlign = 'right';
    ctx.fillStyle = '#E6E8E3';
    ctx.fillText(`SHIELDS: ${Math.max(0, player.lives)}`, width - 20, 28);

    // Sound toggle indicator
    ctx.fillStyle = soundEnabled ? '#B6FF3B' : '#566059';
    ctx.fillText(`AUDIO: ${soundEnabled ? 'ON [M]' : 'MUTED [M]'}`, width - 20, 46);

    // High Score
    ctx.fillStyle = '#8A918C';
    ctx.fillText(`HI: ${state.highScore.toLocaleString()}`, width - 20, 64);
  }
}
