// 추천 알고리즘 엔진
// 최소 비용으로 최대 전투력(스탯) 상승을 위한 장비 강화 추천
import type { 
  CharacterItem,
  EquipmentRecommendation, 
  RecommendationOption, 
  StatGain,
  RecommendationResponse,
  RecommendationSummary 
} from '@/types';
import { CLASS_MAIN_STAT, EQUIPMENT_PRIORITY } from '@/types';
import { 
  getStarforceData, 
  calculateStarforceExpectedCost, 
  STARFORCE_STAT_GAIN,
  MAX_STARFORCE_BY_TYPE 
} from '@/lib/starforce-data';
import { 
  calculateCubeUpgradeCost, 
  calculatePotentialRerollCost,
  getPotentialOptions,
  POTENTIAL_GRADE_ORDER,
  POTENTIAL_GRADE_AVG_STAT 
} from '@/lib/potential-data';
import { parseItemOptions, getMainStatValue, UnifiedItem } from '@/lib/maple-api';
import type { CharacterEquipment } from '@/lib/maple-api';

// 장비 부위 정규화 (API 응답 -> 내부 표준)
function normalizeEquipmentPart(part: string): string {
  const partMap: Record<string, string> = {
    '무기': '무기',
    '보조무기': '보조무기',
    '엠블렘': '엠블렘',
    '모자': '모자',
    '상의': '상의',
    '하의': '하의',
    '장갑': '장갑',
    '신발': '신발',
    '망토': '망토',
    '벨트': '벨트',
    '어깨장식': '어깨장식',
    '반지1': '반지',
    '반지2': '반지',
    '반지3': '반지',
    '반지4': '반지',
    '펜던트1': '펜던트',
    '펜던트2': '펜던트',
    '귀고리': '귀고리',
    '심볼': '심볼',
    '훈장': '훈장',
    '포켓': '포켓',
    '기계심장': '기계심장',
    '뱃지': '뱃지',
  };
  return partMap[part] || part;
}

// 장비 우선순위 인덱스 가져오기
function getEquipmentPriorityIndex(part: string): number {
  const normalized = normalizeEquipmentPart(part);
  const index = EQUIPMENT_PRIORITY.indexOf(normalized);
  return index >= 0 ? index : 999;
}

// 메인 스탯 결정
function getMainStat(characterClass: string): string {
  return CLASS_MAIN_STAT[characterClass] || '주스탯';
}

// 현재 장비의 메인 스탯 기여도 계산
function calculateCurrentItemStat(item: CharacterItem, mainStat: string): number {
  // UnifiedItem으로 캐스팅하여 getMainStatValue 사용
  return getMainStatValue(item as any, mainStat);
}

// 스타포스 강화 추천 옵션 생성
function generateStarforceRecommendations(
  item: CharacterItem,
  mainStat: string,
  equipType: string
): RecommendationOption[] {
  const recommendations: RecommendationOption[] = [];
  const currentStar = item.item_starforce;
  const maxStar = Math.min(item.item_max_starforce, MAX_STARFORCE_BY_TYPE[equipType] || 25);
  const equipLevel = item.item_equip_level;
  
  if (currentStar >= maxStar) return recommendations;

  // 다음 1~3성 강화 추천
  for (let targetStar = currentStar + 1; targetStar <= Math.min(currentStar + 5, maxStar); targetStar++) {
    const result = calculateStarforceExpectedCost(equipLevel, currentStar, targetStar, false);
    const protectResult = calculateStarforceExpectedCost(equipLevel, currentStar, targetStar, true);
    
    // 스탯 상승량 계산
    const currentGain = STARFORCE_STAT_GAIN[currentStar] || { mainStat: 0, atk: 0, hp: 0 };
    const targetGain = STARFORCE_STAT_GAIN[targetStar] || { mainStat: 0, atk: 0, hp: 0 };
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
        description: `예상 비용: ${(result.expectedCost / 1000000).toFixed(1)}억 메소, 성공 확률: ${(result.successProb * 100).toFixed(1)}%, 파괴 확률: ${(result.destroyProb * 100).toFixed(2)}%`,
      });

      // 스타포스 보호 사용 옵션 (15성 이상부터 추천)
      if (targetStar >= 15 && protectResult.expectedCost > 0) {
        recommendations.push({
          type: 'starforce',
          action: `${currentStar}성 → ${targetStar}성 강화 (스타포스 보호)`,
          estimated_cost: protectResult.expectedCost,
          expected_stat_gain: [
            { stat_name: '주스탯', current_value: currentGain.mainStat, expected_value: targetGain.mainStat, gain: statGain },
            { stat_name: '공격력', current_value: currentGain.atk, expected_value: targetGain.atk, gain: atkGain },
          ],
          success_rate: protectResult.successProb,
          risk_level: 'low',
          description: `보호 사용 시 예상 비용: ${(protectResult.expectedCost / 1000000).toFixed(1)}억 메소, 성공 확률: ${(protectResult.successProb * 100).toFixed(1)}%, 파괴 없음`,
        });
      }
    }
  }

  return recommendations;
}

