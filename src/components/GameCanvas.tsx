import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { LuckyScoopPhysics, PhysicsItem } from '../game/physics';
import { LuckyScoopSceneManager } from '../game/sceneManager';
import { LevelConfig, UpgradeState } from '../types/game';

interface ScorePopup {
  id: number;
  text: string;
  value: number;
  x: number;
  y: number;
  color: string;
}

interface GameCanvasProps {
  currentLevel: LevelConfig;
  upgrades: UpgradeState;
  physics: LuckyScoopPhysics;
  isPaused: boolean;
  onItemCollected: (item: PhysicsItem) => void;
  onScoopCountChange: (count: number) => void;
  onPlungeScoop: () => void;
  onDumpScoop: () => void;
  onTogglePause: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  currentLevel,
  upgrades,
  physics,
  isPaused,
  onItemCollected,
  onScoopCountChange,
  onPlungeScoop,
  onDumpScoop,
  onTogglePause,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<LuckyScoopSceneManager | null>(null);
  const keysHeld = useRef<Record<string, boolean>>({});
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const popupIdRef = useRef(1);

  // Reusable 3D vector for raycasting
  const tempGroundHit = useRef(new THREE.Vector3());

  // Initialize Three.js scene once
  useEffect(() => {
    if (!mountRef.current) return;

    const manager = new LuckyScoopSceneManager(mountRef.current, physics);
    sceneManagerRef.current = manager;

    // Connect scoring popup events
    manager.onScorePopup = (text, value, screenX, screenY, color) => {
      const id = popupIdRef.current++;
      setPopups((prev) => [
        ...prev.slice(-10),
        { id, text, value, x: screenX, y: screenY, color },
      ]);

      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== id));
      }, 1000);
    };

    // Forward collected item events
    physics.onChuteHit = (evt) => {
      onItemCollected(evt.item);
    };

    physics.onScoopHit = (count) => {
      onScoopCountChange(physics.getScoopedCount());
    };

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  // Sync Level & Upgrades
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.applyLevelTheme(currentLevel);
      sceneManagerRef.current.updateScoopVisualScale(upgrades);
    }
    physics.setScoopUpgrades(upgrades);
  }, [currentLevel, upgrades]);

  // Main continuous physics simulation step
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const rawDt = (now - lastTime) * 0.001;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      if (!isPaused) {
        // Continuous keyboard movement input
        const speed = 7.5;
        let dx = 0;
        let dz = 0;

        if (keysHeld.current['KeyA'] || keysHeld.current['ArrowLeft']) dx -= speed * dt;
        if (keysHeld.current['KeyD'] || keysHeld.current['ArrowRight']) dx += speed * dt;
        if (keysHeld.current['KeyW'] || keysHeld.current['ArrowUp']) dz -= speed * dt;
        if (keysHeld.current['KeyS'] || keysHeld.current['ArrowDown']) dz += speed * dt;

        if (dx !== 0 || dz !== 0) {
          physics.setScoopTarget(physics.scoop.targetX + dx, physics.scoop.targetZ + dz);
        }

        // Advance physics engine
        physics.step(dt, upgrades);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, upgrades]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysHeld.current[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isPaused) {
          onPlungeScoop();
        }
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        if (!isPaused) {
          onDumpScoop();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onTogglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.current[e.code] = false;
    };

    const handleBlur = () => {
      keysHeld.current = {};
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isPaused, onPlungeScoop, onDumpScoop, onTogglePause]);

  // Pointer move tracking for scoop steering
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPaused || !sceneManagerRef.current) return;
    const hit = sceneManagerRef.current.getGroundIntersection(
      e.clientX,
      e.clientY,
      tempGroundHit.current
    );
    if (hit) {
      physics.setScoopTarget(tempGroundHit.current.x, tempGroundHit.current.z);
    }
  };

  return (
    <div
      ref={mountRef}
      onPointerMove={handlePointerMove}
      className="absolute inset-0 w-full h-full cursor-crosshair overflow-hidden touch-none"
    >
      {/* Dynamic Screen Floating Score Popups */}
      {popups.map((p) => (
        <div
          key={p.id}
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            color: p.color,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none font-black text-xl sm:text-2xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] animate-out fade-out slide-out-to-top duration-1000 select-none z-20"
        >
          {p.text}
        </div>
      ))}
    </div>
  );
};
