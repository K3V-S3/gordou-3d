/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BadgeDefinition,
  FoodItem,
  GymExercise,
  GordouState,
  INITIAL_WEIGHT,
  MinigameId,
  PotionItem,
  RoomId,
  WardrobeItem,
  applyExerciseToState,
  applyFoodToState,
  calculateMinigameRewards,
  calculateVoicePitch,
  checkGoalReached,
  clampStat,
  clampWeight,
  createInitialGordouState,
  evaluateBadges,
} from './game/rules';
import { GordouCanvas3D } from './components/GordouCanvas3D';
import { TitleScreen } from './components/TitleScreen';
import { TopHud } from './components/TopHud';
import { BottomDock } from './components/BottomDock';
import { VoiceAndCoachModal } from './components/VoiceAndCoachModal';
import { MinigameSummary, StatusModal, StatusModalTab } from './components/StatusModal';
import { sound } from './utils/sound';

const STORAGE_KEY = 'gordou_3d_save_v1';

interface FloatingTextItem {
  id: number;
  text: string;
  color: string;
}

function loadSavedState(): GordouState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialGordouState(INITIAL_WEIGHT);
    const parsed = JSON.parse(raw) as GordouState;
    if (typeof parsed.weight !== 'number') return createInitialGordouState(INITIAL_WEIGHT);

    // Apply gentle offline time degradation (capped so Gordou is never broken)
    const elapsedMinutes = Math.min(
      60,
      Math.max(0, (Date.now() - (parsed.lastSavedAt || Date.now())) / 60000)
    );
    const decay = Math.floor(elapsedMinutes * 0.4);
    const base = createInitialGordouState(parsed.startWeight || INITIAL_WEIGHT);
    return {
      ...base,
      ...parsed,
      workoutsCompleted: parsed.workoutsCompleted ?? 0,
      healthyMealsEaten: parsed.healthyMealsEaten ?? 0,
      unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : [],
      hunger: clampStat((parsed.hunger ?? 78) - decay),
      hygiene: clampStat((parsed.hygiene ?? 88) - decay),
      energy: parsed.isSleeping
        ? clampStat((parsed.energy ?? 85) + decay * 2)
        : clampStat((parsed.energy ?? 85) - Math.floor(decay * 0.5)),
      lastSavedAt: Date.now(),
    };
  } catch {
    return createInitialGordouState(INITIAL_WEIGHT);
  }
}

