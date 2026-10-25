import React, { useState } from 'react';
import { X, Smartphone, Download, CheckCircle2, Globe, Terminal, Sparkles, Share, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { sound } from '../audio/soundEngine';
import { haptics } from '../utils/haptics';

interface InstallModalProps {
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, install, isAndroid } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'apk' | 'ios'>('android');

  const handleInstallClick = async () => {
    haptics.medium();
    sound.playClick();
    await install();
  };

  return (
    <div className="absolute inset-0 z-35 flex items-center justify-center p-4 bg-black/80 pointer-events-auto">
      <div className="bg-[#0e1326] border border-slate-700/80 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#131933]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-1.5">
                <span>WORKFLOW INSTALASI ANDROID & PWA</span>
              </h2>
              <p className="text-xs text-slate-400">Pasang game ke layar beranda seperti aplikasi native Android</p>
            </div>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#10162e] p-2 gap-2">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('android');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'android'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 Android (WebAPK)
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('apk');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'apk'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📦 Standalone APK (Play Store)
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('ios');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ios'
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 text-purple-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🍏 iOS Safari
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar text-xs text-slate-300">
          {/* Tab 1: Android PWA / WebAPK */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              {/* Instant 1-Click Install CTA if supported */}
              {isInstallable ? (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                  <div>
                    <h3 className="text-emerald-300 font-extrabold text-sm mb-0.5 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Browser Mendukung Instalasi Instan!</span>
                    </h3>
                    <p className="text-slate-300 text-[11px]">
                      Klik tombol di samping untuk memasang game secara otomatis ke smartphone Anda.
                    </p>
                  </div>
                  <button
                    onClick={handleInstallClick}
                    className="w-full sm:w-auto py-2.5 px-5 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instal Sekarang</span>
                  </button>
                </div>
              ) : isInstalled ? (
                <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-2xl p-3.5 flex items-center gap-2.5 text-cyan-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span>Aplikasi sudah terpasang di perangkat Anda sebagai PWA Standalone!</span>
                </div>
              ) : null}

              {/* Step-by-Step Android Chrome Manual Flow */}
              <div className="bg-[#141b38] border border-slate-700/60 rounded-2xl p-4 space-y-3">
                <h4 className="font-extrabold text-white text-sm">
                  Langkah Instalasi di Android Chrome / Browser:
                </h4>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <p>
                      Buka game ini di browser <strong>Google Chrome</strong> atau <strong>Brave</strong> di smartphone Android.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <p>
                      Ketuk menu titik tiga <strong>(⋮)</strong> di sudut kanan atas layar browser Chrome.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <p>
                      Pilih opsi <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home screen) atau <strong>"Instal Aplikasi"</strong> (Install App).
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center shrink-0 text-[11px]">
                      4
                    </span>
                    <p>
                      Konfirmasi nama <strong>"Lucky Scoop 3D"</strong> dan ketuk <strong>Instal</strong>.
                    </p>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-slate-900/70 border border-slate-800 rounded-xl text-slate-400 text-[11px] leading-relaxed">
                  💡 <strong className="text-white">Keuntungan PWA Android:</strong> Game akan berjalan dalam layar penuh (fullscreen) tanpa address bar, performa 60fps dengan Three.js, getaran haptic Android aktif, dan data level & koin tersimpan otomatis.
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Standalone APK for Google Play */}
          {activeTab === 'apk' && (
            <div className="space-y-3.5">
              <p className="leading-relaxed">
                Untuk mengubah game ini menjadi file instalasi <strong>.APK</strong> atau <strong>.AAB</strong> (Android App Bundle) mandiri untuk diunggah ke Google Play Store, gunakan alat resmi Google <strong>Bubblewrap (Trusted Web Activity)</strong>:
              </p>

              <div className="bg-[#080c1a] border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-cyan-300 space-y-2">
                <div className="text-slate-500"># 1. Install Bubblewrap CLI dari Google</div>
                <div className="text-amber-300">npm install -g @bubblewrap/cli</div>
                <div className="text-slate-500 mt-2"># 2. Inisialisasi dari Manifest PWA yang sudah ada</div>
                <div className="text-amber-300">bubblewrap init --manifest https://[URL_APPLET]/manifest.webmanifest</div>
                <div className="text-slate-500 mt-2"># 3. Build file APK siap pasang / rilis</div>
                <div className="text-emerald-400">bubblewrap build</div>
              </div>

              <div className="bg-[#141b38] border border-slate-700/60 rounded-xl p-3 space-y-1.5">
                <span className="font-bold text-white text-xs">Alternatif GUI (Tanpa Koding):</span>
                <p className="text-[11px] text-slate-300">
                  Buka website <strong className="text-cyan-400">PWABuilder.com</strong> (by Microsoft), masukkan tautan game ini, lalu unduh paket APK Android siap rilis hanya dengan satu klik.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: iOS Safari */}
          {activeTab === 'ios' && (
            <div className="bg-[#141b38] border border-slate-700/60 rounded-2xl p-4 space-y-3">
              <h4 className="font-extrabold text-white text-sm">
                Alur Pemasangan di iPhone / iPad (Safari):
              </h4>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-black flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <p>Buka tautan game menggunakan browser <strong>Safari</strong> bawaan Apple.</p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-black flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <p className="flex items-center gap-1.5">
                    Ketuk tombol Bagikan / <strong>Share</strong> (<Share className="w-3.5 h-3.5 text-cyan-400 inline" />) di bilah bawah.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-black flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <p>Gulir ke bawah dan ketuk <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#10162e] flex justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
