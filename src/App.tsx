import React, { useState, useEffect, useRef } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { GameCanvas } from './components/GameCanvas';
import { ShopModal } from './components/ShopModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { ResultModal } from './components/ResultModal';
import { PauseModal } from './components/PauseModal';
import { LuckyScoopPhysics, PhysicsItem } from './game/physics';
import { LEVELS, UPGRADES_CONFIG } from './data/gameData';
import { GameState, LevelConfig, PlayerStats, UpgradeState } from './types/game';
import { sound } from './audio/soundEngine';
import { haptics } from './utils/haptics';

const STORAGE_KEY_STATS = 'lucky_scoop_stats_v2';
const STORAGE_KEY_UPGRADES = 'lucky_scoop_upgrades_v2';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(LEVELS[0]);
  const [isFreeplay, setIsFreeplay] = useState<boolean>(false);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [remainingScoops, setRemainingScoops] = useState<number>(LEVELS[0].maxScoops);
  const [scoopedInHand, setScoopedInHand] = useState<number>(0);
  const [collectedItems, setCollectedItems] = useState<PhysicsItem[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [coinsAwarded, setCoinsAwarded] = useState<number>(0);
  const [starsEarnedThisRound, setStarsEarnedThisRound] = useState<number>(0);
  const [isPlunging, setIsPlunging] = useState<boolean>(false);
  const [isDumping, setIsDumping] = useState<boolean>(false);

  // Persistent Player Stats
  const [stats, setStats] = useState<PlayerStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      coins: 250, // Starter bonus for Android test
      starsEarned: {},
      highScores: {},
      totalItemsScooped: 0,
      bestSingleHaul: 0,
    };
  });

  // Persistent Scoop Upgrades
  const [upgrades, setUpgrades] = useState<UpgradeState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_UPGRADES);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      scoopSize: 1,
      lipGuard: 0,
      magnetism: 0,
      luckBonus: 0,
      liftSpeed: 1,
    };
  });

  // Physics Engine instance
  const physicsRef = useRef<LuckyScoopPhysics>(new LuckyScoopPhysics());

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    } catch {}
  }, [stats]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_UPGRADES, JSON.stringify(upgrades));
    } catch {}
  }, [upgrades]);

  // Start Level (Campaign)
  const startLevel = (level: LevelConfig) => {
    setIsFreeplay(false);
    setCurrentLevel(level);
    setCurrentScore(0);
    setRemainingScoops(level.maxScoops);
    setScoopedInHand(0);
    setCollectedItems([]);

    const luckMultiplier = UPGRADES_CONFIG.luckBonus[upgrades.luckBonus]?.multiplier || 1.0;
    physicsRef.current.initItems(level.itemPoolRatios, level.totalItems, luckMultiplier);
    physicsRef.current.setScoopUpgrades(upgrades);

    setGameState('playing');
  };

  // Start Freeplay Mode (Unlimited scoops & practice)
  const startFreeplay = () => {
    setIsFreeplay(true);
    setCurrentLevel(LEVELS[0]);
    setCurrentScore(0);
    setRemainingScoops(999);
    setScoopedInHand(0);
    setCollectedItems([]);

    const luckMultiplier = UPGRADES_CONFIG.luckBonus[upgrades.luckBonus]?.multiplier || 1.0;
    // Blend of all fun items
    const allItemsRatios: Record<string, number> = {
      candy_pink: 0.2,
      candy_cyan: 0.2,
      gem_amethyst: 0.2,
      gem_sapphire: 0.15,
      lucky_duck: 0.15,
      mystery_egg: 0.1,
    };
    physicsRef.current.initItems(allItemsRatios, 160, luckMultiplier);
    physicsRef.current.setScoopUpgrades(upgrades);

    setGameState('playing');
  };

  // Virtual Joystick Delta Movement from Android
  const handleJoystickMove = (normX: number, normZ: number) => {
    if (physicsRef.current && !physicsRef.current.scoop.isDumping) {
      const curX = physicsRef.current.scoop.targetX;
      const curZ = physicsRef.current.scoop.targetZ;
      const speedMult = [1.0, 1.25, 1.5, 2.0][Math.min(3, upgrades.liftSpeed - 1)];
      const step = 0.22 * speedMult;
      physicsRef.current.setScoopTarget(curX + normX * step, curZ + normZ * step);
    }
  };

  // Plunge & Scoop Triggered
  const handlePlunge = () => {
    if (isPlunging || isDumping) return;
    if (!isFreeplay && remainingScoops <= 0) return;

    setIsPlunging(true);
    physicsRef.current.startScoopPlunge(() => {
      setIsPlunging(false);
      setScoopedInHand(physicsRef.current.getScoopedCount());
    });

    if (!isFreeplay) {
      setRemainingScoops((prev) => {
        const nextVal = prev - 1;
        if (nextVal <= 0) {
          setTimeout(() => {
            evaluateLevelResult();
          }, 3600);
        }
        return Math.max(0, nextVal);
      });
    }
  };

  // Dump Shovel into Chute Triggered
  const handleDump = () => {
    if (isDumping || isPlunging) return;
    setIsDumping(true);
    physicsRef.current.triggerDump(() => {
      setIsDumping(false);
      setScoopedInHand(0);
    });
  };

  // Handle Item Collected in Chute
  const handleItemCollected = (item: PhysicsItem) => {
    const luckMultiplier = UPGRADES_CONFIG.luckBonus[upgrades.luckBonus]?.multiplier || 1.0;
    const finalValue = Math.round(item.def.value * luckMultiplier);

    if (item.def.isHazard) {
      haptics.hazard();
    } else if (item.type === 'lucky_duck') {
      haptics.scoopClink();
    } else {
      haptics.chuteScore();
    }

    setCurrentScore((prev) => Math.max(0, prev + finalValue));
    setCollectedItems((prev) => [...prev, item]);

    setStats((prev) => ({
      ...prev,
      totalItemsScooped: prev.totalItemsScooped + 1,
    }));
  };

  // Evaluate Level Results
  const evaluateLevelResult = () => {
    setCurrentScore((finalScore) => {
      const target = currentLevel.targetScore;
      const isVictory = finalScore >= target;

      // Calculate Stars
      let stars = 0;
      if (isVictory) stars = 1;

      // Check goals
      currentLevel.goals.forEach((goal) => {
        if (goal.type === 'collect_type' && goal.targetItemType) {
          const matched = collectedItems.filter((it) => it.type === goal.targetItemType).length;
          if (matched >= goal.targetValue) stars = Math.min(3, stars + 1);
        } else if (goal.type === 'no_hazard') {
          const hazards = collectedItems.filter((it) => it.def.isHazard).length;
          if (hazards <= goal.targetValue) stars = Math.min(3, stars + 1);
        } else if (goal.type === 'min_items') {
          if (collectedItems.length >= goal.targetValue) stars = Math.min(3, stars + 1);
        }
      });

      if (finalScore >= target * 1.5 && stars < 3) {
        stars = 3;
      }

      setStarsEarnedThisRound(stars);

      if (isVictory) {
        haptics.victory();
      }

      // Reward Coins: 25% of score + $100 per star
      const coinsEarned = isVictory ? Math.round(finalScore * 0.25) + stars * 100 : Math.round(finalScore * 0.1);
      setCoinsAwarded(coinsEarned);

      setStats((prev) => {
        const currentBestStars = prev.starsEarned[currentLevel.id] || 0;
        const currentHighScore = prev.highScores[currentLevel.id] || 0;

        return {
          ...prev,
          coins: prev.coins + coinsEarned,
          starsEarned: {
            ...prev.starsEarned,
            [currentLevel.id]: Math.max(currentBestStars, stars),
          },
          highScores: {
            ...prev.highScores,
            [currentLevel.id]: Math.max(currentHighScore, finalScore),
          },
        };
      });

      setGameState(isVictory ? 'victory' : 'gameover');
      return finalScore;
    });
  };

  // Upgrade Purchase
  const handleUpgrade = (category: keyof UpgradeState) => {
    const currentTierIndex = upgrades[category];
    const tiers = UPGRADES_CONFIG[category];
    const nextTier = tiers[category === 'scoopSize' || category === 'liftSpeed' ? currentTierIndex : currentTierIndex + 1];

    if (nextTier && stats.coins >= nextTier.cost) {
      setStats((prev) => ({
        ...prev,
        coins: prev.coins - nextTier.cost,
      }));
      setUpgrades((prev) => ({
        ...prev,
        [category]: prev[category] + 1,
      }));
      haptics.light();
      sound.playClick();
    }
  };

  // Next Level
  const handleNextLevel = () => {
    const nextIndex = LEVELS.findIndex((l) => l.id === currentLevel.id) + 1;
    if (nextIndex < LEVELS.length) {
      startLevel(LEVELS[nextIndex]);
    } else {
      setGameState('level_select');
    }
  };

  const totalStars = Object.values(stats.starsEarned).reduce((acc, s) => acc + s, 0);

  return (
    <div className="relative w-full h-screen bg-[#070913] text-white overflow-hidden select-none font-sans">
      {/* 3D WebGL Canvas Layer */}
      <GameCanvas
        currentLevel={currentLevel}
        upgrades={upgrades}
        physics={physicsRef.current}
        isPaused={gameState !== 'playing'}
        onItemCollected={handleItemCollected}
        onScoopCountChange={setScoopedInHand}
        onPlungeScoop={handlePlunge}
        onDumpScoop={handleDump}
        onTogglePause={() => {
          if (gameState === 'playing') setGameState('paused');
          else if (gameState === 'paused') setGameState('playing');
        }}
      />

      {/* Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={() => startLevel(currentLevel)}
          onStartFreeplay={startFreeplay}
          onOpenLevelSelect={() => setGameState('level_select')}
          onOpenShop={() => setGameState('shop')}
          isMuted={isMuted}
          onToggleMute={() => {
            const next = sound.toggleMute();
            setIsMuted(next);
          }}
          coins={stats.coins}
          totalStars={totalStars}
        />
      )}

      {/* In-Game HUD */}
      {gameState === 'playing' && (
        <HUD
          currentLevel={currentLevel}
          currentScore={currentScore}
          remainingScoops={isFreeplay ? 99 : remainingScoops}
          scoopedInHand={scoopedInHand}
          coins={stats.coins}
          isMuted={isMuted}
          onToggleMute={() => {
            const next = sound.toggleMute();
            setIsMuted(next);
          }}
          onPause={() => setGameState('paused')}
          onPlungeScoop={handlePlunge}
          onDumpScoop={handleDump}
          onJoystickMove={handleJoystickMove}
          isPlunging={isPlunging}
          isDumping={isDumping}
          upgrades={upgrades}
        />
      )}

      {/* Shop Modal */}
      {gameState === 'shop' && (
        <ShopModal
          coins={stats.coins}
          upgrades={upgrades}
          onUpgrade={handleUpgrade}
          onClose={() => setGameState('title')}
        />
      )}

      {/* Level Select Modal */}
      {gameState === 'level_select' && (
        <LevelSelectModal
          stats={stats}
          currentLevelId={currentLevel.id}
          onSelectLevel={(level) => startLevel(level)}
          onClose={() => setGameState('title')}
        />
      )}

      {/* Victory / Game Over Modal */}
      {(gameState === 'victory' || gameState === 'gameover') && (
        <ResultModal
          isVictory={gameState === 'victory'}
          score={currentScore}
          starsEarned={starsEarnedThisRound}
          level={currentLevel}
          collectedItems={collectedItems}
          coinsAwarded={coinsAwarded}
          onNextLevel={handleNextLevel}
          onRetry={() => (isFreeplay ? startFreeplay() : startLevel(currentLevel))}
          onOpenShop={() => setGameState('shop')}
        />
      )}

      {/* Pause Menu */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={() => setGameState('playing')}
          onRestart={() => (isFreeplay ? startFreeplay() : startLevel(currentLevel))}
          onLevelSelect={() => setGameState('level_select')}
          onHome={() => setGameState('title')}
          isMuted={isMuted}
          onToggleMute={() => {
            const next = sound.toggleMute();
            setIsMuted(next);
          }}
        />
      )}
    </div>
  );
}
