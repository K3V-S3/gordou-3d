export type RoomId = 'cocina' | 'bano' | 'gimnasio' | 'dormitorio' | 'juegos';

export type MinigameId = 'none' | 'runner' | 'fooddrop' | 'jumprope' | 'treadmill';

export interface FoodItem {
  id: string;
  name: string;
  category: 'healthy' | 'junk';
  price: number;
  weightDelta: number; // negative burns fat, positive gains fat
  hungerDelta: number;
  healthDelta: number;
  happinessDelta: number;
  energyDelta: number;
  color: string;
  accentColor: string;
  description: string;
}

export interface PotionItem {
  id: string;
  name: string;
  price: number;
  energyDelta: number;
  healthDelta: number;
  hygieneDelta: number;
   activatesFatBurner?: boolean;
  color: string;
  description: string;
}

export interface GymExercise {
  id: 'dumbbells' | 'squats';
  name: string;
  weightDelta: number;
  energyCost: number;
  hygieneCost: number;
  xpReward: number;
  coinReward: number;
  description: string;
}

export interface WardrobeItem {
  id: string;
  name: string;
  slot: 'shirt' | 'headband' | 'cap' | 'glasses' | 'chain';
  price: number;
  color: string;
  unlockAtGoal?: boolean;
}

export interface EquippedCosmetics {
  shirt: string;
  headband: string | null;
  cap: string | null;
  glasses: string | null;
  chain: string | null;
}

export type BadgeId =
  | 'first_10kg'
  | 'constant_trainer'
  | 'clothes_collector'
  | 'healthy_chef'
  | 'clean_freak'
  | 'champion_65kg';

export interface BadgeDefinition {
  id: BadgeId;
  title: string;
  description: string;
  target: number;
  unit: string;
  rewardCoins: number;
  color: string;
  accentColor: string;
}

export interface GordouState {
  weight: number; // Starts at 110.0 kg (or 120.0 kg), target 65.0 kg
  startWeight: number;
  hunger: number; // 0 - 100
  health: number; // 0 - 100
  energy: number; // 0 - 100
  hygiene: number; // 0 - 100
  happiness: number; // 0 - 100
  coins: number;
  xp: number;
  level: number;
  room: RoomId;
  isSleeping: boolean;
  fatBurnerUntil: number; // timestamp ms
  sweatLevel: number; // 0 - 100
  soapBubbles: number; // 0 - 30
  inventory: Record<string, number>;
  unlockedCosmetics: string[];
  equipped: EquippedCosmetics;
  workoutsCompleted: number;
  healthyMealsEaten: number;
  unlockedBadges: BadgeId[];
  goalReached: boolean;
  freePlayMode: boolean;
  coinMultiplier: number;
  lastSavedAt: number;
}

export const INITIAL_WEIGHT = 110.0;
export const MAX_FAT_WEIGHT = 120.0;
export const TARGET_WEIGHT = 65.0;
export const MIN_HEALTHY_WEIGHT = 58.0;

export const BADGES: BadgeDefinition[] = [
  {
    id: 'first_10kg',
    title: 'Primeros 10kg perdidos',
    description: 'Pierde tus primeros 10.0 kg respecto a tu peso inicial.',
    target: 10,
    unit: 'kg',
    rewardCoins: 60,
    color: '#10B981',
    accentColor: '#A7F3D0',
  },
  {
    id: 'constant_trainer',
    title: 'Entrenador Constante',
    description: 'Completa 5 sesiones de ejercicio o minijuegos en el Gimnasio 3D.',
    target: 5,
    unit: 'entrenos',
    rewardCoins: 75,
    color: '#FF6B35',
    accentColor: '#FED7AA',
  },
  {
    id: 'clothes_collector',
    title: 'Coleccionista de Ropa',
    description: 'Desbloquea al menos 4 prendas o accesorios en el Armario 3D.',
    target: 4,
    unit: 'prendas',
    rewardCoins: 90,
    color: '#A855F7',
    accentColor: '#E9D5FF',
  },
  {
    id: 'healthy_chef',
    title: 'Nutricionista Fit',
    description: 'Alimenta a Gordou con 5 comidas saludables de la Cocina.',
    target: 5,
    unit: 'comidas',
    rewardCoins: 50,
    color: '#22C55E',
    accentColor: '#BBF7D0',
  },
  {
    id: 'clean_freak',
    title: 'Higiene Reluciente',
    description: 'Alcanza el 100% de higiene con un baño de espuma y ducha.',
    target: 100,
    unit: '%',
    rewardCoins: 40,
    color: '#38BDF8',
    accentColor: '#BAE6FD',
  },
  {
    id: 'champion_65kg',
    title: 'Campeón 65.0 kg',
    description: 'Alcanza la meta saludable de 65.0 kg y gana el Trofeo Dorado.',
    target: 1,
    unit: 'meta',
    rewardCoins: 200,
    color: '#FACC15',
    accentColor: '#FEF08A',
  },
];

