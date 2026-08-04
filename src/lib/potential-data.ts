// 잠재능력/에디셔널 잠재능력 데이터 및 큐브 비용

export interface PotentialOption {
  grade: '레어' | '에픽' | '유니크' | '레전드리';
  lines: number; // 2줄 또는 3줄
  stats: PotentialStat[];
}

export interface PotentialStat {
  stat: string;
  minValue: number;
  maxValue: number;
  weight: number; // 가중치 (뽑기 확률)
}

export interface CubeCost {
  cubeType: '일반큐브' | '레드큐브' | '블랙큐브' | '에디셔널큐브';
  price: number; // 메소 단위 (경매장 시세 기준)
  gradeUpRates: Record<string, number>; // 등급 상승 확률
}

// 큐브 가격 (2024년 경매장 시세 기준, 서버별 상이할 수 있음)
export const CUBE_PRICES: CubeCost[] = [
  {
    cubeType: '일반큐브',
    price: 1200000, // 120만 메소
    gradeUpRates: {
      '레어→에픽': 0.10,
      '에픽→유니크': 0.05,
      '유니크→레전드리': 0.01,
    },
  },
  {
    cubeType: '레드큐브',
    price: 22000000, // 2200만 메소
    gradeUpRates: {
      '레어→에픽': 0.20,
      '에픽→유니크': 0.10,
      '유니크→레전드리': 0.03,
    },
  },
  {
    cubeType: '블랙큐브',
    price: 35000000, // 3500만 메소
    gradeUpRates: {
      '레어→에픽': 0.05, // 블랙큐브는 등급 유지/하락 방지용
      '에픽→유니크': 0.15,
      '유니크→레전드리': 0.08,
    },
  },
  {
    cubeType: '에디셔널큐브',
    price: 8000000, // 800만 메소
    gradeUpRates: {
      '레어→에픽': 0.10,
      '에픽→유니크': 0.05,
      '유니크→레전드리': 0.01,
    },
  },
];

