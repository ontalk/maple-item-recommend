// 메이플스토리 전투력 계산 엔진
//
// 인게임 전투력 공식(커뮤니티 검증):
//   전투력 = 스탯 × 공격력 × (1 + 데미지% + 보스데미지%) × (1.35 + 크리티컬데미지%) × (1 + 최종데미지%)
//   스탯 = ⌊(최종 주스탯 × 4 + 최종 부스탯) / 100⌋
//   공격력 = ⌊최종 공격력/마력⌋
//
// 여기서 중요한 점은 "아이템별 증가분을 더하지 않는다"는 것이다.
// 장비를 하나 추가하면 세트 개수가 바뀌고, 그 세트 효과가 다시 스탯/공격력/보공/크뎀에
// 반영되므로 매 단계마다 착용 상태 전체를 다시 계산해야 한다.
//
// 절대값은 넥슨 API가 돌려준 현재 전투력에 맞춰 보정(calibration)하고,
// 아이템 교체·세트 효과로 인한 "변화량"만 공식으로 계산한다.

import type { CharacterItem } from '@/types';
import { CLASS_MAIN_STAT } from '@/types';
import {
  addToBag,
  mergeBags,
  negateBag,
  normalizeEquipmentPart,
  resolveSetBonuses,
  totalSetEffects,
  type ActiveSet,
  type EquippedPiece,
  type StatBag,
  type StatKey,
} from './set-effects';

export interface FinalStats {
  combatPower: number;
  str: number;
  dex: number;
  int: number;
  luk: number;
  maxHp: number;
  attack: number;
  magic: number;
  damage: number;
  bossDamage: number;
  critDamage: number;
  finalDamage: number;
  ignoreDefense: number;
}

type StatName = 'str' | 'dex' | 'int' | 'luk';
export type MainStatKey = StatName | 'maxHp';

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const parsed = Number(value.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function readStat(finalStat: Array<{ stat_name: string; stat_value: string }>, ...names: string[]): number {
  for (const name of names) {
    const found = finalStat.find((stat) => stat.stat_name === name);
    if (found) return toNumber(found.stat_value);
  }
  return 0;
}

export function parseFinalStats(finalStat?: Array<{ stat_name: string; stat_value: string }> | null): FinalStats {
  const stats = Array.isArray(finalStat) ? finalStat : [];
  return {
    combatPower: readStat(stats, '전투력'),
    str: readStat(stats, 'STR'),
    dex: readStat(stats, 'DEX'),
    int: readStat(stats, 'INT'),
    luk: readStat(stats, 'LUK'),
    maxHp: readStat(stats, '최대 HP', '최대HP'),
    attack: readStat(stats, '공격력'),
    magic: readStat(stats, '마력'),
    damage: readStat(stats, '데미지'),
    bossDamage: readStat(stats, '보스 몬스터 데미지', '보스 몬스터 공격 시 데미지', '보스 데미지'),
    critDamage: readStat(stats, '크리티컬 데미지'),
    finalDamage: readStat(stats, '최종 데미지'),
    ignoreDefense: readStat(stats, '방어율 무시'),
  };
}

const MAIN_STAT_LABELS: Record<MainStatKey, string> = {
  str: 'STR', dex: 'DEX', int: 'INT', luk: 'LUK', maxHp: '최대 HP',
};

const SUB_STAT_BY_MAIN: Record<StatName, StatName> = {
  str: 'dex', dex: 'str', int: 'luk', luk: 'dex',
};

function resolveMainStat(characterClass: string): { mainKey: MainStatKey; approximate: boolean } {
  const mapped = CLASS_MAIN_STAT[characterClass];
  if (mapped === 'HP') return { mainKey: 'maxHp', approximate: true };
  const main = (mapped || 'STR').split('/')[0].toLowerCase() as StatName;
  if (main === 'str' || main === 'dex' || main === 'int' || main === 'luk') {
    return { mainKey: main, approximate: mapped === 'STR/DEX/INT' };
  }
  return { mainKey: 'str', approximate: true };
}

/** 잠재능력 문자열("STR +12%", "보스 몬스터 공격 시 데미지 +30%")을 스탯 키로 분류한다. */
function classifyStatLabel(label: string, isPercent: boolean): StatKey | null {
  const text = label.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.includes('보스')) return 'bossDamage';
  if (text.includes('크리티컬') && text.includes('데미지')) return 'critDamage';
  if (text.includes('최종')) return 'finalDamage';
  if (text.includes('방어율') || text.includes('방어력 무시')) return 'ignoreDefense';
  if (text.includes('올스탯')) return isPercent ? 'allStatPct' : 'allStat';
  if (text.includes('공격력')) return isPercent ? 'attackPct' : 'attack';
  if (text.includes('마력')) return isPercent ? 'magicPct' : 'magic';
  if (text.includes('최대 HP') || text.includes('최대HP')) return isPercent ? 'maxHpPct' : 'maxHp';
  if (text.includes('데미지')) return 'damage';
  if (text.startsWith('STR')) return isPercent ? 'strPct' : 'str';
  if (text.startsWith('DEX')) return isPercent ? 'dexPct' : 'dex';
  if (text.startsWith('INT')) return isPercent ? 'intPct' : 'int';
  if (text.startsWith('LUK')) return isPercent ? 'lukPct' : 'luk';
  return null;
}

