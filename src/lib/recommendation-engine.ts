// 추천 알고리즘 엔진
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

function generateStarforceRecommendations(
  item: CharacterItem,
  mainStat: string,
  equipType: string
): RecommendationOption[] {
  const recommendations: RecommendationOption[] = [];
  const currentStar = Number(item.item_starforce || 0);
  const maxStarByEquip = (MAX_STARFORCE_BY_TYPE as Record<string, number>)[equipType] || 25;
  const maxStar = Math.min(item.item_max_starforce || 25, maxStarByEquip);
  const equipLevel = item.item_equip_level || 150;
  
  if (currentStar >= maxStar) return recommendations;

  for (let targetStar = currentStar + 1; targetStar <= Math.min(currentStar + 5, maxStar); targetStar++) {
    const result = calculateStarforceExpectedCost(equipLevel, currentStar, targetStar, false);
    const protectResult = calculateStarforceExpectedCost(equipLevel, currentStar, targetStar, true);
    
    const currentGain = (STARFORCE_STAT_GAIN as Record<number, any>)[currentStar] || { mainStat: 0, atk: 0, hp: 0 };
    const targetGain = (STARFORCE_STAT_GAIN as Record<number, any>)[targetStar] || { mainStat: 0, atk: 0, hp: 0 };
    const statGain = targetGain.mainStat - currentGain.mainStat;
    const atkGain = targetGain.atk - currentGain.atk;

    if (result.expectedCost > 0 && result.successProb > 0.1) {
      recommendations.push({
        type: 'starforce',
        action: `${currentStar}성 → ${targetStar}성 강화 (보호 없음)`,
        estimated_cost: result.expectedCost,
        expected_stat_gain: [
          { stat_name: '주스탯', current_value: currentGain.mainStat, expected_value: targetGain.mainStat, gain: statGain },
          { stat_name: '공격력', current_value: currentGain.atk, expected_value: targetGain.atk, gain: atkGain },
        ],
        success_rate: result.successProb,
        risk_level: result.destroyProb > 0.1 ? 'high' : result.destroyProb > 0.01 ? 'medium' : 'low',
        description: `예상 비용: ${(result.expectedCost / 100000000).toFixed(1)}억 메소, 성공 확률: ${(result.successProb * 100).toFixed(1)}%`,
      });

      if (targetStar >= 15 && protectResult.expectedCost > 0) {
        recommendations.push({
          type: 'starforce',
          action: `${currentStar}성 → ${targetStar}성 강화 (파괴 방지)`,
          estimated_cost: protectResult.expectedCost,
          expected_stat_gain: [
            { stat_name: '주스탯', current_value: currentGain.mainStat, expected_value: targetGain.mainStat, gain: statGain },
            { stat_name: '공격력', current_value: currentGain.atk, expected_value: targetGain.atk, gain: atkGain },
          ],
          success_rate: protectResult.successProb,
          risk_level: 'low',
          description: `파괴방지 적용 비용: ${(protectResult.expectedCost / 100000000).toFixed(1)}억 메소`,
        });
      }
    }
  }

  return recommendations;
}

function generatePotentialUpgradeRecommendations(
  item: CharacterItem,
  mainStat: string,
  equipType: string
): RecommendationOption[] {
  const recommendations: RecommendationOption[] = [];
  const currentGrade = item.item_potential_option_grade || '노말';
  const currentPotentialValue = parseItemOptions(item).potentialOptions;
  
  let currentMainStatPercent = 0;
  currentPotentialValue.forEach((opt: any) => {
    const statStr = opt.stat || '';
    if (statStr.includes('주스탯%') || statStr.includes('올스탯%') || statStr.includes('STR%') || statStr.includes('DEX%') || statStr.includes('INT%') || statStr.includes('LUK%')) {
      if (opt.isPercent) {
        currentMainStatPercent += opt.value || 0;
      }
    }
  });

  const gradeIndex = (POTENTIAL_GRADE_ORDER as readonly string[] | string[]).indexOf(currentGrade as any);
  if (gradeIndex < 0 || gradeIndex >= POTENTIAL_GRADE_ORDER.length - 1) return recommendations;

  for (let targetIndex = gradeIndex + 1; targetIndex < POTENTIAL_GRADE_ORDER.length; targetIndex++) {
    const targetGrade = POTENTIAL_GRADE_ORDER[targetIndex];
    const avgStat = (POTENTIAL_GRADE_AVG_STAT as Record<string, number>)[targetGrade] || 0;
    const currentAvg = (POTENTIAL_GRADE_AVG_STAT as Record<string, number>)[currentGrade] || 0;
    const statGain = avgStat - currentAvg;

    const redCubeCost = calculateCubeUpgradeCost(currentGrade, targetGrade, '레드큐브');
    if (redCubeCost.expectedCost < Infinity && redCubeCost.successRate > 0.01) {
      recommendations.push({
        type: 'potential',
        action: `${currentGrade} → ${targetGrade} 등업 (레드큐브)`,
        estimated_cost: redCubeCost.expectedCost,
        expected_stat_gain: [
          { stat_name: '주스탯%', current_value: currentMainStatPercent, expected_value: currentMainStatPercent + statGain, gain: statGain },
        ],
        success_rate: redCubeCost.successRate,
        risk_level: redCubeCost.successRate > 0.1 ? 'low' : redCubeCost.successRate > 0.03 ? 'medium' : 'high',
        description: `예상 큐브: ${redCubeCost.expectedCubes}개, 예상 비용: ${(redCubeCost.expectedCost / 100000000).toFixed(1)}억 메소`,
      });
    }
  }

  return recommendations;
}

