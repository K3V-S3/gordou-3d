import React from 'react';
import {
  GordouState,
  MinigameId,
  TARGET_WEIGHT,
  calculateWeightProgress,
} from '../game/rules';

interface TopHudProps {
  state: GordouState;
  activeMinigame: MinigameId;
  mgScore: number;
  mgCombo: number;
  mgTimeLeft: number;
  muted: boolean;
  isRecordingVoice: boolean;
  isPlayingPouVoice: boolean;
  onToggleMic: () => void;
  onOpenCoach: () => void;
  onOpenBadges: () => void;
  onToggleMute: () => void;
  onPauseToggle: () => void;
  onExitMinigame: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  state,
  activeMinigame,
  mgScore,
  mgCombo,
  mgTimeLeft,
  muted,
  isRecordingVoice,
  isPlayingPouVoice,
  onToggleMic,
  onOpenCoach,
  onOpenBadges,
  onToggleMute,
  onPauseToggle,
  onExitMinigame,
}) => {
  const progressPct = calculateWeightProgress(state.weight, state.startWeight);
  const fatBurnerActive = state.fatBurnerUntil > Date.now();
  const unlockedBadgesCount = (state.unlockedBadges ?? []).length;

  const stats = [
    {
      id: 'hunger',
      label: 'HAMBRE',
      value: Math.round(state.hunger),
      color: '#22C55E',
      icon: (
        <path
          d="M12 4c2.5 0 4.5 1.8 4.5 4.5 0 3.8-3.2 7.5-4.5 7.5S7.5 12.3 7.5 8.5C7.5 5.8 9.5 4 12 4zm0-2c-1 0-1.8.8-1.8 1.8S11 5.5 12 5.5s1.8-.8 1.8-1.7S13 2 12 2z"
          fill="currentColor"
        />
      ),
    },
    {
      id: 'health',
      label: 'SALUD',
      value: Math.round(state.health),
      color: '#EF4444',
      icon: (
        <path
          d="M12 20.5l-1.4-1.3C5.4 14.5 2 11.4 2 7.6 2 4.5 4.4 2 7.5 2c1.7 0 3.4.8 4.5 2.1C13.1 2.8 14.8 2 16.5 2 19.6 2 22 4.5 22 7.6c0 3.8-3.4 6.9-8.6 11.6L12 20.5z"
          fill="currentColor"
        />
      ),
    },
    {
      id: 'energy',
      label: 'ENERGÍA',
      value: Math.round(state.energy),
      color: '#FACC15',
      icon: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" />,
    },
    {
      id: 'hygiene',
      label: 'HIGIENE',
      value: Math.round(state.hygiene),
      color: '#38BDF8',
      icon: (
        <path
          d="M12 2l2.2 5.3L19.5 9l-5.3 2.2L12 16.5l-2.2-5.3L4.5 9l5.3-1.7L12 2zm6 13l1.1 2.4L21.5 18l-2.4 1.1L18 21.5l-1.1-2.4L14.5 18l2.4-.6L18 15z"
          fill="currentColor"
        />
      ),
    },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-20 pointer-events-none p-2 sm:p-3.5 flex flex-col gap-1.5 max-w-2xl mx-auto">
      {/* Row 1: Primary Weight Readout + Coins/Level + Utility Square Buttons */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Left Perimeter Cluster: Weight & Progress to 65 kg + FitCoins */}
        <div
          className="pointer-events-auto flex items-center gap-2 sm:gap-3 px-2.5 py-1.5 rounded-2xl border-2 border-[#0F172A] shadow-[0_4px_0_#0F172A] min-w-0"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] sm:text-[10px] font-extrabold tracking-wider text-slate-400 uppercase whitespace-nowrap">
                META {TARGET_WEIGHT} KG
              </span>
              {state.sweatLevel > 50 && (
                <span
                  data-testid="hud-sweat-badge"
                  title={`Nivel de sudor: ${Math.round(state.sweatLevel)}% (Usa la ducha en el Baño)`}
                  className="text-[8.5px] font-extrabold text-[#38BDF8] whitespace-nowrap"
                >
                  · 💦 {Math.round(state.sweatLevel)}%
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span
                data-testid="hud-weight-kg"
                className="font-display font-black text-xl sm:text-3xl leading-none text-[#FACC15] tabular-nums stroke-title"
              >
                {state.weight.toFixed(1)}
              </span>
              <span className="text-[11px] font-extrabold text-slate-300">kg</span>
              {fatBurnerActive && (
                <span className="text-[9px] font-extrabold text-[#10B981]">2X</span>
              )}
            </div>
            {/* Weight Goal Bar */}
            <div className="w-20 sm:w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700">
              <div
                className="h-full bg-[#10B981] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="h-8 w-[1px] bg-slate-700 shrink-0" />

          {/* FitCoins & Level */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <div className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#FACC15] shrink-0">
                <circle cx="12" cy="12" r="10" fill="currentColor" stroke="#0F172A" strokeWidth="2" />
                <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="900" fill="#0F172A">
                  $
                </text>
              </svg>
              <span
                data-testid="hud-coins"
                className="font-mono-num font-extrabold text-xs sm:text-base text-white tabular-nums"
              >
                {Math.round(state.coins)}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 tabular-nums whitespace-nowrap">
              NVL {state.level} · {progressPct}%
            </span>
          </div>
        </div>

        {/* Right Perimeter Cluster: Pou Mic, Coach IA, Logros, Mute [M], Pause [P] */}
        <div className="pointer-events-auto flex items-center gap-1 shrink-0">
          {/* Interactive Pou Microphone Button */}
          <button
            type="button"
            onClick={onToggleMic}
            aria-label={isRecordingVoice ? 'Detener micrófono Pou' : 'Repetir voz como Pou'}
            className={`min-w-[36px] sm:min-w-[42px] min-h-[40px] sm:min-h-[44px] px-1.5 sm:px-2.5 rounded-xl border-2 border-[#0F172A] shadow-[0_3px_0_#0F172A] flex items-center justify-center gap-1 font-extrabold text-xs transition-transform active:scale-95 cursor-pointer ${
              isRecordingVoice
                ? 'bg-[#EF4444] text-white'
                : isPlayingPouVoice
                  ? 'bg-[#10B981] text-[#052E16]'
                  : 'bg-[#FF6B35] text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            <span className="hidden md:inline whitespace-nowrap">
              {isRecordingVoice ? 'Escuchando...' : isPlayingPouVoice ? 'Hablando...' : 'Voz Pou'}
            </span>
          </button>

          {/* Gemini Coach IA Button */}
          <button
            type="button"
            onClick={onOpenCoach}
            aria-label="Abrir Coach Nutricional IA"
            className="min-w-[36px] sm:min-w-[42px] min-h-[40px] sm:min-h-[44px] px-1.5 sm:px-2.5 rounded-xl border-2 border-[#0F172A] shadow-[0_3px_0_#0F172A] bg-[#38BDF8] text-[#082F49] flex items-center justify-center gap-1 font-extrabold text-xs transition-transform active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z" />
            </svg>
            <span className="hidden md:inline whitespace-nowrap">Coach IA</span>
          </button>

          {/* Logros / Medallas Button */}
          <button
            type="button"
            onClick={onOpenBadges}
            aria-label="Ver Logros y Medallas"
            className="min-w-[36px] sm:min-w-[42px] min-h-[40px] sm:min-h-[44px] px-1.5 sm:px-2 rounded-xl border-2 border-[#0F172A] shadow-[0_3px_0_#0F172A] bg-[#FACC15] text-[#0F172A] flex items-center justify-center gap-1 font-extrabold text-xs transition-transform active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
              <path d="M12 8c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 9l-2.5 1.5.65-2.81-2.18-1.89 2.88-.25L12 11l1.15 2.55 2.88.25-2.18 1.89.65 2.81L12 17zm-4-15h8l-2 5h-4L8 2z" />
            </svg>
            <span className="font-mono-num text-[11px] font-black tabular-nums">
              {unlockedBadgesCount}
            </span>
          </button>

          {/* Mute Toggle [M] */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
            className="min-w-[36px] sm:min-w-[42px] min-h-[40px] sm:min-h-[44px] rounded-xl border-2 border-[#0F172A] shadow-[0_3px_0_#0F172A] flex items-center justify-center text-white transition-transform active:scale-95 cursor-pointer"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
          >
            {muted ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-400">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#FACC15]">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>

          {/* Pause Button [P] */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPauseToggle();
            }}
            aria-label="Pausar juego"
            className="min-w-[36px] sm:min-w-[42px] min-h-[40px] sm:min-h-[44px] rounded-xl border-2 border-[#0F172A] shadow-[0_3px_0_#0F172A] flex items-center justify-center text-white transition-transform active:scale-95 cursor-pointer"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Row 2: 4 Compact Stat Sockets OR Active Minigame Scoreboard */}
      {activeMinigame === 'none' ? (
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {stats.map((st) => (
            <div
              key={st.id}
              className="px-2 py-1.5 rounded-xl border-2 border-[#0F172A] flex flex-col gap-1"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
            >
              <div className="flex items-center justify-between gap-0.5">
                <div className="flex items-center gap-1 min-w-0">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0"
                    style={{ color: st.color }}
                  >
                    {st.icon}
                  </svg>
                  <span className="text-[8.5px] sm:text-[10px] font-extrabold text-slate-200 whitespace-nowrap">
                    {st.label}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-black tabular-nums text-white">
                  {st.value}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${st.value}%`,
                    backgroundColor: st.value < 25 ? '#EF4444' : st.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="pointer-events-auto flex items-center justify-between px-4 py-2 rounded-2xl border-2 border-[#0F172A] shadow-[0_4px_0_#0F172A]"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
        >
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 block">PUNTOS</span>
              <span className="font-display font-black text-2xl text-[#10B981] tabular-nums">
                {mgScore}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 block">COMBO QUEMA</span>
              <span className="font-display font-black text-2xl text-[#FACC15] tabular-nums">
                x{mgCombo}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 block">TIEMPO</span>
              <span className="font-display font-black text-2xl text-white tabular-nums">
                {mgTimeLeft}s
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onExitMinigame}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#EF4444] text-white text-xs font-extrabold border-2 border-[#0F172A] active:scale-95 cursor-pointer whitespace-nowrap"
          >
            Terminar y Cobrar
          </button>
        </div>
      )}
    </div>
  );
};