// 장비 타입별 주요 잠재옵션 (주스탯 % 기준)
export const POTENTIAL_OPTIONS_BY_TYPE: Record<string, PotentialOption[]> = {
  // 무기류
  '무기': [
    { grade: '레어', lines: 2, stats: [
      { stat: '공격력%', minValue: 4, maxValue: 6, weight: 30 },
      { stat: '주스탯%', minValue: 4, maxValue: 6, weight: 25 },
      { stat: '보스 데미지%', minValue: 4, maxValue: 6, weight: 20 },
      { stat: '데미지%', minValue: 4, maxValue: 6, weight: 15 },
      { stat: '크리티컬 데미지%', minValue: 3, maxValue: 5, weight: 10 },
    ]},
    { grade: '에픽', lines: 3, stats: [
      { stat: '공격력%', minValue: 7, maxValue: 9, weight: 25 },
      { stat: '주스탯%', minValue: 7, maxValue: 9, weight: 20 },
      { stat: '보스 데미지%', minValue: 7, maxValue: 9, weight: 20 },
      { stat: '데미지%', minValue: 7, maxValue: 9, weight: 15 },
      { stat: '크리티컬 데미지%', minValue: 5, maxValue: 7, weight: 10 },
      { stat: '올스탯%', minValue: 5, maxValue: 7, weight: 10 },
    ]},
    { grade: '유니크', lines: 3, stats: [
      { stat: '공격력%', minValue: 10, maxValue: 12, weight: 20 },
      { stat: '주스탯%', minValue: 10, maxValue: 12, weight: 18 },
      { stat: '보스 데미지%', minValue: 10, maxValue: 12, weight: 18 },
      { stat: '데미지%', minValue: 10, maxValue: 12, weight: 14 },
      { stat: '크리티컬 데미지%', minValue: 8, maxValue: 10, weight: 10 },
      { stat: '올스탯%', minValue: 8, maxValue: 10, weight: 10 },
      { stat: '크리티컬 확률%', minValue: 5, maxValue: 7, weight: 5 },
      { stat: '아크포스', minValue: 10, maxValue: 15, weight: 5 },
    ]},
    { grade: '레전드리', lines: 3, stats: [
      { stat: '공격력%', minValue: 13, maxValue: 15, weight: 15 },
      { stat: '주스탯%', minValue: 13, maxValue: 15, weight: 15 },
      { stat: '보스 데미지%', minValue: 13, maxValue: 15, weight: 15 },
      { stat: '데미지%', minValue: 13, maxValue: 15, weight: 12 },
      { stat: '크리티컬 데미지%', minValue: 11, maxValue: 13, weight: 10 },
      { stat: '올스탯%', minValue: 11, maxValue: 13, weight: 10 },
      { stat: '크리티컬 확률%', minValue: 8, maxValue: 10, weight: 8 },
      { stat: '아크포스', minValue: 15, maxValue: 20, weight: 8 },
      { stat: '어센틱포스', minValue: 10, maxValue: 15, weight: 7 },
    ]},
  ],
  // 방어구류 (모자, 상의, 하의, 장갑, 신발, 망토)
  '방어구': [
    { grade: '레어', lines: 2, stats: [
      { stat: '주스탯%', minValue: 4, maxValue: 6, weight: 35 },
      { stat: '올스탯%', minValue: 3, maxValue: 5, weight: 25 },
      { stat: '최대 HP%', minValue: 5, maxValue: 8, weight: 15 },
      { stat: '방어력%', minValue: 5, maxValue: 8, weight: 10 },
      { stat: '이동속도', minValue: 10, maxValue: 20, weight: 8 },
      { stat: '점프력', minValue: 10, maxValue: 20, weight: 7 },
    ]},
    { grade: '에픽', lines: 3, stats: [
      { stat: '주스탯%', minValue: 7, maxValue: 9, weight: 30 },
      { stat: '올스탯%', minValue: 6, maxValue: 8, weight: 20 },
      { stat: '최대 HP%', minValue: 9, maxValue: 12, weight: 15 },
      { stat: '방어력%', minValue: 9, maxValue: 12, weight: 10 },
      { stat: '이동속도', minValue: 20, maxValue: 30, weight: 8 },
      { stat: '점프력', minValue: 20, maxValue: 30, weight: 7 },
      { stat: '크리티컬 확률%', minValue: 3, maxValue: 5, weight: 5 },
      { stat: '상태이상 내성%', minValue: 10, maxValue: 15, weight: 5 },
    ]},
    { grade: '유니크', lines: 3, stats: [
      { stat: '주스탯%', minValue: 10, maxValue: 12, weight: 25 },
      { stat: '올스탯%', minValue: 9, maxValue: 11, weight: 18 },
      { stat: '최대 HP%', minValue: 13, maxValue: 16, weight: 15 },
      { stat: '방어력%', minValue: 13, maxValue: 16, weight: 12 },
      { stat: '이동속도', minValue: 30, maxValue: 40, weight: 8 },
      { stat: '점프력', minValue: 30, maxValue: 40, weight: 7 },
      { stat: '크리티컬 확률%', minValue: 5, maxValue: 7, weight: 8 },
      { stat: '아크포스', minValue: 10, maxValue: 15, weight: 7 },
    ]},
    { grade: '레전드리', lines: 3, stats: [
      { stat: '주스탯%', minValue: 13, maxValue: 15, weight: 20 },
      { stat: '올스탯%', minValue: 12, maxValue: 14, weight: 15 },
      { stat: '최대 HP%', minValue: 17, maxValue: 20, weight: 12 },
      { stat: '방어력%', minValue: 17, maxValue: 20, weight: 10 },
      { stat: '이동속도', minValue: 40, maxValue: 50, weight: 8 },
      { stat: '점프력', minValue: 40, maxValue: 50, weight: 7 },
      { stat: '크리티컬 확률%', minValue: 8, maxValue: 10, weight: 8 },
      { stat: '아크포스', minValue: 15, maxValue: 20, weight: 10 },
      { stat: '어센틱포스', minValue: 10, maxValue: 15, weight: 10 },
    ]},
  ],
  // 악세서리류 (반지, 펜던트, 귀고리, 벨트, 어깨장식)
  '악세서리': [
    { grade: '레어', lines: 2, stats: [
      { stat: '주스탯%', minValue: 4, maxValue: 6, weight: 35 },
      { stat: '올스탯%', minValue: 3, maxValue: 5, weight: 25 },
      { stat: '공격력/마력', minValue: 8, maxValue: 12, weight: 15 },
      { stat: '보스 데미지%', minValue: 4, maxValue: 6, weight: 10 },
      { stat: '데미지%', minValue: 4, maxValue: 6, weight: 8 },
      { stat: '크리티컬 확률%', minValue: 3, maxValue: 5, weight: 7 },
    ]},
    { grade: '에픽', lines: 3, stats: [
      { stat: '주스탯%', minValue: 7, maxValue: 9, weight: 28 },
      { stat: '올스탯%', minValue: 6, maxValue: 8, weight: 20 },
      { stat: '공격력/마력', minValue: 15, maxValue: 20, weight: 15 },
      { stat: '보스 데미지%', minValue: 7, maxValue: 9, weight: 12 },
      { stat: '데미지%', minValue: 7, maxValue: 9, weight: 10 },
      { stat: '크리티컬 확률%', minValue: 5, maxValue: 7, weight: 8 },
      { stat: '크리티컬 데미지%', minValue: 5, maxValue: 7, weight: 7 },
    ]},
    { grade: '유니크', lines: 3, stats: [
      { stat: '주스탯%', minValue: 10, maxValue: 12, weight: 22 },
      { stat: '올스탯%', minValue: 9, maxValue: 11, weight: 18 },
      { stat: '공격력/마력', minValue: 22, maxValue: 28, weight: 15 },
      { stat: '보스 데미지%', minValue: 10, maxValue: 12, weight: 12 },
      { stat: '데미지%', minValue: 10, maxValue: 12, weight: 10 },
      { stat: '크리티컬 확률%', minValue: 8, maxValue: 10, weight: 10 },
      { stat: '크리티컬 데미지%', minValue: 8, maxValue: 10, weight: 8 },
      { stat: '아크포스', minValue: 10, maxValue: 15, weight: 5 },
    ]},
    { grade: '레전드리', lines: 3, stats: [
      { stat: '주스탯%', minValue: 13, maxValue: 15, weight: 18 },
      { stat: '올스탯%', minValue: 12, maxValue: 14, weight: 15 },
      { stat: '공격력/마력', minValue: 30, maxValue: 35, weight: 13 },
      { stat: '보스 데미지%', minValue: 13, maxValue: 15, weight: 12 },
      { stat: '데미지%', minValue: 13, maxValue: 15, weight: 10 },
      { stat: '크리티컬 확률%', minValue: 10, maxValue: 12, weight: 10 },
      { stat: '크리티컬 데미지%', minValue: 11, maxValue: 13, weight: 10 },
      { stat: '아크포스', minValue: 15, maxValue: 20, weight: 8 },
      { stat: '어센틱포스', minValue: 10, maxValue: 15, weight: 4 },
    ]},
  ],
  // 심볼/엠블렘/기타
  '심볼': [
    { grade: '레어', lines: 2, stats: [
      { stat: '주스탯%', minValue: 4, maxValue: 6, weight: 40 },
      { stat: '올스탯%', minValue: 3, maxValue: 5, weight: 30 },
      { stat: '아크포스', minValue: 5, maxValue: 10, weight: 15 },
      { stat: '어센틱포스', minValue: 3, maxValue: 7, weight: 10 },
      { stat: '최대 HP%', minValue: 5, maxValue: 8, weight: 5 },
    ]},
    { grade: '에픽', lines: 3, stats: [
      { stat: '주스탯%', minValue: 7, maxValue: 9, weight: 35 },
      { stat: '올스탯%', minValue: 6, maxValue: 8, weight: 25 },
      { stat: '아크포스', minValue: 10, maxValue: 15, weight: 15 },
      { stat: '어센틱포스', minValue: 7, maxValue: 12, weight: 10 },
      { stat: '최대 HP%', minValue: 9, maxValue: 12, weight: 8 },
      { stat: '방어력%', minValue: 9, maxValue: 12, weight: 7 },
    ]},
    { grade: '유니크', lines: 3, stats: [
      { stat: '주스탯%', minValue: 10, maxValue: 12, weight: 30 },
      { stat: '올스탯%', minValue: 9, maxValue: 11, weight: 20 },
      { stat: '아크포스', minValue: 15, maxValue: 20, weight: 15 },
      { stat: '어센틱포스', minValue: 12, maxValue: 17, weight: 12 },
      { stat: '최대 HP%', minValue: 13, maxValue: 16, weight: 10 },
      { stat: '방어력%', minValue: 13, maxValue: 16, weight: 8 },
      { stat: '크리티컬 확률%', minValue: 5, maxValue: 7, weight: 5 },
    ]},
    { grade: '레전드리', lines: 3, stats: [
      { stat: '주스탯%', minValue: 13, maxValue: 15, weight: 25 },
      { stat: '올스탯%', minValue: 12, maxValue: 14, weight: 20 },
      { stat: '아크포스', minValue: 20, maxValue: 25, weight: 15 },
      { stat: '어센틱포스', minValue: 15, maxValue: 20, weight: 13 },
      { stat: '최대 HP%', minValue: 17, maxValue: 20, weight: 10 },
      { stat: '방어력%', minValue: 17, maxValue: 20, weight: 8 },
      { stat: '크리티컬 확률%', minValue: 8, maxValue: 10, weight: 5 },
      { stat: '어센틱포스', minValue: 20, maxValue: 25, weight: 4 },
    ]},
  ],
};

