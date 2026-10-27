import React from 'react';
import {
  BADGES,
  BadgeId,
  GordouState,
  MinigameId,
  calculateWeightProgress,
  getBadgeProgress,
} from '../game/rules';

export interface MinigameSummary {
  game: Exclude<MinigameId, 'none'>;
  score: number;
  weightLost: number;
  coinsEarned: number;
  xpEarned: number;
  reason: string;
}

export type StatusModalTab = 'status' | 'badges';

interface StatusModalProps {
  gameState: 'title' | 'playing' | 'paused' | 'gameover';
  gordouState: GordouState;
  minigameSummary: MinigameSummary | null;
  showGoalVictoryModal: boolean;
  activeTab: StatusModalTab;
  onSelectTab: (tab: StatusModalTab) => void;
  onResume: () => void;
  onRestartChallenge: (multiplier: number, startWeight: number) => void;
  onReturnToTitle: () => void;
  onCloseMinigameSummary: () => void;
  onContinueFreePlay: () => void;
}

function renderBadgeSvg(id: BadgeId, unlocked: boolean, color: string) {
  const strokeColor = unlocked ? '#0F172A' : '#475569';
  const fillColor = unlocked ? color : '#334155';

  switch (id) {
    case 'first_10kg':
      return (
        <svg viewBox="0 0 36 36" className="w-8 h-8 shrink-0">
          <path d="M11 3h14l-3 9H14L11 3z" fill={unlocked ? '#EF4444' : '#475569'} stroke={strokeColor} strokeWidth="2" />
          <circle cx="18" cy="21" r="11" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" />
          <text x="18" y="24.5" textAnchor="middle" fontSize="9.5" fontWeight="900" fill={unlocked ? '#052E16' : '#94A3B8'}>
            -10kg
          </text>
        </svg>
      );
    case 'constant_trainer':
      return (
        <svg viewBox="0 0 36 36" className="w-8 h-8 shrink-0">
          <circle cx="18" cy="18" r="14" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" />
          <rect x="7" y="14" width="4" height="8" rx="1.5" fill={unlocked ? '#0F172A' : '#64748B'} />
          <rect x="25" y="14" width="4" height="8" rx="1.5" fill={unlocked ? '#0F172A' : '#64748B'} />
          <rect x="11" y="16.5" width="14" height="3" fill={unlocked ? '#0F172A' : '#64748B'} />
        </svg>
      );
    case 'clothes_collector':
      return (
        <svg viewBox="0 0 36 36" className="w-8 h-8 shrink-0">
          <circle cx="18" cy="18" r="14" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" />
          <path
            d="M13 11l3 2h4l3-2 4 4-3 3-1-1v9H13v-9l-1 1-3-3 4-4z"
            fill={unlocked ? '#0F172A' : '#94A3B8'}
          />
        </svg>
      );
    case 'healthy_chef':
      return (
        <svg viewBox="0 0 36 36" className="w-8 h-8 shrink-0">
          <circle cx="18" cy="18" r="14" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" />
          <path
            d="M18 11c3.5 0 6 2.5 6 6.5 0 4.5-4 8.5-6 8.5s-6-4-6-8.5c0-4 2.5-6.5 6-6.5z"
            fill={unlocked ? '#052E16' : '#94A3B8'}
          />
        </svg>
      );
    case 'clean_freak':
      return (
        <svg viewBox="0 0 36 36" className="w-8 h-8 shrink-0">
          <circle cx="18" cy="18" r="14" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" />
          <path
            d="M18 9l2.4 5.6L26 17l-5.6 2.4L18 25l-2.4-5.6L10 17l5.6-2.4L18 9z"
            fill={unlocked ? '#082F49' : '#94A3B8'}
          />
        </svg>
      );
    case 'champion_65kg':
      return (
        <svg viewBox="0 0 36 36" className="w-8 h-8 shrink-0">
          <circle cx="18" cy="18" r="14" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" />
          <path
            d="M12 11h12v5c0 3.3-2.7 6-6 6s-6-2.7-6-6v-5zm4 13h4v3h-4v-3z"
            fill={unlocked ? '#0F172A' : '#94A3B8'}
          />
        </svg>
      );
  }
}

