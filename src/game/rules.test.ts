import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_WEIGHT,
  TARGET_WEIGHT,
  BADGES,
  FOOD_ITEMS,
  GYM_EXERCISES,
  calculateWeightProgress,
  calculateMorphFactors,
  calculateVoicePitch,
  checkGoalReached,
  createInitialGordouState,
  applyFoodToState,
  applyExerciseToState,
  calculateMinigameRewards,
  calculateSweatParticleMetrics,
  getBadgeProgress,
  evaluateBadges,
} from './rules';

test('weight progress calculates 0% at start weight and 100% at 65kg target', () => {
  assert.equal(calculateWeightProgress(INITIAL_WEIGHT), 0);
  assert.equal(calculateWeightProgress(TARGET_WEIGHT), 100);
  assert.equal(calculateWeightProgress(87.5), 50);
});

test('3D morphology scales down dynamically from 110kg to 65kg', () => {
  const heavy = calculateMorphFactors(110.0);
  const fit = calculateMorphFactors(65.0);

  assert.ok(heavy.torsoScaleX > fit.torsoScaleX);
  assert.ok(heavy.torsoScaleZ > fit.torsoScaleZ);
  assert.ok(heavy.bellyScale > fit.bellyScale);
  assert.ok(heavy.cheekScale > fit.cheekScale);
  assert.equal(fit.fatRatio, 0);
});

test('voice pitch shifts from 1.25 at 110kg to 1.55 at 65kg', () => {
  assert.equal(calculateVoicePitch(110.0), 1.25);
  assert.equal(calculateVoicePitch(65.0), 1.55);
  const midPitch = calculateVoicePitch(87.5);
  assert.ok(midPitch > 1.25 && midPitch < 1.55);
});

test('healthy food reduces weight and boosts health while junk food increases weight', () => {
  const initial = createInitialGordouState(110.0);
  const broccoli = FOOD_ITEMS.find((f) => f.id === 'broccoli')!;
  const burger = FOOD_ITEMS.find((f) => f.id === 'burger')!;

  const afterBroccoli = applyFoodToState(initial, broccoli);
  assert.equal(afterBroccoli.nextState.weight, 109.5);
  assert.ok(afterBroccoli.nextState.health > initial.health);

  const afterBurger = applyFoodToState(afterBroccoli.nextState, burger);
  assert.equal(afterBurger.nextState.weight, 111.0);
});

test('exercise burns double weight when natural fat burner potion is active', () => {
  const now = 100000;
  const state = {
    ...createInitialGordouState(100.0),
    fatBurnerUntil: now + 60000,
  };
  const dumbbells = GYM_EXERCISES[0];
  const res = applyExerciseToState(state, dumbbells, now);
  assert.equal(res.weightChange, -1.0);
  assert.equal(res.nextState.weight, 99.0);
});

test('goal reached triggers at 65.0 kg and unlocks golden champion outfit', () => {
  const nearGoal = createInitialGordouState(65.4);
  const smoothie = FOOD_ITEMS.find((f) => f.id === 'smoothie')!;
  const { nextState } = applyFoodToState(nearGoal, smoothie);
  assert.equal(checkGoalReached(nextState.weight), true);
  assert.equal(nextState.goalReached, true);
  assert.ok(nextState.unlockedCosmetics.includes('shirt_gold_champion'));
});

test('minigame rewards scale with score and fat burner multiplier', () => {
  const normal = calculateMinigameRewards('jumprope', 5, false, 1);
  const boosted = calculateMinigameRewards('jumprope', 5, true, 2);
  assert.equal(normal.weightLost, 1.0);
  assert.equal(boosted.weightLost, 2.0);
  assert.equal(boosted.coinsEarned, normal.coinsEarned * 2);
});

test('badges unlock for Primeros 10kg perdidos, Entrenador Constante, and Coleccionista de Ropa', () => {
  const initial = createInitialGordouState(110.0);
  const first10Badge = BADGES.find((b) => b.id === 'first_10kg')!;
  const trainerBadge = BADGES.find((b) => b.id === 'constant_trainer')!;
  const collectorBadge = BADGES.find((b) => b.id === 'clothes_collector')!;

  assert.equal(getBadgeProgress(initial, first10Badge).percent, 0);

  const milestoneState = {
    ...initial,
    weight: 99.8, // 10.2 kg lost from 110.0 kg
    workoutsCompleted: 5,
    unlockedCosmetics: ['shirt_orange', 'headband_red', 'cap_sport', 'glasses_cool'],
  };

  const { nextState, newlyUnlocked } = evaluateBadges(milestoneState);
  const unlockedIds = newlyUnlocked.map((b) => b.id);

  assert.ok(unlockedIds.includes('first_10kg'));
  assert.ok(unlockedIds.includes('constant_trainer'));
  assert.ok(unlockedIds.includes('clothes_collector'));
  assert.ok(nextState.unlockedBadges.includes('first_10kg'));
  assert.ok(nextState.unlockedBadges.includes('constant_trainer'));
  assert.ok(nextState.unlockedBadges.includes('clothes_collector'));
  assert.equal(
    nextState.coins,
    initial.coins + first10Badge.rewardCoins + trainerBadge.rewardCoins + collectorBadge.rewardCoins
  );
});

test('3D sweat particles activate only when sweatLevel > 50% and disappear when using the shower', () => {
  assert.equal(calculateSweatParticleMetrics(10, false).active, false);
  assert.equal(calculateSweatParticleMetrics(50, false).active, false);
  assert.equal(calculateSweatParticleMetrics(50, false).visibleSurfaceDrops, 0);

  const activeSweat = calculateSweatParticleMetrics(75, false);
  assert.equal(activeSweat.active, true);
  assert.ok(activeSweat.visibleSurfaceDrops >= 12);
  assert.ok(activeSweat.visibleFallingDrops >= 9);

  // Immediately disappears when shower is active or sweatLevel resets to 0
  const duringShower = calculateSweatParticleMetrics(75, true);
  assert.equal(duringShower.active, false);
  assert.equal(duringShower.visibleSurfaceDrops, 0);
  assert.equal(duringShower.visibleFallingDrops, 0);
});
