import type {
  BenchmarkComparison,
  BenchmarkItem,
  CharacterItem,
  EquipmentRecommendation,
  RecommendationOption,
  RecommendationResponse,
  RecommendationSummary,
} from '@/types';
import { CLASS_MAIN_STAT, EQUIPMENT_PRIORITY } from '@/types';

type EquipmentPart = BenchmarkItem['equipment_part'];

const DAWN_KEYWORDS = ['여명', '데이브레이크', '에스텔라', '트와일라이트', '가디언 엔젤', '가엔링'];
const BLACK_KEYWORDS = ['칠흑', '루즈 컨트롤', '몽환의 벨트', '거대한 공포', '창세의 뱃지', '마력이 깃든 안대', '커맨더 포스'];

const TWO_HUNDRED_MILLION_MINIMUM: BenchmarkItem[] = [
  { equipment_part: '무기', target_item: '아케인셰이드 무기', track: '공용', target_starforce: 17, target_potential: '유니크 2줄 이상', estimated_cost: 1800000000, rationale: '방어구보다 먼저 공격력·보스 장비의 기반을 확보합니다.' },
  { equipment_part: '모자', target_item: '앱솔랩스/아케인셰이드 모자', track: '공용', target_starforce: 17, target_potential: '유니크 2줄 이상', estimated_cost: 700000000, rationale: '17성·유니크를 최소선으로 두는 가성비 방어구 축입니다.' },
  { equipment_part: '상의', target_item: '앱솔랩스/아케인셰이드 상의', track: '공용', target_starforce: 17, target_potential: '유니크 2줄 이상', estimated_cost: 700000000, rationale: '세트 효과를 깨지 않는 범위에서 맞춥니다.' },
  { equipment_part: '하의', target_item: '앱솔랩스/아케인셰이드 하의', track: '공용', target_starforce: 17, target_potential: '유니크 2줄 이상', estimated_cost: 700000000, rationale: '세트 효과를 깨지 않는 범위에서 맞춥니다.' },
  { equipment_part: '반지', target_item: '가디언 엔젤 링', track: '여명 유지', target_starforce: 17, target_potential: '유니크 2줄 이상', estimated_cost: 900000000, rationale: '여명 세트의 중심 파츠입니다. 칠흑으로 즉시 넘어가기보다 먼저 유지합니다.' },
  { equipment_part: '펜던트', target_item: '데이브레이크 펜던트', track: '여명 유지', target_starforce: 17, target_potential: '유니크 2줄 이상', estimated_cost: 1200000000, rationale: '도미네이터 펜던트와 조합해 여명 세트 효과를 노립니다.' },
  { equipment_part: '귀고리', target_item: '에스텔라 이어링', track: '여명 유지', target_starforce: 17, target_potential: '유니크 2줄 이상', estimated_cost: 1000000000, rationale: '2억대 목표에서는 칠흑 귀고리보다 비용 대비 안정적입니다.' },
  { equipment_part: '얼굴장식', target_item: '트와일라이트 마크', track: '여명 유지', target_starforce: 17, target_potential: '유니크 2줄 이상', estimated_cost: 800000000, rationale: '여명 세트 수를 채우는 가성비 파츠입니다.' },
];

function normalizeEquipmentPart(part: string): EquipmentPart | string {
  if (part.startsWith('반지')) return '반지';
  if (part.startsWith('펜던트')) return '펜던트';
  if (part.replace(/\s/g, '') === '기계심장') return '기계심장';
  return part;
}

function getPriority(part: string): number {
  const normalized = normalizeEquipmentPart(part);
  const exactIndex = EQUIPMENT_PRIORITY.indexOf(part);
  const normalizedIndex = EQUIPMENT_PRIORITY.findIndex((value) => normalizeEquipmentPart(value) === normalized);
  return exactIndex >= 0 ? exactIndex : normalizedIndex >= 0 ? normalizedIndex : 999;
}

function getMainStat(characterClass: string): string {
  return CLASS_MAIN_STAT[characterClass] || '주스탯';
}