// 잠재옵션 등업 추천
function generatePotentialUpgradeRecommendations(
  item: CharacterItem,
  mainStat: string,
  equipType: string
): RecommendationOption[] {
  const recommendations: RecommendationOption[] = [];
  const currentGrade = item.item_potential_option_grade;
  const currentPotentialValue = parseItemOptions(item).potentialOptions;
  
  // 현재 주스탯% 추출
  let currentMainStatPercent = 0;
  currentPotentialValue.forEach(opt => {
    const statStr = opt.stat; // ParsedOption의 stat 필드 사용
    if (statStr.includes('주스탯%') || statStr.includes('올스탯%') || statStr.includes('STR%') || statStr.includes('DEX%') || statStr.includes('INT%') || statStr.includes('LUK%')) {
      // value는 이미 숫자로 파싱됨
      if (opt.isPercent) {
        currentMainStatPercent += opt.value;
      }
    }
  });

  const gradeIndex = POTENTIAL_GRADE_ORDER.indexOf(currentGrade as any);
  if (gradeIndex < 0 || gradeIndex >= POTENTIAL_GRADE_ORDER.length - 1) return recommendations;

  // 다음 등급으로 등업 추천
  for (let targetIndex = gradeIndex + 1; targetIndex < POTENTIAL_GRADE_ORDER.length; targetIndex++) {
    const targetGrade = POTENTIAL_GRADE_ORDER[targetIndex];
    const avgStat = POTENTIAL_GRADE_AVG_STAT[targetGrade] || 0;
    const statGain = avgStat - (POTENTIAL_GRADE_AVG_STAT[currentGrade] || 0);

    // 레드큐브로 등업
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
        description: `예상 큐브: ${redCubeCost.expectedCubes}개, 예상 비용: ${(redCubeCost.expectedCost / 1000000).toFixed(1)}억 메소, 성공 확률: ${(redCubeCost.successRate * 100).toFixed(1)}%`,
      });
    }

    // 블랙큐브로 등업 (유니크→레전드리 추천)
    if (targetGrade === '레전드리' || targetGrade === '유니크') {
      const blackCubeCost = calculateCubeUpgradeCost(currentGrade, targetGrade, '블랙큐브');
      if (blackCubeCost.expectedCost < Infinity && blackCubeCost.successRate > 0.01) {
        recommendations.push({
          type: 'potential',
          action: `${currentGrade} → ${targetGrade} 등업 (블랙큐브)`,
          estimated_cost: blackCubeCost.expectedCost,
          expected_stat_gain: [
            { stat_name: '주스탯%', current_value: currentMainStatPercent, expected_value: currentMainStatPercent + statGain, gain: statGain },
          ],
          success_rate: blackCubeCost.successRate,
          risk_level: blackCubeCost.successRate > 0.1 ? 'low' : blackCubeCost.successRate > 0.03 ? 'medium' : 'high',
          description: `블랙큐브로 등급 하락 방지, 예상 큐브: ${blackCubeCost.expectedCubes}개, 예상 비용: ${(blackCubeCost.expectedCost / 1000000).toFixed(1)}억 메소`,
        });
      }
    }
  }

  // 현재 등급에서 좋은 옵션 뽑기 (리롤)
  if (gradeIndex >= 1) { // 에픽 이상부터 리롤 추천
    const targetStats = ['주스탯%', '올스탯%', '공격력%', '보스 데미지%', '데미지%', '크리티컬 데미지%'];
    targetStats.forEach(targetStat => {
      const rerollCost = calculatePotentialRerollCost(currentGrade, targetStat, '레드큐브');
      if (rerollCost.expectedCost < Infinity && rerollCost.expectedCubes < 50) {
        const avgGain = POTENTIAL_GRADE_AVG_STAT[currentGrade] || 0;
        recommendations.push({
          type: 'potential',
          action: `${currentGrade} ${targetStat} 옵션 뽑기 (리롤)`,
          estimated_cost: rerollCost.expectedCost,
          expected_stat_gain: [
            { stat_name: targetStat, current_value: 0, expected_value: avgGain, gain: avgGain },
          ],
          success_rate: 1 / rerollCost.expectedCubes,
          risk_level: rerollCost.expectedCubes < 10 ? 'low' : rerollCost.expectedCubes < 25 ? 'medium' : 'high',
          description: `예상 큐브: ${rerollCost.expectedCubes}개, 예상 비용: ${(rerollCost.expectedCost / 1000000).toFixed(1)}억 메소`,
        });
      }
    });
  }

  return recommendations;
}

