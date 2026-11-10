// 메이플스토리 장비 세트 효과 데이터베이스
//
// 전투력 계산은 "아이템을 하나 더 살 때 세트 개수가 늘고, 그 세트 효과가
// 다시 전투력에 반영된다"는 구조를 따라야 한다. 그래서 세트별 구성원과
// 세트 개수별 효과를 데이터로 두고, 착용 목록에서 매번 다시 계산한다.
//
// 수치 출처: 메이플스토리 인게임 세트 효과 / 나무위키·세트옵션 시뮬레이터 대조

export type StatKey =
  | 'str' | 'dex' | 'int' | 'luk' | 'allStat'
  | 'strPct' | 'dexPct' | 'intPct' | 'lukPct' | 'allStatPct'
  | 'attack' | 'magic' | 'attackPct' | 'magicPct'
  | 'damage' | 'bossDamage' | 'critDamage' | 'finalDamage' | 'ignoreDefense'
  | 'maxHp' | 'maxHpPct' | 'defense';

export type StatBag = Partial<Record<StatKey, number>>;

export function addToBag(bag: StatBag, key: StatKey, value: number): void {
  if (!Number.isFinite(value) || value === 0) return;
  bag[key] = (bag[key] ?? 0) + value;
}

export function mergeBags(...bags: StatBag[]): StatBag {
  const out: StatBag = {};
  for (const bag of bags) {
    for (const [key, value] of Object.entries(bag)) {
      addToBag(out, key as StatKey, Number(value));
    }
  }
  return out;
}

export function negateBag(bag: StatBag): StatBag {
  const out: StatBag = {};
  for (const [key, value] of Object.entries(bag)) {
    if (value) out[key as StatKey] = -Number(value);
  }
  return out;
}

export interface SetEffectTier {
  count: number;
  effects: StatBag;
}

export interface SetMember {
  key: string;
  part: string;
  /** 이름에 모두 포함되어야 하는 토큰 (없으면 부위만 본다) */
  tokens?: string[];
  /** 이름에 하나라도 포함되면 이 세트가 아니다 (예: '여명의 가디언 엔젤 링') */
  exclude?: string[];
}

export interface EquipmentSetDefinition {
  id: string;
  name: string;
  members: SetMember[];
  tiers: SetEffectTier[];
}

export interface ActiveSet {
  id: string;
  name: string;
  count: number;
  maxCount: number;
  tiers: number[];
  effects: StatBag;
  matchedParts: string[];
}

const STAT_LABELS: Record<StatKey, string> = {
  str: 'STR', dex: 'DEX', int: 'INT', luk: 'LUK', allStat: '올스탯',
  strPct: 'STR%', dexPct: 'DEX%', intPct: 'INT%', lukPct: 'LUK%', allStatPct: '올스탯%',
  attack: '공격력', magic: '마력', attackPct: '공격력%', magicPct: '마력%',
  damage: '데미지', bossDamage: '보스 데미지', critDamage: '크리티컬 데미지',
  finalDamage: '최종 데미지', ignoreDefense: '방어율 무시',
  maxHp: '최대 HP', maxHpPct: '최대 HP%', defense: '방어력',
};

const PERCENT_KEYS: StatKey[] = [
  'strPct', 'dexPct', 'intPct', 'lukPct', 'allStatPct',
  'attackPct', 'magicPct', 'damage', 'bossDamage', 'critDamage',
  'finalDamage', 'ignoreDefense', 'maxHpPct',
];

export function formatStatBag(bag: StatBag): string[] {
  return Object.entries(bag)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => {
      const statKey = key as StatKey;
      const suffix = PERCENT_KEYS.includes(statKey) ? '%' : '';
      return `${STAT_LABELS[statKey]} +${value}${suffix}`;
    });
}

export function normalizeEquipmentPart(part: string): string {
  const compact = (part || '').replace(/\s+/g, '');
  if (compact.startsWith('반지')) return '반지';
  if (compact.startsWith('펜던트')) return '펜던트';
  if (compact === '기계심장') return '기계심장';
  if (compact === '포켓아이템' || compact === '포켓') return '포켓';
  if (compact === '어깨' || compact === '숄더' || compact === '어깨장식') return '어깨장식';
  if (compact === '한벌옷' || compact === '옷') return '상의';
  return compact;
}

