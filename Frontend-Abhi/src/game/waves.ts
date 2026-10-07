import type { Enemy } from './types';

export function generateWaveEnemies(wave: number, screenWidth: number): Enemy[] {
  const enemies: Enemy[] = [];
  const isBossWave = wave % 5 === 0;

  if (isBossWave) {
    // Wave 5, 10, 15... U2R Privilege Escalation Boss
    enemies.push({
      id: `u2r-boss-${wave}`,
      x: screenWidth / 2 - 28,
      y: -60,
      width: 56,
      height: 48,
      vx: 1.2,
      vy: 0.8,
      hp: 30 + wave * 5,
      maxHp: 30 + wave * 5,
      family: 'u2r',
      scoreValue: 500,
      attackTimer: 60,
    });
    return enemies;
  }

  // Regular waves: combination of DoS swarm, Probe scouts, and R2L intruders
  const dosCount = Math.min(16, 6 + wave * 2);
  const probeCount = Math.min(8, 2 + Math.floor(wave / 2));
  const r2lCount = Math.min(4, 1 + Math.floor(wave / 3));

  // 1. DoS swarm (arrives in 2 compact batches)
  for (let i = 0; i < dosCount; i++) {
    const col = i % 8;
    const row = Math.floor(i / 8);
    enemies.push({
      id: `dos-${wave}-${i}`,
      x: 40 + col * ((screenWidth - 80) / 8),
      y: -40 - row * 35,
      width: 20,
      height: 18,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 2.2 + Math.min(2.0, wave * 0.15),
      hp: 1,
      maxHp: 1,
      family: 'dos',
      scoreValue: 10,
    });
  }

  // 2. Probe scouts (zig-zagging scouts)
  for (let i = 0; i < probeCount; i++) {
    enemies.push({
      id: `probe-${wave}-${i}`,
      x: 60 + Math.random() * (screenWidth - 120),
      y: -100 - i * 50,
      width: 24,
      height: 24,
      vx: 1.8,
      vy: 1.2,
      hp: 2,
      maxHp: 2,
      family: 'probe',
      scoreValue: 25,
      attackTimer: 80 + i * 20,
    });
  }

  // 3. R2L intruders (phasing in and out, drops power-ups)
  for (let i = 0; i < r2lCount; i++) {
    enemies.push({
      id: `r2l-${wave}-${i}`,
      x: 80 + Math.random() * (screenWidth - 160),
      y: -140 - i * 60,
      width: 26,
      height: 26,
      vx: (Math.random() - 0.5) * 2,
      vy: 1.0,
      hp: 2,
      maxHp: 2,
      family: 'r2l',
      scoreValue: 50,
      phaseTimer: 0,
      phaseState: true,
    });
  }

  return enemies;
}
