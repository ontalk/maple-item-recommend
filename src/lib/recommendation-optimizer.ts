import type { EquipmentState, EquipmentStateItem } from './equipment-state';
import { calculateCombatPower, calculateCombatPowerAfterReplacements, calculateCombatPowerDelta } from './combat-power-calculator';
import { calculateSetEffects } from './set-effect-calculator';

export interface OptimizerCandidate {
  part: string;
  slot: string;
  name: string;
  price: number;
  power: number;
  item: EquipmentStateItem;
  payload: unknown;
}

export interface PurchaseStep extends OptimizerCandidate {
  step: number;
  delta: number;
  cumulativeCost: number;
  cumulativePower: number;
  reason: string;
}

export interface OptimizedRecommendation {
  selections: OptimizerCandidate[];
  purchaseOrder: PurchaseStep[];
  cost: number;
  power: number;
  targetReached: boolean;
}

function applyReplacementState(current: EquipmentState, replacement: EquipmentStateItem): EquipmentState {
  const previous = current.items.find((item) => item.slot === replacement.slot);
  const baseStats = { ...(current.baseStats ?? {}) };
  const keys = new Set([...Object.keys(previous?.stats ?? {}), ...Object.keys(replacement.stats)]);
  keys.forEach((key) => {
    baseStats[key] = (baseStats[key] ?? 0) - (previous?.stats[key] ?? 0) + (replacement.stats[key] ?? 0);
  });
  return {
    items: current.items.filter((item) => item.slot !== replacement.slot).concat(replacement),
    mainStat: current.mainStat,
    subStats: current.subStats,
    baseStats,
    officialCombatPower: current.officialCombatPower,
  };
}

function powerFor(current: EquipmentState, selections: OptimizerCandidate[]): number {
  const replacements = selections.map((candidate) => candidate.item);
  const nextItems = replacements.reduce((items, replacement) => items.filter((item) => item.slot !== replacement.slot).concat(replacement), current.items);
  const currentFormula = calculateCombatPower(current) - calculateSetEffects(current.items);
  const nextFormula = calculateCombatPowerAfterReplacements(current, replacements) - calculateSetEffects(nextItems);
  const equipmentDelta = current.officialCombatPower !== undefined && currentFormula > 0
    ? current.officialCombatPower * ((nextFormula / currentFormula) - 1)
    : nextFormula - currentFormula;
  return equipmentDelta + calculateSetEffects(nextItems) - calculateSetEffects(current.items);
}

function better(current: EquipmentState, left: OptimizerCandidate[], right: OptimizerCandidate[], target: number, preferTarget: boolean): boolean {
  const leftPower = powerFor(current, left);
  const rightPower = powerFor(current, right);
  const leftCost = left.reduce((sum, item) => sum + item.price, 0);
  const rightCost = right.reduce((sum, item) => sum + item.price, 0);
  if (preferTarget && target > 0) return Math.abs(target - leftPower) < Math.abs(target - rightPower) || (Math.abs(target - leftPower) === Math.abs(target - rightPower) && leftCost < rightCost);
  const leftReached = target > 0 && leftPower >= target;
  const rightReached = target > 0 && rightPower >= target;
  return leftReached !== rightReached ? leftReached : leftReached ? leftCost < rightCost : leftPower > rightPower || (leftPower === rightPower && leftCost < rightCost);
}

export function optimizeRecommendations(current: EquipmentState, candidates: OptimizerCandidate[], budget: number, targetIncrease: number, preferTarget = false): OptimizedRecommendation {
  let states: OptimizerCandidate[][] = [[]];
  const groups = [...new Set(candidates.map((candidate) => candidate.slot))];
  for (const slot of groups) {
    const options = candidates.filter((candidate) => candidate.slot === slot);
    const next = [...states];
    for (const state of states) for (const option of options) {
      if (state.some((item) => item.name === option.name)) continue;
      const cost = state.reduce((sum, item) => sum + item.price, 0) + option.price;
      if (option.price > 0 && cost <= budget) next.push([...state, option]);
    }
    states = next.sort((a, b) => better(current, a, b, targetIncrease, preferTarget) ? -1 : 1).slice(0, 3000);
  }
  const selections = states.sort((a, b) => better(current, a, b, targetIncrease, preferTarget) ? -1 : 1)[0] ?? [];
  const cost = selections.reduce((sum, item) => sum + item.price, 0);
  const power = powerFor(current, selections);
  let state = current;
  let cumulativeCost = 0;
  let cumulativePower = 0;
  const remaining = [...selections];
  const purchaseOrder: PurchaseStep[] = [];
  while (remaining.length) {
    const ranked = remaining.map((candidate) => ({ candidate, delta: calculateCombatPowerDelta(state, candidate.item).totalDelta }))
      .sort((a, b) => (b.delta / Math.max(b.candidate.price, 1)) - (a.delta / Math.max(a.candidate.price, 1)));
    const { candidate, delta } = ranked[0];
    remaining.splice(remaining.indexOf(candidate), 1);
    const nextState = applyReplacementState(state, candidate.item);
    nextState.officialCombatPower = (state.officialCombatPower ?? calculateCombatPower(state)) + delta;
    state = nextState;
    cumulativeCost += candidate.price;
    cumulativePower += delta;
    purchaseOrder.push({ ...candidate, step: purchaseOrder.length + 1, delta, cumulativeCost, cumulativePower, reason: cumulativePower >= targetIncrease ? '이 장비 구매로 목표 전투력에 도달' : delta > 0 ? '현재 장비·세트 효과를 반영한 가격 대비 증가 효율이 높음' : '최종 조합의 세트 효과를 활성화하는 장비' });
  }
  return { selections, purchaseOrder, cost, power, targetReached: power >= targetIncrease };
}
