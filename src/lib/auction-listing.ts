// 옥션 실매물 → 후보 장비 옵션 변환기
//
// 옥션 툴팁은 잠재·에디셔널·추옵을 "보스 몬스터 공격 시 데미지 +35%" 같은
// 문자열 줄로 준다. 조합 계산기는 숫자를 받으므로, 줄에서 수치를 뽑아
// 공격력·주스탯%·보공·크뎀·방무·최종뎀으로 나눠 담는다.
// 해석하지 못한 줄은 그대로 남겨 사용자가 직접 확인할 수 있게 한다.

import type { AuctionRawItem } from './auction-extension';
import { EMPTY_ITEM_STATS, type ItemStats } from './item-planner';

type TooltipEntry = string | { text?: string; description?: string; value?: string | number };

export interface ParsedLine {
  text: string;
  handled: boolean;
}

export interface ParsedListing {
  /** 메소 단위 가격 */
  price: number;
  /** 억 메소 단위 가격 */
  priceEok: number;
  stats: ItemStats;
  lines: ParsedLine[];
  /** 텍스트에 없어 툴팁 숫자 필드에서 공격력을 가져왔는지 */
  attackFromTooltip: boolean;
}

const MAIN_LABELS: Record<string, string[]> = {
  str: ['STR', '힘'],
  dex: ['DEX', '민첩'],
  int: ['INT', '지력'],
  luk: ['LUK', '운'],
};

export function entryToText(entry: TooltipEntry): string {
  if (typeof entry === 'string') return entry;
  return entry.text ?? entry.description ?? (entry.value === undefined ? '' : String(entry.value));
}

/** "1,999,999,999" / "1999999999" / 1999999999 → 메소 */
export function parseMesos(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  const text = value.trim().replace(/,/g, '').replace(/메소$/i, '').trim();
  if (!text) return 0;
  const plain = Number(text);
  return Number.isFinite(plain) ? plain : 0;
}

