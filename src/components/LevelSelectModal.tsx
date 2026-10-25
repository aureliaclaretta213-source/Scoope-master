import React from 'react';
import { X, Lock, Star, Trophy, Sparkles, Play } from 'lucide-react';
import { LEVELS } from '../data/gameData';
import { LevelConfig, PlayerStats } from '../types/game';
import { sound } from '../audio/soundEngine';

interface LevelSelectModalProps {
  stats: PlayerStats;
  currentLevelId: number;
  onSelectLevel: (level: LevelConfig) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  stats,
  currentLevelId,
  onSelectLevel,
  onClose,
}) => {
  const totalStars = Object.values(stats.starsEarned).reduce((acc, s) => acc + s, 0);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
      <div className="bg-[#0e1326] border border-slate-700/80 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#131933]">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>PILIH TANTANGAN LEVEL</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Selesaikan quest untuk mengumpulkan bintang dan membuka level baru!</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-white font-black text-sm tabular-nums">{totalStars} / 18 Bintang</span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Levels Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 custom-scrollbar">
          {LEVELS.map((level) => {
            const stars = stats.starsEarned[level.id] || 0;
            const isUnlocked = totalStars >= level.unlockRequirementStars;
            const isCurrent = level.id === currentLevelId;

            return (
              <div
                key={level.id}
                className={`relative rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                  !isUnlocked
                    ? 'bg-[#101426]/60 border-slate-800/80 opacity-60'
                    : isCurrent
                    ? 'bg-[#182042] border-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.25)]'
                    : 'bg-[#141b38]/90 border-slate-700/70 hover:border-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-black tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-slate-800 text-cyan-300">
                      Level {level.id}
                    </span>

                    {/* Star Badges */}
                    <div className="flex items-center gap-1 text-base">
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-4 h-4 ${
                            starIdx <= stars
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(255,214,0,0.6)]'
                              : 'fill-slate-800 text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <h3 className="font-black text-white text-base leading-tight mb-1">
                    {level.name.split(':')[1] || level.name}
                  </h3>
                  <p className="text-xs text-slate-300 mb-3">{level.subtitle}</p>

                  {/* Target & Specs */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 mb-3">
                    <div>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Target Nilai</span>
                      <strong className="text-yellow-300 font-extrabold">{level.targetScore} Pts</strong>
                    </div>
                    <div className="border-l border-slate-800 pl-3">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Batas Serokan</span>
                      <strong className="text-cyan-300 font-extrabold">{level.maxScoops} Kali</strong>
                    </div>
                    <div className="border-l border-slate-800 pl-3">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Rekor Terbaik</span>
                      <strong className="text-emerald-400 font-extrabold">
                        {stats.highScores[level.id] || 0} Pts
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card CTA */}
                <div>
                  {isUnlocked ? (
                    <button
                      onClick={() => {
                        sound.playClick();
                        onSelectLevel(level);
                      }}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isCurrent ? 'MAIN LEVEL INI' : 'PILIH & MAIN'}</span>
                    </button>
                  ) : (
                    <div className="w-full py-2.5 px-4 bg-slate-900/80 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-rose-400" />
                      <span>Butuh {level.unlockRequirementStars} Bintang untuk Buka</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
