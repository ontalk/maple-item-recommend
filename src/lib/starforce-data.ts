// 스타포스 강화 비용 및 확률 테이블 (2024년 기준)
// 레벨별, 별별 비용 (메소 단위)

export interface StarforceData {
  level: number;
  maxLevel: number;
  star: number;
  cost: number;
  successRate: number;
  destroyRate: number;
  downRate: number;
  protectCost: number; // 스타포스 보호 비용
}

// 장비 레벨별 스타포스 데이터 (일반 장비 기준)
export const STARFORCE_TABLE: StarforceData[] = [
  // 100레벨 미만 장비
  ...generateStarforceData(0, 100, [
    { star: 0, cost: 1000, success: 0.95, destroy: 0, down: 0 },
    { star: 1, cost: 1000, success: 0.95, destroy: 0, down: 0 },
    { star: 2, cost: 1000, success: 0.9, destroy: 0, down: 0 },
    { star: 3, cost: 1000, success: 0.9, destroy: 0, down: 0 },
    { star: 4, cost: 1000, success: 0.85, destroy: 0, down: 0 },
    { star: 5, cost: 2000, success: 0.85, destroy: 0, down: 0 },
    { star: 6, cost: 3000, success: 0.8, destroy: 0, down: 0 },
    { star: 7, cost: 5000, success: 0.75, destroy: 0, down: 0 },
    { star: 8, cost: 7000, success: 0.7, destroy: 0, down: 0 },
    { star: 9, cost: 10000, success: 0.65, destroy: 0, down: 0 },
    { star: 10, cost: 15000, success: 0.6, destroy: 0, down: 0.1 },
    { star: 11, cost: 20000, success: 0.55, destroy: 0, down: 0.15 },
    { star: 12, cost: 30000, success: 0.5, destroy: 0, down: 0.2 },
    { star: 13, cost: 40000, success: 0.45, destroy: 0, down: 0.25 },
    { star: 14, cost: 50000, success: 0.4, destroy: 0, down: 0.3 },
    { star: 15, cost: 70000, success: 0.3, destroy: 0.006, down: 0.4 },
    { star: 16, cost: 100000, success: 0.3, destroy: 0.01, down: 0.4 },
    { star: 17, cost: 150000, success: 0.3, destroy: 0.014, down: 0.4 },
    { star: 18, cost: 200000, success: 0.3, destroy: 0.021, down: 0.4 },
    { star: 19, cost: 300000, success: 0.3, destroy: 0.028, down: 0.4 },
    { star: 20, cost: 400000, success: 0.3, destroy: 0.035, down: 0.4 },
    { star: 21, cost: 500000, success: 0.3, destroy: 0.042, down: 0.4 },
    { star: 22, cost: 700000, success: 0.3, destroy: 0.07, down: 0.4 },
    { star: 23, cost: 1000000, success: 0.3, destroy: 0.094, down: 0.4 },
    { star: 24, cost: 1500000, success: 0.3, destroy: 0.118, down: 0.4 },
    { star: 25, cost: 2000000, success: 0.3, destroy: 0.14, down: 0.4 },
  ]),
  
  // 100~139레벨 장비
  ...generateStarforceData(100, 140, [
    { star: 0, cost: 5000, success: 0.95, destroy: 0, down: 0 },
    { star: 1, cost: 5000, success: 0.95, destroy: 0, down: 0 },
    { star: 2, cost: 5000, success: 0.9, destroy: 0, down: 0 },
    { star: 3, cost: 5000, success: 0.9, destroy: 0, down: 0 },
    { star: 4, cost: 5000, success: 0.85, destroy: 0, down: 0 },
    { star: 5, cost: 10000, success: 0.85, destroy: 0, down: 0 },
    { star: 6, cost: 15000, success: 0.8, destroy: 0, down: 0 },
    { star: 7, cost: 20000, success: 0.75, destroy: 0, down: 0 },
    { star: 8, cost: 30000, success: 0.7, destroy: 0, down: 0 },
    { star: 9, cost: 40000, success: 0.65, destroy: 0, down: 0 },
    { star: 10, cost: 60000, success: 0.6, destroy: 0, down: 0.1 },
    { star: 11, cost: 80000, success: 0.55, destroy: 0, down: 0.15 },
    { star: 12, cost: 120000, success: 0.5, destroy: 0, down: 0.2 },
    { star: 13, cost: 180000, success: 0.45, destroy: 0, down: 0.25 },
    { star: 14, cost: 250000, success: 0.4, destroy: 0, down: 0.3 },
    { star: 15, cost: 350000, success: 0.3, destroy: 0.006, down: 0.4 },
    { star: 16, cost: 500000, success: 0.3, destroy: 0.01, down: 0.4 },
    { star: 17, cost: 750000, success: 0.3, destroy: 0.014, down: 0.4 },
    { star: 18, cost: 1000000, success: 0.3, destroy: 0.021, down: 0.4 },
    { star: 19, cost: 1500000, success: 0.3, destroy: 0.028, down: 0.4 },
    { star: 20, cost: 2000000, success: 0.3, destroy: 0.035, down: 0.4 },
    { star: 21, cost: 2500000, success: 0.3, destroy: 0.042, down: 0.4 },
    { star: 22, cost: 3500000, success: 0.3, destroy: 0.07, down: 0.4 },
    { star: 23, cost: 5000000, success: 0.3, destroy: 0.094, down: 0.4 },
    { star: 24, cost: 7500000, success: 0.3, destroy: 0.118, down: 0.4 },
    { star: 25, cost: 10000000, success: 0.3, destroy: 0.14, down: 0.4 },
  ]),
  
  // 140~159레벨 장비 (아케인/어센틱 등)
  ...generateStarforceData(140, 160, [
    { star: 0, cost: 10000, success: 0.95, destroy: 0, down: 0 },
    { star: 1, cost: 10000, success: 0.95, destroy: 0, down: 0 },
    { star: 2, cost: 10000, success: 0.9, destroy: 0, down: 0 },
    { star: 3, cost: 10000, success: 0.9, destroy: 0, down: 0 },
    { star: 4, cost: 10000, success: 0.85, destroy: 0, down: 0 },
    { star: 5, cost: 20000, success: 0.85, destroy: 0, down: 0 },
    { star: 6, cost: 30000, success: 0.8, destroy: 0, down: 0 },
    { star: 7, cost: 50000, success: 0.75, destroy: 0, down: 0 },
    { star: 8, cost: 70000, success: 0.7, destroy: 0, down: 0 },
    { star: 9, cost: 100000, success: 0.65, destroy: 0, down: 0 },
    { star: 10, cost: 150000, success: 0.6, destroy: 0, down: 0.1 },
    { star: 11, cost: 200000, success: 0.55, destroy: 0, down: 0.15 },
    { star: 12, cost: 300000, success: 0.5, destroy: 0, down: 0.2 },
    { star: 13, cost: 450000, success: 0.45, destroy: 0, down: 0.25 },
    { star: 14, cost: 600000, success: 0.4, destroy: 0, down: 0.3 },
    { star: 15, cost: 900000, success: 0.3, destroy: 0.006, down: 0.4 },
    { star: 16, cost: 1200000, success: 0.3, destroy: 0.01, down: 0.4 },
    { star: 17, cost: 1800000, success: 0.3, destroy: 0.014, down: 0.4 },
    { star: 18, cost: 2500000, success: 0.3, destroy: 0.021, down: 0.4 },
    { star: 19, cost: 3500000, success: 0.3, destroy: 0.028, down: 0.4 },
    { star: 20, cost: 5000000, success: 0.3, destroy: 0.035, down: 0.4 },
    { star: 21, cost: 7000000, success: 0.3, destroy: 0.042, down: 0.4 },
    { star: 22, cost: 10000000, success: 0.3, destroy: 0.07, down: 0.4 },
    { star: 23, cost: 15000000, success: 0.3, destroy: 0.094, down: 0.4 },
    { star: 24, cost: 20000000, success: 0.3, destroy: 0.118, down: 0.4 },
    { star: 25, cost: 30000000, success: 0.3, destroy: 0.14, down: 0.4 },
  ]),
  
  // 160~199레벨 장비 (그랜드이스 등)
  ...generateStarforceData(160, 200, [
    { star: 0, cost: 50000, success: 0.95, destroy: 0, down: 0 },
    { star: 1, cost: 50000, success: 0.95, destroy: 0, down: 0 },
    { star: 2, cost: 50000, success: 0.9, destroy: 0, down: 0 },
    { star: 3, cost: 50000, success: 0.9, destroy: 0, down: 0 },
    { star: 4, cost: 50000, success: 0.85, destroy: 0, down: 0 },
    { star: 5, cost: 100000, success: 0.85, destroy: 0, down: 0 },
    { star: 6, cost: 150000, success: 0.8, destroy: 0, down: 0 },
    { star: 7, cost: 200000, success: 0.75, destroy: 0, down: 0 },
    { star: 8, cost: 300000, success: 0.7, destroy: 0, down: 0 },
    { star: 9, cost: 400000, success: 0.65, destroy: 0, down: 0 },
    { star: 10, cost: 600000, success: 0.6, destroy: 0, down: 0.1 },
    { star: 11, cost: 800000, success: 0.55, destroy: 0, down: 0.15 },
    { star: 12, cost: 1200000, success: 0.5, destroy: 0, down: 0.2 },
    { star: 13, cost: 1800000, success: 0.45, destroy: 0, down: 0.25 },
    { star: 14, cost: 2500000, success: 0.4, destroy: 0, down: 0.3 },
    { star: 15, cost: 3500000, success: 0.3, destroy: 0.006, down: 0.4 },
    { star: 16, cost: 5000000, success: 0.3, destroy: 0.01, down: 0.4 },
    { star: 17, cost: 7500000, success: 0.3, destroy: 0.014, down: 0.4 },
    { star: 18, cost: 10000000, success: 0.3, destroy: 0.021, down: 0.4 },
    { star: 19, cost: 15000000, success: 0.3, destroy: 0.028, down: 0.4 },
    { star: 20, cost: 20000000, success: 0.3, destroy: 0.035, down: 0.4 },
    { star: 21, cost: 25000000, success: 0.3, destroy: 0.042, down: 0.4 },
    { star: 22, cost: 35000000, success: 0.3, destroy: 0.07, down: 0.4 },
    { star: 23, cost: 50000000, success: 0.3, destroy: 0.094, down: 0.4 },
    { star: 24, cost: 75000000, success: 0.3, destroy: 0.118, down: 0.4 },
    { star: 25, cost: 100000000, success: 0.3, destroy: 0.14, down: 0.4 },
  ]),
  
  // 200레벨 이상 장비 (아케인셰이드 등)
  ...generateStarforceData(200, 300, [
    { star: 0, cost: 100000, success: 0.95, destroy: 0, down: 0 },
    { star: 1, cost: 100000, success: 0.95, destroy: 0, down: 0 },
    { star: 2, cost: 100000, success: 0.9, destroy: 0, down: 0 },
    { star: 3, cost: 100000, success: 0.9, destroy: 0, down: 0 },
    { star: 4, cost: 100000, success: 0.85, destroy: 0, down: 0 },
    { star: 5, cost: 200000, success: 0.85, destroy: 0, down: 0 },
    { star: 6, cost: 300000, success: 0.8, destroy: 0, down: 0 },
    { star: 7, cost: 500000, success: 0.75, destroy: 0, down: 0 },
    { star: 8, cost: 700000, success: 0.7, destroy: 0, down: 0 },
    { star: 9, cost: 1000000, success: 0.65, destroy: 0, down: 0 },
    { star: 10, cost: 1500000, success: 0.6, destroy: 0, down: 0.1 },
    { star: 11, cost: 2000000, success: 0.55, destroy: 0, down: 0.15 },
    { star: 12, cost: 3000000, success: 0.5, destroy: 0, down: 0.2 },
    { star: 13, cost: 4500000, success: 0.45, destroy: 0, down: 0.25 },
    { star: 14, cost: 6000000, success: 0.4, destroy: 0, down: 0.3 },
    { star: 15, cost: 9000000, success: 0.3, destroy: 0.006, down: 0.4 },
    { star: 16, cost: 12000000, success: 0.3, destroy: 0.01, down: 0.4 },
    { star: 17, cost: 18000000, success: 0.3, destroy: 0.014, down: 0.4 },
    { star: 18, cost: 25000000, success: 0.3, destroy: 0.021, down: 0.4 },
    { star: 19, cost: 35000000, success: 0.3, destroy: 0.028, down: 0.4 },
    { star: 20, cost: 50000000, success: 0.3, destroy: 0.035, down: 0.4 },
    { star: 21, cost: 70000000, success: 0.3, destroy: 0.042, down: 0.4 },
    { star: 22, cost: 100000000, success: 0.3, destroy: 0.07, down: 0.4 },
    { star: 23, cost: 150000000, success: 0.3, destroy: 0.094, down: 0.4 },
    { star: 24, cost: 200000000, success: 0.3, destroy: 0.118, down: 0.4 },
    { star: 25, cost: 300000000, success: 0.3, destroy: 0.14, down: 0.4 },
  ]),
];

