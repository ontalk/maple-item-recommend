// 옥션 후보 장비 조합 평가기
//
// maplescouter(환산 주스탯) 방식의 핵심은 "지금 내 스탯에서 1공격력/1보공%가
// 전투력을 얼마나 올리는가"를 먼저 구하고, 그 한계 기여도로 아이템을 환산하는 것이다.
// 전투력은 곱셈식이라 같은 옵션이라도 현재 수치에 따라 값이 달라지므로,
// 후보 조합마다 착용 상태 전체(아이템 옵션 + 세트 효과)를 다시 계산한다.

import type { CharacterItem } from '@/types';
import { equipmentStatBag, powerWithDelta, type CombatModel } from './combat-power';
import {
  mergeBags,
  negateBag,
  normalizeEquipmentPart,
  resolveSetBonuses,
  totalSetEffects,
  type EquippedPiece,
  type StatBag,
  type StatKey,
} from './set-effects';

export interface ItemStats {
  /** 공격력(마법사는 마력) */
  attack: number;
  /** 주스탯 고정값 */
  mainFlat: number;
  /** 주스탯 % */
  mainPct: number;
  /** 보스 몬스터 데미지 % */
  bossDamage: number;
  /** 방어율 무시 % (전투력에는 직접 반영되지 않음) */
  ignoreDefense: number;
  /** 크리티컬 데미지 % */
  critDamage: number;
  /** 최종 데미지 % */
  finalDamage: number;
  /** 데미지 % */
  damage: number;
}

export const EMPTY_ITEM_STATS: ItemStats = {
  attack: 0,
  mainFlat: 0,
  mainPct: 0,
  bossDamage: 0,
  ignoreDefense: 0,
  critDamage: 0,
  finalDamage: 0,
  damage: 0,
};

export interface CandidateItem {
  id: string;
  part: string;
  name: string;
  /** 억 메소 단위 가격 */
  priceEok: number;
  stats: ItemStats;
}

export interface PlanEvaluation {
  picks: CandidateItem[];
  costEok: number;
  finalPower: number;
  totalGain: number;
  itemPowerGain: number;
  setPowerGain: number;
  activeTiers: string[];
  /** 억 메소당 전투력 증가 */
  valuePerEok: number;
  /** 증가분을 주스탯으로 환산한 값 */
  equivalentMainStat: number;
}

const statKeyOf = (model: CombatModel) => (model.attackLabel === '마력' ? 'magic' : 'attack') as StatKey;

export function statsToBag(model: CombatModel, stats: ItemStats): StatBag {
  const bag: StatBag = {};
  const mainKey = model.mainKey as StatKey;
  const mainPctKey = `${model.mainKey}Pct` as StatKey;
  const attackKey = statKeyOf(model);

  const add = (key: StatKey, value: number) => {
    if (!value) return;
    bag[key] = (bag[key] ?? 0) + value;
  };

  add(mainKey, stats.mainFlat);
  add(mainPctKey, stats.mainPct);
  add(attackKey, stats.attack);
  add('bossDamage', stats.bossDamage);
  add('ignoreDefense', stats.ignoreDefense);
  add('critDamage', stats.critDamage);
  add('finalDamage', stats.finalDamage);
  add('damage', stats.damage);
  return bag;
}

/** 후보를 반영한 착용 상태(같은 부위는 교체) */
function piecesFor(items: CharacterItem[], picks: CandidateItem[]): EquippedPiece[] {
  const equipped: EquippedPiece[] = items.map((item) => ({
    name: item.item_name || '',
    part: item.item_equipment_part || item.item_slot || '',
  }));

  for (const pick of picks) {
    const target = normalizeEquipmentPart(pick.part);
    const index = equipped.findIndex((piece) => normalizeEquipmentPart(piece.part) === target);
    const piece = { name: pick.name, part: pick.part };
    if (index >= 0) equipped[index] = piece;
    else equipped.push(piece);
  }

  return equipped;
}

/** 같은 부위를 이미 착용 중이면 그 장비의 옵션 기여분을 빼야 순증가가 된다. */
function replacedBag(items: CharacterItem[], picks: CandidateItem[]): StatBag {
  let bag: StatBag = {};
  const seen = new Set<string>();

  for (const pick of picks) {
    const target = normalizeEquipmentPart(pick.part);
    if (seen.has(target)) continue;
    seen.add(target);

    const oldItem = items.find(
      (item) => normalizeEquipmentPart(item.item_equipment_part || item.item_slot || '') === target,
    );
    if (!oldItem) continue;

    bag = mergeBags(bag, equipmentStatBag([oldItem]));
  }

  return bag;
}

