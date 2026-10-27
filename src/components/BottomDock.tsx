import React, { useState } from 'react';
import {
  FOOD_ITEMS,
  FoodItem,
  GYM_EXERCISES,
  GymExercise,
  GordouState,
  LAB_POTIONS,
  MinigameId,
  PotionItem,
  RoomId,
  WARDROBE_ITEMS,
  WardrobeItem,
} from '../game/rules';

interface BottomDockProps {
  state: GordouState;
  activeMinigame: MinigameId;
  activeBathTool: 'none' | 'soap' | 'shower';
  dockCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectRoom: (room: RoomId) => void;
  onFeedOrBuyFood: (food: FoodItem, mode: 'eat' | 'buy') => void;
  onSelectBathTool: (tool: 'none' | 'soap' | 'shower') => void;
  onQuickScrubSoap: () => void;
  onTriggerExercise: (ex: GymExercise) => void;
  onUsePotion: (potion: PotionItem) => void;
  onToggleSleep: () => void;
  onEquipOrBuyCosmetic: (item: WardrobeItem) => void;
  onStartMinigame: (game: Exclude<MinigameId, 'none'>) => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  state,
  activeMinigame,
  activeBathTool,
  dockCollapsed,
  onToggleCollapse,
  onSelectRoom,
  onFeedOrBuyFood,
  onSelectBathTool,
  onQuickScrubSoap,
  onTriggerExercise,
  onUsePotion,
  onToggleSleep,
  onEquipOrBuyCosmetic,
  onStartMinigame,
}) => {
  const [kitchenMode, setKitchenMode] = useState<'inventory' | 'shop'>('inventory');
  const [foodFilter, setFoodFilter] = useState<'all' | 'healthy' | 'junk'>('all');

  // If a minigame is active, render large thumb controls for that minigame
  if (activeMinigame !== 'none') {
    return (
      <div className="fixed bottom-4 left-0 right-0 z-20 pointer-events-none px-4 max-w-md mx-auto">
        {activeMinigame === 'jumprope' && (
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('gordou-action', { detail: { type: 'jump' } }))
            }
            className="pointer-events-auto w-full min-h-[64px] rounded-2xl bg-[#FACC15] text-[#0F172A] font-display font-black text-xl border-4 border-[#0F172A] shadow-[0_6px_0_#0F172A] active:scale-95 cursor-pointer"
          >
            ¡SALTAR CUERDA! (-0.2 KG COMBO)
          </button>
        )}

        {(activeMinigame === 'runner' || activeMinigame === 'fooddrop') && (
          <div className="pointer-events-auto grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('gordou-action', { detail: { type: 'lane', dir: -1 } })
                )
              }
              className="min-h-[58px] rounded-2xl bg-[#1E293B] text-white font-display font-black text-lg border-3 border-[#0F172A] shadow-[0_5px_0_#0F172A] active:scale-95 cursor-pointer"
            >
              ◀ IZQ
            </button>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('gordou-action', { detail: { type: 'jump' } }))
              }
              className="min-h-[58px] rounded-2xl bg-[#10B981] text-[#052E16] font-display font-black text-lg border-3 border-[#0F172A] shadow-[0_5px_0_#0F172A] active:scale-95 cursor-pointer"
            >
              ▲ SALTAR
            </button>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('gordou-action', { detail: { type: 'lane', dir: 1 } })
                )
              }
              className="min-h-[58px] rounded-2xl bg-[#1E293B] text-white font-display font-black text-lg border-3 border-[#0F172A] shadow-[0_5px_0_#0F172A] active:scale-95 cursor-pointer"
            >
              DER ▶
            </button>
          </div>
        )}

        {activeMinigame === 'treadmill' && (
          <div className="pointer-events-auto grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('gordou-action', { detail: { type: 'treadmillStep' } })
                )
              }
              className="min-h-[64px] rounded-2xl bg-[#FF6B35] text-white font-display font-black text-xl border-4 border-[#0F172A] shadow-[0_6px_0_#0F172A] active:scale-95 cursor-pointer"
            >
              👟 PASO IZQ
            </button>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('gordou-action', { detail: { type: 'treadmillStep' } })
                )
              }
              className="min-h-[64px] rounded-2xl bg-[#10B981] text-[#052E16] font-display font-black text-xl border-4 border-[#0F172A] shadow-[0_6px_0_#0F172A] active:scale-95 cursor-pointer"
            >
              👟 PASO DER
            </button>
          </div>
        )}
      </div>
    );
  }

  const filteredFoods = FOOD_ITEMS.filter((f) =>
    foodFilter === 'all' ? true : f.category === foodFilter
  );

  const rooms: { id: RoomId; label: string; color: string }[] = [
    { id: 'cocina', label: 'Cocina', color: '#FF6B35' },
    { id: 'bano', label: 'Baño', color: '#38BDF8' },
    { id: 'gimnasio', label: 'Gimnasio', color: '#10B981' },
    { id: 'dormitorio', label: 'Armario', color: '#A855F7' },
    { id: 'juegos', label: 'Juegos 3D', color: '#FACC15' },
  ];

  return (
    <div className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-20 w-[min(940px,95vw)] pointer-events-none flex flex-col items-center">
      {/* Collapsible Cinema / Zen Mode Toggle Button */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="pointer-events-auto mb-1.5 px-3.5 py-1 rounded-full border-2 border-[#0F172A] text-[11px] font-extrabold text-slate-200 hover:text-white transition-transform active:scale-95 cursor-pointer"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
      >
        {dockCollapsed ? '▴ Mostrar Controles [H]' : '▾ Vista 3D Libre [H]'}
      </button>

      {!dockCollapsed && (
        <div
          className="pointer-events-auto w-full rounded-3xl border-2 border-[#0F172A] shadow-[0_8px_0_#0F172A] p-2.5 sm:p-3 flex flex-col gap-2.5"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
        >
          {/* Room-Specific Interactive Strip */}
          {state.room === 'cocina' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setKitchenMode('inventory')}
                    className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer whitespace-nowrap ${
                      kitchenMode === 'inventory'
                        ? 'bg-[#FF6B35] text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Nevera (Comer)
                  </button>
                  <button
                    type="button"
                    onClick={() => setKitchenMode('shop')}
                    className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer whitespace-nowrap ${
                      kitchenMode === 'shop'
                        ? 'bg-[#FACC15] text-[#0F172A]'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Tienda ($ FitCoins)
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {(['all', 'healthy', 'junk'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFoodFilter(cat)}
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                        foodFilter === cat
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? 'Todo' : cat === 'healthy' ? 'Sano (-kg)' : 'Chatarra (+kg)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horizontal Food Cards */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {filteredFoods.map((food) => {
                  const stock = state.inventory[food.id] ?? 0;
                  const isHealthy = food.category === 'healthy';
                  return (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => onFeedOrBuyFood(food, kitchenMode === 'shop' ? 'buy' : 'eat')}
                      className="shrink-0 min-w-[132px] min-h-[66px] p-2 rounded-2xl border-2 border-[#0F172A] bg-slate-800/90 hover:bg-slate-700/90 active:scale-95 transition-transform flex flex-col justify-between text-left cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full gap-1">
                        <span className="text-xs font-extrabold text-white truncate">
                          {food.name}
                        </span>
                        <span
                          className={`text-[10px] font-black tabular-nums ${
                            isHealthy ? 'text-[#10B981]' : 'text-[#F97316]'
                          }`}
                        >
                          {food.weightDelta > 0 ? `+${food.weightDelta}` : food.weightDelta}kg
                        </span>
                      </div>
                      <div className="flex items-center justify-between w-full mt-1 text-[11px] font-bold">
                        {kitchenMode === 'shop' ? (
                          <span className="text-[#FACC15] tabular-nums">
                            Comprar ${food.price}
                          </span>
                        ) : (
                          <span className="text-slate-300 tabular-nums">
                            Stock: {stock}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {kitchenMode === 'shop' ? `Tienes ${stock}` : stock > 0 ? 'Dar' : `$${food.price}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {state.room === 'bano' && (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectBathTool('soap');
                  onQuickScrubSoap();
                }}
                className={`min-h-[56px] px-3 py-2 rounded-2xl border-2 border-[#0F172A] font-extrabold text-xs sm:text-sm flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                  activeBathTool === 'soap'
                    ? 'bg-[#38BDF8] text-[#082F49]'
                    : 'bg-slate-800 text-white'
                }`}
              >
                <span>🧽 Frotar Jabón</span>
                <span className="text-[10px] opacity-80">Espuma ({state.soapBubbles}/24)</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectBathTool(activeBathTool === 'shower' ? 'none' : 'shower')}
                className={`min-h-[56px] px-3 py-2 rounded-2xl border-2 border-[#0F172A] font-extrabold text-xs sm:text-sm flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                  activeBathTool === 'shower'
                    ? 'bg-[#10B981] text-[#052E16]'
                    : 'bg-slate-800 text-white'
                }`}
              >
                <span>🚿 Ducha Agua 3D</span>
                <span className="text-[10px] opacity-80">Enjuagar al 100%</span>
              </button>

              <div className="px-3 py-2 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-center text-center">
                <span className="text-[10px] font-bold text-slate-400">ESTADO BAÑO</span>
                <span className="text-xs font-extrabold text-[#38BDF8] tabular-nums">
                  Higiene {Math.round(state.hygiene)}%
                </span>
              </div>
            </div>
          )}

          {state.room === 'gimnasio' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {GYM_EXERCISES.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => onTriggerExercise(ex)}
                  className="shrink-0 min-w-[165px] min-h-[60px] p-2.5 rounded-2xl border-2 border-[#0F172A] bg-[#10B981] text-[#052E16] font-extrabold text-left active:scale-95 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-black">
                    <span>💪 {ex.name}</span>
                    <span className="tabular-nums">{ex.weightDelta} kg</span>
                  </div>
                  <p className="text-[10px] font-bold mt-1 opacity-90">
                    +{ex.coinReward} FitCoins · -{ex.energyCost}% Energía
                  </p>
                </button>
              ))}

              {LAB_POTIONS.map((pot) => (
                <button
                  key={pot.id}
                  type="button"
                  onClick={() => onUsePotion(pot)}
                  className="shrink-0 min-w-[155px] min-h-[60px] p-2.5 rounded-2xl border-2 border-[#0F172A] bg-slate-800 text-white font-extrabold text-left active:scale-95 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: pot.color }}>🧪 {pot.name}</span>
                    <span className="text-[#FACC15] tabular-nums">${pot.price}</span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1 truncate">{pot.description}</p>
                </button>
              ))}
            </div>
          )}

          {state.room === 'dormitorio' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={onToggleSleep}
                className={`shrink-0 min-w-[145px] min-h-[62px] p-2.5 rounded-2xl border-2 border-[#0F172A] font-extrabold text-left active:scale-95 cursor-pointer ${
                  state.isSleeping
                    ? 'bg-[#8B5CF6] text-white'
                    : 'bg-[#FACC15] text-[#0F172A]'
                }`}
              >
                <div className="text-xs font-black">
                  {state.isSleeping ? '🌙 Lámpara Apagada' : '💡 Lámpara Encendida'}
                </div>
                <div className="text-[10px] mt-1 font-bold">
                  {state.isSleeping ? 'Durmiendo (+Energía)' : 'Toca para dormir'}
                </div>
              </button>

              {WARDROBE_ITEMS.map((item) => {
                const unlocked = state.unlockedCosmetics.includes(item.id);
                const isEquipped = state.equipped[item.slot] === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onEquipOrBuyCosmetic(item)}
                    className={`shrink-0 min-w-[138px] min-h-[62px] p-2.5 rounded-2xl border-2 border-[#0F172A] text-left active:scale-95 cursor-pointer ${
                      isEquipped
                        ? 'bg-[#10B981] text-[#052E16]'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs font-extrabold">
                      <span className="truncate">{item.name}</span>
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-black/40"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                    <div className="text-[10px] font-bold mt-1">
                      {isEquipped
                        ? 'Equipado ✓'
                        : unlocked
                          ? 'Toca para equipar'
                          : item.unlockAtGoal
                            ? 'Meta 65.0 kg'
                            : `Comprar $${item.price}`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {state.room === 'juegos' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => onStartMinigame('jumprope')}
                className="min-h-[60px] p-2.5 rounded-2xl border-2 border-[#0F172A] bg-[#FACC15] text-[#0F172A] text-left font-extrabold active:scale-95 cursor-pointer"
              >
                <div className="text-xs font-black">縄 Cardio Cuerda 3D</div>
                <div className="text-[10px] font-bold mt-0.5">-0.2 kg por combo</div>
              </button>

              <button
                type="button"
                onClick={() => onStartMinigame('runner')}
                className="min-h-[60px] p-2.5 rounded-2xl border-2 border-[#0F172A] bg-[#FF6B35] text-white text-left font-extrabold active:scale-95 cursor-pointer"
              >
                <div className="text-xs font-black">🏃 Gordou Runner 3D</div>
                <div className="text-[10px] font-bold mt-0.5">3 carriles · Esquiva</div>
              </button>

              <button
                type="button"
                onClick={() => onStartMinigame('fooddrop')}
                className="min-h-[60px] p-2.5 rounded-2xl border-2 border-[#0F172A] bg-[#10B981] text-[#052E16] text-left font-extrabold active:scale-95 cursor-pointer"
              >
                <div className="text-xs font-black">🥦 Atrapa lo Sano 3D</div>
                <div className="text-[10px] font-bold mt-0.5">Atrapa verdura 3D</div>
              </button>

              <button
                type="button"
                onClick={() => onStartMinigame('treadmill')}
                className="min-h-[60px] p-2.5 rounded-2xl border-2 border-[#0F172A] bg-[#38BDF8] text-[#082F49] text-left font-extrabold active:scale-95 cursor-pointer"
              >
                <div className="text-xs font-black">⚡ Sprint Caminadora</div>
                <div className="text-[10px] font-bold mt-0.5">Toques rápidos 15s</div>
              </button>
            </div>
          )}

          {/* 5 Room Navigation Thumb Tabs */}
          <nav
            aria-label="Habitaciones de Gordou"
            className="grid grid-cols-5 gap-1.5 pt-1 border-t border-slate-800"
          >
            {rooms.map((r) => {
              const active = state.room === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectRoom(r.id)}
                  className={`min-h-[46px] rounded-xl font-extrabold text-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                    active
                      ? 'text-[#0F172A] shadow-[0_3px_0_#0F172A]'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                  style={active ? { backgroundColor: r.color } : undefined}
                >
                  {r.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
};
