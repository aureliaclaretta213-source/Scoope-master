import React from 'react';
import { Play, RotateCcw, List, Home, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onLevelSelect: () => void;
  onHome: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onLevelSelect,
  onHome,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/80 pointer-events-auto">
      <div className="bg-[#0e1326] border border-slate-700/80 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-150">
        <h2 className="text-xl font-black text-white uppercase tracking-wider mb-1">GAME DIJEDA</h2>
        <p className="text-xs text-slate-400 mb-6">Ambil nafas sejenak sebelum serokan berikutnya!</p>

        <div className="w-full space-y-2.5">
          <button
            onClick={() => {
              sound.playClick();
              onResume();
            }}
            className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>LANJUTKAN (ESC)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="w-full py-3 bg-[#151c38] hover:bg-[#1f284f] border border-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ULANG LEVEL INI</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onLevelSelect();
            }}
            className="w-full py-3 bg-[#151c38] hover:bg-[#1f284f] border border-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
          >
            <List className="w-4 h-4" />
            <span>PILIH LEVEL LAIN</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onHome();
            }}
            className="w-full py-3 bg-[#151c38] hover:bg-[#1f284f] border border-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>KEMBALI KE MENU UTAMA</span>
          </button>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onToggleMute();
          }}
          className="mt-6 flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
          <span>{isMuted ? 'Suara Dimatikan' : 'Suara Aktif'}</span>
        </button>
      </div>
    </div>
  );
};
