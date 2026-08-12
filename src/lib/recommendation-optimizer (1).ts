import { calculateSetEffects, calculateSetCounts } from './set-effect-calculator';
import type { SetId, SetStatBonus } from './set-effect-database';

export interface CombinationCandidate {
  slot: string;
  part: string;
  name: string;
  setId?: SetId;
  cost: number;
  directPower: number;
}

export interface CombinationState {
  cost: number;
  power: number;
  selections: CombinationCandidate[];
  setCounts: Record<string, number>;
  setEffects: SetStatBonus;
}

export interface CombinationOptions {
  maxStates?: number;
  /** 세트 효과를 직업/현재 스탯에 맞춘 전투력으로 환산하는 함수 */
  setEffectPower?: (effects: SetStatBonus) => number;
}

function stateFor(selections: CombinationCandidate[], setEffectPower: (effects: SetStatBonus) => number): CombinationState {
  const setCounts = calculateSetCounts(selections.map((candidate) => candidate.setId));
  const setEffects = calculateSetEffects(setCounts);
  return {
    cost: selections.reduce((sum, candidate) => sum + candidate.cost, 0),
    power: selections.reduce((sum, candidate) => sum + candidate.directPower, 0) + setEffectPower(setEffects),
    selections,
    setCounts,
    setEffects,
  };
}

export function optimizeEquipmentCombinations(
  groups: Record<string, CombinationCandidate[]>,
  budget: number,
  targetPower: number,
  options: CombinationOptions = {},
): CombinationState {
  const maxStates = options.maxStates ?? 3000;
  const setEffectPower = options.setEffectPower ?? (() => 0);
  let states: CombinationState[] = [stateFor([], setEffectPower)];

  for (const candidates of Object.values(groups)) {
    const next: CombinationState[] = [...states];
    for (const state of states) {
      for (const candidate of candidates) {
        if (candidate.cost <= 0 || state.cost + candidate.cost > budget) continue;
        if (state.selections.some((selected) => selected.part === candidate.part && selected.name === candidate.name)) continue;
        next.push(stateFor([...state.selections, candidate], setEffectPower));
      }
    }
    states = next
      .sort((left, right) => {
        const leftReached = targetPower > 0 && left.power >= targetPower;
        const rightReached = targetPower > 0 && right.power >= targetPower;
        if (leftReached !== rightReached) return Number(rightReached) - Number(leftReached);
        if (leftReached && rightReached) return left.cost - right.cost || right.power - left.power;
        return (right.power / Math.max(right.cost, 1)) - (left.power / Math.max(left.cost, 1));
      })
      .slice(0, maxStates);
  }

  const reached = states.filter((state) => targetPower > 0 && state.power >= targetPower);
  return (reached.length ? reached : states).sort((left, right) => {
    if (reached.length) return left.cost - right.cost || right.power - left.power;
    return right.power - left.power || left.cost - right.cost;
  })[0] ?? stateFor([], setEffectPower);
}

