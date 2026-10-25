export type GameMode = 'campaign' | 'freeplay';

export type GameState = 'title' | 'level_select' | 'shop' | 'playing' | 'victory' | 'gameover' | 'paused';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'hazard';

export interface ScoopItemDef {
  type: string;
  name: string;
  nameId: string; // Indonesian name
  rarity: ItemRarity;
  value: number; // point/currency value
  radius: number;
  color: string;
  metalness: number;
  roughness: number;
  transmission?: number;
  isHazard?: boolean;
  isSpecial?: boolean;
}

export interface QuestGoal {
  type: 'score' | 'min_items' | 'collect_type' | 'no_hazard' | 'single_scoop_haul';
  targetValue: number;
  targetItemType?: string;
  description: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  theme: 'arcade' | 'carnival' | 'crystals' | 'gold_vault' | 'cosmic';
  tubColor: string;
  neonColor: string;
  targetScore: number;
  maxScoops: number;
  goals: QuestGoal[];
  itemPoolRatios: Record<string, number>;
  totalItems: number;
  unlockRequirementStars: number;
}

export interface UpgradeState {
  scoopSize: number; // 1 to 4 (Capacity & radius)
  lipGuard: number; // 0 to 3 (Retains items on shovel without falling)
  magnetism: number; // 0 to 3 (Attracts high-value items)
  luckBonus: number; // 0 to 3 (Higher rare spawns & +% value)
  liftSpeed: number; // 1 to 4 (Arm speed & responsiveness)
}

export interface PlayerStats {
  coins: number;
  starsEarned: Record<number, number>; // levelId -> stars (0-3)
  highScores: Record<number, number>;
  totalItemsScooped: number;
  bestSingleHaul: number;
}

export interface ScoopPhysicalState {
  x: number;
  y: number;
  z: number;
  pitch: number; // Shovel tilt angle
  isDumping: boolean;
  isPlunging: boolean;
  power: number;
}
