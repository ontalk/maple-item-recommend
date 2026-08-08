// 메이플스토리 장비 데이터베이스 - 정확한 장비 목록

export interface EquipmentOption {
  job?: string;
  part?: '보조무기' | '엠블렘';
  name: string;
  set: '보스장신구' | '여명' | '칠흑' | '광휘의 장신구' | '앱솔랩스' | '아케인셰이드' | '에테르넬';
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
  ],
  반지: [
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

// ===== 광휘의 장신구 세트 =====
const BRILLIANT_ACCESSORY_SET: Record<string, EquipmentOption[]> = {
  반지: [
    { name: '근원의 속삭임', set: '광휘의 장신구', minLevel: 200, estimatedCost: 3000000000 },
    { name: '황홀한 악몽', set: '광휘의 장신구', minLevel: 200, estimatedCost: 3000000000 },
  ],
  펜던트: [
    { name: '죽음의 맹세', set: '광휘의 장신구', minLevel: 200, estimatedCost: 3000000000 },
  ],
  훈장: [
    { name: '불멸의 유산', set: '광휘의 장신구', minLevel: 200, estimatedCost: 3000000000 },
  ],
  얼굴장식: [
    { name: '오만의 원죄', set: '광휘의 장신구', minLevel: 200, estimatedCost: 3000000000 },
  ],
  눈장식: [
    { name: '굶주리는 핏빛 원혼', set: '광휘의 장신구', minLevel: 200, estimatedCost: 3000000000 },
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

// ===== 엠블렘 =====
export const EMBLEM_SET: Record<string, EquipmentOption[]> = {
  엠블렘: [
    { name: '미트라의 분노 : 나이트', set: '칠흑', minLevel: 200, estimatedCost: 3000000000 },
    { name: '미트라의 분노 : 메이지', set: '칠흑', minLevel: 200, estimatedCost: 3000000000 },
    { name: '미트라의 분노 : 아처', set: '칠흑', minLevel: 200, estimatedCost: 3000000000 },
    { name: '미트라의 분노 : 시프', set: '칠흑', minLevel: 200, estimatedCost: 3000000000 },
    { name: '미트라의 분노 : 해적', set: '칠흑', minLevel: 200, estimatedCost: 3000000000 },
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
const SECONDARY_WEAPON_SET: EquipmentOption[] = [
  ['히어로', '버츄스 메달'], ['팔라딘', '세이크리드 로자리오'], ['다크나이트', '버서크 체인'],
  ['불독', '적녹의 서 <종장>'], ['썬콜', '청은의 서 <종장>'], ['비숍', '백금의 서 <종장>'],
  ['보우마스터', '블라스트 페더'], ['신궁', '전발적중'], ['패스파인더', '퍼펙트 렐릭'],
  ['나이트로드', '파사부'], ['섀도어', '슬래싱 섀도우'], ['듀얼블레이드', '아케인셰이드 블레이드'],
  ['바이퍼', '리스트 아머'], ['캡틴', '팔콘아이'], ['캐논슈터', '봄버드 센터파이어'],
  ['소울마스터', '에레브의 광휘'], ['플레임위자드', '에레브의 광휘'], ['윈드브레이커', '에레브의 광휘'],
  ['나이트워커', '에레브의 광휘'], ['스트라이커', '에레브의 광휘'], ['아란', '천룡추'],
  ['에반', '드래곤마스터의 유산'], ['루미너스', '카르마 오브'], ['메르세데스', '무한의 마법 화살'],
  ['팬텀', '데르니에 카르트'], ['은월', '황금빛 여우구슬'], ['블래스터', '익스플로시브 필<3호>'],
  ['배틀메이지', '맥시마이즈 볼'], ['와일드헌터', '와일드 팡'], ['메카닉', '이터널 매그넘'],
  ['제논', '하이브리드 하트'], ['데몬슬레이어', '극한의 포스실드'], ['데몬슬레이어', '루인 포스실드'],
  ['데몬어벤져', '극한의 포스실드'], ['데몬어벤져', '루인 포스실드'], ['카데나', '트랜스미터 type:A'],
  ['아델', '노블 브레이슬릿'], ['일리움', '글로리 매직윙'], ['아크', '얼티밋 패스'],
  ['카인', 'D100 커스텀 웨폰 벨트'], ['칼리', '인피니트 헥스시커'], ['호영', '월장석 선추'],
  ['라라', '빛나는 사옥 노리개'], ['렌', '자색 여의보주'], ['키네시스', '체스피스 디 퀸'],
  ['레테', '녹스 마법깃펜'],
].map(([job, name]): EquipmentOption => ({ job, part: '보조무기', name, set: '칠흑', minLevel: 100, estimatedCost: 0 }));

const EMBLEM_WEAPON_SET: EquipmentOption[] = [
  ['카이저', '드래곤 엠블렘'], ['엔젤릭버스터', '엔젤 엠블렘'],
].map(([job, name]): EquipmentOption => ({ job, part: '엠블렘', name, set: '칠흑', minLevel: 100, estimatedCost: 0 }));

export function getAllEquipmentOptions(part: string): EquipmentOption[] {
  const normalizedPart = normalizePart(part);
  const options: EquipmentOption[] = [];

  if (normalizedPart === '보조무기') options.push(...SECONDARY_WEAPON_SET);
  if (normalizedPart === '엠블렘') options.push(...EMBLEM_WEAPON_SET);
  if (BRILLIANT_ACCESSORY_SET[normalizedPart]) options.push(...BRILLIANT_ACCESSORY_SET[normalizedPart]);

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

  if (EMBLEM_SET[normalizedPart]) {
    options.push(...EMBLEM_SET[normalizedPart]);
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