export const FOOD_ITEMS: FoodItem[] = [
  {
    id: 'apple',
    name: 'Manzana Roja',
    category: 'healthy',
    price: 12,
    weightDelta: -0.3,
    hungerDelta: 16,
    healthDelta: 10,
    happinessDelta: 6,
    energyDelta: 6,
    color: '#EF4444',
    accentColor: '#22C55E',
    description: '-0.3 kg · Fibra natural y vitaminas',
  },
  {
    id: 'broccoli',
    name: 'Brócoli Fit',
    category: 'healthy',
    price: 16,
    weightDelta: -0.5,
    hungerDelta: 20,
    healthDelta: 16,
    happinessDelta: 4,
    energyDelta: 8,
    color: '#16A34A',
    accentColor: '#86EFAC',
    description: '-0.5 kg · Quema grasa acelerada',
  },
  {
    id: 'chicken',
    name: 'Pechuga Grill',
    category: 'healthy',
    price: 22,
    weightDelta: -0.6,
    hungerDelta: 32,
    healthDelta: 18,
    happinessDelta: 12,
    energyDelta: 14,
    color: '#F59E0B',
    accentColor: '#FEF3C7',
    description: '-0.6 kg · Proteína pura para músculo',
  },
  {
    id: 'smoothie',
    name: 'Batido Verde',
    category: 'healthy',
    price: 26,
    weightDelta: -0.8,
    hungerDelta: 22,
    healthDelta: 24,
    happinessDelta: 14,
    energyDelta: 18,
    color: '#10B981',
    accentColor: '#D1FAE5',
    description: '-0.8 kg · Detox metabólico intenso',
  },
  {
    id: 'water',
    name: 'Agua Pura',
    category: 'healthy',
    price: 8,
    weightDelta: -0.3,
    hungerDelta: 8,
    healthDelta: 12,
    happinessDelta: 6,
    energyDelta: 10,
    color: '#38BDF8',
    accentColor: '#E0F2FE',
    description: '-0.3 kg · Hidratación esencial',
  },
  {
    id: 'burger',
    name: 'Hamburguesa Doble',
    category: 'junk',
    price: 7,
    weightDelta: 1.5,
    hungerDelta: 38,
    healthDelta: -12,
    happinessDelta: 26,
    energyDelta: -6,
    color: '#D97706',
    accentColor: '#EF4444',
    description: '+1.5 kg · Sube felicidad pero engorda',
  },
  {
    id: 'pizza',
    name: 'Pizza Pepperoni',
    category: 'junk',
    price: 6,
    weightDelta: 1.2,
    hungerDelta: 30,
    healthDelta: -10,
    happinessDelta: 24,
    energyDelta: -4,
    color: '#F97316',
    accentColor: '#DC2626',
    description: '+1.2 kg · Mucha grasa saturada',
  },
  {
    id: 'donut',
    name: 'Pastel / Dona',
    category: 'junk',
    price: 5,
    weightDelta: 1.0,
    hungerDelta: 20,
    healthDelta: -9,
    happinessDelta: 28,
    energyDelta: -5,
    color: '#EC4899',
    accentColor: '#FDE047',
    description: '+1.0 kg · Azúcar rápida, baja salud',
  },
  {
    id: 'soda',
    name: 'Refresco Cola',
    category: 'junk',
    price: 4,
    weightDelta: 0.8,
    hungerDelta: 12,
    healthDelta: -10,
    happinessDelta: 20,
    energyDelta: 4,
    color: '#7C2D12',
    accentColor: '#EF4444',
    description: '+0.8 kg · Calorías vacías con gas',
  },
];