function generateStarforceData(minLevel: number, maxLevel: number, data: Array<{
  star: number;
  cost: number;
  success: number;
  destroy: number;
  down: number;
}>) {
  return data.map(d => ({
    level: minLevel,
    maxLevel: maxLevel - 1,
    star: d.star,
    cost: d.cost,
    successRate: d.success,
    destroyRate: d.destroy,
    downRate: d.down,
    protectCost: d.cost * 2, // 보호 비용은 기본 비용의 2배로 가정
  }));
}

// 스타포스 데이터 조회
export function getStarforceData(equipLevel: number, currentStar: number): StarforceData | null {
  const data = STARFORCE_TABLE.find(
    d => equipLevel >= d.level && equipLevel <= d.maxLevel && d.star === currentStar
  );
  return data || null;
}

// 다음 스타포스 비용 조회
export function getNextStarforceCost(equipLevel: number, currentStar: number): number {
  const data = getStarforceData(equipLevel, currentStar);
  return data?.cost || 0;
}

// 스타포스 기대값 계산 (마르코프 체인 기반)
export function calculateStarforceExpectedCost(
  equipLevel: number,
  fromStar: number,
  toStar: number,
  useProtection: boolean = false
): { expectedCost: number; successProb: number; destroyProb: number } {
  let totalCost = 0;
  let currentProb = 1;
  let destroyProb = 0;
  
  for (let star = fromStar; star < toStar; star++) {
    const data = getStarforceData(equipLevel, star);
    if (!data) break;
    
    const cost = useProtection ? data.protectCost : data.cost;
    const successRate = data.successRate;
    const destroyRate = data.destroyRate;
    const downRate = data.downRate;
    
    // 보호 사용 시 파괴 방지, 하락 방지
    const effectiveDestroyRate = useProtection ? 0 : destroyRate;
    const effectiveDownRate = useProtection ? 0 : downRate;
    const effectiveSuccessRate = 1 - effectiveDestroyRate - effectiveDownRate;
    
    // 이 단계에서 성공할 확률
    totalCost += cost / currentProb;
    currentProb *= effectiveSuccessRate;
    destroyProb += (1 - currentProb) * (effectiveDestroyRate / (effectiveDestroyRate + effectiveDownRate));
  }
  
  return {
    expectedCost: Math.round(totalCost),
    successProb: currentProb,
    destroyProb: Math.min(destroyProb, 1),
  };
}