const BLACK_HEART: StatBag = {};

export const EQUIPMENT_SETS: EquipmentSetDefinition[] = [
  {
    id: 'black',
    name: '칠흑의 보스 세트',
    members: [
      { key: '루즈컨', part: '얼굴장식', tokens: ['루즈 컨트롤'] },
      { key: '마깃안', part: '눈장식', tokens: ['마력이 깃든 안대'] },
      { key: '블랙하트', part: '기계심장', tokens: ['블랙 하트'] },
      { key: '컴플리트', part: '기계심장', tokens: ['컴플리트 언더컨트롤'] },
      { key: '몽벨', part: '벨트', tokens: ['몽환의 벨트'] },
      { key: '고근', part: '펜던트', tokens: ['고통의 근원'] },
      { key: '창뱃', part: '뱃지', tokens: ['창세의 뱃지'] },
      { key: '커포', part: '귀고리', tokens: ['커맨더 포스 이어링'] },
      { key: '거공', part: '반지', tokens: ['거대한 공포'] },
      { key: '마도서', part: '포켓', tokens: ['마도서'] },
      { key: '미트라', part: '엠블렘', tokens: ['미트라의 분노'] },
    ],
    tiers: [
      { count: 2, effects: { allStat: 10, maxHp: 250, attack: 10, magic: 10, bossDamage: 10 } },
      { count: 3, effects: { allStat: 10, maxHp: 250, attack: 10, magic: 10, defense: 250, ignoreDefense: 10 } },
      { count: 4, effects: { allStat: 15, maxHp: 375, attack: 15, magic: 15, critDamage: 5 } },
      { count: 5, effects: { allStat: 15, maxHp: 375, attack: 15, magic: 15, bossDamage: 10 } },
      { count: 6, effects: { allStat: 15, maxHp: 375, attack: 15, magic: 15, ignoreDefense: 10 } },
      { count: 7, effects: { allStat: 15, maxHp: 375, attack: 15, magic: 15, critDamage: 5 } },
      { count: 8, effects: { allStat: 15, maxHp: 375, attack: 15, magic: 15, bossDamage: 10 } },
      { count: 9, effects: { allStat: 15, maxHp: 375, attack: 15, magic: 15, critDamage: 5 } },
      { count: 10, effects: { allStat: 20, maxHp: 500, attack: 20, magic: 20, bossDamage: 10 } },
    ],
  },
  {
    id: 'dawn',
    name: '여명의 보스 세트',
    members: [
      { key: '트왈마', part: '얼굴장식', tokens: ['트와일라이트 마크'] },
      { key: '에스텔라', part: '귀고리', tokens: ['에스텔라 이어링'] },
      { key: '여명가엔링', part: '반지', tokens: ['여명', '가디언 엔젤 링'] },
      { key: '데브펜', part: '펜던트', tokens: ['데이브레이크'] },
    ],
    tiers: [
      { count: 2, effects: { allStat: 10, maxHp: 250, attack: 10, magic: 10, bossDamage: 10 } },
      { count: 3, effects: { allStat: 10, maxHp: 250, attack: 10, magic: 10 } },
      { count: 4, effects: { allStat: 10, maxHp: 250, attack: 10, magic: 10, defense: 100, ignoreDefense: 10 } },
    ],
  },
  {
    id: 'boss-accessory',
    name: '보스 장신구 세트',
    members: [
      { key: '응축', part: '얼굴장식', tokens: ['응축된 힘의 결정석'] },
      { key: '아쿠아틱', part: '눈장식', tokens: ['아쿠아틱'] },
      { key: '블랙빈', part: '눈장식', tokens: ['블랙빈'] },
      { key: '파풀마', part: '눈장식', tokens: ['파풀라투스 마크'] },
      { key: '지옥불꽃', part: '귀고리', tokens: ['지옥의 불꽃'] },
      { key: '데아시두스', part: '귀고리', tokens: ['데아 시두스'] },
      { key: '실블링', part: '반지', tokens: ['실버블라썸'] },
      { key: '이피아', part: '반지', tokens: ['이피아의 반지'] },
      { key: '가엔링', part: '반지', tokens: ['가디언 엔젤 링'], exclude: ['여명'] },
      { key: '혼목', part: '펜던트', tokens: ['혼테일의 목걸이'], exclude: ['카오스'] },
      { key: '카혼목', part: '펜던트', tokens: ['카오스 혼테일의 목걸이'] },
      { key: '매커', part: '펜던트', tokens: ['매커네이터'] },
      { key: '도미', part: '펜던트', tokens: ['도미네이터'] },
      { key: '골클벨', part: '벨트', tokens: ['골든 클로버'] },
      { key: '분자벨', part: '벨트', tokens: ['분노한 자쿰'] },
      { key: '로얄숄더', part: '어깨장식', tokens: ['로얄 블랙메탈'] },
      { key: '성배', part: '포켓', tokens: ['핑크빛 성배'] },
      { key: '영생의돌', part: '포켓', tokens: ['영생의 돌'] },
      { key: '크웬뱃', part: '뱃지', tokens: ['크리스탈 웬투스'] },
    ],
    tiers: [
      { count: 3, effects: { allStat: 10, maxHpPct: 5, attack: 5, magic: 5 } },
      { count: 5, effects: { allStat: 10, maxHpPct: 5, attack: 5, magic: 5 } },
      { count: 7, effects: { allStat: 10, attack: 10, magic: 10, defense: 80, ignoreDefense: 10 } },
      { count: 9, effects: { allStat: 15, attack: 10, magic: 10, defense: 100, bossDamage: 10 } },
    ],
  },
  {
    id: 'brilliant',
    name: '광휘의 보스 세트',
    members: [
      { key: '근원', part: '반지', tokens: ['근원의 속삭임'] },
      { key: '황홀', part: '반지', tokens: ['황홀한 악몽'] },
      { key: '죽음의맹세', part: '펜던트', tokens: ['죽음의 맹세'] },
      { key: '불멸의유산', part: '훈장', tokens: ['불멸의 유산'] },
      { key: '오만', part: '얼굴장식', tokens: ['오만의 원죄'] },
      { key: '핏빛원혼', part: '눈장식', tokens: ['굶주리는 핏빛 원혼'] },
    ],
    tiers: [
      { count: 2, effects: { allStat: 20, maxHp: 500, attack: 20, magic: 20, bossDamage: 15 } },
      { count: 3, effects: { allStat: 20, maxHp: 500, attack: 20, magic: 20, ignoreDefense: 15 } },
      { count: 4, effects: { allStat: 20, maxHp: 500, attack: 20, magic: 20, critDamage: 5 } },
      { count: 5, effects: { allStat: 20, maxHp: 500, attack: 20, magic: 20, bossDamage: 15 } },
    ],
  },
  {
    id: 'absolabs',
    name: '앱솔랩스 세트',
    members: [
      { key: '모자', part: '모자', tokens: ['앱솔랩스'] },
      { key: '상의', part: '상의', tokens: ['앱솔랩스'] },
      { key: '장갑', part: '장갑', tokens: ['앱솔랩스'] },
      { key: '신발', part: '신발', tokens: ['앱솔랩스'] },
      { key: '망토', part: '망토', tokens: ['앱솔랩스'] },
      { key: '어깨장식', part: '어깨장식', tokens: ['앱솔랩스'] },
      { key: '무기', part: '무기', tokens: ['앱솔랩스'] },
    ],
    tiers: [
      { count: 2, effects: { maxHp: 1500, attack: 20, magic: 20, bossDamage: 10 } },
      { count: 3, effects: { allStat: 30, attack: 20, magic: 20, bossDamage: 10 } },
      { count: 4, effects: { attack: 25, magic: 25, defense: 200, ignoreDefense: 10 } },
      { count: 5, effects: { attack: 30, magic: 30, bossDamage: 10 } },
      { count: 6, effects: { maxHpPct: 20, attack: 20, magic: 20 } },
      { count: 7, effects: { attack: 20, magic: 20, ignoreDefense: 10 } },
    ],
  },
  {
    id: 'arcane',
    name: '아케인셰이드 세트',
    members: [
      { key: '모자', part: '모자', tokens: ['아케인셰이드'] },
      { key: '상의', part: '상의', tokens: ['아케인셰이드'] },
      { key: '하의', part: '하의', tokens: ['아케인셰이드'] },
      { key: '장갑', part: '장갑', tokens: ['아케인셰이드'] },
      { key: '신발', part: '신발', tokens: ['아케인셰이드'] },
      { key: '망토', part: '망토', tokens: ['아케인셰이드'] },
      { key: '어깨장식', part: '어깨장식', tokens: ['아케인셰이드'] },
      { key: '무기', part: '무기', tokens: ['아케인셰이드'] },
    ],
    tiers: [
      { count: 2, effects: { maxHp: 2000, attack: 30, magic: 30, bossDamage: 10 } },
      { count: 3, effects: { allStat: 50, attack: 30, magic: 30, bossDamage: 10 } },
      { count: 4, effects: { attack: 30, magic: 30, bossDamage: 10, ignoreDefense: 10 } },
      { count: 5, effects: { attack: 40, magic: 40, bossDamage: 15 } },
      { count: 6, effects: { attack: 40, magic: 40, ignoreDefense: 10 } },
    ],
  },
  {
    id: 'eternal',
    name: '에테르넬 세트',
    members: [
      { key: '모자', part: '모자', tokens: ['에테르넬'] },
      { key: '상의', part: '상의', tokens: ['에테르넬'] },
      { key: '하의', part: '하의', tokens: ['에테르넬'] },
      { key: '장갑', part: '장갑', tokens: ['에테르넬'] },
      { key: '신발', part: '신발', tokens: ['에테르넬'] },
      { key: '망토', part: '망토', tokens: ['에테르넬'] },
      { key: '어깨장식', part: '어깨장식', tokens: ['에테르넬'] },
      { key: '무기', part: '무기', tokens: ['제네시스'] },
      { key: '데스티니무기', part: '무기', tokens: ['데스티니'] },
    ],
    tiers: [
      { count: 2, effects: { maxHp: 2500, attack: 40, magic: 40, bossDamage: 10 } },
      { count: 3, effects: { allStat: 50, attack: 40, magic: 40, bossDamage: 10, defense: 600 } },
      { count: 4, effects: { maxHpPct: 15, attack: 40, magic: 40, bossDamage: 10 } },
      { count: 5, effects: { attack: 40, magic: 40, ignoreDefense: 20 } },
      { count: 6, effects: { attack: 40, magic: 40, bossDamage: 15 } },
      { count: 7, effects: { maxHp: 2500, allStat: 50, attack: 40, magic: 40, bossDamage: 15 } },
      { count: 8, effects: { attack: 40, magic: 40, bossDamage: 15 } },
    ],
  },
];