// 장비 부위별 타입 매핑
export const EQUIPMENT_POTENTIAL_TYPE: Record<string, string> = {
  '무기': '무기',
  '보조무기': '무기',
  '모자': '방어구',
  '상의': '방어구',
  '하의': '방어구',
  '장갑': '방어구',
  '신발': '방어구',
  '망토': '방어구',
  '벨트': '악세서리',
  '어깨장식': '악세서리',
  '반지': '악세서리',
  '펜던트': '악세서리',
  '귀고리': '악세서리',
  '심볼': '심볼',
  '엠블렘': '심볼',
  '기계심장': '악세서리',
  '뱃지': '악세서리',
  '포켓': '악세서리',
  '훈장': '악세서리',
};

// 잠재옵션 등급 순서
export const POTENTIAL_GRADE_ORDER = ['레어', '에픽', '유니크', '레전드리'] as const;

// 잠재옵션 등급별 평균 스탯 값 (주스탯% 기준)
export const POTENTIAL_GRADE_AVG_STAT: Record<string, number> = {
  '레어': 5,
  '에픽': 8,
  '유니크': 11,
  '레전드리': 14,
};

// 큐브로 등업할 때 예상 비용 계산
export function calculateCubeUpgradeCost(
  currentGrade: string,
  targetGrade: string,
  cubeType: '일반큐브' | '레드큐브' | '블랙큐브' | '에디셔널큐브' = '레드큐브'
): { expectedCost: number; expectedCubes: number; successRate: number } {
  const cube = CUBE_PRICES.find(c => c.cubeType === cubeType);
  if (!cube) return { expectedCost: 0, expectedCubes: 0, successRate: 0 };

  const currentIndex = POTENTIAL_GRADE_ORDER.indexOf(currentGrade as any);
  const targetIndex = POTENTIAL_GRADE_ORDER.indexOf(targetGrade as any);
  
  if (currentIndex >= targetIndex) return { expectedCost: 0, expectedCubes: 0, successRate: 1 };

  let totalExpectedCubes = 0;
  let cumulativeProb = 1;

  for (let i = currentIndex; i < targetIndex; i++) {
    const gradeKey = `${POTENTIAL_GRADE_ORDER[i]}→${POTENTIAL_GRADE_ORDER[i + 1]}`;
    const rate = cube.gradeUpRates[gradeKey] || 0.01;
    
    if (rate <= 0) return { expectedCost: Infinity, expectedCubes: Infinity, successRate: 0 };
    
    totalExpectedCubes += 1 / (cumulativeProb * rate);
    cumulativeProb *= rate;
  }

  return {
    expectedCost: Math.round(totalExpectedCubes * cube.price),
    expectedCubes: Math.round(totalExpectedCubes * 100) / 100,
    successRate: cumulativeProb,
  };
}

