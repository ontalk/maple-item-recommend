// 메이플스토리 장비 데이터베이스 - 정확한 장비 목록

export interface EquipmentOption {
  name: string;
  set: '보스장신구' | '여명' | '칠흑' | '앱솔랩스' | '아케인셰이드' | '에테르넬';
  minLevel: number;
  estimatedCost: number; // 17성 유니크 기준 예상 가격
}

// ===== 보스 장신구 세트 =====
export const BOSS_ACCESSORY: Record<string, EquipmentOption[]> = {
  얼굴장식: [
    { name: '응축된 힘의 결정석', set: '보스장신구', minLevel: 120, estimatedCost: 300000000 },
  ],
  눈장식: [
    { name: '아쿠아틱 레터 눈장식', set: '보스장신구', minLevel: 110, estimatedCost: 400000000 },
    { name: '블랙빈 마크', set: '보스장신구', minLevel: 135, estimatedCost: 500000000 },
    { name: '파풀라투스 마크', set: '보스장신구', minLevel: 145, estimatedCost: 600000000 },
  ],
  귀고리: [
    { name: '데아 시두스 이어링', set: '보스장신구', minLevel: 130, estimatedCost: 500000000 },
    { name: '지옥의 불꽃', set: '보스장신구', minLevel: 140, estimatedCost: 600000000 },
  ],
  반지: [
    { name: '실버블라썸 링', set: '보스장신구', minLevel: 110, estimatedCost: 400000000 },
    { name: '고귀한 이피아의 반지', set: '보스장신구', minLevel: 120, estimatedCost: 500000000 },
  ],
  펜던트: [
    { name: '매커네이터 펜던트', set: '보스장신구', minLevel: 120, estimatedCost: 500000000 },
    { name: '도미네이터 펜던트', set: '보스장신구', minLevel: 140, estimatedCost: 700000000 },
    { name: '혼테일의 목걸이', set: '보스장신구', minLevel: 120, estimatedCost: 300000000 },
    { name: '카오스 혼테일의 목걸이', set: '보스장신구', minLevel: 130, estimatedCost: 400000000 },
  ],
  벨트: [
    { name: '골든 클로버 벨트', set: '보스장신구', minLevel: 140, estimatedCost: 800000000 },
    { name: '분노한 자쿰의 벨트', set: '보스장신구', minLevel: 110, estimatedCost: 500000000 },
  ],
  어깨장식: [
    { name: '로얄 블랙메탈 숄더', set: '보스장신구', minLevel: 150, estimatedCost: 900000000 },
  ],
};

// ===== 여명 세트 =====
export const DAWN_SET: Record<string, EquipmentOption[]> = {
  얼굴장식: [
    { name: '트와일라이트 마크', set: '여명', minLevel: 140, estimatedCost: 800000000 },
  ],
  귀고리: [
    { name: '에스텔라 이어링', set: '여명', minLevel: 140, estimatedCost: 1000000000 },
  ],
  반지: [
    { name: '여명의 가디언 엔젤 링', set: '여명', minLevel: 140, estimatedCost: 900000000 },
    { name: '가디언 엔젤 링', set: '여명', minLevel: 140, estimatedCost: 900000000 },
  ],
  펜던트: [
    { name: '데이브레이크 펜던트', set: '여명', minLevel: 140, estimatedCost: 1200000000 },
  ],
};

// ===== 칠흑 세트 =====
export const BLACK_SET: Record<string, EquipmentOption[]> = {
  얼굴장식: [
    { name: '루즈 컨트롤 머신 마크', set: '칠흑', minLevel: 160, estimatedCost: 1600000000 },
  ],
  눈장식: [
    { name: '마력이 깃든 안대', set: '칠흑', minLevel: 160, estimatedCost: 1700000000 },
  ],
  귀고리: [
    { name: '커맨더 포스 이어링', set: '칠흑', minLevel: 160, estimatedCost: 1800000000 },
  ],
  반지: [
    { name: '거대한 공포', set: '칠흑', minLevel: 160, estimatedCost: 2000000000 },
  ],
  펜던트: [
    { name: '고통의 근원', set: '칠흑', minLevel: 160, estimatedCost: 1900000000 },
  ],
  벨트: [
    { name: '몽환의 벨트', set: '칠흑', minLevel: 160, estimatedCost: 1700000000 },
  ],
};

// ===== 앱솔랩스 세트 (직업별) =====
const ABSOLABS_JOB_SUFFIXES = {
  전사: '나이트',
  마법사: '메이지',
  궁수: '아처',
  도적: '시프',
  해적: '파이렛',
};