// 스타포스별 스탯 상승량 (대략적)
export const STARFORCE_STAT_GAIN: Record<number, { mainStat: number; atk: number; hp: number }> = {
  0: { mainStat: 0, atk: 0, hp: 0 },
  1: { mainStat: 1, atk: 1, hp: 10 },
  2: { mainStat: 2, atk: 1, hp: 20 },
  3: { mainStat: 3, atk: 2, hp: 30 },
  4: { mainStat: 4, atk: 2, hp: 40 },
  5: { mainStat: 6, atk: 3, hp: 60 },
  6: { mainStat: 7, atk: 4, hp: 70 },
  7: { mainStat: 8, atk: 5, hp: 80 },
  8: { mainStat: 10, atk: 6, hp: 100 },
  9: { mainStat: 12, atk: 7, hp: 120 },
  10: { mainStat: 15, atk: 9, hp: 150 },
  11: { mainStat: 18, atk: 11, hp: 180 },
  12: { mainStat: 21, atk: 13, hp: 210 },
  13: { mainStat: 25, atk: 15, hp: 250 },
  14: { mainStat: 30, atk: 18, hp: 300 },
  15: { mainStat: 35, atk: 22, hp: 350 },
  16: { mainStat: 42, atk: 26, hp: 420 },
  17: { mainStat: 50, atk: 31, hp: 500 },
  18: { mainStat: 60, atk: 37, hp: 600 },
  19: { mainStat: 72, atk: 44, hp: 720 },
  20: { mainStat: 85, atk: 52, hp: 850 },
  21: { mainStat: 100, atk: 62, hp: 1000 },
  22: { mainStat: 120, atk: 75, hp: 1200 },
  23: { mainStat: 140, atk: 90, hp: 1400 },
  24: { mainStat: 165, atk: 108, hp: 1650 },
  25: { mainStat: 195, atk: 130, hp: 1950 },
};

// 장비 타입별 최대 스타포스
export const MAX_STARFORCE_BY_TYPE: Record<string, number> = {
  '무기': 25,
  '모자': 25,
  '상의': 25,
  '하의': 25,
  '장갑': 25,
  '신발': 25,
  '망토': 25,
  '벨트': 20,
  '어깨장식': 20,
  '반지': 20,
  '펜던트': 20,
  '귀고리': 15,
  '심볼': 20,
  '훈장': 15,
  '포켓': 15,
  '기계심장': 15,
  '뱃지': 15,
  '보조무기': 25,
  '엠블렘': 15,
};