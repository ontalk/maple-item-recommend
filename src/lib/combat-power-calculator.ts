import type { EquipmentState, EquipmentStateItem } from './equipment-state';
import { calculateSetEffects } from './set-effect-calculator';

function sumStat(state: EquipmentState, key: string): number {
  return (state.baseStats?.[key] ?? 0) + state.items.reduce((total, item) => total + (item.stats[key] ?? 0), 0);
}

/**
 * 장비 전체를 합산한 전투력 추정식.
 * 퍼센트 옵션은 데이터에서 30(%)으로 들어오므로 /100 후 계산한다.
 */
function formulaPower(state: EquipmentState): number {
  const mainStat = sumStat(state, state.mainStat ?? 'str');
  const subStat = (state.subStats ?? ['dex', 'int', 'luk'])
    .reduce((total, key) => total + sumStat(state, key), 0);
  const attack = sumStat(state, 'attackPower');
  const magic = sumStat(state, 'magicPower');
  const attackPercent = sumStat(state, 'attackPercent');
  const magicPercent = sumStat(state, 'magicPercent');
  const bossDamage = sumStat(state, 'bossDamage');
  const finalDamage = sumStat(state, 'finalDamage');
  const criticalDamage = sumStat(state, 'criticalDamage');
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

export function calculateCombatPowerDelta(current: EquipmentState, replacement: EquipmentStateItem): CombatPowerDelta {
  const nextItems = current.items.filter((item) => item.slot !== replacement.slot).concat(replacement);
  const oldEquipmentPower = formulaPower(current);
  const newEquipmentPower = formulaPower({ ...current, items: nextItems });
  const setPower = calculateSetEffects(nextItems) - calculateSetEffects(current.items);
  const equipmentPower = newEquipmentPower - oldEquipmentPower;
  return { equipmentPower, setPower, totalDelta: equipmentPower + setPower };
}

export function calculateCombatPower(state: EquipmentState): number {
  return formulaPower(state) + calculateSetEffects(state.items);
}