const POTENTIAL_VALUE_PATTERN = /([+\-]?\d+(?:\.\d+)?)\s*(%?)/;

/** 잠재능력/에디셔널 한 줄을 { 키, 값 } 으로 바꾼다. */
function parsePotentialLine(line: string): { key: StatKey; value: number } | null {
  const text = (line || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const match = text.match(POTENTIAL_VALUE_PATTERN);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value === 0) return null;
  const label = text.slice(0, match.index ?? text.length);
  const key = classifyStatLabel(label, match[2] === '%');
  return key ? { key, value } : null;
}

function bagFromEquipment(items: CharacterItem[]): StatBag {
  const bag: StatBag = {};

  for (const item of items) {
    for (const option of item.item_total_option ?? []) {
      const label = option.option_type || '';
      const isPercent = label.includes('%');
      const value = toNumber(option.option_value);
      const key = classifyStatLabel(label, isPercent);
      if (key) addToBag(bag, key, value);
    }

    for (const potential of [...(item.item_potential_option ?? []), ...(item.item_add_potential_option ?? [])]) {
      const parsed = parsePotentialLine(potential.potential_option_value || '');
      if (parsed) addToBag(bag, parsed.key, parsed.value);
    }
  }

  return bag;
}

function piecesFromItems(items: CharacterItem[]): EquippedPiece[] {
  return items.map((item) => ({
    name: item.item_name || '',
    part: item.item_equipment_part || item.item_slot || '',
  }));
}

export interface CombatModel {
  mainKey: MainStatKey;
  mainStatLabel: string;
  subKey: StatName | null;
  mainBase: number;
  mainPct: number;
  subBase: number;
  subPct: number;
  attackBase: number;
  attackPct: number;
  attackLabel: string;
  damage: number;
  bossDamage: number;
  critDamage: number;
  finalDamage: number;
  ignoreDefense: number;
  calibration: number;
  apiPower: number;
  activeSets: ActiveSet[];
  bag: StatBag;
  approximate: boolean;
  /** 모델이 API 전투력을 재현하지 못한 정도(보정 전 비율) */
  rawPower: number;
}

function rawPowerOf(input: {
  main: number;
  sub: number;
  attack: number;
  damage: number;
  bossDamage: number;
  critDamage: number;
  finalDamage: number;
}): number {
  const stat = Math.floor((input.main * 4 + input.sub) / 100);
  if (stat <= 0 || input.attack <= 0) return 0;
  const damageTerm = 1 + (input.damage + input.bossDamage) / 100;
  const critTerm = 1.35 + input.critDamage / 100;
  const finalTerm = 1 + input.finalDamage / 100;
  return stat * input.attack * damageTerm * critTerm * finalTerm;
}

/**
 * 현재 착용 장비 + 넥슨 API 스탯으로 계산 모델을 만든다.
 * 아이템이 주는 스탯%를 역산해 "기본 스탯"을 구하고, 이후 변화량은
 * 합연산(스탯%) 규칙을 그대로 따라 다시 계산한다.
 */