export default function App() {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>(
    isAutostart ? 'playing' : 'title'
  );
  const [gordouState, setGordouState] = useState<GordouState>(() => loadSavedState());
  const [statusModalTab, setStatusModalTab] = useState<StatusModalTab>('status');
  const [activeMinigame, setActiveMinigame] = useState<MinigameId>('none');
  const [mgScore, setMgScore] = useState(0);
  const [mgCombo, setMgCombo] = useState(0);
  const [mgTimeLeft, setMgTimeLeft] = useState(25);
  const [minigameSummary, setMinigameSummary] = useState<MinigameSummary | null>(null);
  const [showGoalVictoryModal, setShowGoalVictoryModal] = useState(false);

  const [activeBathTool, setActiveBathTool] = useState<'none' | 'soap' | 'shower'>('none');
  const [workoutAnim, setWorkoutAnim] = useState<'none' | 'dumbbells' | 'squats'>('none');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [coachModalOpen, setCoachModalOpen] = useState(false);

  // Pou Interactive Microphone & Lip-Sync State
  const [mouthOpenness, setMouthOpenness] = useState(0);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isPlayingPouVoice, setIsPlayingPouVoice] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastReaction, setLastReaction] = useState('');
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);

  // Floating feedback texts (-0.5 kg, +15 FitCoins, etc.)
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const floatIdRef = useRef(1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const spawnFloatingText = useCallback((text: string, color = '#10B981') => {
    const id = floatIdRef.current++;
    setFloatingTexts((prev) => [...prev.slice(-4), { id, text, color }]);
    window.setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 1250);
  }, []);

  const announceUnlockedBadges = useCallback(
    (badges: BadgeDefinition[]) => {
      if (badges.length === 0) return;
      sound.playVictoryFanfare();
      badges.forEach((b) => {
        spawnFloatingText(`🏅 ¡Logro: ${b.title}! (+$${b.rewardCoins})`, '#FACC15');
      });
    },
    [spawnFloatingText]
  );

  // Mirror game state to document.body.dataset.state as required by game shell architecture
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Persist to localStorage automatically whenever gordouState changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...gordouState, lastSavedAt: Date.now() })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [gordouState]);

  // Periodic passive energy regeneration when sleeping or shower rinsing
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = window.setInterval(() => {
      setGordouState((prev) => {
        if (prev.isSleeping && prev.room === 'dormitorio') {
          sound.playSnore();
          return {
            ...prev,
            energy: clampStat(prev.energy + 5),
            health: clampStat(prev.health + 1),
          };
        }
        return prev;
      });
    }, 3000);
    return () => window.clearInterval(interval);
  }, [gameState]);

  // Shower water rinsing effect when activeBathTool === 'shower'
  useEffect(() => {
    if (activeBathTool !== 'shower') return;
    sound.playShower();
    const timer = window.setTimeout(() => {
      const rinsed: GordouState = {
        ...gordouState,
        hygiene: 100,
        sweatLevel: 0,
        soapBubbles: 0,
        happiness: clampStat(gordouState.happiness + 10),
      };
      const evaluated = evaluateBadges(rinsed);
      setGordouState(evaluated.nextState);
      spawnFloatingText('+100% Higiene ¡Limpio!', '#38BDF8');
      announceUnlockedBadges(evaluated.newlyUnlocked);
      setActiveBathTool('none');
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [activeBathTool, announceUnlockedBadges, gordouState, spawnFloatingText]);

  const handleStartGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.dataset.state = 'playing';
    setGameState('playing');
    sound.playTap();
  }, []);

  // Global keyboard shortcuts (Enter/Space on Title, P/Escape for Pause, M for Mute, H for Dock)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (gameState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleStartGame();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') {
          setStatusModalTab('status');
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      } else if (e.code === 'KeyM') {
        setMuted((m) => {
          sound.muted = !m;
          return !m;
        });
      } else if (e.code === 'KeyH' && gameState === 'playing') {
        setDockCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, handleStartGame]);

  // Belly tap handler (bounce, laugh, hearts/happiness)
  const handleBellyTap = useCallback(() => {
    const pitch = calculateVoicePitch(gordouState.weight);
    sound.playLaugh(pitch);
    setGordouState((prev) => ({
      ...prev,
      happiness: clampStat(prev.happiness + 4),
    }));
    spawnFloatingText('¡Jajaja! +4 Felicidad ❤️', '#FACC15');
  }, [gordouState.weight, spawnFloatingText]);

  // Soap scrub handler in Baño
  const handleSoapScrub = useCallback(() => {
    sound.playBubble();
    const nextBubbles = Math.min(24, gordouState.soapBubbles + 3);
    const scrubbed: GordouState = {
      ...gordouState,
      soapBubbles: nextBubbles,
      hygiene: clampStat(gordouState.hygiene + 6),
      sweatLevel: Math.max(0, gordouState.sweatLevel - 10),
    };
    const evaluated = evaluateBadges(scrubbed);
    setGordouState(evaluated.nextState);
    spawnFloatingText('🫧 +Espuma 3D', '#38BDF8');
    announceUnlockedBadges(evaluated.newlyUnlocked);
  }, [announceUnlockedBadges, gordouState, spawnFloatingText]);

  // Feed or Buy Food in Cocina
  const handleFeedOrBuyFood = useCallback(
    (food: FoodItem, mode: 'eat' | 'buy') => {
      const stock = gordouState.inventory[food.id] ?? 0;
      if (mode === 'buy' || stock <= 0) {
        if (gordouState.coins < food.price) {
          sound.playHitHazard();
          spawnFloatingText('Faltan FitCoins ($)', '#EF4444');
          return;
        }
        sound.playCoin();
        setGordouState((prev) => ({
          ...prev,
          coins: prev.coins - food.price,
          inventory: {
            ...prev.inventory,
            [food.id]: (prev.inventory[food.id] ?? 0) + 1,
          },
        }));
        spawnFloatingText(`+1 ${food.name} (-$${food.price})`, '#FACC15');
        return;
      }

      // Eat food: launch 3D projectile into Gordou's mouth
      window.dispatchEvent(
        new CustomEvent('gordou-action', { detail: { type: 'feed', color: food.color } })
      );
      sound.playEat(food.category === 'healthy');

      const { nextState, weightChange, newlyUnlocked } = applyFoodToState(gordouState, food);
      const justReachedGoal = !gordouState.goalReached && nextState.goalReached;
      setGordouState(nextState);

      const sign = weightChange > 0 ? `+${weightChange.toFixed(1)}` : weightChange.toFixed(1);
      spawnFloatingText(
        `${sign} kg · ${food.name}`,
        weightChange < 0 ? '#10B981' : '#F97316'
      );
      announceUnlockedBadges(newlyUnlocked);

      if (justReachedGoal) {
        sound.playVictoryFanfare();
        setShowGoalVictoryModal(true);
      }
    },
    [announceUnlockedBadges, gordouState, spawnFloatingText]
  );

  // Trigger 3D Exercise in Gimnasio
  const handleTriggerExercise = useCallback(
    (ex: GymExercise) => {
      if (gordouState.energy < ex.energyCost) {
        sound.playHitHazard();
        spawnFloatingText('¡Poca energía! Duerme o toma Bebida Energética', '#EF4444');
        return;
      }
      setWorkoutAnim(ex.id);
      window.setTimeout(() => setWorkoutAnim('none'), 2200);

      sound.playJump();
      const { nextState, weightChange, coinsEarned, newlyUnlocked } = applyExerciseToState(
        gordouState,
        ex
      );
      const justReachedGoal = !gordouState.goalReached && nextState.goalReached;
      setGordouState(nextState);

      spawnFloatingText(
        `${weightChange.toFixed(1)} kg · +${coinsEarned} FitCoins`,
        '#10B981'
      );
      announceUnlockedBadges(newlyUnlocked);

      if (justReachedGoal) {
        sound.playVictoryFanfare();
        setShowGoalVictoryModal(true);
      }
    },
    [announceUnlockedBadges, gordouState, spawnFloatingText]
  );

  // Use Lab Potion
  const handleUsePotion = useCallback(
    (pot: PotionItem) => {
      if (gordouState.coins < pot.price) {
        sound.playHitHazard();
        spawnFloatingText('Faltan FitCoins para la poción', '#EF4444');
        return;
      }
      sound.playCoin();
      setGordouState((prev) => ({
        ...prev,
        coins: prev.coins - pot.price,
        energy: clampStat(prev.energy + pot.energyDelta),
        health: clampStat(prev.health + pot.healthDelta),
        hygiene: clampStat(prev.hygiene + pot.hygieneDelta),
        fatBurnerUntil: pot.activatesFatBurner ? Date.now() + 120000 : prev.fatBurnerUntil,
      }));
      spawnFloatingText(
        pot.activatesFatBurner ? '🔥 ¡Quemador 2x activo por 2 min!' : `✨ ${pot.name} aplicada`,
        pot.color
      );
    },
    [gordouState.coins, spawnFloatingText]
  );

  // Equip or buy 3D Cosmetic in Armario
  const handleEquipOrBuyCosmetic = useCallback(
    (item: WardrobeItem) => {
      const unlocked = gordouState.unlockedCosmetics.includes(item.id);
      if (!unlocked) {
        if (item.unlockAtGoal) {
          spawnFloatingText('Se desbloquea al llegar a 65.0 kg 🏆', '#FACC15');
          return;
        }
        if (gordouState.coins < item.price) {
          sound.playHitHazard();
          spawnFloatingText('Faltan FitCoins ($)', '#EF4444');
          return;
        }
        sound.playCoin();
        const purchased: GordouState = {
          ...gordouState,
          coins: gordouState.coins - item.price,
          unlockedCosmetics: [...gordouState.unlockedCosmetics, item.id],
          equipped: {
            ...gordouState.equipped,
            [item.slot]: item.id,
          },
        };
        const evaluated = evaluateBadges(purchased);
        setGordouState(evaluated.nextState);
        spawnFloatingText(`¡Comprado y equipado: ${item.name}!`, '#10B981');
        announceUnlockedBadges(evaluated.newlyUnlocked);
        return;
      }

      sound.playTap();
      setGordouState((prev) => ({
        ...prev,
        equipped: {
          ...prev.equipped,
          [item.slot]:
            item.slot !== 'shirt' && prev.equipped[item.slot] === item.id ? null : item.id,
        },
      }));
    },
    [announceUnlockedBadges, gordouState, spawnFloatingText]
  );

  // Minigame start & finish handlers
  const handleStartMinigame = useCallback(
    (game: Exclude<MinigameId, 'none'>) => {
      if (gordouState.energy < 10) {
        sound.playHitHazard();
        spawnFloatingText('¡Energía baja! Descansa en el Dormitorio', '#EF4444');
        return;
      }
      sound.playTap();
      setMgScore(0);
      setMgCombo(0);
      setMgTimeLeft(game === 'treadmill' ? 15 : 25);
      setActiveMinigame(game);
    },
    [gordouState.energy, spawnFloatingText]
  );

  const handleFinishMinigame = useCallback(
    (finalScore: number, reason: string) => {
      if (activeMinigame === 'none') return;
      const currentGame = activeMinigame;
      setActiveMinigame('none');

      const burnerActive = gordouState.fatBurnerUntil > Date.now();
      const rewards = calculateMinigameRewards(
        currentGame,
        finalScore,
        burnerActive,
        gordouState.coinMultiplier
      );

      const nextWeight = clampWeight(gordouState.weight - rewards.weightLost);
      const reachedNow = checkGoalReached(nextWeight);
      const justReachedGoal = !gordouState.goalReached && reachedNow;
      const totalXp = gordouState.xp + rewards.xpEarned;

      const nextUnlocked = [...gordouState.unlockedCosmetics];
      if (reachedNow && !nextUnlocked.includes('shirt_gold_champion')) {
        nextUnlocked.push('shirt_gold_champion');
      }

      const postGameState: GordouState = {
        ...gordouState,
        weight: nextWeight,
        coins: gordouState.coins + rewards.coinsEarned,
        xp: totalXp,
        level: Math.floor(totalXp / 100) + 1,
        energy: clampStat(gordouState.energy - 14),
        hygiene: clampStat(gordouState.hygiene - 15),
        sweatLevel: clampStat(gordouState.sweatLevel + 35),
        unlockedCosmetics: nextUnlocked,
        workoutsCompleted: (gordouState.workoutsCompleted ?? 0) + 1,
        goalReached: gordouState.goalReached || reachedNow,
      };

      const evaluated = evaluateBadges(postGameState);
      setGordouState(evaluated.nextState);
      announceUnlockedBadges(evaluated.newlyUnlocked);

      setMinigameSummary({
        game: currentGame,
        score: finalScore,
        weightLost: rewards.weightLost,
        coinsEarned: rewards.coinsEarned,
        xpEarned: rewards.xpEarned,
        reason,
      });

      if (justReachedGoal) {
        sound.playVictoryFanfare();
        setShowGoalVictoryModal(true);
      } else {
        sound.playCoin();
        setGameState('gameover');
      }
    },
    [activeMinigame, announceUnlockedBadges, gordouState]
  );

  // Pou Interactive Microphone (MediaRecorder + Silence Detection + Pitch Shift + Lip-Sync 3D + Gemini Transcribe)
  const triggerSimulatedPouVoice = useCallback(
    async (phrase: string) => {
      const pitch = calculateVoicePitch(gordouState.weight);
      setIsPlayingPouVoice(true);
      setLastTranscript(phrase);
      setSpeechBubble(`"${phrase}"`);

      sound.playPouSynthSpeech(
        pitch,
        2100,
        (openness) => setMouthOpenness(openness),
        () => {
          setIsPlayingPouVoice(false);
          setMouthOpenness(0);
          window.setTimeout(() => setSpeechBubble(null), 3200);
        }
      );

      try {
        const resp = await fetch('/api/gemini/quick-tip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weight: gordouState.weight,
            hunger: gordouState.hunger,
            health: gordouState.health,
            energy: gordouState.energy,
            spokenText: phrase,
          }),
        });
        const data = await resp.json();
        if (data.tip) {
          setLastReaction(data.tip);
        }
      } catch {
        setLastReaction('¡Jajaja! ¡Vamos a llegar a los 65 kilos!');
      }
    },
    [gordouState.energy, gordouState.health, gordouState.hunger, gordouState.weight]
  );

  const handleToggleMic = useCallback(async () => {
    if (isRecordingVoice && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      triggerSimulatedPouVoice('¡Hola Gordou, vamos a entrenar para llegar a 65 kilos!');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecordingVoice(true);
      spawnFloatingText('🎤 ¡Habla ahora! (Se detiene tras 1s de silencio)', '#FACC15');

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      // Silence detector (stops after 1 second of silence once speech started, or max 4.5s)
      let hasSpoken = false;
      let silenceStart = Date.now();
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      const monitorId = window.setInterval(() => {
        analyser.getByteFrequencyData(freqData);
        const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
        if (avg > 18) {
          hasSpoken = true;
          silenceStart = Date.now();
        } else if (hasSpoken && Date.now() - silenceStart > 1000) {
          if (recorder.state === 'recording') recorder.stop();
        }
      }, 100);

      const maxStopTimeout = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 4500);

      recorder.onstop = async () => {
        window.clearInterval(monitorId);
        window.clearTimeout(maxStopTimeout);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecordingVoice(false);

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 200) {
          triggerSimulatedPouVoice('¡Vamos Gordou, a quemar calorías!');
          return;
        }

        // 1. Replay recorded voice immediately with Pou pitch shift (1.25 -> 1.55) + 3D Lip-Sync
        const pitch = calculateVoicePitch(gordouState.weight);
        const arrayBuf = await blob.arrayBuffer();
        setIsPlayingPouVoice(true);

        try {
          const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0));
          const playSource = audioCtx.createBufferSource();
          playSource.buffer = decoded;
          playSource.playbackRate.value = pitch;

          const playAnalyser = audioCtx.createAnalyser();
          playAnalyser.fftSize = 256;
          playSource.connect(playAnalyser);
          playAnalyser.connect(audioCtx.destination);

          const playBins = new Uint8Array(playAnalyser.frequencyBinCount);
          const lipInterval = window.setInterval(() => {
            playAnalyser.getByteFrequencyData(playBins);
            const avgEnergy = playBins.reduce((a, b) => a + b, 0) / playBins.length;
            setMouthOpenness(Math.min(1, avgEnergy / 65));
          }, 40);

          playSource.onended = () => {
            window.clearInterval(lipInterval);
            setMouthOpenness(0);
            setIsPlayingPouVoice(false);
          };
          playSource.start(0);
        } catch {
          sound.playPouSynthSpeech(pitch, 1800, setMouthOpenness, () =>
            setIsPlayingPouVoice(false)
          );
        }

        // 2. Transcribe with gemini-3.5-transcribe on server
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = String(reader.result || '').split(',')[1];
          if (!base64Data) return;
          try {
            const resp = await fetch('/api/gemini/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Data,
                mimeType: blob.type || 'audio/webm',
                weight: gordouState.weight,
              }),
            });
            const data = await resp.json();
            if (data.transcript) {
              setLastTranscript(data.transcript);
              setSpeechBubble(`"${data.transcript}"`);
              window.setTimeout(() => setSpeechBubble(null), 4000);
            }
            if (data.reaction) {
              setLastReaction(data.reaction);
            }
          } catch {
            // ignore transcription error
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
    } catch {
      // Fallback when browser blocks mic in headless/unpermissioned context
      triggerSimulatedPouVoice('¡Hola Gordou, vamos a bajar a 65 kilos!');
    }
  }, [gordouState.weight, isRecordingVoice, spawnFloatingText, triggerSimulatedPouVoice]);

  const handleSelectRoom = useCallback((room: RoomId) => {
    sound.playTap();
    setActiveBathTool('none');
    setGordouState((prev) => ({
      ...prev,
      room,
      isSleeping: room === 'dormitorio' ? prev.isSleeping : false,
    }));
  }, []);

  const handleRestartChallenge = useCallback((multiplier: number, startWeight: number) => {
    const fresh = createInitialGordouState(startWeight);
    fresh.coinMultiplier = multiplier;
    setGordouState(fresh);
    setShowGoalVictoryModal(false);
    setMinigameSummary(null);
    setGameState('playing');
    sound.playTap();
  }, []);

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden select-none touch-none">
      {/* Persistent 3D Three.js Scene Canvas */}
      <GordouCanvas3D
        gameState={gameState}
        gordouState={gordouState}
        activeMinigame={activeMinigame}
        mouthOpenness={mouthOpenness}
        activeBathTool={activeBathTool}
        feedingFoodColor={null}
        workoutAnim={workoutAnim}
        onBellyTap={handleBellyTap}
        onSoapScrub={handleSoapScrub}
        onMinigameScoreChange={(score, combo, timeLeft) => {
          setMgScore(score);
          setMgCombo(combo);
          setMgTimeLeft(timeLeft);
        }}
        onMinigameFinish={handleFinishMinigame}
      />

      {/* Floating Speech Bubble when Gordou repeats voice or Coach speaks */}
      {speechBubble && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-2 rounded-2xl bg-white text-[#0F172A] font-display font-extrabold text-xs sm:text-sm border-3 border-[#0F172A] shadow-[0_5px_0_#0F172A] max-w-xs text-center">
          {speechBubble}
        </div>
      )}

      {/* Floating Action Feedback Popups (-0.5 kg, +15 FitCoins, etc.) */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-1">
        {floatingTexts.map((ft) => (
          <div
            key={ft.id}
            className="animate-float-feedback font-display font-black text-lg sm:text-xl stroke-title whitespace-nowrap"
            style={{ color: ft.color }}
          >
            {ft.text}
          </div>
        ))}
      </div>

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          startWeight={gordouState.startWeight}
          onSelectStartWeight={(kg) => {
            sound.playTap();
            setGordouState((prev) => ({
              ...prev,
              weight: kg,
              startWeight: kg,
            }));
          }}
          onStartGame={handleStartGame}
        />
      )}

      {/* Active Playing HUD & Collapsible Bottom Dock */}
      {gameState !== 'title' && (
        <>
          <TopHud
            state={gordouState}
            activeMinigame={activeMinigame}
            mgScore={mgScore}
            mgCombo={mgCombo}
            mgTimeLeft={mgTimeLeft}
            muted={muted}
            isRecordingVoice={isRecordingVoice}
            isPlayingPouVoice={isPlayingPouVoice}
            onToggleMic={handleToggleMic}
            onOpenCoach={() => setCoachModalOpen(true)}
            onOpenBadges={() => {
              sound.playTap();
              setStatusModalTab('badges');
              setGameState('paused');
            }}
            onToggleMute={() => {
              setMuted((m) => {
                sound.muted = !m;
                return !m;
              });
            }}
            onPauseToggle={() => {
              sound.playTap();
              setStatusModalTab('status');
              setGameState((prev) => (prev === 'paused' ? 'playing' : 'paused'));
            }}
            onExitMinigame={() => handleFinishMinigame(mgScore, 'Entrenamiento finalizado')}
          />

          <BottomDock
            state={gordouState}
            activeMinigame={activeMinigame}
            activeBathTool={activeBathTool}
            dockCollapsed={dockCollapsed}
            onToggleCollapse={() => setDockCollapsed((c) => !c)}
            onSelectRoom={handleSelectRoom}
            onFeedOrBuyFood={handleFeedOrBuyFood}
            onSelectBathTool={setActiveBathTool}
            onQuickScrubSoap={handleSoapScrub}
            onTriggerExercise={handleTriggerExercise}
            onUsePotion={handleUsePotion}
            onToggleSleep={() => {
              sound.playTap();
              setGordouState((prev) => ({ ...prev, isSleeping: !prev.isSleeping }));
            }}
            onEquipOrBuyCosmetic={handleEquipOrBuyCosmetic}
            onStartMinigame={handleStartMinigame}
          />
        </>
      )}

      {/* Coach Fit IA & Pou Voice Lip-Sync Modal */}
      <VoiceAndCoachModal
        isOpen={coachModalOpen}
        onClose={() => setCoachModalOpen(false)}
        state={gordouState}
        lastTranscript={lastTranscript}
        lastReaction={lastReaction}
        onSimulatePouVoice={triggerSimulatedPouVoice}
      />

      {/* Pause, Minigame Complete & 65.0 kg Victory Celebration Modals */}
      <StatusModal
        gameState={gameState}
        gordouState={gordouState}
        minigameSummary={minigameSummary}
        showGoalVictoryModal={showGoalVictoryModal}
        activeTab={statusModalTab}
        onSelectTab={(tab) => {
          sound.playTap();
          setStatusModalTab(tab);
        }}
        onResume={() => setGameState('playing')}
        onRestartChallenge={handleRestartChallenge}
        onReturnToTitle={() => {
          setActiveMinigame('none');
          setGameState('title');
        }}
        onCloseMinigameSummary={() => {
          setMinigameSummary(null);
          setGameState('playing');
        }}
        onContinueFreePlay={() => {
          setShowGoalVictoryModal(false);
          setGordouState((prev) => ({
            ...prev,
            freePlayMode: true,
            equipped: { ...prev.equipped, shirt: 'shirt_gold_champion' },
          }));
          setGameState('playing');
        }}
      />
    </main>
  );
}