function includesOneOf(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

function getTargetRange(targetCombatPower: number): string {
  if (targetCombatPower <= 100000000) return '1억대';
  if (targetCombatPower < 300000000) return '2억대';
  return `${Math.floor(targetCombatPower / 100000000)}억대`;
}

function buildBenchmark(items: CharacterItem[], targetCombatPower: number): BenchmarkComparison {
  const names = items.map((item) => item.item_name || '');
  const dawn = names.filter((name) => includesOneOf(name, DAWN_KEYWORDS));
  const black = names.filter((name) => includesOneOf(name, BLACK_KEYWORDS));
  const recommendedTrack = black.length > 0 ? '혼합' : '여명 유지';

  return {
    target_combat_power: targetCombatPower,
    range_label: getTargetRange(targetCombatPower),
    source: 'template',
    source_label: '현재는 2억대 최소 세팅 기준표입니다. 전 서버 표본 DB가 연결되면 실제 착용 비율과 평균 강화 수치로 자동 대체됩니다.',
    dawn_items_equipped: dawn,
    black_items_equipped: black,
    recommended_track: recommendedTrack,
    minimum_plan: TWO_HUNDRED_MILLION_MINIMUM,
  };
}

function createOption(item: CharacterItem, standard: BenchmarkItem, isDawnToBlack: boolean): RecommendationOption {
  const currentStar = Number(item.item_starforce || 0);
  const belowStar = currentStar < standard.target_starforce;
  const replacementNeeded = !item.item_name.includes(standard.target_item.split(' ')[0]);

  if (replacementNeeded) {
    return {
      type: 'replace',
      action: `${standard.target_item}로 교체`,
      estimated_cost: standard.estimated_cost,
      expected_stat_gain: [{ stat_name: '주스탯/공격력', current_value: 0, expected_value: 0, gain: 0 }],
      success_rate: 1,
      risk_level: 'low',
      description: isDawnToBlack
        ? `현재 여명 파츠입니다. 2억대 최소 목표에서는 칠흑 직행보다 ${standard.target_item} 기준의 여명 세트 유지가 비용 대비 안정적입니다.`
        : `${standard.rationale} 목표는 ${standard.target_starforce}성 · ${standard.target_potential}입니다.`,
    };
  }

  return {
    type: 'starforce',
    action: `${currentStar}성 → ${standard.target_starforce}성 강화`,
    estimated_cost: belowStar ? Math.max(100000000, Math.round(standard.estimated_cost * 0.25)) : 0,
    expected_stat_gain: [{ stat_name: '주스탯', current_value: 0, expected_value: 0, gain: 0 }],
    success_rate: belowStar ? 0.5 : 1,
    risk_level: belowStar ? 'medium' : 'low',
    description: belowStar
      ? `${standard.target_item}을 유지하고 ${standard.target_starforce}성까지 먼저 올리는 최소 루트입니다.`
      : `최소 기준(${standard.target_starforce}성)을 충족했습니다. 다음 교체보다 다른 미달 부위를 우선하세요.`,
  };
}

export function generateRecommendations(character: {
  character_name: string;
  world_name: string;
  character_class: string;
  character_level: number;
  character_item: CharacterItem[];
}, targetCombatPower = 200000000): RecommendationResponse {
  const items = character.character_item || [];
  const benchmark = buildBenchmark(items, targetCombatPower);
  const recommendations: EquipmentRecommendation[] = items.map((item) => {
    const part = normalizeEquipmentPart(item.item_equipment_part) as EquipmentPart;
    const standard = TWO_HUNDRED_MILLION_MINIMUM.find((candidate) => candidate.equipment_part === part);
    const isDawn = includesOneOf(item.item_name || '', DAWN_KEYWORDS);
    const isBlack = includesOneOf(item.item_name || '', BLACK_KEYWORDS);

    if (!standard) {
      return { equipment_part: item.item_slot || item.item_equipment_part, current_item: item, recommendations: [], priority: 'low' as const, reason: '2억대 최소 세팅의 핵심 교체 부위가 아닙니다.' };
    }

    const option = createOption(item, standard, isDawn && !isBlack);
    const currentStar = Number(item.item_starforce || 0);
    const priority: EquipmentRecommendation['priority'] = option.type === 'replace' ? 'high' : currentStar < standard.target_starforce ? 'medium' : 'low';
    return {
      equipment_part: item.item_slot || item.item_equipment_part,
      current_item: item,
      recommendations: option.estimated_cost > 0 ? [option] : [],
      priority,
      reason: isDawn ? '여명 장비 감지: 칠흑 직행과 비용·세트 효과를 비교했습니다.' : standard.rationale,
    };
  }).sort((a, b) => getPriority(a.equipment_part) - getPriority(b.equipment_part));

  const planned = recommendations.flatMap((entry) => entry.recommendations);
  const summary: RecommendationSummary = {
    total_items_analyzed: items.length,
    high_priority_count: recommendations.filter((entry) => entry.priority === 'high').length,
    medium_priority_count: recommendations.filter((entry) => entry.priority === 'medium').length,
    low_priority_count: recommendations.filter((entry) => entry.priority === 'low').length,
    main_stat_focus: getMainStat(character.character_class),
    estimated_total_cost: planned.reduce((sum, option) => sum + option.estimated_cost, 0),
    expected_stat_increase: 0,
  };

  return { character_name: character.character_name, world_name: character.world_name, total_estimated_cost: summary.estimated_total_cost, recommendations, summary, benchmark };
}

export function formatMesos(mesos: number): string {
  return mesos >= 100000000 ? `${(mesos / 100000000).toFixed(1)}억` : mesos >= 10000 ? `${(mesos / 10000).toFixed(1)}만` : mesos.toLocaleString();
}