export const LAB_POTIONS: PotionItem[] = [
  {
    id: 'energy_drink',
    name: 'Bebida Energética',
    price: 25,
    energyDelta: 60,
    healthDelta: 5,
    hygieneDelta: 0,
    color: '#38BDF8',
    description: '+60% Energía al instante para entrenar',
  },
  {
    id: 'medicine',
    name: 'Medicina Pou Fit',
    price: 30,
    energyDelta: 10,
    healthDelta: 100,
    hygieneDelta: 10,
    color: '#EF4444',
    description: 'Restaura la Salud al 100% inmediatamente',
  },
  {
    id: 'fat_burner',
    name: 'Quemador Natural',
    price: 45,
    energyDelta: 20,
    healthDelta: 10,
    hygieneDelta: 0,
    activatesFatBurner: true,
    color: '#10B981',
    description: 'Duplica (2x) la pérdida de peso por 2 min',
  },
];

export const GYM_EXERCISES: GymExercise[] = [
  {
    id: 'dumbbells',
    name: 'Curl de Mancuernas 3D',
    weightDelta: -0.5,
    energyCost: 14,
    hygieneCost: 12,
    xpReward: 25,
    coinReward: 15,
    description: 'Quema -0.5 kg, gana +15 FitCoins y +25 XP',
  },
  {
    id: 'squats',
    name: 'Sentadillas Explosivas',
    weightDelta: -0.6,
    energyCost: 16,
    hygieneCost: 14,
    xpReward: 30,
    coinReward: 18,
    description: 'Quema -0.6 kg, gana +18 FitCoins y +30 XP',
  },
];

export const WARDROBE_ITEMS: WardrobeItem[] = [
  {
    id: 'shirt_orange',
    name: 'Camiseta Naranja Fuego',
    slot: 'shirt',
    price: 0,
    color: '#FF6B35',
  },
  {
    id: 'shirt_emerald',
    name: 'Camiseta Verde Fit',
    slot: 'shirt',
    price: 35,
    color: '#10B981',
  },
  {
    id: 'shirt_royal',
    name: 'Camiseta Azul Eléctrico',
    slot: 'shirt',
    price: 40,
    color: '#2563EB',
  },
  {
    id: 'shirt_crimson',
    name: 'Camiseta Roja Pro',
    slot: 'shirt',
    price: 45,
    color: '#E11D48',
  },
  {
    id: 'shirt_gold_champion',
    name: 'Atuendo Dorado Campeón',
    slot: 'shirt',
    price: 0,
    color: '#FACC15',
    unlockAtGoal: true,
  },
  {
    id: 'headband_red',
    name: 'Cinta Gym Roja',
    slot: 'headband',
    price: 30,
    color: '#EF4444',
  },
  {
    id: 'headband_neon',
    name: 'Cinta Gym Neón',
    slot: 'headband',
    price: 40,
    color: '#22C55E',
  },
  {
    id: 'cap_sport',
    name: 'Gorra Runner Azul',
    slot: 'cap',
    price: 55,
    color: '#0EA5E9',
  },
  {
    id: 'cap_gold',
    name: 'Gorra Dorada VIP',
    slot: 'cap',
    price: 85,
    color: '#F59E0B',
  },
  {
    id: 'glasses_cool',
    name: 'Gafas de Sol Dark',
    slot: 'glasses',
    price: 50,
    color: '#1E293B',
  },
  {
    id: 'glasses_visor',
    name: 'Gafas Deportivas Cyber',
    slot: 'glasses',
    price: 70,
    color: '#06B6D4',
  },
  {
    id: 'chain_gold',
    name: 'Cadena Dorada 3D',
    slot: 'chain',
    price: 95,
    color: '#EAB308',
  },
];