export function buildCombatModel(
  stats: FinalStats | null,
  items: CharacterItem[],
  characterClass: string,
): CombatModel | null {
  if (!stats || stats.combatPower <= 0) return null;

  const { mainKey, approximate } = resolveMainStat(characterClass);
  const mainPctKey = (`${mainKey}Pct`) as StatKey;
  const subKey: StatName | null = mainKey === 'maxHp' ? null : SUB_STAT_BY_MAIN[mainKey];

  const activeSets = resolveSetBonuses(piecesFromItems(items));
  const bag = mergeBags(bagFromEquipment(items), totalSetEffects(activeSets));

  const mainFinal = mainKey === 'maxHp' ? stats.maxHp : stats[mainKey];
  const subFinal = subKey ? stats[subKey] : 0;
  const mainPct = (bag[mainPctKey] ?? 0) + (bag.allStatPct ?? 0);
  const subPct = subKey ? (bag[`${subKey}Pct` as StatKey] ?? 0) + (bag.allStatPct ?? 0) : 0;

  const usesMagic = stats.magic > stats.attack;
  const attackFinal = usesMagic ? stats.magic : stats.attack;
  const attackPct = (usesMagic ? bag.magicPct : bag.attackPct) ?? 0;

  const mainBase = mainFinal / (1 + mainPct / 100);
  const subBase = subFinal / (1 + subPct / 100);
  const attackBase = attackFinal / (1 + attackPct / 100);

  const rawPower = rawPowerOf({
    main: mainFinal,
    sub: subFinal,
    attack: attackFinal,
    damage: stats.damage,
    bossDamage: stats.bossDamage,
    critDamage: stats.critDamage,
    finalDamage: stats.finalDamage,
  });

  return {
    mainKey,
    mainStatLabel: MAIN_STAT_LABELS[mainKey],
    subKey,
    mainBase,
    mainPct,
    subBase,
    subPct,
    attackBase,
    attackPct,
    attackLabel: usesMagic ? '마력' : '공격력',
    damage: stats.damage,
    bossDamage: stats.bossDamage,
    critDamage: stats.critDamage,
    finalDamage: stats.finalDamage,
    ignoreDefense: stats.ignoreDefense,
    calibration: rawPower > 0 ? stats.combatPower / rawPower : 1,
    apiPower: stats.combatPower,
    activeSets,
    bag,
    approximate,
    rawPower,
  };
}

/** 세트 효과 등 변화분(delta)을 적용한 전투력을 다시 계산한다. */
export function powerWithDelta(model: CombatModel, delta: StatBag): number {
  const mainFlat = (delta[model.mainKey] ?? 0) + (delta.allStat ?? 0);
  const mainPctDelta = (delta[`${model.mainKey}Pct` as StatKey] ?? 0) + (delta.allStatPct ?? 0);
  const main = Math.floor((model.mainBase + mainFlat) * (1 + (model.mainPct + mainPctDelta) / 100));

  let sub = 0;
  if (model.subKey) {
    const subFlat = (delta[model.subKey] ?? 0) + (delta.allStat ?? 0);
    const subPctDelta = (delta[`${model.subKey}Pct` as StatKey] ?? 0) + (delta.allStatPct ?? 0);
    sub = Math.floor((model.subBase + subFlat) * (1 + (model.subPct + subPctDelta) / 100));
  }

  const usesMagic = model.attackLabel === '마력';
  const attackFlat = usesMagic ? (delta.magic ?? 0) : (delta.attack ?? 0);
  const attackPctDelta = usesMagic ? (delta.magicPct ?? 0) : (delta.attackPct ?? 0);
  const attack = Math.floor((model.attackBase + attackFlat) * (1 + (model.attackPct + attackPctDelta) / 100));

  const raw = rawPowerOf({
    main,
    sub,
    attack,
    damage: model.damage + (delta.damage ?? 0),
    bossDamage: model.bossDamage + (delta.bossDamage ?? 0),
    critDamage: model.critDamage + (delta.critDamage ?? 0),
    finalDamage: model.finalDamage + (delta.finalDamage ?? 0),
  });

  return Math.round(raw * model.calibration);
}

export interface PlannedPurchase {
  part: string;
  itemName: string;
  /** 옥션/인게임에서 확인한 해당 아이템의 전투력 증가량 (모르면 0) */
  itemPowerGain: number;
}

export interface SimulationStep {
  index: number;
  part: string;
  itemName: string;
  itemPowerGain: number;
  /** 이 단계에서 새로 발동한 세트 효과가 만든 전투력 (직전 단계 대비 증가분) */
  setPowerGain: number;
  /** 지금까지 세트 효과로 얻은 누적 전투력 */
  cumulativeSetPower: number;
  powerAfter: number;
  totalGain: number;
  activatedTiers: string[];
  activeSetLabels: string[];
}

