/**
 * 메이플스토리 Open API 연동 라이브러리
 * 넥슨 공식 API를 사용해 캐릭터 정보 조회
 */

const API_BASE_URL = 'https://open.api.nexon.com/maplestory/v1';
const API_KEY = process.env.NEXT_PUBLIC_MAPLE_API_KEY;

// API 키 검증
if (!API_KEY) {
  console.warn('⚠️ NEXT_PUBLIC_MAPLE_API_KEY가 설정되지 않았습니다.');
}

// 공통 헤더
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

// ============================================
// 타입 정의
// ============================================
export interface CharacterBasic {
  ocid: string;
  character_name: string;
  world_name: string;
  character_gender: string;
  character_class: string;
  character_level: number;
  character_exp: number;
  character_exp_rate: string;
  character_guild_name: string | null;
  character_image: string;
  date_create: string;
  date_last_login: string;
}

export interface CharacterEquipment {
  item_equipment_part: string;
  item_slot: string;
  item_name: string;
  item_icon: string;
  item_description: string;
  item_shape_name: string;
  item_shape_icon: string;
  item_gender: string;
  item_type: string;
  item_level: number;
  item_equip_level: number;
  item_rarity: string;
  item_starforce: number;
  item_potential_option_grade: string;
  item_add_potential_option_grade: string;
  item_exceptional_option: string | null;
  item_growth_exp: number | null;
  item_growth_level: number | null;
  item_appearance: boolean;
  item_cash: boolean;
  item_preset: boolean;
  potential_options: PotentialOption[];
  additional_potential_options: PotentialOption[];
}

export interface PotentialOption {
  potential_option_grade: string;
  potential_option_1: string | null;
  potential_option_2: string | null;
  potential_option_3: string | null;
}

export interface CharacterStat {
  final_stat: StatDetail[];
  base_stat: StatDetail[];
  additional_stat: StatDetail[];
}

export interface StatDetail {
  stat_name: string;
  stat_value: number;
}

export interface CharacterFullInfo {
  basic: CharacterBasic;
  equipment: CharacterEquipment[];
  stat: CharacterStat;
  // 계산용 추가 필드
  main_stat: string; // STR, DEX, INT, LUK 중 주스탯
  main_stat_value: number;
}

// ============================================
// API 호출 함수들
// ============================================

/**
 * 캐릭터 OCID 조회 (닉네임으로)
 */
export async function getCharacterOCID(characterName: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/id?character_name=${encodeURIComponent(characterName)}`,
      { headers }
    );
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`OCID 조회 실패: ${response.status}`);
    }
    
    const data = await response.json();
    return data.ocid || null;
  } catch (error) {
    console.error('OCID 조회 오류:', error);
    throw error;
  }
}

/**
 * 캐릭터 기본 정보 조회
 */
export async function getCharacterBasic(ocid: string): Promise<CharacterBasic | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/character/basic?ocid=${ocid}`, { headers });
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`기본 정보 조회 실패: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('기본 정보 조회 오류:', error);
    throw error;
  }
}

/**
 * 캐릭터 장비 정보 조회
 */
export async function getCharacterEquipment(ocid: string): Promise<CharacterEquipment[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/character/item-equipment?ocid=${ocid}`, { headers });
    
    if (!response.ok) {
      throw new Error(`장비 정보 조회 실패: ${response.status}`);
    }
    
    const data = await response.json();
    return data.item_equipment || [];
  } catch (error) {
    console.error('장비 정보 조회 오류:', error);
    throw error;
  }
}

/**
 * 캐릭터 스탯 정보 조회
 */
export async function getCharacterStat(ocid: string): Promise<CharacterStat | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/character/stat?ocid=${ocid}`, { headers });
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`스탯 정보 조회 실패: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('스탯 정보 조회 오류:', error);
    throw error;
  }
}

/**
 * 캐릭터 전체 정보 한 번에 조회 (병렬 처리)
 */
export async function getCharacterFullInfo(characterName: string): Promise<CharacterFullInfo | null> {
  try {
    // 1. OCID 조회
    const ocid = await getCharacterOCID(characterName);
    if (!ocid) return null;

    // 2. 병렬로 기본정보, 장비, 스탯 조회
    const [basic, equipment, stat] = await Promise.all([
      getCharacterBasic(ocid),
      getCharacterEquipment(ocid),
      getCharacterStat(ocid),
    ]);

    if (!basic || !stat) return null;

    // 3. 주스탯 계산
    const { main_stat, main_stat_value } = calculateMainStat(basic.character_class, stat.final_stat);

    return {
      basic,
      equipment,
      stat,
      main_stat,
      main_stat_value,
    };
  } catch (error) {
    console.error('전체 정보 조회 오류:', error);
    throw error;
  }
}

