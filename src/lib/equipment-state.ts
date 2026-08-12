import type { AuctionRawItem } from './auction-extension';
import type { CharacterItem, CharacterStat } from '@/types';
import { CLASS_MAIN_STAT } from '@/types';

export type EquipmentSlot = string;

export interface EquipmentStateItem {
  slot: EquipmentSlot;
  part: string;
  name: string;
  setName: string | null;
  stats: Record<string, number>;
  source: CharacterItem | AuctionRawItem;
}

export interface EquipmentState {
  items: EquipmentStateItem[];
  mainStat?: string;
  subStats?: string[];
  baseStats?: Record<string, number>;
}

function numbers(...values: unknown[]): number[] {
  return values.map(Number).filter(Number.isFinite);
}

function normalizeStatKey(key: string, value?: unknown): string {
  const text = `${key} ${String(value ?? '')}`.toLowerCase().replace(/\s/g, '');
  if (text.includes('str')) return 'str';
  if (text.includes('dex')) return 'dex';
  if (text.includes('int')) return 'int';
  if (text.includes('luk')) return 'luk';
  if (text.includes('주스탯')) return 'mainStat';
  if (text.includes('부스탯')) return 'subStat';
  if (text.includes('공격력%') || text.includes('공격력퍼') || text.includes('attackpercent')) return 'attackPercent';
  if (text.includes('마력%') || text.includes('마력퍼') || text.includes('magicpercent')) return 'magicPercent';
  if (text.includes('공격력') || text.includes('attackpower')) return 'attackPower';
  if (text.includes('마력') || text.includes('magicpower')) return 'magicPower';
  if (text.includes('보스') || text.includes('bossdamage')) return 'bossDamage';
  if (text.includes('최종데미지') || text.includes('finaldamage')) return 'finalDamage';
  if (text.includes('크리티컬데미지') || text.includes('criticaldamage')) return 'criticalDamage';
  return key;
}

function mergeStats(...stats: Array<Record<string, number> | undefined>): Record<string, number> {
  return stats.reduce<Record<string, number>>((result, current) => {
    Object.entries(current ?? {}).forEach(([key, value]) => {
      const number = Number(value);
      if (Number.isFinite(number)) {
        const normalized = normalizeStatKey(key);
        result[normalized] = (result[normalized] ?? 0) + number;
      }
    });
    return result;
  }, {});
}

export function inferSetName(name: string, explicit?: string | null, categories?: string[]): string | null {
  if (explicit?.trim()) return explicit.trim();
  const text = `${name} ${(categories ?? []).join(' ')}`;
  const sets: Array<[string, string]> = [
    ['에테르넬', '에테르넬'], ['아케인셰이드', '아케인셰이드'], ['앱솔랩스', '앱솔랩스'],
    ['여명', '여명'], ['데이브레이크', '여명'], ['에스텔라', '여명'], ['트와일라이트', '여명'],
    ['가디언 엔젤', '여명'], ['칠흑', '칠흑'], ['루즈 컨트롤', '칠흑'], ['몽환의 벨트', '칠흑'],
    ['거대한 공포', '칠흑'], ['고통의 근원', '칠흑'], ['커맨더 포스', '칠흑'],
    ['보스장신구', '보스장신구'],
  ];
  return sets.find(([keyword]) => text.includes(keyword))?.[1] ?? null;
}

export function characterItemToStateItem(item: CharacterItem, index = 0): EquipmentStateItem {
  const stats = item.item_total_option.reduce<Record<string, number>>((result, option) => {
    const value = Number(String(option.option_value).replace(/[^\d.-]/g, ''));
    if (Number.isFinite(value)) {
      const key = normalizeStatKey(option.option_type, option.option_value);
      result[key] = (result[key] ?? 0) + value;
    }
    return result;
  }, {});
  return {
    slot: item.item_slot || `${item.item_equipment_part}${index + 1}`,
    part: item.item_equipment_part,
    name: item.item_name,
    setName: inferSetName(item.item_name, item.item_set_name),
    stats,
    source: item,
  };
}

export function auctionCandidateToStateItem(item: AuctionRawItem, part: string, slot = part): EquipmentStateItem {
  const tooltip = item.toolTip;
  const stats = mergeStats(tooltip?.stat, tooltip?.baseStat, tooltip?.starforceStat, tooltip?.upgradeStat, tooltip?.exOptionStat);
  const attack = numbers(stats.attackPower, stats.magicPower, (item as AuctionRawItem & { attackPowerDiff?: number }).attackPowerDiff)[0];
  if (attack !== undefined && stats.attackPower === undefined && stats.magicPower === undefined) stats.attackPower = attack;
  return {
    slot,
    part,
    name: item.itemName,
    setName: inferSetName(item.itemName, null, tooltip?.categories),
    stats,
    source: item,
  };
}

export function equipmentStateFromCharacter(items: CharacterItem[], characterClass?: string, characterStats: CharacterStat[] = []): EquipmentState {
  const mainStat = CLASS_MAIN_STAT[characterClass ?? ''] ?? 'STR';
  const subStats = ['STR', 'DEX', 'INT', 'LUK'].filter((stat) => stat !== mainStat).map((stat) => stat.toLowerCase());
  const baseStats = characterStats.reduce<Record<string, number>>((result, stat) => {
    const value = Number(String(stat.stat_value).replace(/[^\d.-]/g, ''));
    if (Number.isFinite(value)) result[normalizeStatKey(stat.stat_name, stat.stat_value)] = value;
    return result;
  }, {});
  return { items: items.map(characterItemToStateItem), mainStat: mainStat.toLowerCase(), subStats, baseStats };
}

export function replaceEquipment(state: EquipmentState, replacement: EquipmentStateItem): EquipmentState {
  const sameSlot = state.items.findIndex((item) => item.slot === replacement.slot);
  if (sameSlot >= 0) {
    const items = [...state.items];
    items[sameSlot] = replacement;
    return { items };
  }
  return { items: [...state.items, replacement] };
}
