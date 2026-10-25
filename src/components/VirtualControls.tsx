import React, { useRef, useState, useEffect } from 'react';
import { ArrowDown, Share2, Compass } from 'lucide-react';
import { haptics } from '../utils/haptics';
import { sound } from '../audio/soundEngine';

interface VirtualControlsProps {
  onMoveDelta: (dx: number, dz: number) => void;
  onPlunge: () => void;
  onDump: () => void;
  isPlunging: boolean;
  isDumping: boolean;
  remainingScoops: number;
  scoopedCount: number;
}

export const VirtualControls: React.FC<VirtualControlsProps> = ({
  onMoveDelta,
  onPlunge,
  onDump,
  isPlunging,
  isDumping,
  remainingScoops,
  scoopedCount,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [stickPos, setStickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Joystick touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    dragCenter.current = { x: centerX, y: centerY };

    const touch = e.touches[0];
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 40;

    const clampedX = dist > maxRadius ? (dx / dist) * maxRadius : dx;
    const clampedY = dist > maxRadius ? (dy / dist) * maxRadius : dy;

    setStickPos({ x: clampedX, y: clampedY });
    setIsDragging(true);
    haptics.light();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragCenter.current.x;
    const dy = touch.clientY - dragCenter.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 40;

    const clampedX = dist > maxRadius ? (dx / dist) * maxRadius : dx;
    const clampedY = dist > maxRadius ? (dy / dist) * maxRadius : dy;

    setStickPos({ x: clampedX, y: clampedY });

    // Send delta scaled to maxRadius
    const normX = clampedX / maxRadius;
    const normZ = clampedY / maxRadius;
    onMoveDelta(normX, normZ);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setStickPos({ x: 0, y: 0 });
    onMoveDelta(0, 0);
  };

  // Continuous loop while dragging
  useEffect(() => {
    if (!isDragging) return;
    const maxRadius = 40;
    const interval = setInterval(() => {
      const normX = stickPos.x / maxRadius;
      const normZ = stickPos.y / maxRadius;
      onMoveDelta(normX, normZ);
    }, 16);
    return () => clearInterval(interval);
  }, [isDragging, stickPos, onMoveDelta]);

  return (
    <div className="absolute inset-x-0 bottom-3 px-4 sm:px-8 pointer-events-none z-20 flex items-end justify-between select-none">
      {/* Left: Virtual Joystick for thumb steering on Android */}
      <div className="pointer-events-auto flex flex-col items-center">
        <div
          ref={joystickBaseRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-900/80 border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(0,229,255,0.2)] flex items-center justify-center touch-none backdrop-blur-none"
        >
          {/* Compass grid markings */}
          <div className="absolute w-full h-[1px] bg-cyan-500/20" />
          <div className="absolute h-full w-[1px] bg-cyan-500/20" />
          <Compass className="w-6 h-6 text-cyan-400/30 absolute" />

          {/* Floating thumb knob */}
          <div
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
            }}
            className={`w-12 h-12 rounded-full transition-transform duration-75 shadow-lg flex items-center justify-center border-2 ${
              isDragging
                ? 'bg-cyan-400 border-white scale-110 shadow-[0_0_15px_rgba(0,229,255,0.8)]'
                : 'bg-[#182348] border-cyan-400/80'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white/60" />
          </div>
        </div>
        <span className="text-[10px] font-bold text-cyan-300/80 mt-1 uppercase tracking-wider">
          Arahkan Serokan
        </span>
      </div>

      {/* Right: Tactile Action Buttons */}
      <div className="pointer-events-auto flex items-end gap-3 sm:gap-4">
        {/* Dump to Chute Button */}
        <button
          onClick={() => {
            haptics.light();
            onDump();
          }}
          disabled={isDumping || isPlunging}
          className={`flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 transition-all active:scale-90 shadow-xl ${
            isDumping
              ? 'bg-pink-900 border-pink-700 text-pink-300'
              : scoopedCount > 0
              ? 'bg-gradient-to-b from-pink-500 to-rose-600 border-pink-300 text-white shadow-[0_0_20px_rgba(233,30,99,0.5)] animate-bounce'
              : 'bg-[#1b152d]/90 hover:bg-[#281c45] border-pink-500/50 text-pink-300'
          }`}
        >
          <Share2 className="w-6 h-6 sm:w-7 sm:h-7" />
          <span className="text-[10px] sm:text-xs font-black uppercase mt-1">
            {isDumping ? 'Menuang...' : 'Tuang'}
          </span>
        </button>

        {/* Primary Plunge & Scoop Button */}
        <button
          onClick={() => {
            haptics.scoopPlunge();
            onPlunge();
          }}
          disabled={isPlunging || isDumping || remainingScoops <= 0}
          className={`flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-2 transition-all active:scale-90 shadow-2xl ${
            isPlunging
              ? 'bg-amber-600 border-amber-400 text-white cursor-not-allowed'
              : remainingScoops <= 0
              ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-b from-amber-400 via-yellow-400 to-amber-500 border-yellow-200 text-slate-950 shadow-[0_0_25px_rgba(255,214,0,0.6)]'
          }`}
        >
          <ArrowDown className={`w-8 h-8 sm:w-9 sm:h-9 ${isPlunging ? 'animate-bounce' : ''}`} />
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider mt-0.5">
            {isPlunging ? 'Menyerok' : 'CELUP!'}
          </span>
          <span className="text-[10px] font-extrabold opacity-80">
            {remainingScoops > 0 ? `${remainingScoops} Sisa` : 'Habis'}
          </span>
        </button>
      </div>
    </div>
  );
};
