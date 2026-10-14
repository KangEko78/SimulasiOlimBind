import React, { useState, useEffect } from 'react';
import { Poem } from '../types/poem';
import {
  Mic,
  MicOff,
  Volume2,
  Clock,
  Sparkles,
  BookOpen,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  X,
  FileText,
  VolumeX,
  Eye,
  Heart,
  Award,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface PerformanceCockpitPanelProps {
  poem: Poem;
  isPracticing: boolean;
  isPaused: boolean;
  practiceDuration: number;
  micLevel: number;
  isRecordingAudio: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onFinish: () => void;
  onOpenRubricModal: () => void;
  onOpenGuideModal: () => void;
}

export const PerformanceCockpitPanel: React.FC<PerformanceCockpitPanelProps> = ({
  poem,
  isPracticing,
  isPaused,
  practiceDuration,
  micLevel,
  isRecordingAudio,
  onStart,
  onPause,
  onResume,
  onRestart,
  onFinish,
  onOpenRubricModal,
  onOpenGuideModal,
}) => {
  const [showPoemReference, setShowPoemReference] = useState(false);
  const [showProsodyGuide, setShowProsodyGuide] = useState(false);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Determine volume feedback level
  const getVolumeStatus = (level: number) => {
    if (level < 10) {
      return {
        label: 'Suara Belum Terdengar / Mikrofon Sunyi',
        color: 'text-slate-400',
        barColor: 'bg-slate-600',
        badge: 'Hening',
      };
    }
    if (level < 25) {
      return {
        label: 'Volume Agak Lirih (Tingkatkan Proyeksi Vokal)',
        color: 'text-amber-400',
        barColor: 'bg-amber-500',
        badge: 'Lirih',
      };
    }
    if (level <= 75) {
      return {
        label: 'Volume Sangat Baik & Optimal untuk Evaluasi AI',
        color: 'text-emerald-400',
        barColor: 'bg-emerald-500',
        badge: 'Optimal',
      };
    }
    return {
      label: 'Volume Cukup Lantang (Pastikan Tidak Terlalu Dekat)',
      color: 'text-sky-400',
      barColor: 'bg-sky-500',
      badge: 'Lantang',
    };
  };

  const volumeInfo = getVolumeStatus(micLevel);

  // Generate 16 responsive animated audio frequency bars based on micLevel
  const audioBars = Array.from({ length: 16 }).map((_, i) => {
    if (!isRecordingAudio || !isPracticing || isPaused) {
      return 6; // resting height
    }
    // Dynamic pseudo-frequency simulation based on micLevel and bar position
    const waveModifier = Math.sin((i / 15) * Math.PI) * 0.7 + 0.3;
    const randomized = Math.max(8, Math.min(100, micLevel * waveModifier * (0.8 + (i % 3) * 0.2)));
    return Math.round(randomized);
  });

  return (
    <div className="h-full flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* 1. HEADER KOKPIT: IDENTITAS PUISI ACUAN & STATUS MODE TEKS MANDIRI */}
      <div className="p-3 sm:p-4 bg-slate-950/80 border-b border-slate-800/80 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold mb-0.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Naskah Acuan Evaluasi AI</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 font-normal">Siswa Membaca Teks Fisik Mandiri</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight font-display flex items-center gap-2">
            <span>{poem.title}</span>
            <span className="text-xs font-normal text-slate-400 font-sans">
              karya {poem.poet}
            </span>
          </h2>
        </div>

        {/* Tombol Akses Referensi Naskah & Notasi */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPoemReference(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="Buka Pratinjau Bait Naskah Acuan"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Intip Teks Asli</span>
          </button>
          <button
            type="button"
            onClick={() => setShowProsodyGuide(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="Panduan Simbol Notasi Jeda"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Notasi Jeda</span>
          </button>
        </div>
      </div>

      {/* 2. BODY KOKPIT: AREA UTAMA FOKUS PEMBACAAN & PENGHAYATAN */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-4">
        {/* CARD A: LIVE AUDIO ACTIVITY & VISUALIZER GELOMBANG SUARA */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isRecordingAudio && isPracticing && !isPaused
                    ? 'bg-red-500 animate-ping'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                <span>Indikator Penangkapan Vokal IFP</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Intensitas:</span>
              <span className={`font-bold ${volumeInfo.color}`}>
                {isPracticing ? `${micLevel}%` : '0%'} ({volumeInfo.badge})
              </span>
            </div>
          </div>

          {/* Equalizer Frequency Bars Visualizer */}
          <div className="h-16 sm:h-20 w-full bg-slate-900/90 rounded-xl p-2.5 flex items-end justify-between gap-1 sm:gap-1.5 border border-slate-800">
            {audioBars.map((height, idx) => (
              <div
                key={idx}
                className="flex-1 rounded-t-sm transition-all duration-75"
                style={{
                  height: `${height}%`,
                  background:
                    height > 75
                      ? 'linear-gradient(to top, #059669, #10b981, #38bdf8)'
                      : height > 25
                      ? 'linear-gradient(to top, #059669, #10b981)'
                      : '#334155',
                }}
              />
            ))}
          </div>

          {/* Volume Status Prose */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className={`font-medium flex items-center gap-1.5 ${volumeInfo.color}`}>
              {micLevel > 10 ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{volumeInfo.label}</span>
            </span>

            <span className="text-slate-500 text-[11px] font-mono hidden sm:inline">
              Sample 48kHz · Echo Cancelled
            </span>
          </div>
        </div>

        {/* CARD B: PEWAKTU PENAMPILAN & STATUS PANGGUNG */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Box Durasi */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Clock
                className={`w-6 h-6 ${
                  isPracticing && !isPaused ? 'text-amber-400 animate-spin' : 'text-slate-400'
                }`}
                style={{ animationDuration: '6s' }}
              />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                Durasi Penampilan
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {formatTime(practiceDuration)}
              </div>
              <div className="text-[10px] text-slate-400">
                Target tempo ideal: 1m 30s – 2m 30s
              </div>
            </div>
          </div>

          {/* Box Status Panggung */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                isPracticing && !isPaused
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : isPaused
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {isPracticing && !isPaused ? (
                <Sparkles className="w-6 h-6 animate-pulse" />
              ) : isPaused ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                Status Sesi
              </div>
              <div className="text-base sm:text-lg font-bold text-white">
                {isPracticing && !isPaused
                  ? 'Sedang Membaca Puisi'
                  : isPaused
                  ? 'Penampilan Dijeda'
                  : 'Siap di Panggung'}
              </div>
              <div className="text-[10px] text-slate-400">
                {isPracticing && !isPaused
                  ? 'AI merekam audio & gestur wajah'
                  : 'Tekan Mulai saat siswa siap'}
              </div>
            </div>
          </div>
        </div>

        {/* CARD C: PANDUAN RUBRIK EVALUASI AKTIF (SMP 40/30/30) */}
        <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              <span>3 Pilar Penilaian AI (Kurikulum Merdeka)</span>
            </div>
            <button
              type="button"
              onClick={onOpenRubricModal}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-0.5"
            >
              <span>Detail Rubrik</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Pilar 1: Vokal */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Vokal & Lafal</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  Bobot 40%
                </span>
              </div>
              <ul className="text-[11px] text-slate-400 space-y-1">
                <li>• Kejelasan lafal vokal & konsonan</li>
                <li>• Ketepatan jeda rasa (/, //, ///)</li>
                <li>• Tempo stabil, tidak terburu-buru</li>
              </ul>
            </div>

            {/* Pilar 2: Penghayatan */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" />
                  <span>Penghayatan</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                  Bobot 30%
                </span>
              </div>
              <ul className="text-[11px] text-slate-400 space-y-1">
                <li>• Modulasi intonasi naik-turun</li>
                <li>• Penjiwaan makna & suasana bait</li>
                <li>• Penekanan pada kata kunci puisi</li>
              </ul>
            </div>

            {/* Pilar 3: Penampilan */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-sky-300 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Penampilan</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                  Bobot 30%
                </span>
              </div>
              <ul className="text-[11px] text-slate-400 space-y-1">
                <li>• Map naskah setinggi dada</li>
                <li>• Tatapan mata berkala ke audiens</li>
                <li>• Postur tubuh tegap & ekspresi mimik</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CARD D: TIPS TAKTIS PEMBACAAN DENGAN TEKS MANDIRI */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
          <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
            <HelpCircle className="w-4 h-4" />
            <span>Petunjuk Siswa saat Membawa Teks Fisik Sendiri</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">1.</span>
              <span>
                Pegang map/kertas setinggi dada di bawah dagu agar mulut tidak terhalang dan suara tertangkap jelas oleh mikrofon IFP.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">2.</span>
              <span>
                Saat jeda henti bait (///), angkat pandangan dan tatap ke arah kamera/penonton untuk memperkuat kharisma panggung.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TACTILE IFP QUICK ACTION FOOTER (Bisa ditekan langsung di panel) */}
      <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Selesai membaca? Tekan tombol oranye untuk mendapatkan penilaian AI.</span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {!isPracticing ? (
            <button
              type="button"
              onClick={onStart}
              className="h-11 sm:h-12 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all font-display flex-1 sm:flex-initial justify-center"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Mulai Pembacaan</span>
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  type="button"
                  onClick={onResume}
                  className="h-11 sm:h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Lanjutkan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPause}
                  className="h-11 sm:h-12 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 border border-slate-700 active:scale-95 transition-all"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Jeda</span>
                </button>
              )}

              <button
                type="button"
                onClick={onRestart}
                className="h-11 sm:h-12 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium border border-slate-700 active:scale-95 transition-all flex items-center gap-1"
                title="Mulai Ulang Sesi"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ulangi</span>
              </button>

              <button
                type="button"
                onClick={onFinish}
                className="h-11 sm:h-12 px-5 sm:px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all font-display"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Selesai & Analisis AI</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. MODAL DRAWER: REFERENSI TEKS ASLI & NOTASI (Jika Siswa/Guru Ingin Mengecek) */}
      {showPoemReference && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-40 p-4 sm:p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Naskah Acuan: {poem.title}
                </h3>
                <p className="text-xs text-slate-400">
                  karya {poem.poet} ({poem.theme})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPoemReference(false)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4 text-slate-200">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
              ℹ️ Siswa membaca teks dari kertas/map sendiri. Tampilan ini disediakan sebagai pembanding atau pengingat isi bait bagi guru dan siswa.
            </div>

            {poem.stanzas.map((stanza) => (
              <div
                key={stanza.stanzaNumber}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-bold text-amber-400 font-mono">
                    Bait {stanza.stanzaNumber}
                  </span>
                  <span>Suasana: {stanza.moodTheme}</span>
                </div>
                <div className="space-y-1.5 font-serif text-sm sm:text-base leading-relaxed text-slate-100">
                  {stanza.lines.map((line) => (
                    <div key={line.id} className="tracking-wide">
                      {line.rawText}
                    </div>
                  ))}
                </div>
                {stanza.voiceGuide && (
                  <div className="text-[11px] text-sky-400/90 pt-1 border-t border-slate-800/60 font-sans">
                    💡 Panduan Vokal: {stanza.voiceGuide}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
            <button
              type="button"
              onClick={() => setShowPoemReference(false)}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Tutup Referensi
            </button>
          </div>
        </div>
      )}

      {/* 5. MODAL DRAWER: PANDUAN NOTASI JEDA (/, //, ///) */}
      {showProsodyGuide && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-40 p-4 sm:p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Panduan Notasi Jeda Deklamasi (Prosodi)
                </h3>
                <p className="text-xs text-slate-400">
                  Standar Tanda Baca Vokal Bahasa Indonesia
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowProsodyGuide(false)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
              <span className="font-mono font-bold text-lg text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                /
              </span>
              <div>
                <strong className="text-emerald-300 block text-sm">
                  Jeda Pendek (± 0.5 detik)
                </strong>
                <p className="text-slate-400 mt-0.5">
                  Digunakan untuk memenggal frasa atau kata yang perlu dihela sejenak tanpa memutuskan alur makna. Jangan mengambil napas dalam-dalam di sini.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
              <span className="font-mono font-bold text-lg text-amber-400 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20">
                //
              </span>
              <div>
                <strong className="text-amber-300 block text-sm">
                  Jeda Sedang (± 1 detik)
                </strong>
                <p className="text-slate-400 mt-0.5">
                  Digunakan pada tanda koma, titik di tengah bait, atau pergantian pokok pikiran baris puisi. Ambil napas halus diafragma.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
              <span className="font-mono font-bold text-lg text-purple-400 px-2 py-1 bg-purple-500/10 rounded border border-purple-500/20">
                ///
              </span>
              <div>
                <strong className="text-purple-300 block text-sm">
                  Jeda Panjang / Henti Perenungan (± 2 detik)
                </strong>
                <p className="text-slate-400 mt-0.5">
                  Digunakan di akhir bait sebelum berpindah ke bait berikutnya. Ini adalah saat emas untuk menatap penonton/kamera dan membiarkan makna meresap.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
            <button
              type="button"
              onClick={() => setShowProsodyGuide(false)}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Kembali ke Kokpit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
