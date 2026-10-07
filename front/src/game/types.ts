import type { AttackFamily } from '../types/api';

export type PowerUpType = 'spread' | 'shield' | 'slow_time';

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  lives: number;
  invulnerableTimer: number; // frames
  activePowerUp: PowerUpType | null;
  powerUpTimer: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isPlayer: boolean;
  damage: number;
  radius: number;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  family: AttackFamily;
  scoreValue: number;
  phaseTimer?: number; // For R2L phasing
  attackTimer?: number; // For Probe/U2R firing
  phaseState?: boolean; // R2L visible or phased
}

export interface PowerUpItem {
  id: string;
  x: number;
  y: number;
  type: PowerUpType;
  vy: number;
  radius: number;
}

export interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  brightness: number;
}

export interface GameScoreEntry {
  date: string;
  score: number;
  wave: number;
}

export interface GameState {
  score: number;
  wave: number;
  comboMultiplier: number;
  comboHits: number;
  killsByFamily: Record<AttackFamily, number>;
  isPaused: boolean;
  isGameOver: boolean;
  highScore: number;
  lastRuns: GameScoreEntry[];
}