function numericExtra(line: string): { value: number; isPercent: boolean } | null {
  const match = line.match(/\+?\s*(\d+(?:\.\d+)?)\s*(%)?/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return { value, isPercent: Boolean(match[2]) };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mainStatIn(line: string, mainKey: string): { value: number; isPercent: boolean } | null {
  const labels = MAIN_LABELS[mainKey] ?? MAIN_LABELS.str;
  for (const label of labels) {
    // 옥션 툴팁은 "STR : +13%"처럼 콜론과 부호를 함께 쓰는 경우가 많다.
    const match = line.match(
      new RegExp(`(^|[^A-Z])${escapeRegExp(label)}\\s*(?:[:=]\\s*)?\\+?\\s*(\\d+(?:\\.\\d+)?)\\s*(%)?`, 'i'),
    );
    if (!match) continue;
    const value = Number(match[2]);
    if (!Number.isFinite(value)) continue;
    return { value, isPercent: Boolean(match[3]) };
  }
  return null;
}

/** 툴팁 숫자 맵에서 키워드에 해당하는 값을 찾는다. */
function pickFromMaps(maps: Array<Record<string, number> | undefined>, keywords: RegExp[]): number | undefined {
  for (const map of maps) {
    if (!map) continue;
    for (const [key, value] of Object.entries(map)) {
      if (!Number.isFinite(Number(value)) || Number(value) === 0) continue;
      const normalized = key.replace(/[\s_-]/g, '').toLowerCase();
      if (keywords.some((keyword) => keyword.test(normalized))) return Number(value);
    }
  }
  return undefined;
}

export function parseListingStats(
  item: AuctionRawItem,
  options: { mainKey: string; attackLabel: string },
): ParsedListing {
  const stats: ItemStats = { ...EMPTY_ITEM_STATS };
  const lines: ParsedLine[] = [];
  const tooltip = item.toolTip;
  const upgradeInfo = tooltip?.upgradeInfo;

  const entrySources: TooltipEntry[][] = [
    upgradeInfo?.potential?.entries ?? [],
    upgradeInfo?.additionalPotential?.entries ?? [],
    upgradeInfo?.exOption?.entries ?? [],
  ];

  for (const source of entrySources) {
    for (const entry of source) {
      const text = entryToText(entry).trim();
      if (!text) continue;

      let handled = true;
      if (/크리티컬\s*데미지/.test(text)) {
        const extra = numericExtra(text);
        if (extra) stats.critDamage += extra.value;
        else handled = false;
      } else if (/보스/.test(text) && /데미지/.test(text)) {
        const extra = numericExtra(text);
        if (extra) stats.bossDamage += extra.value;
        else handled = false;
      } else if (/방어율\s*무시/.test(text)) {
        const extra = numericExtra(text);
        if (extra) stats.ignoreDefense += extra.value;
        else handled = false;
      } else if (/최종\s*데미지/.test(text)) {
        const extra = numericExtra(text);
        if (extra) stats.finalDamage += extra.value;
        else handled = false;
      } else if (/올스탯|모든\s*능력치/.test(text)) {
        const extra = numericExtra(text);
        if (extra) {
          if (extra.isPercent) stats.mainPct += extra.value;
          else stats.mainFlat += extra.value;
        } else handled = false;
      } else if (/데미지/.test(text)) {
        const extra = numericExtra(text);
        if (extra) stats.damage += extra.value;
        else handled = false;
      } else if (options.attackLabel && text.includes(options.attackLabel)) {
        const extra = numericExtra(text);
        // 공격력 %는 조합 계산기에 입력 칸이 없으므로 직접 확인하도록 남긴다.
        if (extra && !extra.isPercent) stats.attack += extra.value;
        else handled = false;
      } else {
        const main = mainStatIn(text, options.mainKey);
        if (main) {
          if (main.isPercent) stats.mainPct += main.value;
          else stats.mainFlat += main.value;
        } else {
          handled = false;
        }
      }

      lines.push({ text, handled });
    }
  }

  const maps = [
    tooltip?.stat,
    tooltip?.baseStat,
    tooltip?.starforceStat,
    tooltip?.upgradeStat,
    tooltip?.exOptionStat,
  ];

  // 스타포스·주문서가 올린 공격력/주스탯은 문자열 줄에 없을 수 있다.
  // 텍스트에서 못 찾았을 때만 숫자 필드에서 보충해 이중 계산을 피한다.
  // 문자열 줄에는 기본 공격력/스타포스/주문서가 빠져 있고 추옵만 들어 있다.
  // 숫자 필드의 총합이 있으면 그쪽을 쓴다(둘을 더하면 이중 계산이 된다).
  let attackFromTooltip = false;
  const attackFromTooltipValue = pickFromMaps(maps, [/attack/, /공격력/, /마력/, /magicpower/]);
  if (attackFromTooltipValue !== undefined) {
    stats.attack = attackFromTooltipValue;
    attackFromTooltip = true;
  }

  const mainLabels = MAIN_LABELS[options.mainKey] ?? MAIN_LABELS.str;
  const mainFlatFromTooltip = pickFromMaps(maps, mainLabels.map((label) => new RegExp(label.toLowerCase())));
  if (mainFlatFromTooltip !== undefined) stats.mainFlat = mainFlatFromTooltip;

  if (stats.bossDamage === 0) {
    const fromTooltip = pickFromMaps(maps, [/bossdamage/, /보스/]);
    if (fromTooltip !== undefined) stats.bossDamage = fromTooltip;
  }

  if (stats.ignoreDefense === 0) {
    const fromTooltip = pickFromMaps(maps, [/ignoredefen[cs]e/, /방어율무시/]);
    if (fromTooltip !== undefined) stats.ignoreDefense = fromTooltip;
  }

  if (stats.critDamage === 0) {
    const fromTooltip = pickFromMaps(maps, [/criticaldamage/, /크리티컬/]);
    if (fromTooltip !== undefined) stats.critDamage = fromTooltip;
  }

  const starforce = upgradeInfo?.starForce?.current ?? tooltip?.starforce ?? item.starforce;
  if (starforce) lines.unshift({ text: `스타포스 ${starforce}성`, handled: true });

  const price = parseMesos(item.pricePerItem || item.price);
  return {
    price,
    priceEok: price / 100000000,
    stats,
    lines,
    attackFromTooltip,
  };
}