function generateAdditionalPotentialRecommendations(
  item: CharacterItem,
  mainStat: string,
  equipType: string
): RecommendationOption[] {
  const recommendations: RecommendationOption[] = [];
  const currentGrade = item.item_add_potential_option_grade || '노말';

  const gradeIndex = (POTENTIAL_GRADE_ORDER as readonly string[] | string[]).indexOf(currentGrade as any);
  if (gradeIndex < 0 || gradeIndex >= POTENTIAL_GRADE_ORDER.length - 1) return recommendations;

  for (let targetIndex = gradeIndex + 1; targetIndex < POTENTIAL_GRADE_ORDER.length; targetIndex++) {
    const targetGrade = POTENTIAL_GRADE_ORDER[targetIndex];
    const avgStat = (POTENTIAL_GRADE_AVG_STAT as Record<string, number>)[targetGrade] || 0;
    const currentAvgStat = (POTENTIAL_GRADE_AVG_STAT as Record<string, number>)[currentGrade] || 0;
    const statGain = avgStat - currentAvgStat;

    const cubeCost = calculateCubeUpgradeCost(currentGrade, targetGrade, '에디셔널큐브');
    if (cubeCost.expectedCost < Infinity && cubeCost.successRate > 0.01) {
      recommendations.push({
        type: 'additional_potential',
        action: `에디셔널 ${currentGrade} → ${targetGrade} 등업`,
        estimated_cost: cubeCost.expectedCost,
        expected_stat_gain: [
          { stat_name: '주스탯%', current_value: currentAvgStat, expected_value: avgStat, gain: statGain },
        ],
        success_rate: cubeCost.successRate,
        risk_level: cubeCost.successRate > 0.1 ? 'low' : cubeCost.successRate > 0.03 ? 'medium' : 'high',
        description: `에디셔널 큐브 ${cubeCost.expectedCubes}개 예상 (${(cubeCost.expectedCost / 100000000).toFixed(1)}억 메소)`,
      });
    }
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
    // 💡 [핵심] 고유 슬롯 명칭(반지1, 반지2 등)을 가져옵니다.
    const slotOrPart = item.item_slot || item.item_equipment_part;
    
    const allOptions: RecommendationOption[] = [
      ...generateStarforceRecommendations(item, mainStat, equipType),
      ...generatePotentialUpgradeRecommendations(item, mainStat, equipType),
      ...generateAdditionalPotentialRecommendations(item, mainStat, equipType),
    ];

    const optionsWithEfficiency = allOptions.map((opt: RecommendationOption) => ({
      ...opt,
      efficiency: opt.expected_stat_gain.reduce((sum: number, s: any) => sum + (s.gain || 0), 0) / (opt.estimated_cost / 1000000 || 1),
    })).filter((opt: any) => opt.estimated_cost > 0 && opt.efficiency > 0)
    .sort((a: any, b: any) => b.efficiency - a.efficiency);

    const topOptions = optionsWithEfficiency.slice(0, 3);

    let priority: 'high' | 'medium' | 'low' = 'low';
    const priorityIndex = getEquipmentPriorityIndex(item.item_equipment_part);
    if (priorityIndex <= 3) priority = 'high';
    else if (priorityIndex <= 10) priority = 'medium';
    
    if (Number(item.item_starforce || 0) < 10 || item.item_potential_option_grade === '레어') {
      priority = priority === 'low' ? 'medium' : 'high';
    }

    let reason = '';
    if (Number(item.item_starforce || 0) < 10) reason += '스타포스 낮음. ';
    if (item.item_potential_option_grade === '레어') reason += '잠재옵션 레어. ';
    if (!reason) reason = '현재 장비 양호, 추가 강화로 스탯 상승 가능.';

    if (topOptions.length > 0) {
      totalEstimatedCost += topOptions.reduce((sum: number, opt: RecommendationOption) => sum + opt.estimated_cost, 0);
    }

    recommendations.push({
      equipment_part: slotOrPart, // 💡 "반지1", "반지2" 등의 슬롯 전달
      current_item: item,
      recommendations: topOptions,
      priority,
      reason: reason.trim(),
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