// 에디셔널 잠재옵션 추천
function generateAdditionalPotentialRecommendations(
  item: CharacterItem,
  mainStat: string,
  equipType: string
): RecommendationOption[] {
  const recommendations: RecommendationOption[] = [];
  const currentGrade = item.item_add_potential_option_grade;
  const additionalOptions = parseItemOptions(item).additionalOptions;

  // 에디셔널이 없거나 레어라면 에픽/유니크로 등업 추천
  const gradeIndex = POTENTIAL_GRADE_ORDER.indexOf(currentGrade as any);
  if (gradeIndex < 0 || gradeIndex >= POTENTIAL_GRADE_ORDER.length - 1) return recommendations;

  for (let targetIndex = gradeIndex + 1; targetIndex < POTENTIAL_GRADE_ORDER.length; targetIndex++) {
    const targetGrade = POTENTIAL_GRADE_ORDER[targetIndex];
    const avgStat = POTENTIAL_GRADE_AVG_STAT[targetGrade] || 0;
    const currentAvgStat = POTENTIAL_GRADE_AVG_STAT[currentGrade] || 0;
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
        description: `에디셔널 큐브 사용, 예상 큐브: ${cubeCost.expectedCubes}개, 예상 비용: ${(cubeCost.expectedCost / 1000000).toFixed(1)}억 메소`,
      });
    }
  }

  return recommendations;
}

// 장비 교체 추천 (현재 장비가 너무 낮을 때)
function generateReplaceRecommendations(
  item: CharacterItem,
  mainStat: string,
  equipType: string
): RecommendationOption[] {
  const recommendations: RecommendationOption[] = [];
  const equipLevel = item.item_equip_level;
  const currentStar = item.item_starforce;
  const currentGrade = item.item_potential_option_grade;
  
  // 레벨이 낮거나(160 미만), 스타포스가 10 미만, 잠재가 레어인 경우 교체 추천
  const shouldReplace = equipLevel < 160 || currentStar < 10 || currentGrade === '레어';
  
  if (shouldReplace) {
    let estimatedPrice = 0;
    let description = '';
    
    // 장비 타입별 대략적인 교체 비용 (경매장 시세 기준)
    const replacePrices: Record<string, number> = {
      '무기': 5000000000, // 50억
      '보조무기': 2000000000,
      '엠블렘': 1000000000,
      '모자': 2000000000,
      '상의': 2000000000,
      '하의': 2000000000,
      '장갑': 1500000000,
      '신발': 1500000000,
      '망토': 1000000000,
      '벨트': 800000000,
      '어깨장식': 800000000,
      '반지': 1000000000,
      '펜던트': 1000000000,
      '귀고리': 500000000,
      '심볼': 3000000000,
      '기계심장': 1000000000,
      '뱃지': 500000000,
      '포켓': 300000000,
      '훈장': 200000000,
    };
    
    estimatedPrice = replacePrices[equipType] || 1000000000;
    description = `${equipType} 교체 권장 (현재 ${equipLevel}레벨, ${currentStar}성, ${currentGrade}). 아케인/그랜드이스/아케인셰이드 장비로 교체 시 대폭 스탯 상승 가능.`;

    recommendations.push({
      type: 'replace',
      action: `${equipType} 교체 (${equipLevel}레벨 → 200+ 레벨 장비)`,
      estimated_cost: estimatedPrice,
      expected_stat_gain: [
        { stat_name: '주스탯', current_value: calculateCurrentItemStat(item, mainStat), expected_value: calculateCurrentItemStat(item, mainStat) * 2, gain: calculateCurrentItemStat(item, mainStat) },
        { stat_name: '공격력', current_value: 0, expected_value: 100, gain: 100 },
      ],
      success_rate: 1.0,
      risk_level: 'low',
      description,
    });
  }

  return recommendations;
}