// 잠재옵션 재설정 예상 비용 (목표 스탯이 나올 때까지)
export function calculatePotentialRerollCost(
  targetGrade: string,
  targetStat: string,
  cubeType: '일반큐브' | '레드큐브' | '블랙큐브' | '에디셔널큐브' = '레드큐브'
): { expectedCost: number; expectedCubes: number } {
  const cube = CUBE_PRICES.find(c => c.cubeType === cubeType);
  if (!cube) return { expectedCost: 0, expectedCubes: 0 };

  const gradeIndex = POTENTIAL_GRADE_ORDER.indexOf(targetGrade as any);
  if (gradeIndex < 0) return { expectedCost: 0, expectedCubes: 0 };

  const options = POTENTIAL_OPTIONS_BY_TYPE['무기'][gradeIndex]; // 무기 기준으로 계산
  const targetOption = options.stats.find(s => s.stat === targetStat);
  
  if (!targetOption) return { expectedCost: Infinity, expectedCubes: Infinity };

  // 3줄 중 하나가 목표 스탯이 나올 확률 (대략적)
  const singleLineProb = targetOption.weight / 100;
  const threeLineProb = 1 - Math.pow(1 - singleLineProb, 3);
  
  const expectedCubes = 1 / threeLineProb;
  
  return {
    expectedCost: Math.round(expectedCubes * cube.price),
    expectedCubes: Math.round(expectedCubes * 100) / 100,
  };
}

// 장비 타입별 잠재옵션 가져오기
export function getPotentialOptions(equipmentPart: string, grade: string): PotentialOption | undefined {
  const type = EQUIPMENT_POTENTIAL_TYPE[equipmentPart] || '방어구';
  const options = POTENTIAL_OPTIONS_BY_TYPE[type];
  return options.find(o => o.grade === grade);
}