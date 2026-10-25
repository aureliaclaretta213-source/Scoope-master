import React, { useState } from 'react';
import { Volume2, VolumeX, Pause, ChevronDown, ChevronUp, ArrowDown, Share2, Sparkles, Gamepad2 } from 'lucide-react';
import { LevelConfig, UpgradeState } from '../types/game';
import { VirtualControls } from './VirtualControls';
import { sound } from '../audio/soundEngine';
import { haptics } from '../utils/haptics';

interface HUDProps {
  currentLevel: LevelConfig;
  currentScore: number;
  remainingScoops: number;
  scoopedInHand: number;
  coins: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onPlungeScoop: () => void;
  onDumpScoop: () => void;
  onJoystickMove: (dx: number, dz: number) => void;
  isPlunging: boolean;
  isDumping: boolean;
  upgrades: UpgradeState;
}

export const HUD: React.FC<HUDProps> = ({
  currentLevel,
  currentScore,
  remainingScoops,
  scoopedInHand,
  coins,
  isMuted,
  onToggleMute,
  onPause,
  onPlungeScoop,
  onDumpScoop,
  onJoystickMove,
  isPlunging,
  isDumping,
  upgrades,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(true);

  const target = currentLevel.targetScore;
  const progressRatio = Math.min(1.0, currentScore / target);

  // Star calculation
  const star1 = currentScore >= target;
  const star2 = currentScore >= target * 1.35;
  const star3 = currentScore >= target * 1.7;

  // Systematic Game Phase Instruction
  let phaseText = '🎯 Arahkan serokan ke target lalu tekan CELUP';
  let phaseColor = 'text-yellow-300 border-yellow-500/40 bg-yellow-950/40';

  if (isPlunging) {
    phaseText = '⚡ Hidrolik menukik... Mengeruk hadiah!';
    phaseColor = 'text-amber-300 border-amber-500/60 bg-amber-950/60';
  } else if (isDumping) {
    phaseText = '✨ Menuangkan hadiah ke corong perolehan!';
    phaseColor = 'text-pink-300 border-pink-500/60 bg-pink-950/60';
  } else if (scoopedInHand > 0) {
    phaseText = `👉 ${scoopedInHand} item terserok! Geser ke kanan atau tekan TUANG`;
    phaseColor = 'text-cyan-300 border-cyan-400/70 bg-cyan-950/60 shadow-[0_0_15px_rgba(0,229,255,0.3)] animate-pulse';
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden font-sans">
      {/* Top Status Clusters: Perimeter Layout, >85% Viewport Unobstructed */}
      <div className="w-full flex items-start justify-between gap-2">
        {/* Top-Left: Level Info & Quests */}
        <div className="bg-[#0b0f20]/90 border border-slate-700/70 rounded-2xl p-2.5 sm:p-3.5 shadow-xl pointer-events-auto max-w-[200px] sm:max-w-[300px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-cyan-400 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider">
              {currentLevel.name.split(':')[0]}
            </span>
            <div className="flex gap-0.5 sm:gap-1 text-xs sm:text-sm">
              <span className={star1 ? 'text-amber-400' : 'text-slate-600'}>★</span>
              <span className={star2 ? 'text-amber-400' : 'text-slate-600'}>★</span>
              <span className={star3 ? 'text-amber-400' : 'text-slate-600'}>★</span>
            </div>
          </div>
          <h2 className="text-white font-black text-xs sm:text-sm truncate mb-1.5">
            {currentLevel.name.split(':')[1] || currentLevel.name}
          </h2>

          {/* Goal checklist */}
          <div className="space-y-1 text-[10px] sm:text-xs">
            {currentLevel.goals.slice(0, 2).map((g, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                <span className="leading-tight truncate">{g.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top-Center: Systematic Guide Banner */}
        <div className="flex flex-col items-center pointer-events-auto max-w-[320px] sm:max-w-md mx-auto">
          {/* Phase Banner */}
          <div className={`px-3.5 py-1.5 rounded-full border text-[11px] sm:text-xs font-black shadow-lg text-center ${phaseColor} mb-2`}>
            {phaseText}
          </div>

          {/* Score & Target Progress */}
          <div className="flex items-center gap-2 bg-[#0b0f20]/90 border border-amber-500/40 rounded-full px-3.5 py-1 shadow-lg">
            <span className="text-amber-400 font-bold text-[10px] uppercase">SKOR:</span>
            <span className="text-yellow-300 font-black text-sm sm:text-base tabular-nums">
              {currentScore} Poin
            </span>
            <span className="text-slate-500 text-[10px]">/ {target} Pts</span>
            <div className="w-16 sm:w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 ml-1">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-300 rounded-full"
                style={{ width: `${progressRatio * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Right: Scoops Remaining, Coins, Menu */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Scoops Remaining Indicator */}
            <div className="bg-[#0b0f20]/90 border border-cyan-500/50 rounded-2xl px-2.5 sm:px-3.5 py-1.5 shadow-xl flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold text-[10px] sm:text-xs uppercase">SISA:</span>
              <span className={`text-base sm:text-lg font-black tabular-nums ${remainingScoops <= 1 ? 'text-rose-400' : 'text-white'}`}>
                {remainingScoops}
              </span>
            </div>

            {/* Toggle Virtual Touch Joystick button */}
            <button
              onClick={() => {
                haptics.light();
                setShowTouchControls(!showTouchControls);
              }}
              className={`p-2 bg-[#0b0f20]/90 border rounded-xl text-slate-300 transition-colors ${
                showTouchControls ? 'border-cyan-400 text-cyan-300' : 'border-slate-700 text-slate-500'
              }`}
              title="Toggle Kontrol Sentuh Android"
            >
              <Gamepad2 className="w-4 h-4" />
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                sound.playClick();
                onToggleMute();
              }}
              className="p-2 bg-[#0b0f20]/90 hover:bg-[#18203c] border border-slate-700 rounded-xl text-slate-300 transition-colors"
              title="Toggle Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
            </button>

            {/* Pause Button */}
            <button
              onClick={() => {
                sound.playClick();
                onPause();
              }}
              className="p-2 bg-[#0b0f20]/90 hover:bg-[#18203c] border border-slate-700 rounded-xl text-slate-300 transition-colors"
              title="Jeda"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {/* Current In-Scoop Haul Badge */}
          {scoopedInHand > 0 && (
            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[11px] px-3 py-1 rounded-full shadow-lg border border-yellow-200 pointer-events-auto">
              ⛏️ {scoopedInHand} Item Tertampung!
            </div>
          )}
        </div>
      </div>

      {/* Android Virtual Touch Controls (Thumb Joystick & Big Tactile Buttons) */}
      {showTouchControls && (
        <VirtualControls
          onMoveDelta={onJoystickMove}
          onPlunge={onPlungeScoop}
          onDump={onDumpScoop}
          isPlunging={isPlunging}
          isDumping={isDumping}
          remainingScoops={remainingScoops}
          scoopedCount={scoopedInHand}
        />
      )}

      {/* Unified Bottom Control Dock (For desktop or fine adjustments, collapsible) */}
      <div
        className={`pointer-events-auto mx-auto w-full max-w-[820px] transition-transform duration-300 ease-out z-10 ${
          isDockCollapsed || showTouchControls ? 'translate-y-[calc(100%-24px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse / Expand Tab Button */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="flex items-center gap-1.5 px-3 py-0.5 bg-[#101529]/95 border-t border-x border-slate-700/80 rounded-t-xl text-slate-400 hover:text-white text-[11px] font-semibold shadow-md active:scale-95"
          >
            {isDockCollapsed || showTouchControls ? (
              <>
                <ChevronUp className="w-3 h-3 text-cyan-400" />
                <span>Panel Keyboard & Info</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 text-slate-400" />
                <span>Sembunyikan Panel</span>
              </>
            )}
          </button>
        </div>

        {/* Main Dock Container */}
        <div className="bg-[#0e1326]/95 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3.5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Quick Instructions */}
          <div className="hidden md:flex flex-col text-xs text-slate-300">
            <span className="font-bold text-cyan-300">Sistematika Bermain:</span>
            <span>1. Arahkan serokan ke spot hadiah (Joystick / Mouse / WASD)</span>
            <span>2. Tekan <strong className="text-yellow-300">CELUP & SEROK</strong></span>
            <span>3. Hadiah terserok? Tekan <strong className="text-pink-300">TUANG</strong> saat di corong</span>
          </div>

          {/* Desktop Fallback Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center">
            <button
              onClick={() => {
                haptics.scoopPlunge();
                onPlungeScoop();
              }}
              disabled={isPlunging || isDumping || remainingScoops <= 0}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 font-black text-sm sm:text-base px-5 py-2.5 rounded-xl shadow-lg transition-all active:scale-95 ${
                isPlunging
                  ? 'bg-amber-600 text-white cursor-not-allowed'
                  : remainingScoops <= 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(255,214,0,0.35)]'
              }`}
            >
              <ArrowDown className={`w-4 h-4 ${isPlunging ? 'animate-bounce' : ''}`} />
              <span>{isPlunging ? 'MENYEROK...' : 'CELUP! (SPASI)'}</span>
            </button>

            <button
              onClick={() => {
                haptics.light();
                onDumpScoop();
              }}
              disabled={isDumping || isPlunging}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl border transition-all active:scale-95 ${
                isDumping
                  ? 'bg-pink-900 border-pink-700 text-pink-300'
                  : 'bg-[#1e1435] hover:bg-[#2b1c4b] border-pink-500/60 text-pink-300 hover:text-white'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>TUANG (E)</span>
            </button>
          </div>

          {/* Active Perks info */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="font-semibold text-amber-400">Kapasitas Lvl {upgrades.scoopSize}</span>
            <span>•</span>
            <span className="text-cyan-400">Bibir Lvl {upgrades.lipGuard}</span>
            <span>•</span>
            <span className="text-pink-400">Magnet Lvl {upgrades.magnetism}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