// 전체 추천 생성 메인 함수
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

  // 장비 부위별로 정렬 (우선순위 순)
  const sortedItems = [...character.character_item].sort((a, b) => 
    getEquipmentPriorityIndex(a.item_equipment_part) - getEquipmentPriorityIndex(b.item_equipment_part)
  );

  sortedItems.forEach(item => {
    const equipType = normalizeEquipmentPart(item.item_equipment_part);
    const currentStat = calculateCurrentItemStat(item, mainStat);
    
    const allOptions: RecommendationOption[] = [
      ...generateStarforceRecommendations(item, mainStat, equipType),
      ...generatePotentialUpgradeRecommendations(item, mainStat, equipType),
      ...generateAdditionalPotentialRecommendations(item, mainStat, equipType),
      ...generateReplaceRecommendations(item, mainStat, equipType),
    ];

    // 비용 대비 효율성 계산 (스탯 상승 / 비용)
    const optionsWithEfficiency = allOptions.map(opt => ({
      ...opt,
      efficiency: opt.expected_stat_gain.reduce((sum, s) => sum + s.gain, 0) / (opt.estimated_cost / 1000000), // 억 메소당 스탯
    })).filter(opt => opt.estimated_cost > 0 && opt.efficiency > 0)
    .sort((a, b) => b.efficiency - a.efficiency); // 효율성 높은 순 정렬

    // 상위 3개만 선택
    const topOptions = optionsWithEfficiency.slice(0, 3);

    // 우선순위 결정
    let priority: 'high' | 'medium' | 'low' = 'low';
    const priorityIndex = getEquipmentPriorityIndex(item.item_equipment_part);
    if (priorityIndex <= 3) priority = 'high';
    else if (priorityIndex <= 10) priority = 'medium';
    
    // 현재 장비 상태가 안 좋으면 우선순위 상향
    if (item.item_starforce < 10 || item.item_potential_option_grade === '레어' || item.item_equip_level < 160) {
      priority = priority === 'low' ? 'medium' : 'high';
    }

    let reason = '';
    if (item.item_starforce < 10) reason += '스타포스 낮음. ';
    if (item.item_potential_option_grade === '레어') reason += '잠재옵션 레어. ';
    if (item.item_equip_level < 160) reason += '장비 레벨 낮음. ';
    if (!reason) reason = '현재 장비 양호, 추가 강화로 스탯 상승 가능. ';

    if (topOptions.length > 0) {
      totalEstimatedCost += topOptions.reduce((sum, opt) => sum + opt.estimated_cost, 0);
    }

    recommendations.push({
      equipment_part: item.item_equipment_part,
      current_item: item,
      recommendations: topOptions,
      priority,
      reason: reason.trim(),
    });
  });

  // 요약 생성
  const highPriority = recommendations.filter(r => r.priority === 'high').length;
  const mediumPriority = recommendations.filter(r => r.priority === 'medium').length;
  const lowPriority = recommendations.filter(r => r.priority === 'low').length;

  const totalStatIncrease = recommendations.reduce((sum, r) => 
    sum + r.recommendations.reduce((s, opt) => s + opt.expected_stat_gain.reduce((g, sg) => g + sg.gain, 0), 0), 0
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

// 비용 포맷팅 헬퍼
export function formatMesos(mesos: number): string {
  if (mesos >= 100000000) {
    return `${(mesos / 100000000).toFixed(1)}억`;
  } else if (mesos >= 10000) {
    return `${(mesos / 10000).toFixed(1)}만`;
  } else {
    return `${mesos.toLocaleString()}`;
  }
}

// 위험도 한국어 변환
export function getRiskLevelKorean(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'low': return '낮음';
    case 'medium': return '보통';
    case 'high': return '높음';
  }
}

// 우선순위 한국어 변환
export function getPriorityKorean(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high': return '높음';
    case 'medium': return '보통';
    case 'low': return '낮음';
  }
}