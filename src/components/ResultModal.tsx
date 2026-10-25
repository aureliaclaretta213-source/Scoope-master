import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Star, Trophy, ArrowRight, RotateCcw, ShoppingBag, Award, AlertCircle } from 'lucide-react';
import { LevelConfig } from '../types/game';
import { PhysicsItem } from '../game/physics';
import { sound } from '../audio/soundEngine';

interface ResultModalProps {
  isVictory: boolean;
  score: number;
  starsEarned: number;
  level: LevelConfig;
  collectedItems: PhysicsItem[];
  coinsAwarded: number;
  onNextLevel: () => void;
  onRetry: () => void;
  onOpenShop: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isVictory,
  score,
  starsEarned,
  level,
  collectedItems,
  coinsAwarded,
  onNextLevel,
  onRetry,
  onOpenShop,
}) => {
  useEffect(() => {
    if (isVictory) {
      sound.playVictory();
      // Burst confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffd600', '#00e5ff', '#ff4081', '#76ff03'],
      });
    }
  }, [isVictory]);

  // Aggregate items by type
  const itemCounts: Record<string, { count: number; name: string; value: number }> = {};
  collectedItems.forEach((it) => {
    if (!itemCounts[it.type]) {
      itemCounts[it.type] = {
        count: 0,
        name: it.def.nameId,
        value: it.def.value,
      };
    }
    itemCounts[it.type].count++;
  });

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 pointer-events-auto">
      <div className="bg-[#0e1326] border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Banner */}
        <div
          className={`p-6 text-center border-b ${
            isVictory
              ? 'bg-gradient-to-b from-amber-500/20 to-transparent border-amber-500/30'
              : 'bg-gradient-to-b from-rose-500/20 to-transparent border-rose-500/30'
          }`}
        >
          {isVictory ? (
            <div className="inline-flex p-3 bg-amber-500/20 rounded-2xl border border-amber-400/40 text-amber-300 mb-2">
              <Trophy className="w-8 h-8 drop-shadow-[0_0_12px_rgba(255,214,0,0.8)]" />
            </div>
          ) : (
            <div className="inline-flex p-3 bg-rose-500/20 rounded-2xl border border-rose-400/40 text-rose-300 mb-2">
              <AlertCircle className="w-8 h-8" />
            </div>
          )}

          <h2 className="text-2xl font-black text-white uppercase tracking-wider">
            {isVictory ? 'SEROKAN BERHASIL!' : 'TARGET BELUM TERCAPAI'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            {isVictory
              ? 'Kerja bagus! Hadiah melimpah berhasil kamu amankan ke dalam corong.'
              : `Target skor level ini adalah ${level.targetScore} Poin. Tingkatkan serokanmu agar lebih mudah!`}
          </p>

          {/* Stars display */}
          {isVictory && (
            <div className="flex justify-center items-center gap-3 mt-4">
              {[1, 2, 3].map((starIdx) => (
                <div
                  key={starIdx}
                  className={`p-2 rounded-2xl transition-all ${
                    starIdx <= starsEarned
                      ? 'bg-amber-500/20 border border-amber-400/60 scale-110 shadow-[0_0_15px_rgba(255,214,0,0.4)]'
                      : 'bg-slate-800/40 border border-slate-700/40 opacity-40'
                  }`}
                >
                  <Star
                    className={`w-7 h-7 ${
                      starIdx <= starsEarned ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                    }`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Haul Summary Stats */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#141b38] border border-slate-700/70 rounded-2xl p-3 text-center">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Total Nilai Hasil
              </span>
              <span className="text-2xl font-black text-yellow-300 tabular-nums">{score} Poin</span>
            </div>

            <div className="bg-[#141b38] border border-slate-700/70 rounded-2xl p-3 text-center">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Koin Bonus Diperoleh
              </span>
              <span className="text-2xl font-black text-emerald-400 tabular-nums">+{coinsAwarded} 💰</span>
            </div>
          </div>

          {/* Items breakdown list */}
          <div className="bg-[#10152b] border border-slate-800 rounded-2xl p-3.5 max-h-44 overflow-y-auto custom-scrollbar">
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
              Rincian Tangkapan Item ({collectedItems.length} Total):
            </h4>
            {Object.keys(itemCounts).length === 0 ? (
              <p className="text-xs text-slate-500 italic">Tidak ada item yang berhasil masuk corong.</p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(itemCounts).map(([key, data]) => (
                  <div key={key} className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-medium">
                      {data.count}x {data.name}
                    </span>
                    <span
                      className={`font-black tabular-nums ${
                        data.value < 0 ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    >
                      {data.value < 0 ? `-${Math.abs(data.value * data.count)} Poin` : `+${data.value * data.count} Poin`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-5 border-t border-slate-800 bg-[#121730] flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              sound.playClick();
              onRetry();
            }}
            className="flex-1 min-w-[120px] py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Main Ulang</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenShop();
            }}
            className="flex-1 min-w-[120px] py-3 px-4 bg-[#1e153b] hover:bg-[#2c1d56] border border-purple-500/40 text-purple-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 text-purple-400" />
            <span>Upgrade Alat</span>
          </button>

          {isVictory && (
            <button
              onClick={() => {
                sound.playClick();
                onNextLevel();
              }}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>LEVEL BERIKUTNYA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
