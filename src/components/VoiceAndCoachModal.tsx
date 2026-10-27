import React, { useState } from 'react';
import { GordouState, calculateVoicePitch } from '../game/rules';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface VoiceAndCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GordouState;
  lastTranscript: string;
  lastReaction: string;
  onSimulatePouVoice: (phrase: string) => void;
}

export const VoiceAndCoachModal: React.FC<VoiceAndCoachModalProps> = ({
  isOpen,
  onClose,
  state,
  lastTranscript,
  lastReaction,
  onSimulatePouVoice,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: `¡Hola! Soy Coach Fit Pou. Gordou pesa ahora ${state.weight.toFixed(1)} kg y nuestra meta es 65.0 kg. ¿Quieres una rutina rápida o consejo de comida?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickTip, setQuickTip] = useState<string>('');
  const [loadingTip, setLoadingTip] = useState(false);

  if (!isOpen) return null;

  const currentPitch = calculateVoicePitch(state.weight);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', text: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          stats: state,
        }),
      });
      const data = await resp.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: data.reply || '¡Sigue alimentando sano a Gordou y saltando la cuerda!',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: '¡Vamos con todo! Dale Brócoli o Pechuga Grill y juega Cardio Cuerda 3D.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestFastTip = async () => {
    if (loadingTip) return;
    setLoadingTip(true);
    try {
      const resp = await fetch('/api/gemini/quick-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: state.weight,
          hunger: state.hunger,
          health: state.health,
          energy: state.energy,
          hygiene: state.hygiene,
          action: 'consejo express',
        }),
      });
      const data = await resp.json();
      setQuickTip(data.tip || '¡Salta la cuerda 3D y toma agua pura!');
    } catch {
      setQuickTip('¡Alterna Pechuga Grill con Cardio Cuerda 3D para quemar grasa rápido!');
    } finally {
      setLoadingTip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
      <dialog
        open
        aria-label="Coach Fit IA y Voz Pou"
        className="w-full max-w-md rounded-3xl border-4 border-[#0F172A] bg-[#1E293B] text-white p-4 sm:p-5 shadow-[0_10px_0_#0F172A] flex flex-col gap-3 m-0"
      >
        <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
          <div>
            <h2 className="font-display font-black text-lg text-[#38BDF8]">
              Coach Fit IA & Voz Pou 3D
            </h2>
            <p className="text-[11px] text-slate-300">
              Tono actual de voz Pou: {currentPitch}x (según {state.weight.toFixed(1)} kg)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar Coach IA"
            className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-800 text-slate-200 font-black text-sm border-2 border-[#0F172A] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Pou Voice Lip-Sync + Audio Transcription Status */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#FACC15]">
              🎤 Repetidor de Voz Pou + Transcripción IA
            </span>
            <button
              type="button"
              onClick={() =>
                onSimulatePouVoice('¡Hola Gordou, vamos a bajar a sesenta y cinco kilos!')
              }
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#FF6B35] text-white text-[11px] font-extrabold cursor-pointer active:scale-95"
            >
              Probar Lip-Sync 3D
            </button>
          </div>
          {lastTranscript ? (
            <p className="text-xs text-slate-200">
              Transcripción: <span className="font-bold text-white">&ldquo;{lastTranscript}&rdquo;</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">
              Usa el botón &ldquo;Voz Pou&rdquo; arriba o prueba el Lip-Sync 3D aquí.
            </p>
          )}
          {lastReaction && (
            <p className="text-xs font-bold text-[#10B981]">Gordou: {lastReaction}</p>
          )}
        </div>

        {/* Low-latency Fast Tip (gemini-3.1-flash-lite) */}
        <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800">
          <p className="text-xs text-slate-200 flex-1">
            {quickTip || '¿Necesitas un consejo express de baja latencia?'}
          </p>
          <button
            type="button"
            onClick={handleRequestFastTip}
            disabled={loadingTip}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#10B981] text-[#052E16] text-xs font-extrabold shrink-0 cursor-pointer active:scale-95"
          >
            {loadingTip ? '...' : '⚡ Tip Flash'}
          </button>
        </div>

        {/* Multi-turn Chat Thread (gemini-3.8-flash) */}
        <div className="h-44 overflow-y-auto rounded-2xl bg-slate-900 p-3 flex flex-col gap-2 border border-slate-800">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#2563EB] text-white self-end max-w-[85%]'
                  : 'bg-slate-800 text-slate-100 self-start max-w-[90%]'
              }`}
            >
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="text-xs text-slate-400 italic">Coach Fit está pensando...</div>
          )}
        </div>

        <form onSubmit={handleSendChat} className="flex items-center gap-2">
          <label htmlFor="coach-chat-input" className="sr-only">
            Pregunta al Coach Fit
          </label>
          <input
            id="coach-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej: ¿Qué le doy de cenar para quemar grasa?"
            className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-900 border-2 border-slate-700 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
          />
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] px-4 rounded-xl bg-[#38BDF8] text-[#082F49] font-extrabold text-xs border-2 border-[#0F172A] cursor-pointer active:scale-95"
          >
            Enviar
          </button>
        </form>
      </dialog>
    </div>
  );
};
