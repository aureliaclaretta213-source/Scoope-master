import React from 'react';
import { X, Sparkles, Shield, Magnet, Gauge, Box, Check } from 'lucide-react';
import { UpgradeState } from '../types/game';
import { UPGRADES_CONFIG } from '../data/gameData';
import { sound } from '../audio/soundEngine';

interface ShopModalProps {
  coins: number;
  upgrades: UpgradeState;
  onUpgrade: (category: keyof UpgradeState) => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ coins, upgrades, onUpgrade, onClose }) => {
  const categories: Array<{
    id: keyof UpgradeState;
    name: string;
    icon: React.ReactNode;
    color: string;
    tiers: typeof UPGRADES_CONFIG.scoopSize;
  }> = [
    {
      id: 'scoopSize',
      name: 'Kapasitas Serokan',
      icon: <Box className="w-5 h-5 text-amber-400" />,
      color: 'amber',
      tiers: UPGRADES_CONFIG.scoopSize,
    },
    {
      id: 'lipGuard',
      name: 'Bibir Pengaman',
      icon: <Shield className="w-5 h-5 text-cyan-400" />,
      color: 'cyan',
      tiers: UPGRADES_CONFIG.lipGuard,
    },
    {
      id: 'magnetism',
      name: 'Magnet Logam Mulia',
      icon: <Magnet className="w-5 h-5 text-pink-400" />,
      color: 'pink',
      tiers: UPGRADES_CONFIG.magnetism,
    },
    {
      id: 'luckBonus',
      name: 'Jimat Hoki & Berkah',
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      color: 'purple',
      tiers: UPGRADES_CONFIG.luckBonus,
    },
    {
      id: 'liftSpeed',
      name: 'Kecepatan Hidrolik',
      icon: <Gauge className="w-5 h-5 text-emerald-400" />,
      color: 'emerald',
      tiers: UPGRADES_CONFIG.liftSpeed,
    },
  ];

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
      <div className="bg-[#0e1326] border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#131933]">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>🔧 BENGKEL UPGRADE SEROKAN</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Tingkatkan peralatanmu agar mampu menaklukkan level sulit!</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 px-3.5 py-1.5 rounded-full">
              <span className="text-yellow-400 font-bold text-xs">SALDO:</span>
              <span className="text-yellow-300 font-black text-sm tabular-nums">{coins} Koin</span>
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

        {/* Upgrade Cards List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 custom-scrollbar">
          {categories.map((cat) => {
            const currentLevel = upgrades[cat.id];
            const maxTierIndex = cat.tiers.length - 1;
            const currentTierIndex = Math.min(maxTierIndex, cat.id === 'scoopSize' || cat.id === 'liftSpeed' ? currentLevel - 1 : currentLevel);
            const currentTier = cat.tiers[currentTierIndex];
            const nextTier = currentTierIndex < maxTierIndex ? cat.tiers[currentTierIndex + 1] : null;
            const canAfford = nextTier ? coins >= nextTier.cost : false;

            return (
              <div
                key={cat.id}
                className="bg-[#141b38]/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">{cat.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-base">{cat.name}</h3>
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded-md">
                        Tingkat {currentLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{currentTier.desc}</p>
                    {nextTier && (
                      <p className="text-xs text-emerald-400 mt-1 font-semibold">
                        Upgrade Berikutnya: {nextTier.name} ({nextTier.desc})
                      </p>
                    )}
                  </div>
                </div>

                <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                  {nextTier ? (
                    <button
                      onClick={() => {
                        sound.playClick();
                        onUpgrade(cat.id);
                      }}
                      disabled={!canAfford}
                      className={`w-full sm:w-auto font-black text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      <span>Upgrade ({nextTier.cost} Koin)</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-400 font-extrabold text-xs bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
                      <Check className="w-3.5 h-3.5" />
                      <span>LEVEL MAKSIMAL</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#10162e] flex justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-colors"
          >
            Tutup Bengkel
          </button>
        </div>
      </div>
    </div>
  );
};