/** 1 주스탯 / 1 공격력이 올리는 전투력 (환산 기준) */
export function marginalValues(model: CombatModel): {
  perMainStat: number;
  perAttack: number;
  attackToMainStat: number;
  perBossDamage: number;
  perCritDamage: number;
  perFinalDamage: number;
} {
  const mainKey = model.mainKey as StatKey;
  const base = model.apiPower;
  // 전투력 공식이 ⌊(주스탯×4+부스탯)/100⌋ 로 내림하기 때문에
  // 1짜리 변화는 0으로 잡힐 수 있다. 충분히 큰 폭으로 재고 나눠 평균 기여도를 쓴다.
  const mainStep = 1000;
  const attackStep = 100;
  const perMainStat = (powerWithDelta(model, { [mainKey]: mainStep }) - base) / mainStep;
  const perAttack = (powerWithDelta(model, { [statKeyOf(model)]: attackStep }) - base) / attackStep;
  const perBossDamage = powerWithDelta(model, { bossDamage: 1 }) - base;
  const perCritDamage = powerWithDelta(model, { critDamage: 1 }) - base;
  const perFinalDamage = powerWithDelta(model, { finalDamage: 1 }) - base;

  return {
    perMainStat,
    perAttack,
    attackToMainStat: perMainStat > 0 ? perAttack / perMainStat : 0,
    perBossDamage,
    perCritDamage,
    perFinalDamage,
  };
}

export function evaluatePlan(
  model: CombatModel,
  items: CharacterItem[],
  picks: CandidateItem[],
): PlanEvaluation {
  const nextSets = resolveSetBonuses(piecesFor(items, picks));
  const setDelta = mergeBags(totalSetEffects(nextSets), negateBag(totalSetEffects(model.activeSets)));

  const newItemBag = picks.reduce((acc, pick) => mergeBags(acc, statsToBag(model, pick.stats)), {} as StatBag);
  const itemBag = mergeBags(newItemBag, negateBag(replacedBag(items, picks)));

  const finalPower = powerWithDelta(model, mergeBags(setDelta, itemBag));
  const itemPowerGain = powerWithDelta(model, itemBag) - model.apiPower;
  const totalGain = finalPower - model.apiPower;

  const costEok = picks.reduce((sum, pick) => sum + (Number.isFinite(pick.priceEok) ? pick.priceEok : 0), 0);
  const perMainStat = marginalValues(model).perMainStat;

  return {
    picks,
    costEok,
    finalPower,
    totalGain,
    itemPowerGain,
    setPowerGain: totalGain - itemPowerGain,
    activeTiers: nextSets.flatMap((set) => set.tiers.map((count) => `${set.name} ${count}세트`)),
    valuePerEok: costEok > 0 ? totalGain / costEok : 0,
    equivalentMainStat: perMainStat > 0 ? totalGain / perMainStat : 0,
  };
}

export interface RankedPlans {
  plans: PlanEvaluation[];
  bestPower: PlanEvaluation | null;
  bestValue: PlanEvaluation | null;
  bestForTarget: PlanEvaluation | null;
  truncated: boolean;
}

/**
 * 후보들의 부분집합을 모두 평가한다. 같은 부위가 둘 이상 들어간 조합은 제외하고,
 * 조합 수는 2^10(1024)개로 제한한다.
 */
export function rankPlans(
  model: CombatModel,
  items: CharacterItem[],
  candidates: CandidateItem[],
  options: { targetGain?: number; limit?: number } = {},
): RankedPlans {
  const limit = options.limit ?? 10;
  const usable = candidates.slice(0, limit);
  const plans: PlanEvaluation[] = [];

  const total = 1 << usable.length;
  for (let mask = 1; mask < total; mask += 1) {
    const picks: CandidateItem[] = [];
    let duplicatePart = false;

    for (let index = 0; index < usable.length; index += 1) {
      if (!(mask & (1 << index))) continue;
      const candidate = usable[index];
      const part = normalizeEquipmentPart(candidate.part);
      if (picks.some((pick) => normalizeEquipmentPart(pick.part) === part)) {
        duplicatePart = true;
        break;
      }
      picks.push(candidate);
    }

    if (duplicatePart || !picks.length) continue;
    plans.push(evaluatePlan(model, items, picks));
  }

  plans.sort((a, b) => b.totalGain - a.totalGain);

  const bestPower = plans[0] ?? null;
  const bestValue = plans
    .filter((plan) => plan.costEok > 0)
    .reduce<PlanEvaluation | null>((best, plan) => (!best || plan.valuePerEok > best.valuePerEok ? plan : best), null);

  const targetGain = options.targetGain ?? 0;
  const bestForTarget = targetGain > 0
    ? plans
        .filter((plan) => plan.totalGain >= targetGain)
        .reduce<PlanEvaluation | null>(
          (best, plan) => (!best || plan.costEok < best.costEok ? plan : best),
          null,
        )
    : null;

  return { plans, bestPower, bestValue, bestForTarget, truncated: candidates.length > limit };
}