/**
 * 직업별 주스탯 결정
 */
function calculateMainStat(job: string, finalStats: StatDetail[]): { main_stat: string; main_stat_value: number } {
  const statMap: Record<string, number> = {};
  finalStats.forEach(s => { statMap[s.stat_name] = s.stat_value; });

  // 직업군별 주스탯 매핑
  const warriorJobs = ['전사', '히어로', '팔라딘', '다크나이트', '아란', '카이저', '아델', '제로', '블래스터', '데몬슬레이어', '데몬어벤져', '미하일', '소울마스터', '플레임위자드', '윈드브레이커', '나이트워커', '스트라이커', '아크', '일리움', '라라', '카인'];
  const magicianJobs = ['마법사', '비숍', '아크메이지(불,독)', '아크메이지(썬,콜)', '에반', '루미너스', '배틀메이지', '와일드헌터', '메카닉', '제논', '키네시스', '호영', '칼리'];
  const archerJobs = ['궁수', '보우마스터', '신궁', '윈드브레이커', '와일드헌터', '메르세데스', '카데나', '패스파인더'];
  const thiefJobs = ['도적', '나이트로드', '섀도어', '듀얼블레이드', '나이트워커', '카데나', '호영', '칼리', '카인'];

  let mainStat = 'STR';
  
  if (magicianJobs.some(j => job.includes(j))) mainStat = 'INT';
  else if (archerJobs.some(j => job.includes(j))) mainStat = 'DEX';
  else if (thiefJobs.some(j => job.includes(j))) mainStat = 'LUK';
  else if (warriorJobs.some(j => job.includes(j))) mainStat = 'STR';
  // 데몬어벤져는 HP 주스탯
  else if (job.includes('데몬어벤져')) mainStat = 'HP';

  return {
    main_stat: mainStat,
    main_stat_value: statMap[mainStat] || 0,
  };
}

/**
 * 장비 부위별 정렬 순서
 */
export const EQUIPMENT_ORDER = [
  '무기', '보조무기', '엠블렘', '모자', '상의', '하의', '장갑', '신발', 
  '망토', '벨트', '어깨장식', '펜던트1', '펜던트2', '반지1', '반지2', '반지3', '반지4', '귀고리'
];

/**
 * 장비 정렬 함수
 */
export function sortEquipment(equipments: CharacterEquipment[]): CharacterEquipment[] {
  const orderMap: Record<string, number> = {};
  EQUIPMENT_ORDER.forEach((part, idx) => orderMap[part] = idx);
  
  return [...equipments].sort((a, b) => {
    const aOrder = orderMap[a.item_equipment_part] ?? 999;
    const bOrder = orderMap[b.item_equipment_part] ?? 999;
    return aOrder - bOrder;
  });
}

/**
 * 잠재옵션 등급 숫자 변환
 */
export function getPotentialGradeValue(grade: string): number {
  const grades: Record<string, number> = {
    '레어': 1,
    '에픽': 2,
    '유니크': 3,
    '레전드리': 4,
  };
  return grades[grade] || 0;
}

/**
 * 에디셔널 잠재옵션 라인 수 계산
 */
export function getAdditionalPotentialLines(grade: string): number {
  const lines: Record<string, number> = {
    '레어': 1,
    '에픽': 2,
    '유니크': 3,
    '레전드리': 3,
  };
  return lines[grade] || 0;
}

// types/index.ts의 타입들을 import
import type { CharacterItem, ItemPotentialOption, ItemOption } from '@/types';

/**
 * 공통 아이템 인터페이스 (API 응답 타입 통합)
 */
export interface UnifiedItem {
  item_potential_option_grade: string;
  item_add_potential_option_grade: string;
  item_starforce: number;
  item_max_starforce?: number; // CharacterEquipment에는 없을 수 있음
  item_equip_level: number;
  item_equipment_part: string;
  // CharacterItem 필드 (types/index.ts)
  item_potential_option?: ItemPotentialOption[];
  item_add_potential_option?: ItemPotentialOption[];
  item_exceptional_option?: ItemOption[] | string | null;
  item_total_option?: ItemOption[];
  item_base_option?: ItemOption[];
  // CharacterEquipment 필드 (maple-api.ts)
  potential_options?: PotentialOption[];
  additional_potential_options?: PotentialOption[];
}

/**
 * CharacterItem (types/index.ts) 타입 가드
 */