export const StatusModal: React.FC<StatusModalProps> = ({
  gameState,
  gordouState,
  minigameSummary,
  showGoalVictoryModal,
  activeTab,
  onSelectTab,
  onResume,
  onRestartChallenge,
  onReturnToTitle,
  onCloseMinigameSummary,
  onContinueFreePlay,
}) => {
  // 1. 65.0 kg Goal Reached Victory Screen!
  if (showGoalVictoryModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pointer-events-auto">
        <dialog
          open
          aria-label="Victoria Meta 65 kg Alcanzada"
          className="w-full max-w-md rounded-3xl border-4 border-[#FACC15] bg-[#1E293B] text-white p-6 shadow-[0_12px_0_#0F172A] flex flex-col items-center text-center gap-4 m-0"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#FACC15] text-[#0F172A] flex items-center justify-center font-display font-black text-3xl border-3 border-[#0F172A]">
            🏆
          </div>
          <h2 className="font-display font-black text-3xl text-[#FACC15] stroke-title">
            ¡META 65.0 KG LOGRADA!
          </h2>
          <p className="text-sm text-slate-200">
            ¡Increíble trabajo! Llevaste a Gordou a su peso saludable de{' '}
            <span className="font-black text-[#10B981] tabular-nums">
              {gordouState.weight.toFixed(1)} kg
            </span>{' '}
            y desbloqueaste el atuendo exclusivo <strong>Gordou Campeón Dorado</strong> y su
            Trofeo 3D.
          </p>

          <div className="grid grid-cols-3 gap-2 w-full">
            <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block">PESO FINAL</span>
              <span className="font-display font-black text-lg text-[#10B981] tabular-nums">
                {gordouState.weight.toFixed(1)} kg
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block">FITCOINS</span>
              <span className="font-display font-black text-lg text-[#FACC15] tabular-nums">
                {Math.round(gordouState.coins)}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block">NIVEL</span>
              <span className="font-display font-black text-lg text-white tabular-nums">
                {gordouState.level}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 w-full mt-1">
            <button
              type="button"
              data-start="true"
              onClick={onContinueFreePlay}
              className="w-full min-h-[50px] rounded-2xl bg-[#10B981] text-[#052E16] font-display font-black text-base border-3 border-[#0F172A] shadow-[0_5px_0_#0F172A] active:scale-95 cursor-pointer"
            >
              Seguir en Modo Libre (Con Atuendo Dorado)
            </button>
            <button
              type="button"
              onClick={() => onRestartChallenge(2, 120.0)}
              className="w-full min-h-[48px] rounded-2xl bg-[#FACC15] text-[#0F172A] font-display font-black text-sm border-3 border-[#0F172A] active:scale-95 cursor-pointer"
            >
              Nuevo Reto 120 kg (Multiplicador 2x FitCoins)
            </button>
          </div>
        </dialog>
      </div>
    );
  }

  // 2. Minigame Completed Summary Card
  if (gameState === 'gameover' && minigameSummary) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
        <dialog
          open
          aria-label="Resumen de Entrenamiento 3D"
          className="w-full max-w-sm rounded-3xl border-4 border-[#0F172A] bg-[#1E293B] text-white p-5 shadow-[0_10px_0_#0F172A] flex flex-col items-center text-center gap-4 m-0"
        >
          <h2 className="font-display font-black text-2xl text-[#10B981]">
            ¡ENTRENAMIENTO COMPLETADO!
          </h2>
          <p className="text-xs text-slate-300">{minigameSummary.reason}</p>

          <div className="grid grid-cols-3 gap-2 w-full">
            <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block">PUNTOS</span>
              <span className="font-display font-black text-xl text-white tabular-nums">
                {minigameSummary.score}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block">QUEMADO</span>
              <span className="font-display font-black text-xl text-[#10B981] tabular-nums">
                -{minigameSummary.weightLost.toFixed(1)} kg
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block">MONEDAS</span>
              <span className="font-display font-black text-xl text-[#FACC15] tabular-nums">
                +{minigameSummary.coinsEarned}
              </span>
            </div>
          </div>

          <button
            type="button"
            data-start="true"
            onClick={onCloseMinigameSummary}
            className="w-full min-h-[50px] rounded-2xl bg-[#10B981] text-[#052E16] font-display font-black text-base border-3 border-[#0F172A] shadow-[0_5px_0_#0F172A] active:scale-95 cursor-pointer"
          >
            ¡Genial! Volver al Gimnasio
          </button>
        </dialog>
      </div>
    );
  }

  // 3. Status & Achievements (Badges) Modal
  if (gameState === 'paused') {
    const unlockedCount = (gordouState.unlockedBadges ?? []).length;
    const totalBadges = BADGES.length;
    const kgLost = Math.max(
      0,
      Number(((gordouState.startWeight || 110) - gordouState.weight).toFixed(1))
    );
    const weightPct = calculateWeightProgress(gordouState.weight, gordouState.startWeight);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 pointer-events-auto">
        <dialog
          open
          aria-label="Modal de Estado y Logros"
          className="w-full max-w-md rounded-3xl border-4 border-[#0F172A] bg-[#1E293B] text-white p-4 sm:p-5 shadow-[0_10px_0_#0F172A] flex flex-col gap-3.5 m-0 max-h-[90dvh]"
        >
          {/* Header + Close button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#FACC15] leading-none">
                {activeTab === 'badges' ? 'MEDALLAS Y LOGROS' : 'ESTADO DE GORDOU'}
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                Nivel {gordouState.level} · {unlockedCount}/{totalBadges} medallas obtenidas
              </p>
            </div>
            <button
              type="button"
              onClick={onResume}
              aria-label="Cerrar modal de estado"
              className="min-w-[38px] min-h-[38px] rounded-xl bg-slate-800 text-slate-200 font-black text-sm border-2 border-[#0F172A] active:scale-95 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Segmented Tab Switcher: Estado vs Logros (Badges) */}
          <div
            role="tablist"
            aria-label="Pestañas del modal de estado"
            className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-900 border-2 border-[#0F172A]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'status'}
              onClick={() => onSelectTab('status')}
              className={`min-h-[40px] rounded-xl font-display font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'status'
                  ? 'bg-[#FF6B35] text-white border-2 border-[#0F172A] shadow-[0_2px_0_#0F172A]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>📊 Estado</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'badges'}
              onClick={() => onSelectTab('badges')}
              className={`min-h-[40px] rounded-xl font-display font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'badges'
                  ? 'bg-[#FACC15] text-[#0F172A] border-2 border-[#0F172A] shadow-[0_2px_0_#0F172A]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🏅 Logros ({unlockedCount}/{totalBadges})</span>
            </button>
          </div>

          {/* TAB 1: ESTADO GENERAL */}
          {activeTab === 'status' ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2 w-full text-center">
                <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block">PESO ACTUAL</span>
                  <span className="font-display font-black text-lg text-[#FACC15] tabular-nums">
                    {gordouState.weight.toFixed(1)} kg
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block">META SALUD</span>
                  <span className="font-display font-black text-lg text-[#10B981] tabular-nums">
                    65.0 kg
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block">FITCOINS</span>
                  <span className="font-display font-black text-lg text-white tabular-nums">
                    {Math.round(gordouState.coins)}
                  </span>
                </div>
              </div>

              {/* Weight & Workout Summary Card */}
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span className="text-slate-300">Progreso hacia 65.0 kg</span>
                  <span className="text-[#10B981] tabular-nums">
                    -{kgLost.toFixed(1)} kg perdidos ({weightPct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-[#10B981] transition-all duration-300"
                    style={{ width: `${weightPct}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1 text-center text-[11px] font-bold text-slate-300">
                  <div className="bg-slate-800/80 rounded-xl py-1.5 px-2">
                    🏋️ Entrenos: <strong className="text-white">{gordouState.workoutsCompleted ?? 0}</strong>
                  </div>
                  <div className="bg-slate-800/80 rounded-xl py-1.5 px-2">
                    🥗 Sano: <strong className="text-white">{gordouState.healthyMealsEaten ?? 0}</strong>
                  </div>
                  <div className="bg-slate-800/80 rounded-xl py-1.5 px-2">
                    👕 Ropa: <strong className="text-white">{gordouState.unlockedCosmetics.length}</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  onClick={onResume}
                  className="w-full min-h-[46px] rounded-2xl bg-[#10B981] text-[#052E16] font-display font-black text-base border-3 border-[#0F172A] active:scale-95 cursor-pointer"
                >
                  Continuar Jugando
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onRestartChallenge(1, 110.0)}
                    className="w-full min-h-[42px] rounded-2xl bg-slate-800 text-slate-200 font-bold text-xs border-2 border-[#0F172A] active:scale-95 cursor-pointer"
                  >
                    Reiniciar (110 kg)
                  </button>
                  <button
                    type="button"
                    onClick={onReturnToTitle}
                    className="w-full min-h-[42px] rounded-2xl bg-slate-900 text-slate-300 font-bold text-xs border-2 border-[#0F172A] active:scale-95 cursor-pointer"
                  >
                    Pantalla de Título
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: LOGROS Y MEDALLAS ('Badges') */
            <div className="flex flex-col gap-2.5 min-h-0">
              <div className="max-h-[48dvh] overflow-y-auto pr-1 flex flex-col gap-2">
                {BADGES.map((badge) => {
                  const prog = getBadgeProgress(gordouState, badge);
                  return (
                    <div
                      key={badge.id}
                      data-testid={`badge-card-${badge.id}`}
                      className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                        prog.unlocked
                          ? 'bg-slate-900 border-[#FACC15] shadow-[0_3px_0_#0F172A]'
                          : 'bg-slate-900/75 border-slate-800'
                      }`}
                    >
                      {/* Medal SVG Emblem */}
                      <div
                        className={`w-12 h-12 rounded-2xl border-2 border-[#0F172A] flex items-center justify-center shrink-0 ${
                          prog.unlocked ? 'bg-slate-800' : 'bg-slate-950 opacity-75'
                        }`}
                      >
                        {renderBadgeSvg(badge.id, prog.unlocked, badge.color)}
                      </div>

                      {/* Badge Details & Progress Bar */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-display font-black text-xs sm:text-sm text-white truncate">
                            {badge.title}
                          </h3>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg shrink-0 ${
                              prog.unlocked
                                ? 'bg-[#10B981] text-[#052E16]'
                                : 'bg-slate-800 text-[#FACC15]'
                            }`}
                          >
                            {prog.unlocked ? '¡DESBLOQUEADO!' : `+${badge.rewardCoins} $`}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                          {badge.description}
                        </p>

                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                            <div
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${prog.percent}%`,
                                backgroundColor: prog.unlocked ? '#10B981' : badge.color,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-mono-num font-extrabold text-slate-300 tabular-nums shrink-0">
                            {prog.current}/{prog.target} {badge.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onResume}
                className="w-full min-h-[46px] rounded-2xl bg-[#10B981] text-[#052E16] font-display font-black text-base border-3 border-[#0F172A] active:scale-95 cursor-pointer"
              >
                Continuar Jugando
              </button>
            </div>
          )}
        </dialog>
      </div>
    );
  }

  return null;
};