export interface SimulationResult {
  basePower: number;
  finalPower: number;
  totalGain: number;
  itemPowerTotal: number;
  setPowerTotal: number;
  steps: SimulationStep[];
  finalSets: ActiveSet[];
}

function tierLabels(active: ActiveSet[]): string[] {
  return active.flatMap((set) =>
    set.tiers.map((count) => `${set.name} ${count}세트`)
  );
}

/**
 * 구매 계획을 순서대로 적용하면서, 매 단계마다 착용 상태 전체를 다시 계산한다.
 * 그래서 거공 → 마깃안처럼 연속으로 사면 두 번째 단계에서 칠흑 2세트가
 * 새로 발동하고, 그 보공/공마가 두 번째 증가분에 함께 잡힌다.
 */
export function simulatePurchases(
  model: CombatModel,
  items: CharacterItem[],
  purchases: PlannedPurchase[],
): SimulationResult {
  const equipped: Array<EquippedPiece & { id: number }> = items.map((item, index) => ({
    id: index,
    name: item.item_name || '',
    part: item.item_equipment_part || item.item_slot || '',
  }));
  const consumed = new Set<number>();
  let nextId = items.length;

  const baseSetEffects = totalSetEffects(model.activeSets);
  let previousSetPower = 0;
  let previousTiers = new Set(tierLabels(model.activeSets));
  let itemPowerTotal = 0;

  const steps: SimulationStep[] = purchases.map((purchase, index) => {
    const targetPart = normalizeEquipmentPart(purchase.part);
    const replaceIndex = equipped.findIndex(
      (piece, pieceIndex) =>
        !consumed.has(pieceIndex) && normalizeEquipmentPart(piece.part) === targetPart
    );

    if (replaceIndex >= 0) {
      consumed.add(replaceIndex);
      equipped[replaceIndex] = {
        id: equipped[replaceIndex].id,
        name: purchase.itemName,
        part: purchase.part,
      };
    } else {
      equipped.push({ id: nextId++, name: purchase.itemName, part: purchase.part });
      consumed.add(equipped.length - 1);
    }

    const nextSets = resolveSetBonuses(equipped);
    const nextSetEffects = totalSetEffects(nextSets);
    // 현재 착용 상태(API 전투력에 이미 반영됨) 대비 세트 효과 변화분만 적용한다.
    const setDelta = mergeBags(nextSetEffects, negateBag(baseSetEffects));
    const cumulativeSetPower = powerWithDelta(model, setDelta) - model.apiPower;

    itemPowerTotal += purchase.itemPowerGain;
    const setPowerGain = cumulativeSetPower - previousSetPower;
    const totalGain = itemPowerTotal + cumulativeSetPower;

    const currentTierLabels = new Set(tierLabels(nextSets));
    const activatedTiers = [...currentTierLabels].filter((label) => !previousTiers.has(label));
    previousTiers = currentTierLabels;
    previousSetPower = cumulativeSetPower;

    return {
      index: index + 1,
      part: purchase.part,
      itemName: purchase.itemName,
      itemPowerGain: purchase.itemPowerGain,
      setPowerGain,
      cumulativeSetPower,
      powerAfter: model.apiPower + totalGain,
      totalGain,
      activatedTiers,
      activeSetLabels: nextSets.map((set) => `${set.name} ${set.count}세트`),
    };
  });

  const finalPower = model.apiPower + itemPowerTotal + previousSetPower;

  return {
    basePower: model.apiPower,
    finalPower,
    totalGain: itemPowerTotal + previousSetPower,
    itemPowerTotal,
    setPowerTotal: previousSetPower,
    steps,
    finalSets: resolveSetBonuses(equipped),
  };
}

export function formatPower(value: number): string {
  const rounded = Math.round(value);
  const negative = rounded < 0;
  const abs = Math.abs(rounded);
  const eok = Math.floor(abs / 100000000);
  const man = Math.floor((abs % 100000000) / 10000);
  const rest = abs % 10000;

  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok}억`);
  if (man > 0) parts.push(`${man.toLocaleString()}만`);
  if (rest > 0 || parts.length === 0) parts.push(rest.toLocaleString());
  return `${negative ? '-' : ''}${parts.join(' ')}`;
}

export { MAIN_STAT_LABELS };