export function clampStat(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

export function clampWeight(kg: number): number {
  const clamped = Math.max(MIN_HEALTHY_WEIGHT, Math.min(140.0, kg));
  return Math.round(clamped * 10) / 10;
}

export function calculateWeightProgress(weight: number, startWeight = INITIAL_WEIGHT): number {
  const span = Math.max(1, startWeight - TARGET_WEIGHT);
  const lost = startWeight - weight;
  const pct = (lost / span) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export interface MorphFactors {
  fatRatio: number; // 0.0 at 65kg, 1.0 at 110kg, 1.22 at 120kg
  torsoScaleX: number;
  torsoScaleZ: number;
  bellyScale: number;
  cheekScale: number;
  limbScale: number;
}

export function calculateMorphFactors(weight: number): MorphFactors {
  const rawRatio = (weight - TARGET_WEIGHT) / (INITIAL_WEIGHT - TARGET_WEIGHT);
  const fatRatio = Math.max(0, Math.min(1.35, rawRatio));

  return {
    fatRatio,
    torsoScaleX: Number((0.88 + fatRatio * 0.48).toFixed(3)),
    torsoScaleZ: Number((0.84 + fatRatio * 0.52).toFixed(3)),
    bellyScale: Number((0.42 + fatRatio * 0.68).toFixed(3)),
    cheekScale: Number((0.85 + fatRatio * 0.38).toFixed(3)),
    limbScale: Number((0.88 + fatRatio * 0.28).toFixed(3)),
  };
}

export interface SweatParticleMetrics {
  active: boolean;
  intensity: number; // 0.0 when <=50% or showering, up to 1.0 at 100%
  visibleSurfaceDrops: number; // 0..18 glossy beads clinging to head, cheeks, torso, belly
  visibleFallingDrops: number; // 0..14 animated dripping 3D droplets
}

export function calculateSweatParticleMetrics(
  sweatLevel: number,
  isShowering = false
): SweatParticleMetrics {
  if (isShowering || sweatLevel <= 50) {
    return {
      active: false,
      intensity: 0,
      visibleSurfaceDrops: 0,
      visibleFallingDrops: 0,
    };
  }

  const clamped = Math.min(100, Math.max(50, sweatLevel));
  const intensity = Number(((clamped - 50) / 50).toFixed(3));
  const visibleSurfaceDrops = Math.min(18, Math.max(8, Math.round(8 + intensity * 10)));
  const visibleFallingDrops = Math.min(14, Math.max(5, Math.round(5 + intensity * 9)));

  return {
    active: true,
    intensity,
    visibleSurfaceDrops,
    visibleFallingDrops,
  };
}

export function calculateVoicePitch(weight: number): number {
  // At 110-120 kg -> 1.25 (comic chubby pitch)
  // At 65 kg -> 1.55 (classic high-pitched Pou voice)
  const t = Math.max(0, Math.min(1, (INITIAL_WEIGHT - weight) / (INITIAL_WEIGHT - TARGET_WEIGHT)));
  return Number((1.25 + t * 0.3).toFixed(2));
}

export function checkGoalReached(weight: number): boolean {
  return weight <= TARGET_WEIGHT;
}

export function getBadgeProgress(
  state: GordouState,
  badge: BadgeDefinition
): { current: number; target: number; percent: number; unlocked: boolean } {
  const alreadyUnlocked = (state.unlockedBadges ?? []).includes(badge.id);
  let rawCurrent = 0;

  switch (badge.id) {
    case 'first_10kg': {
      const lost = Math.max(0, (state.startWeight || INITIAL_WEIGHT) - state.weight);
      rawCurrent = Math.round(lost * 10) / 10;
      break;
    }
    case 'constant_trainer':
      rawCurrent = state.workoutsCompleted ?? 0;
      break;
    case 'clothes_collector':
      rawCurrent = (state.unlockedCosmetics ?? []).length;
      break;
    case 'healthy_chef':
      rawCurrent = state.healthyMealsEaten ?? 0;
      break;
    case 'clean_freak':
      rawCurrent = Math.round(state.hygiene ?? 0);
      break;
    case 'champion_65kg':
      rawCurrent = state.goalReached || checkGoalReached(state.weight) ? 1 : 0;
      break;
  }

  const current = alreadyUnlocked ? badge.target : Math.min(badge.target, rawCurrent);
  const percent = alreadyUnlocked
    ? 100
    : Math.max(0, Math.min(100, Math.round((current / badge.target) * 100)));
  const unlocked = alreadyUnlocked || rawCurrent >= badge.target;

  return { current, target: badge.target, percent, unlocked };
}

export function evaluateBadges(state: GordouState): {
  nextState: GordouState;
  newlyUnlocked: BadgeDefinition[];
} {
  const currentUnlocked = new Set<BadgeId>(state.unlockedBadges ?? []);
  const newlyUnlocked: BadgeDefinition[] = [];
  let bonusCoins = 0;

  for (const badge of BADGES) {
    if (currentUnlocked.has(badge.id)) continue;
    const progress = getBadgeProgress(state, badge);
    if (progress.unlocked) {
      currentUnlocked.add(badge.id);
      newlyUnlocked.push(badge);
      bonusCoins += badge.rewardCoins * (state.coinMultiplier || 1);
    }
  }

  if (newlyUnlocked.length === 0) {
    return { nextState: state, newlyUnlocked: [] };
  }

  return {
    newlyUnlocked,
    nextState: {
      ...state,
      coins: state.coins + Math.round(bonusCoins),
      unlockedBadges: Array.from(currentUnlocked),
    },
  };
}

export function createInitialGordouState(startWeight = INITIAL_WEIGHT): GordouState {
  return {
    weight: startWeight,
    startWeight,
    hunger: 78,
    health: 86,
    energy: 92,
    hygiene: 88,
    happiness: 85,
    coins: 150,
    xp: 0,
    level: 1,
    room: 'cocina',
    isSleeping: false,
    fatBurnerUntil: 0,
    sweatLevel: 10,
    soapBubbles: 0,
    inventory: {
      apple: 3,
      broccoli: 2,
      chicken: 1,
      smoothie: 1,
      water: 3,
      burger: 1,
      pizza: 1,
      donut: 1,
      soda: 1,
    },
    unlockedCosmetics: ['shirt_orange', 'headband_red'],
    equipped: {
      shirt: 'shirt_orange',
      headband: 'headband_red',
      cap: null,
      glasses: null,
      chain: null,
    },
    workoutsCompleted: 0,
    healthyMealsEaten: 0,
    unlockedBadges: [],
    goalReached: false,
    freePlayMode: false,
    coinMultiplier: 1,
    lastSavedAt: Date.now(),
  };
}

export function applyFoodToState(
  state: GordouState,
  food: FoodItem,
  now = Date.now()
): { nextState: GordouState; weightChange: number; newlyUnlocked: BadgeDefinition[] } {
  const count = state.inventory[food.id] ?? 0;
  if (count <= 0) {
    return { nextState: state, weightChange: 0, newlyUnlocked: [] };
  }

  const burnerActive = state.fatBurnerUntil > now;
  const effectiveWeightDelta =
    food.weightDelta < 0 && burnerActive
      ? Number((food.weightDelta * 2).toFixed(1))
      : food.weightDelta;

  const nextWeight = clampWeight(state.weight + effectiveWeightDelta);
  const reachedNow = checkGoalReached(nextWeight);
  const xpGain = food.category === 'healthy' ? 15 : 5;
  const totalXp = state.xp + xpGain;
  const nextLevel = Math.floor(totalXp / 100) + 1;

  const nextUnlocked = [...state.unlockedCosmetics];
  if (reachedNow && !nextUnlocked.includes('shirt_gold_champion')) {
    nextUnlocked.push('shirt_gold_champion');
  }

  const intermediateState: GordouState = {
    ...state,
    weight: nextWeight,
    hunger: clampStat(state.hunger + food.hungerDelta),
    health: clampStat(state.health + food.healthDelta),
    happiness: clampStat(state.happiness + food.happinessDelta),
    energy: clampStat(state.energy + food.energyDelta),
    xp: totalXp,
    level: nextLevel,
    inventory: {
      ...state.inventory,
      [food.id]: count - 1,
    },
    unlockedCosmetics: nextUnlocked,
    healthyMealsEaten:
      (state.healthyMealsEaten ?? 0) + (food.category === 'healthy' ? 1 : 0),
    goalReached: state.goalReached || reachedNow,
    lastSavedAt: now,
  };

  const evaluated = evaluateBadges(intermediateState);

  return {
    weightChange: Number((nextWeight - state.weight).toFixed(1)),
    nextState: evaluated.nextState,
    newlyUnlocked: evaluated.newlyUnlocked,
  };
}

export function applyExerciseToState(
  state: GordouState,
  exercise: GymExercise,
  now = Date.now()
): {
  nextState: GordouState;
  weightChange: number;
  coinsEarned: number;
  newlyUnlocked: BadgeDefinition[];
} {
  const burnerActive = state.fatBurnerUntil > now;
  const rawDelta = burnerActive ? exercise.weightDelta * 2 : exercise.weightDelta;
  const nextWeight = clampWeight(state.weight + rawDelta);
  const weightChange = Number((nextWeight - state.weight).toFixed(1));
  const coinsEarned = Math.round(exercise.coinReward * state.coinMultiplier);
  const totalXp = state.xp + exercise.xpReward;
  const nextLevel = Math.floor(totalXp / 100) + 1;
  const reachedNow = checkGoalReached(nextWeight);

  const nextUnlocked = [...state.unlockedCosmetics];
  if (reachedNow && !nextUnlocked.includes('shirt_gold_champion')) {
    nextUnlocked.push('shirt_gold_champion');
  }

  const intermediateState: GordouState = {
    ...state,
    weight: nextWeight,
    energy: clampStat(state.energy - exercise.energyCost),
    hygiene: clampStat(state.hygiene - exercise.hygieneCost),
    hunger: clampStat(state.hunger - 8),
    health: clampStat(state.health + 6),
    happiness: clampStat(state.happiness + 8),
    sweatLevel: clampStat(state.sweatLevel + 45),
    coins: state.coins + coinsEarned,
    xp: totalXp,
    level: nextLevel,
    unlockedCosmetics: nextUnlocked,
    workoutsCompleted: (state.workoutsCompleted ?? 0) + 1,
    goalReached: state.goalReached || reachedNow,
    lastSavedAt: now,
  };

  const evaluated = evaluateBadges(intermediateState);

  return {
    weightChange,
    coinsEarned,
    nextState: evaluated.nextState,
    newlyUnlocked: evaluated.newlyUnlocked,
  };
}

export function calculateMinigameRewards(
  game: Exclude<MinigameId, 'none'>,
  score: number,
  fatBurnerActive: boolean,
  coinMultiplier = 1
): { weightLost: number; coinsEarned: number; xpEarned: number } {
  const safeScore = Math.max(0, score);
  let baseKgLost = 0.2;
  let baseCoins = 10;

  if (game === 'jumprope') {
    // -0.2 kg per combo / jump milestone
    baseKgLost = Math.min(3.2, Math.max(0.2, Math.round(safeScore * 0.2 * 10) / 10));
    baseCoins = 12 + safeScore * 4;
  } else if (game === 'fooddrop') {
    baseKgLost = Math.min(3.0, Math.max(0.2, Math.round(safeScore * 0.12 * 10) / 10));
    baseCoins = 14 + safeScore * 3;
  } else if (game === 'runner') {
    baseKgLost = Math.min(3.5, Math.max(0.3, Math.round((safeScore / 15) * 0.25 * 10) / 10));
    baseCoins = 18 + Math.round(safeScore * 1.5);
  } else if (game === 'treadmill') {
    baseKgLost = Math.min(3.0, Math.max(0.3, Math.round((safeScore / 12) * 0.25 * 10) / 10));
    baseCoins = 15 + Math.round(safeScore * 1.4);
  }

  const finalKgLost = Number((baseKgLost * (fatBurnerActive ? 2 : 1)).toFixed(1));
  const coinsEarned = Math.round(baseCoins * coinMultiplier);
  const xpEarned = Math.round(20 + safeScore * 2);

  return {
    weightLost: finalKgLost,
    coinsEarned,
    xpEarned,
  };
}
