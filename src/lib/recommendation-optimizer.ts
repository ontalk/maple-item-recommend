import type { EquipmentState, EquipmentStateItem } from './equipment-state';
import { calculateCombatPowerDelta } from './combat-power-calculator';

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
  return {
    items: current.items.filter((item) => item.slot !== replacement.slot).concat(replacement),
    mainStat: current.mainStat,
    subStats: current.subStats,
    // final_stat은 원래 캐릭터 기준값으로 고정한다. 교체 장비를 여기에
    // 다시 더하면 다음 단계부터 장비 옵션이 중복 집계된다.
    baseStats: current.baseStats,
    officialCombatPower: current.officialCombatPower,
  };
}

function evaluatePurchaseOrder(current: EquipmentState, selections: OptimizerCandidate[]): { power: number; steps: PurchaseStep[] } {
  let state = current;
  let cumulativeCost = 0;
  let cumulativePower = 0;
  const remaining = [...selections];
  const steps: PurchaseStep[] = [];

  while (remaining.length) {
    const ranked = remaining.map((candidate) => ({
      candidate,
      // 현재 단계의 상태를 기준으로 후보를 다시 계산한다.
      delta: calculateCombatPowerDelta(state, candidate.item).totalDelta,
    })).sort((left, right) =>
      (right.delta / Math.max(right.candidate.price, 1)) -
      (left.delta / Math.max(left.candidate.price, 1))
    );
    const { candidate, delta } = ranked[0];
    remaining.splice(remaining.indexOf(candidate), 1);
    cumulativeCost += candidate.price;
    cumulativePower += delta;
    steps.push({
      ...candidate,
      step: steps.length + 1,
      delta,
      cumulativeCost,
      cumulativePower,
      reason: cumulativePower >= 0 ? '이전 장비 적용 상태에서 다시 계산한 전투력·세트 효과 기준' : '이전 장비 적용 상태에서 다시 계산한 결과',
    });
    state = { ...applyReplacementState(state, candidate.item), officialCombatPower: (state.officialCombatPower ?? 0) + delta };
  }
  return { power: cumulativePower, steps };
}

function powerFor(current: EquipmentState, selections: OptimizerCandidate[]): number {
  return evaluatePurchaseOrder(current, selections).power;
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
  const evaluated = evaluatePurchaseOrder(current, selections);
  return { selections, purchaseOrder: evaluated.steps, cost, power: evaluated.power, targetReached: evaluated.power >= targetIncrease };
}
