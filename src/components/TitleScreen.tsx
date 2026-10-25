import React from 'react';
import { Play, ShoppingBag, Trophy, Volume2, VolumeX, Smartphone, Infinity, Compass } from 'lucide-react';
import { sound } from '../audio/soundEngine';
import { haptics } from '../utils/haptics';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface TitleScreenProps {
  onStartGame: () => void;
  onStartFreeplay: () => void;
  onOpenLevelSelect: () => void;
  onOpenShop: () => void;
  onOpenInstallModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  coins: number;
  totalStars: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onStartFreeplay,
  onOpenLevelSelect,
  onOpenShop,
  onOpenInstallModal,
  isMuted,
  onToggleMute,
  coins,
  totalStars,
}) => {
  const { isInstallable, install, isAndroid } = usePWAInstall();

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-between pointer-events-auto p-4 sm:p-6 select-none bg-radial from-transparent via-[#070913]/70 to-[#05070f]/95 overflow-y-auto custom-scrollbar">
      {/* Top Bar with Coins, Stars, Android PWA Install, and Audio Toggle */}
      <div className="w-full max-w-4xl flex items-center justify-between pt-1 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-[#141829]/90 border border-amber-500/40 rounded-full px-3 sm:px-4 py-1.5 shadow-lg">
            <span className="text-amber-400 font-bold text-xs sm:text-sm tracking-wide">⭐ BINTANG:</span>
            <span className="text-white font-extrabold tabular-nums text-sm sm:text-base">{totalStars}/18</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#141829]/90 border border-yellow-500/40 rounded-full px-3 sm:px-4 py-1.5 shadow-lg">
            <span className="text-yellow-400 font-bold text-xs sm:text-sm tracking-wide">💰 KOIN:</span>
            <span className="text-yellow-300 font-extrabold tabular-nums text-sm sm:text-base">{coins} Koin</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Installation Workflow Button */}
          <button
            onClick={() => {
              haptics.light();
              sound.playClick();
              onOpenInstallModal();
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 border border-emerald-400/50 text-emerald-300 font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow-lg active:scale-95 transition-all"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Alur Instalasi Android</span>
          </button>

          <button
            onClick={() => {
              haptics.light();
              sound.playClick();
              onToggleMute();
            }}
            className="p-2.5 sm:p-3 bg-[#141829]/90 hover:bg-[#1f2642] border border-cyan-500/40 rounded-full text-cyan-300 transition-colors shadow-lg active:scale-95"
            title="Toggle Suara"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-300" />}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup with 30-40% Negative Space */}
      <div className="flex flex-col items-center text-center my-auto max-w-2xl px-2 py-4">
        <div className="relative mb-2 flex items-center justify-center">
          {/* Custom SVG Title Typography */}
          <svg viewBox="0 0 680 160" className="w-[300px] sm:w-[460px] md:w-[560px] drop-shadow-[0_0_35px_rgba(0,229,255,0.4)]">
            <defs>
              <linearGradient id="titleGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff9c4" />
                <stop offset="40%" stopColor="#ffd600" />
                <stop offset="100%" stopColor="#ff8f00" />
              </linearGradient>
              <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00e5ff" />
                <stop offset="50%" stopColor="#00b0ff" />
                <stop offset="100%" stopColor="#d500f9" />
              </linearGradient>
            </defs>

            {/* Background 3D scoop shadow */}
            <text
              x="50%"
              y="75"
              textAnchor="middle"
              className="font-black text-5xl sm:text-6xl tracking-wider"
              fill="#060b18"
              stroke="#00e5ff"
              strokeWidth="4"
              strokeLinejoin="round"
            >
              LUCKY SCOOP 3D
            </text>

            <text
              x="50%"
              y="70"
              textAnchor="middle"
              className="font-black text-5xl sm:text-6xl tracking-wider uppercase"
              fill="url(#titleGold)"
              stroke="#fff"
              strokeWidth="1.2"
            >
              LUCKY SCOOP 3D
            </text>

            <rect x="180" y="95" width="320" height="4" fill="url(#neonCyan)" rx="2" />

            <text
              x="50%"
              y="132"
              textAnchor="middle"
              className="font-extrabold text-xl sm:text-2xl tracking-[0.25em] uppercase"
              fill="#00e5ff"
            >
              SEROKAN HOKI NUSANTARA
            </text>
          </svg>
        </div>

        <p className="text-slate-300 text-xs sm:text-base font-medium max-w-md mx-auto mb-6 drop-shadow px-2">
          Game serokan hoki 3D seru berhadiah! Dioptimalkan untuk Android dengan kontrol sentuh virtual, fisika realistis, dan sistem level menantang.
        </p>

        {/* Primary Start CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center max-w-md">
          <button
            onClick={() => {
              haptics.medium();
              sound.playClick();
              onStartGame();
            }}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-base sm:text-lg py-3.5 sm:py-4 px-6 sm:px-8 rounded-2xl shadow-[0_0_30px_rgba(255,214,0,0.45)] hover:shadow-[0_0_40px_rgba(255,214,0,0.7)] transition-all transform hover:-translate-y-0.5 active:scale-95"
          >
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            <span>MAIN LEVEL</span>
          </button>

          <button
            onClick={() => {
              haptics.light();
              sound.playClick();
              onStartFreeplay();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1b2140] hover:bg-[#252e58] border border-emerald-400/50 text-emerald-300 font-bold text-sm sm:text-base py-3.5 sm:py-4 px-5 rounded-2xl shadow-lg transition-all active:scale-95"
          >
            <Infinity className="w-5 h-5 text-emerald-400" />
            <span>Latihan Bebas</span>
          </button>
        </div>

        {/* Secondary Hub Actions */}
        <div className="flex items-center gap-3 w-full justify-center max-w-md mt-3">
          <button
            onClick={() => {
              haptics.light();
              sound.playClick();
              onOpenLevelSelect();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#151c38]/90 hover:bg-[#1e274c] border border-cyan-400/50 text-cyan-300 font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg transition-all active:scale-95"
          >
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span>Peta Level (6)</span>
          </button>

          <button
            onClick={() => {
              haptics.light();
              sound.playClick();
              onOpenShop();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#151c38]/90 hover:bg-[#1e274c] border border-pink-400/50 text-pink-300 font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg transition-all active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 text-pink-400" />
            <span>Bengkel Upgrade</span>
          </button>
        </div>
      </div>

      {/* Flat Control Hints Footer */}
      <div className="w-full max-w-3xl flex flex-col items-center gap-2 pb-1 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-400 bg-[#0d1226]/85 border border-slate-700/60 rounded-full px-4 py-1.5">
          <span><strong className="text-cyan-300 font-bold">Android Touch</strong> Joystick & Tombol Sentuh</span>
          <span className="text-slate-600">•</span>
          <span><strong className="text-yellow-300 font-bold">Desktop</strong> WASD + SPASI + E</span>
          <span className="text-slate-600">•</span>
          <span><strong className="text-pink-300 font-bold">Haptic Feedback</strong> Getar Nyata</span>
        </div>
      </div>
    </div>
  );
};
