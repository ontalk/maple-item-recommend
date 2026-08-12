import type { EquipmentStateItem } from './equipment-state';
import { SET_EFFECT_DATABASE, type SetId, type SetStatBonus } from './set-effect-database';

export function calculateSetCounts(items: EquipmentStateItem[]): Record<string, number>;
export function calculateSetCounts(ids: Array<SetId | undefined>): Record<string, number>;
export function calculateSetCounts(itemsOrIds: EquipmentStateItem[] | Array<SetId | undefined>): Record<string, number> {
  return itemsOrIds.reduce<Record<string, number>>((counts, value) => {
    const setName = typeof value === 'object' ? value.setName : value;
    if (setName) counts[setName] = (counts[setName] ?? 0) + 1;
    return counts;
  }, {});
}

export function calculateSetEffects(items: EquipmentStateItem[]): number;
export function calculateSetEffects(counts: Record<string, number>): SetStatBonus;
export function calculateSetEffects(itemsOrCounts: EquipmentStateItem[] | Record<string, number>): number | SetStatBonus {
  if (!Array.isArray(itemsOrCounts)) {
    return Object.entries(itemsOrCounts).reduce<SetStatBonus>((bonuses, [setName, count]) => {
      bonuses[setName] = Object.entries(SET_EFFECT_DATABASE[setName]?.thresholds ?? {})
        .filter(([threshold]) => count >= Number(threshold))
        .reduce((sum, [, power]) => sum + power, 0);
      return bonuses;
    }, {});
  }
  const items = itemsOrCounts;
  const counts = calculateSetCounts(items);
  return Object.entries(counts).reduce((total, [setName, count]) => {
    const thresholds = SET_EFFECT_DATABASE[setName]?.thresholds ?? {};
    return total + Object.entries(thresholds)
      .filter(([threshold]) => count >= Number(threshold))
      .reduce((sum, [, power]) => sum + power, 0);
  }, 0);
}

export function calculateSetEffectsFromItems(items: EquipmentStateItem[]): number {
  return calculateSetEffects(items);
}

export function setIdFromLegacyName(name: string | null | undefined): string | null {
  return name ? Object.keys(SET_EFFECT_DATABASE).find((set) => name.includes(set)) ?? name : null;
}
