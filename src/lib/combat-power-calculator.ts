import type { EquipmentState, EquipmentStateItem } from './equipment-state';
import { calculateSetEffects } from './set-effect-calculator';

function sumStat(state: EquipmentState, key: string, includeItemStats = true): number {
  return (state.baseStats?.[key] ?? 0) + (includeItemStats ? state.items.reduce((total, item) => total + (item.stats[key] ?? 0), 0) : 0);
}

/**
 * 장비 전체를 합산한 전투력 추정식.
 * 퍼센트 옵션은 데이터에서 30(%)으로 들어오므로 /100 후 계산한다.
 */
function formulaPower(state: EquipmentState, includeItemStats = true): number {
  const mainStat = sumStat(state, state.mainStat ?? 'str', includeItemStats);
  const subStat = (state.subStats ?? ['dex', 'int', 'luk'])
    .reduce((total, key) => total + sumStat(state, key, includeItemStats), 0);
  const attack = sumStat(state, 'attackPower', includeItemStats);
  const magic = sumStat(state, 'magicPower', includeItemStats);
  const attackPercent = sumStat(state, 'attackPercent', includeItemStats);
  const magicPercent = sumStat(state, 'magicPercent', includeItemStats);
  const bossDamage = sumStat(state, 'bossDamage', includeItemStats);
  const finalDamage = sumStat(state, 'finalDamage', includeItemStats);
  const criticalDamage = sumStat(state, 'criticalDamage', includeItemStats);
  const attackOrMagic = Math.max(attack * (1 + attackPercent / 100), magic * (1 + magicPercent / 100));
  return (mainStat * 4 + subStat) * 0.01
    * attackOrMagic
    * (1 + bossDamage / 100)
    * (1 + finalDamage / 100)
    * (1.35 + criticalDamage / 100);
}

export interface CombatPowerDelta {
  equipmentPower: number;
  setPower: number;
  totalDelta: number;
}

function subtractStats(next: Record<string, number>, previous: Record<string, number>): Record<string, number> {
  const keys = new Set([...Object.keys(next), ...Object.keys(previous)]);
  return Object.fromEntries([...keys].map((key) => [key, (next[key] ?? 0) - (previous[key] ?? 0)]));
}

function actualStateAfterReplacements(current: EquipmentState, replacements: EquipmentStateItem[]): EquipmentState {
  return replacements.reduce((state, replacement) => ({
    ...state,
    items: state.items.filter((item) => item.slot !== replacement.slot).concat(replacement),
  }), current);
}

export function calculateCombatPowerAfterReplacements(current: EquipmentState, replacements: EquipmentStateItem[]): number {
  const next = actualStateAfterReplacements(current, replacements);
  // final_stat에는 현재 장비가 이미 포함되어 있으므로 교체 장비의 변화량만 더한다.
  // final_stat이 없는 테스트/빈 캐릭터 상태에서는 전체 장비 옵션을 사용한다.
  if (Object.keys(current.baseStats ?? {}).length === 0) return formulaPower(next) + calculateSetEffects(next.items);
  const deltas = replacements.map((replacement) => {
    const previous = current.items.find((item) => item.slot === replacement.slot);
    return { ...replacement, stats: subtractStats(replacement.stats, previous?.stats ?? {}) };
  });
  return formulaPower({ ...current, items: deltas }) + calculateSetEffects(next.items);
}

export function calculateCombatPowerDelta(current: EquipmentState, replacement: EquipmentStateItem): CombatPowerDelta {
  const oldPower = calculateCombatPower(current);
  const nextPower = calculateCombatPowerAfterReplacements(current, [replacement]);
  const nextItems = actualStateAfterReplacements(current, [replacement]).items;
  const setPower = calculateSetEffects(nextItems) - calculateSetEffects(current.items);
  const equipmentPower = nextPower - oldPower - setPower;
  return { equipmentPower, setPower, totalDelta: equipmentPower + setPower };
}

export function calculateCombatPower(state: EquipmentState): number {
  const hasBaseStats = Object.keys(state.baseStats ?? {}).length > 0;
  return formulaPower(state, !hasBaseStats) + calculateSetEffects(state.items);
}
