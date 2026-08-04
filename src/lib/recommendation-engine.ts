import type { 
  CharacterItem,
  EquipmentRecommendation, 
  RecommendationOption, 
  RecommendationResponse,
  RecommendationSummary 
} from '@/types';
import { CLASS_MAIN_STAT, EQUIPMENT_PRIORITY } from '@/types';
import { 
  calculateStarforceExpectedCost, 
  STARFORCE_STAT_GAIN,
  MAX_STARFORCE_BY_TYPE 
} from '@/lib/starforce-data';
import { 
  calculateCubeUpgradeCost, 
  POTENTIAL_GRADE_ORDER,
  POTENTIAL_GRADE_AVG_STAT 
} from '@/lib/potential-data';
import { parseItemOptions } from '@/lib/maple-api';

function normalizeEquipmentPart(part: string): string {
  const partMap: Record<string, string> = {
    '무기': '무기', '보조무기': '보조무기', '엠블렘': '엠블렘', '모자': '모자',
    '상의': '상의', '하의': '하의', '장갑': '장갑', '신발': '신발', '망토': '망토',
    '벨트': '벨트', '어깨장식': '어깨장식', '반지1': '반지', '반지2': '반지',
    '반지3': '반지', '반지4': '반지', '펜던트1': '펜던트', '펜던트2': '펜던트',
    '귀고리': '귀고리', '심볼': '심볼', '훈장': '훈장', '포켓': '포켓',
    '기계심장': '기계심장', '뱃지': '뱃지',
  };
  return partMap[part] || part;
}

function getEquipmentPriorityIndex(part: string): number {
  const normalized = normalizeEquipmentPart(part);
  const index = (EQUIPMENT_PRIORITY as readonly string[] | string[])?.indexOf(normalized) ?? -1;
  return index >= 0 ? index : 999;
}

function getMainStat(characterClass: string): string {
  return (CLASS_MAIN_STAT as Record<string, string>)[characterClass] || '주스탯';
}

// 💡 [핵심] 고스펙 유저들의 표준 템셋팅 데이터를 바탕으로 한 '장비 교체(구매) 추천' 생성
function generateEquipmentSwapRecommendations(
  item: CharacterItem,
  equipType: string
): RecommendationOption[] {
  const recommendations: RecommendationOption[] = [];
  const equipLevel = item.item_equip_level || 150;
  const currentStar = Number(item.item_starforce || 0);
  const itemName = item.item_name || '';

  // 도전자 장비, 150제 이하 저렙 장비, 혹은 17성 미만의 가성비 구간인 경우 상위 템 구매 추천
  const isLowTier = equipLevel < 200 || itemName.includes('도전자') || itemName.includes('펜살릴') || itemName.includes('블랙');

  if (isLowTier || currentStar < 17) {
    let targetItemName = '';
    let estimatedPrice = 0;
    let statGainValue = 800;

    if (['모자', '상의', '하의'].includes(equipType)) {
      targetItemName = '아케인셰이드 방어구 (18성 / 에픽~유니크)';
      estimatedPrice = 2500000000; // 25억 메소 기준
    } else if (equipType === '무기') {
      targetItemName = '아케인셰이드 무기 (18~22성)';
      estimatedPrice = 8000000000; // 80억 메소 기준
    } else if (['반지', '펜던트', '귀고리', '벨트', '얼굴장식', '눈장식'].includes(equipType)) {
      targetItemName = '여명/보스 장신구 세트 (가엔링, 데이브레이크 등)';
      estimatedPrice = 4000000000; // 40억 메소 기준
    }

    if (targetItemName) {
      recommendations.push({
        type: 'replace',
        action: `[경매장 구매] ${targetItemName} 교체`,
        estimated_cost: estimatedPrice,
        expected_stat_gain: [
          { stat_name: '주스탯/공격력', current_value: 0, expected_value: statGainValue, gain: statGainValue },
        ],
        success_rate: 1.0,
        risk_level: 'low',
        description: `현재 저효율 장비를 경매장에서 ${targetItemName}(으)로 통째로 구매 및 교체하는 것이 메소 대비 스펙업 효율이 가장 높습니다. (예상 비용: ${(estimatedPrice / 100000000).toFixed(1)}억 메소)`,
      });
    }
  }

  return recommendations;
}