export const ABSOLABS_SET: Record<string, EquipmentOption[]> = {
  모자: [
    { name: '앱솔랩스 나이트헤어', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 메이지헤어', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 아처헤어', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 시프헤어', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 파이렛헤어', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
  ],
  상의: [
    { name: '앱솔랩스 나이트슈트', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 메이지슈트', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 아처슈트', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 시프슈트', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 파이렛슈트', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
  ],
  하의: [
    { name: '앱솔랩스 나이트팬츠', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 메이지팬츠', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 아처팬츠', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 시프팬츠', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 파이렛팬츠', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
  ],
  장갑: [
    { name: '앱솔랩스 나이트글러브', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 메이지글러브', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 아처글러브', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 시프글러브', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 파이렛글러브', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
  ],
  신발: [
    { name: '앱솔랩스 나이트슈즈', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 메이지슈즈', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 아처슈즈', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 시프슈즈', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 파이렛슈즈', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
  ],
  망토: [
    { name: '앱솔랩스 나이트케이프', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 메이지케이프', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 아처케이프', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 시프케이프', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 파이렛케이프', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
  ],
  어깨장식: [
    { name: '앱솔랩스 나이트숄더', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 메이지숄더', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 아처숄더', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 시프숄더', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
    { name: '앱솔랩스 파이렛숄더', set: '앱솔랩스', minLevel: 160, estimatedCost: 700000000 },
  ],
  무기: [
    { name: '앱솔랩스 무기', set: '앱솔랩스', minLevel: 160, estimatedCost: 1800000000 },
  ],
};

// ===== 아케인셰이드 세트 (직업별) =====
export const ARCANE_SET: Record<string, EquipmentOption[]> = {
  모자: [
    { name: '아케인셰이드 나이트햇', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 메이지햇', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 아처햇', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 시프햇', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 파이렛햇', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
  ],
  상의: [
    { name: '아케인셰이드 나이트슈트', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 메이지슈트', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 아처슈트', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 시프슈트', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 파이렛슈트', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
  ],
  하의: [
    { name: '아케인셰이드 나이트팬츠', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 메이지팬츠', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 아처팬츠', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 시프팬츠', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 파이렛팬츠', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
  ],
  장갑: [
    { name: '아케인셰이드 나이트글러브', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 메이지글러브', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 아처글러브', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 시프글러브', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 파이렛글러브', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
  ],
  신발: [
    { name: '아케인셰이드 나이트슈즈', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 메이지슈즈', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 아처슈즈', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 시프슈즈', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 파이렛슈즈', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
  ],
  망토: [
    { name: '아케인셰이드 나이트케이프', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 메이지케이프', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 아처케이프', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 시프케이프', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 파이렛케이프', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
  ],
  어깨장식: [
    { name: '아케인셰이드 나이트숄더', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 메이지숄더', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 아처숄더', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 시프숄더', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
    { name: '아케인셰이드 파이렛숄더', set: '아케인셰이드', minLevel: 200, estimatedCost: 1500000000 },
  ],
  무기: [
    { name: '아케인셰이드 무기', set: '아케인셰이드', minLevel: 200, estimatedCost: 3500000000 },
  ],
};

// ===== 에테르넬 세트 (직업별) =====
export const ETERNAL_SET: Record<string, EquipmentOption[]> = {
  모자: [
    { name: '에테르넬 나이트햇', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 메이지햇', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 아처햇', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 시프햇', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 파이렛햇', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
  ],
  상의: [
    { name: '에테르넬 나이트셔츠', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 메이지셔츠', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 아처셔츠', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 시프셔츠', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 파이렛셔츠', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
  ],
  하의: [
    { name: '에테르넬 나이트팬츠', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 메이지팬츠', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 아처팬츠', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 시프팬츠', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 파이렛팬츠', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
  ],
  장갑: [
    { name: '에테르넬 나이트글러브', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 메이지글러브', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 아처글러브', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 시프글러브', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 파이렛글러브', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
  ],
  신발: [
    { name: '에테르넬 나이트슈즈', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 메이지슈즈', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 아처슈즈', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 시프슈즈', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 파이렛슈즈', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
  ],
  망토: [
    { name: '에테르넬 나이트케이프', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 메이지케이프', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 아처케이프', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 시프케이프', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 파이렛케이프', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
  ],
  어깨장식: [
    { name: '에테르넬 나이트숄더', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 메이지숄더', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 아처숄더', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 시프숄더', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
    { name: '에테르넬 파이렛숄더', set: '에테르넬', minLevel: 250, estimatedCost: 5000000000 },
  ],
};

// ===== 부위별 모든 장비 통합 =====
export function getAllEquipmentOptions(part: string): EquipmentOption[] {
  const normalizedPart = normalizePart(part);
  const options: EquipmentOption[] = [];

  // 보스 장신구
  if (BOSS_ACCESSORY[normalizedPart]) {
    options.push(...BOSS_ACCESSORY[normalizedPart]);
  }

  // 여명 세트
  if (DAWN_SET[normalizedPart]) {
    options.push(...DAWN_SET[normalizedPart]);
  }

  // 칠흑 세트
  if (BLACK_SET[normalizedPart]) {
    options.push(...BLACK_SET[normalizedPart]);
  }

  // 앱솔랩스 세트
  if (ABSOLABS_SET[normalizedPart]) {
    options.push(...ABSOLABS_SET[normalizedPart]);
  }

  // 아케인셰이드 세트
  if (ARCANE_SET[normalizedPart]) {
    options.push(...ARCANE_SET[normalizedPart]);
  }

  // 에테르넬 세트
  if (ETERNAL_SET[normalizedPart]) {
    options.push(...ETERNAL_SET[normalizedPart]);
  }

  return options;
}

// 부위명 정규화
export function normalizePart(part: string): string {
  if (part.startsWith('반지')) return '반지';
  if (part.startsWith('펜던트')) return '펜던트';
  if (part === '어깨' || part === '숄더') return '어깨장식';
  if (part === '한벌옷' || part === '옷' || part === '투피스') return '상의';
  return part;
}
