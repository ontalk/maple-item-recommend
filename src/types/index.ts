// 메이플스토리 API 관련 타입 정의

export interface MapleCharacter {
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
  character_stat: CharacterStat[];
  character_item: CharacterItem[];
}

export interface CharacterStat {
  stat_name: string;
  stat_value: string;
}

export interface CharacterItem {
  item_equipment_part: string;
  item_slot: string;
  item_name: string;
  item_icon: string;
  item_description: string;
  item_shape_name: string;
  item_shape_icon: string;
  item_gender: string;
  item_total_option: ItemOption[];
  item_base_option: ItemOption[];
  item_exceptional_option: ItemOption[]; // 에디셔널 잠재능력
  item_potential_option_grade: string;
  item_potential_option: ItemPotentialOption[];
  item_add_potential_option_grade: string;
  item_add_potential_option: ItemPotentialOption[]; // 에디셔널 잠재능력
  item_starforce: number;
  item_max_starforce: number;
  item_equip_level: number;
  item_equip_type: string;
  item_set_name: string | null;
}

export interface ItemOption {
  option_type: string;
  option_value: string;
}

export interface ItemPotentialOption {
  potential_option_grade: string;
  potential_option_value: string;
}

// 추천 시스템 타입
export interface EquipmentRecommendation {
  equipment_part: string;
  current_item: CharacterItem;
  recommendations: RecommendationOption[];
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface RecommendationOption {
  type: 'starforce' | 'potential' | 'additional_potential' | 'replace';
  action: string;
  estimated_cost: number; // 메소 단위
  expected_stat_gain: StatGain[];
  success_rate: number;
  risk_level: 'low' | 'medium' | 'high';
  description: string;
}

export interface StatGain {
  stat_name: string;
  current_value: number;
  expected_value: number;
  gain: number;
}

export interface RecommendationResponse {
  character_name: string;
  world_name: string;
  total_estimated_cost: number;
  recommendations: EquipmentRecommendation[];
  summary: RecommendationSummary;
}

export interface RecommendationSummary {
  total_items_analyzed: number;
  high_priority_count: number;
  medium_priority_count: number;
  low_priority_count: number;
  main_stat_focus: string;
  estimated_total_cost: number;
  expected_stat_increase: number;
}

// 스타포스 비용 테이블 (레벨별, 별별)
export interface StarforceCost {
  level: number;
  star: number;
  cost: number;
  success_rate: number;
  destroy_rate: number;
  down_rate: number;
}

// 잠재옵션 등급별 확률
export interface PotentialGradeRate {
  grade: '레어' | '에픽' | '유니크' | '레전드리';
  rate: number;
  cube_type: '일반큐브' | '레드큐브' | '블랙큐브';
}

// 장비 부위별 메인 스탯 매핑
export const EQUIPMENT_MAIN_STAT: Record<string, string> = {
  '무기': '공격력',
  '모자': '주스탯',
  '상의': '주스탯',
  '하의': '주스탯',
  '장갑': '주스탯',
  '신발': '주스탯',
  '망토': '주스탯',
  '벨트': '주스탯',
  '어깨장식': '주스탯',
  '반지': '주스탯',
  '펜던트': '주스탯',
  '귀고리': '주스탯',
  '심볼': '주스탯',
  '훈장': '주스탯',
  '포켓': '주스탯',
  '기계심장': '주스탯',
  '뱃지': '주스탯',
};

// 직업별 주스탯 매핑
export const CLASS_MAIN_STAT: Record<string, string> = {
  '히어로': 'STR',
  '팔라딘': 'STR',
  '다크나이트': 'STR',
  '소울마스터': 'STR',
  '미하일': 'STR',
  '블래스터': 'STR',
  '데몬슬레이어': 'STR',
  '데몬어벤져': 'HP',
  '아란': 'STR',
  '카이저': 'STR',
  '카데나': 'STR',
  '엔젤릭버스터': 'STR',
  '제로': 'STR',
  '보우마스터': 'DEX',
  '신궁': 'DEX',
  '패스파인더': 'DEX',
  '윈드브레이커': 'DEX',
  '와일드헌터': 'DEX',
  '메르세데스': 'DEX',
  '캡틴': 'DEX',
  '바이퍼': 'DEX',
  '캐논슈터': 'DEX',
  '스트라이커': 'DEX',
  '카인': 'DEX',
  '아크': 'DEX',
  '아델': 'STR',
  '일리움': 'INT',
  '칼리': 'DEX',
  '라라': 'INT',
  '호영': 'STR',
  '제논': 'STR/DEX/INT',
  '키네시스': 'INT',
  '배틀메이지': 'INT',
  '와일드매지션': 'INT',
  '메카닉': 'INT',
  '플레임위자드': 'INT',
  '에반': 'INT',
  '루미너스': 'INT',
  '비숍': 'INT',
  '아크메이지(불,독)': 'INT',
  '아크메이지(썬,콜)': 'INT',
  '헤이스트': 'INT',
  '은월': 'DEX',
  '팬텀': 'DEX',
  '나이트워커': 'DEX',
  '듀얼블레이드': 'DEX',
};

// 장비 부위 순서 (우선순위)
export const EQUIPMENT_PRIORITY = [
  '무기',
  '심볼',
  '보조무기',
  '엠블렘',
  '모자',
  '상의',
  '하의',
  '장갑',
  '신발',
  '망토',
  '벨트',
  '어깨장식',
  '반지1',
  '반지2',
  '반지3',
  '반지4',
  '펜던트1',
  '펜던트2',
  '귀고리',
  '기계심장',
  '뱃지',
  '포켓',
  '훈장',
];

// 환경 변수 타입
export interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MAPLE_API_KEY: string;
  MAPLE_API_BASE_URL: string;
}