function generateStarforceRecommendations(
  item: CharacterItem,
  equipType: string
): RecommendationOption[] {
  const recommendations: RecommendationOption[] = [];
  const maxStarForceField = item.item_max_starforce;
  if (maxStarForceField === 0 || maxStarForceField === undefined) return recommendations;
  if (['엠블렘', '뱃지', '훈장', '포켓 아이템', '포켓'].includes(equipType)) return recommendations;

  const currentStar = Number(item.item_starforce || 0);
  const maxStarByEquip = (MAX_STARFORCE_BY_TYPE as Record<string, number>)[equipType] || 30;
  const maxStar = Math.min(maxStarForceField || 30, maxStarByEquip);

  if (maxStar <= 0 || currentStar >= maxStar) return recommendations;

  const targetStar = currentStar + 1;
  const equipLevel = item.item_equip_level || 150;
  const result = calculateStarforceExpectedCost(equipLevel, currentStar, targetStar, false);
  
  const currentGain = (STARFORCE_STAT_GAIN as Record<number, any>)[currentStar] || { mainStat: 0, atk: 0 };
  const targetGain = (STARFORCE_STAT_GAIN as Record<number, any>)[targetStar] || { mainStat: 0, atk: 0 };

  if (result.expectedCost > 0 && result.successProb > 0) {
    recommendations.push({
      type: 'starforce',
      action: `${currentStar}성 → ${targetStar}성 직접 강화`,
      estimated_cost: result.expectedCost,
      expected_stat_gain: [
        { stat_name: '주스탯', current_value: currentGain.mainStat, expected_value: targetGain.mainStat, gain: targetGain.mainStat - currentGain.mainStat },
      ],
      success_rate: result.successProb,
      risk_level: result.destroyProb > 0.1 ? 'high' : 'low',
      description: `예상 비용: ${(result.expectedCost / 100000000).toFixed(1)}억 메소`,
    });
  }

  return recommendations;
}

export function generateRecommendations(character: {
  character_name: string;
  world_name: string;
  character_class: string;
  character_level: number;
  character_item: CharacterItem[];
}): RecommendationResponse {
  const mainStat = getMainStat(character.character_class);
  const recommendations: EquipmentRecommendation[] = [];
  let totalEstimatedCost = 0;

  const sortedItems = [...(character.character_item || [])].sort((a: CharacterItem, b: CharacterItem) => 
    getEquipmentPriorityIndex(a.item_equipment_part) - getEquipmentPriorityIndex(b.item_equipment_part)
  );

  sortedItems.forEach((item: CharacterItem) => {
    const equipType = normalizeEquipmentPart(item.item_equipment_part);
    const slotOrPart = item.item_slot || item.item_equipment_part;
    
    // 💡 [핵심] 1순위로 '장비 교체(구매)' 추천을 넣고, 그 다음이 직접 강화 추천
    const allOptions: RecommendationOption[] = [
      ...generateEquipmentSwapRecommendations(item, equipType),
      ...generateStarforceRecommendations(item, equipType),
    ];

    const topOptions = allOptions.slice(0, 1); // 가장 효율 좋은 1개 추출

    let priority: 'high' | 'medium' | 'low' = 'low';
    const priorityIndex = getEquipmentPriorityIndex(item.item_equipment_part);
    if (priorityIndex <= 3) priority = 'high';
    else if (priorityIndex <= 10) priority = 'medium';

    if (topOptions.length > 0) {
      totalEstimatedCost += topOptions.reduce((sum: number, opt: RecommendationOption) => sum + opt.estimated_cost, 0);
    }

    recommendations.push({
      equipment_part: slotOrPart,
      current_item: item,
      recommendations: topOptions,
      priority,
      reason: '목표 전투력 달성을 위한 최적 템셋팅 가이드',
    });
  });

  const highPriority = recommendations.filter((r: EquipmentRecommendation) => r.priority === 'high').length;
  const mediumPriority = recommendations.filter((r: EquipmentRecommendation) => r.priority === 'medium').length;
  const lowPriority = recommendations.filter((r: EquipmentRecommendation) => r.priority === 'low').length;

  const totalStatIncrease = recommendations.reduce((sum: number, r: EquipmentRecommendation) => 
    sum + r.recommendations.reduce((s: number, opt: RecommendationOption) => 
      s + opt.expected_stat_gain.reduce((g: number, sg: any) => g + (sg.gain || 0), 0), 0
    ), 0
  );

  const summary: RecommendationSummary = {
    total_items_analyzed: recommendations.length,
    high_priority_count: highPriority,
    medium_priority_count: mediumPriority,
    low_priority_count: lowPriority,
    main_stat_focus: mainStat,
    estimated_total_cost: totalEstimatedCost,
    expected_stat_increase: totalStatIncrease,
  };

  return {
    character_name: character.character_name,
    world_name: character.world_name,
    total_estimated_cost: totalEstimatedCost,
    recommendations,
    summary,
  };
}

export function formatMesos(mesos: number): string {
  if (mesos >= 100000000) {
    return `${(mesos / 100000000).toFixed(1)}억`;
  } else if (mesos >= 10000) {
    return `${(mesos / 10000).toFixed(1)}만`;
  } else {
    return `${mesos.toLocaleString()}`;
  }
}