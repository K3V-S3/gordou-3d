import React from 'react';

interface TitleScreenProps {
  startWeight: number;
  onSelectStartWeight: (kg: number) => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  startWeight,
  onSelectStartWeight,
  onStartGame,
}) => {
  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-5 sm:p-8">
      {/* Upper Negative-Space Title Lockup */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center pt-2 pointer-events-auto">
        <svg
          viewBox="0 0 420 115"
          className="w-full max-w-[350px] h-auto drop-shadow-[0_6px_0_rgba(15,23,42,0.95)]"
          role="img"
          aria-label="Gordou 3D Mascota Fitness"
        >
          <defs>
            <linearGradient id="gordouGold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="55%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>
          {/* Diegetic Dumbbell Emblem Backing */}
          <rect x="26" y="36" width="24" height="44" rx="8" fill="#334155" stroke="#0F172A" strokeWidth="4" />
          <rect x="370" y="36" width="24" height="44" rx="8" fill="#334155" stroke="#0F172A" strokeWidth="4" />
          <rect x="48" y="20" width="324" height="76" rx="26" fill="#1E293B" stroke="#0F172A" strokeWidth="5" />
          <rect x="54" y="26" width="312" height="64" rx="20" fill="#0F172A" />
          {/* Main Display Title */}
          <text
            x="210"
            y="69"
            textAnchor="middle"
            fontFamily="Outfit, sans-serif"
            fontWeight="900"
            fontSize="46"
            letterSpacing="2"
            fill="url(#gordouGold)"
            stroke="#0F172A"
            strokeWidth="7"
            paintOrder="stroke fill"
          >
            GORDOU 3D
          </text>
          {/* Subtitle Crest */}
          <rect x="125" y="82" width="170" height="24" rx="12" fill="#10B981" stroke="#0F172A" strokeWidth="3.5" />
          <text
            x="210"
            y="98"
            textAnchor="middle"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="800"
            fontSize="11.5"
            letterSpacing="1.5"
            fill="#052E16"
          >
            META SALUDABLE: 65 KG
          </text>
        </svg>
      </div>

      {/* Center Unobstructed 3D Hero Showcase Zone (Gordou is visible and interactive here) */}
      <div className="flex-1" />

      {/* Bottom Action & Single Flat Control Hint Line */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 pb-2 pointer-events-auto">
        {/* Starting Weight Mode Selector */}
        <div
          className="flex items-center gap-2 p-1.5 rounded-2xl border-2 border-[#0F172A]"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          role="group"
          aria-label="Seleccionar peso inicial"
        >
          <button
            type="button"
            onClick={() => onSelectStartWeight(110.0)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-extrabold transition-transform active:scale-95 whitespace-nowrap ${
              startWeight === 110.0
                ? 'bg-[#10B981] text-[#052E16]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Modo Clásico · 110.0 kg
          </button>
          <button
            type="button"
            onClick={() => onSelectStartWeight(120.0)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-extrabold transition-transform active:scale-95 whitespace-nowrap ${
              startWeight === 120.0
                ? 'bg-[#FF6B35] text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Reto Extremo · 120.0 kg
          </button>
        </div>

        {/* Primary CTA with mandatory data-start="true" */}
        <button
          type="button"
          data-start="true"
          onClick={onStartGame}
          className="w-full max-w-[320px] min-h-[56px] py-3.5 px-6 rounded-2xl bg-[#10B981] hover:bg-[#059669] active:scale-95 text-[#052E16] font-display font-black text-xl tracking-wide border-b-4 border-[#047857] shadow-[0_8px_0_#0F172A] transition-all cursor-pointer whitespace-nowrap"
        >
          ¡JUGAR AHORA!
        </button>

        {/* Single flat borderless control hint line */}
        <p className="text-xs font-extrabold text-white tracking-wide text-center drop-shadow-[0_2px_3px_rgba(15,23,42,0.98)]">
          Toca Barriga · Arrastra Comida · WASD / Flechas Minijuegos · P Pausa
        </p>
      </div>
    </div>
  );
};