export interface EquippedPiece {
  name: string;
  part: string;
}

function memberMatches(member: SetMember, piece: EquippedPiece): boolean {
  if (normalizeEquipmentPart(piece.part) !== normalizeEquipmentPart(member.part)) return false;
  const name = piece.name || '';
  if (member.exclude?.some((token) => name.includes(token))) return false;
  if (!member.tokens?.length) return true;
  return member.tokens.every((token) => name.includes(token));
}

/**
 * 착용 목록에서 발동 중인 세트와 세트 개수별 효과를 계산한다.
 * 같은 세트 구성원을 두 번 세지 않는다(같은 아이템 중복 장착 불가와 동일).
 */
export function resolveSetBonuses(pieces: EquippedPiece[]): ActiveSet[] {
  return EQUIPMENT_SETS.flatMap((set) => {
    const matched = set.members.filter((member) =>
      pieces.some((piece) => memberMatches(member, piece))
    );
    if (matched.length === 0) return [];

    const tiers = set.tiers.filter((tier) => tier.count <= matched.length).map((tier) => tier.count);
    const effects = mergeBags(
      ...set.tiers.filter((tier) => tier.count <= matched.length).map((tier) => tier.effects)
    );

    return [{
      id: set.id,
      name: set.name,
      count: matched.length,
      maxCount: set.members.length,
      tiers,
      effects,
      matchedParts: matched.map((member) => member.key),
    }];
  });
}

export function totalSetEffects(active: ActiveSet[]): StatBag {
  return mergeBags(...active.map((set) => set.effects));
}