export function isCharacterItem(item: UnifiedItem): item is UnifiedItem & {
  item_potential_option: ItemPotentialOption[];
  item_add_potential_option: ItemPotentialOption[];
  item_exceptional_option: ItemOption[];
  item_total_option: ItemOption[];
  item_base_option: ItemOption[];
} {
  return 'item_potential_option' in item && Array.isArray(item.item_potential_option);
}

/**
 * CharacterEquipment (maple-api.ts) 타입 가드
 */
export function isCharacterEquipment(item: UnifiedItem): item is UnifiedItem & {
  potential_options: PotentialOption[];
  additional_potential_options: PotentialOption[];
} {
  return 'potential_options' in item && Array.isArray(item.potential_options);
}

/**
 * 아이템 옵션 파싱 (잠재옵션, 에디셔널 옵션 추출) - 통합 버전
 */
export interface ParsedOption {
  stat: string;
  value: number;
  isPercent: boolean;
}

export interface ParsedItemOptions {
  potentialOptions: ParsedOption[];
  additionalOptions: ParsedOption[];
}

export function parseItemOptions(item: UnifiedItem): ParsedItemOptions {
  const potentialOptions: ParsedOption[] = [];
  const additionalOptions: ParsedOption[] = [];

  // CharacterItem 타입인 경우 (types/index.ts)
  if (isCharacterItem(item)) {
    // 잠재옵션 파싱
    item.item_potential_option.forEach(opt => {
      if (opt.potential_option_value) {
        const parsed = parseOptionString(opt.potential_option_value);
        if (parsed) potentialOptions.push(parsed);
      }
    });
    
    // 에디셔널 잠재옵션 파싱
    item.item_add_potential_option.forEach(opt => {
      if (opt.potential_option_value) {
        const parsed = parseOptionString(opt.potential_option_value);
        if (parsed) additionalOptions.push(parsed);
      }
    });
  } 
  // CharacterEquipment 타입인 경우 (maple-api.ts)
  else if (isCharacterEquipment(item)) {
    // 잠재옵션 파싱
    item.potential_options.forEach(opt => {
      [opt.potential_option_1, opt.potential_option_2, opt.potential_option_3].forEach(optStr => {
        if (optStr) {
          const parsed = parseOptionString(optStr);
          if (parsed) potentialOptions.push(parsed);
        }
      });
    });

    // 에디셔널 잠재옵션 파싱
    item.additional_potential_options.forEach(opt => {
      [opt.potential_option_1, opt.potential_option_2, opt.potential_option_3].forEach(optStr => {
        if (optStr) {
          const parsed = parseOptionString(optStr);
          if (parsed) additionalOptions.push(parsed);
        }
      });
    });
  }

  return { potentialOptions, additionalOptions };
}

function parseOptionString(optionStr: string): ParsedOption | null {
  // 예: "STR 12%", "공격력 15", "주스탯 9%", "올스탯 7%"
  const percentMatch = optionStr.match(/^(.+?)\s*(\d+)%$/);
  const flatMatch = optionStr.match(/^(.+?)\s*(\d+)$/);
  
  if (percentMatch) {
    return {
      stat: percentMatch[1].trim(),
      value: parseInt(percentMatch[2]),
      isPercent: true,
    };
  }
  
  if (flatMatch) {
    return {
      stat: flatMatch[1].trim(),
      value: parseInt(flatMatch[2]),
      isPercent: false,
    };
  }
  
  return null;
}

/**
 * 아이템의 메인 스탯 기여도 계산
 */
export function getMainStatValue(item: CharacterEquipment, mainStat: string): number {
  let totalValue = 0;
  
  // 잠재옵션에서 주스탯% 추출
  const { potentialOptions, additionalOptions } = parseItemOptions(item);
  
  potentialOptions.forEach(opt => {
    const statLower = opt.stat.toLowerCase();
    const mainStatLower = mainStat.toLowerCase();
    
    if (opt.isPercent && (
      statLower.includes('주스탯') || 
      statLower.includes('올스탯') ||
      statLower.includes(mainStatLower) ||
      (mainStat === 'HP' && statLower.includes('hp'))
    )) {
      totalValue += opt.value;
    }
  });
  
  additionalOptions.forEach(opt => {
    const statLower = opt.stat.toLowerCase();
    const mainStatLower = mainStat.toLowerCase();
    
    if (opt.isPercent && (
      statLower.includes('주스탯') || 
      statLower.includes('올스탯') ||
      statLower.includes(mainStatLower) ||
      (mainStat === 'HP' && statLower.includes('hp'))
    )) {
      totalValue += opt.value;
    }
  });
  
  // 기본 장비 스탯도 고려 (무기의 경우 공격력 등)
  // 이 부분은 API에서 제공하는 item_total_option 등을 통해 더 정확히 계산 가능
  
  return totalValue;
}
