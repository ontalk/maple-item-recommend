'use client';

import { useRef, useState } from 'react';
import { Loader2, ShoppingCart, AlertCircle, CheckCircle2, TrendingUp, Zap } from 'lucide-react';
import type { BenchmarkComparison } from '@/types';
import { searchAuction, type AuctionProfile, type AuctionRawItem } from '@/lib/auction-extension';
import { getAllEquipmentOptions, type EquipmentOption } from '@/lib/equipment-database';

interface EquipmentSearchResult {
  part: string;
  equipment: EquipmentOption;
  lowestPrice: number | null;
  medianPrice: number | null;
  avgAttackPowerDiff: number; // 평균 전투력 증가량
  recommendedPrice: number | null;
  recommendedPower: number;
  listingCount: number;
  efficiency: number; // 효율 = 전투력 / 가격
  topItem?: AuctionRawItem;
}

interface OptimalSet {
  part: string;
  selected: EquipmentSearchResult;
  alternatives: EquipmentSearchResult[];
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// 옥션 응답은 보통 메소 단위 숫자를 주지만, 일부 응답/표시값은
// `1조 1000억`, `11,000,000,000`처럼 한국식 단위로 내려올 수 있다.
function parseMesos(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  const text = value.trim().replace(/,/g, '').replace(/메소$/i, '').trim();
  if (!text) return 0;
  const plain = Number(text);
  if (Number.isFinite(plain)) return plain;

  const unit = text.match(/^(?:(\d+(?:\.\d+)?)조)?\s*(?:(\d+(?:\.\d+)?)억)?\s*(?:(\d+(?:\.\d+)?)만)?\s*(?:(\d+(?:\.\d+)?)천)?\s*(\d+)?$/);
  if (!unit || !unit.slice(1).some(Boolean)) return 0;
  return (Number(unit[1] || 0) * 1_000_000_000_000)
    + (Number(unit[2] || 0) * 100_000_000)
    + (Number(unit[3] || 0) * 10_000)
    + (Number(unit[4] || 0) * 1_000)
    + Number(unit[5] || 0);
}

function parseAuctionPrice(value: unknown): number {
  // API의 price/pricePerItem은 이미 메소 단위다.
  // 예: 199,999,999,999 → 1999억 9999만 9999메소.
  return parseMesos(value);
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatMesos(value: number | null): string {
  if (value === null) return '매물 없음';
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
  if (value >= 10000) return `${(value / 10000).toFixed(0)}만`;
  return value.toLocaleString();
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

type DetailEntry = string | { text?: string; description?: string; value?: string | number };

function formatDetailEntries(entries?: DetailEntry[]): string[] {
  return (entries ?? [])
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      return entry.text ?? entry.description ?? (entry.value === undefined ? '' : String(entry.value));
    })
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatStatEntries(stats?: Record<string, number>): string[] {
  if (!stats) return [];
  const labels: Record<string, string> = {
    str: 'STR', dex: 'DEX', int: 'INT', luk: 'LUK', hp: '최대 HP', mp: '최대 MP',
    attackPower: '공격력', magicPower: '마력', allStat: '올스탯', bossDamage: '보스 몬스터 데미지',
    ignoreDefense: '방어율 무시', damage: '데미지',
  };
  return Object.entries(stats)
    .filter(([, value]) => Number(value) !== 0)
    .map(([key, value]) => `${labels[key] ?? key} +${value}`);
}

function getCuttableCount(item: AuctionRawItem): number | undefined {
  const tooltip = item.toolTip as typeof item.toolTip & {
    cuttableCount?: number;
    cuttableCountRemaining?: number;
    etcOption?: { cuttableCount?: number; cuttableCountRemaining?: number };
  } | undefined;
  const candidates = [
    item.cuttableCount,
    item.tradeCountRemaining,
    item.tradeCount,
    item.etcOption?.cuttableCount,
    item.etcOption?.cuttableCountRemaining,
    tooltip?.cuttableCount,
    tooltip?.cuttableCountRemaining,
    tooltip?.etcOption?.cuttableCount,
    tooltip?.etcOption?.cuttableCountRemaining,
  ];
  const numericCount = candidates.find((value) => value !== undefined && Number.isFinite(Number(value)));
  if (numericCount !== undefined) return Number(numericCount);

  // 넥슨 응답은 가횟을 숫자 필드가 아니라 tradeDesc에 표시하는 경우가 있다.
  // 예: "(가위 사용 잔여 횟수 : 5 / 5)"
  const tradeDescriptions = [...(item.tradeDesc ?? []), ...(tooltip?.tradeDesc ?? [])];
  for (const description of tradeDescriptions) {
    const match = description.match(/가위\s*사용(?:\s*잔여)?\s*횟수\s*:\s*(\d+)\s*\/\s*(\d+)/);
    if (match) return Number(match[1]);
  }
  return undefined;
}

function AuctionTooltipDetails({ item }: { item: AuctionRawItem }) {
  const tooltip = item.toolTip;
  if (!tooltip) return null;
  const upgradeInfo = tooltip.upgradeInfo;
  const exOptionEntries = formatDetailEntries(upgradeInfo?.exOption?.entries);
  const potentialEntries = formatDetailEntries(upgradeInfo?.potential?.entries);
  const additionalPotentialEntries = formatDetailEntries(upgradeInfo?.additionalPotential?.entries);
  const exOptionStats = formatStatEntries(tooltip.exOptionStat);
  const starForce = upgradeInfo?.starForce;
  const cuttableCount = getCuttableCount(item);

  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-white/80 p-3 text-xs text-gray-700">
      <p className="mb-2 font-bold text-gray-900">🔍 추천 매물 상세</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p>⭐ 스타포스: {starForce?.current ?? tooltip.starforce ?? item.starforce ?? 0}성{starForce?.max !== undefined ? ` (최대 ${starForce.max}성)` : ''}</p>
          <p>✂️ 가위 사용 가능: {cuttableCount !== undefined ? `${cuttableCount}회` : '정보 없음'}</p>
        </div>
        <p>📜 주문서: {upgradeInfo?.scroll?.description || '정보 없음'}</p>
        <div>
          <p className="font-semibold text-gray-800">🔥 추옵</p>
          {exOptionEntries.length > 0 ? <ul className="mt-1 list-disc pl-5">{exOptionEntries.map((entry, index) => <li key={`ex-${index}`}>{entry}</li>)}</ul> : exOptionStats.length > 0 ? <ul className="mt-1 list-disc pl-5">{exOptionStats.map((entry) => <li key={entry}>{entry}</li>)}</ul> : <p className="mt-1">{upgradeInfo?.exOption?.description || '추옵 정보 없음'}</p>}
        </div>
        <div>
          <p className="font-semibold text-gray-800">🟨 잠재능력</p>
          {potentialEntries.length > 0 ? <ul className="mt-1 list-disc pl-5">{potentialEntries.map((entry, index) => <li key={`potential-${index}`}>{entry}</li>)}</ul> : <p className="mt-1">{upgradeInfo?.potential?.description || '잠재능력 없음'}</p>}
        </div>
        <div className="sm:col-span-2">
          <p className="font-semibold text-gray-800">🟦 에디셔널 잠재능력</p>
          {additionalPotentialEntries.length > 0 ? <ul className="mt-1 list-disc pl-5">{additionalPotentialEntries.map((entry, index) => <li key={`additional-${index}`}>{entry}</li>)}</ul> : <p className="mt-1">{upgradeInfo?.additionalPotential?.description || '에디셔널 잠재능력 없음'}</p>}
        </div>
      </div>
    </div>
  );
}

interface OptimizationState {
  cost: number;
  power: number;
  selections: EquipmentSearchResult[];
}

interface AuctionItemFilter {
  minPrice: string;
  maxPrice: string;
  minStarforce: string;
  maxStarforce: string;
  minPotentialGrade: string;
  minAdditionalPotentialGrade: string;
  minCuttableCount: string;
  maxCuttableCount: string;
}

function isFatalAuctionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /426|6013|429|요청이 너무 많습니다|현재 열린 옥션 탭|Could not establish connection|message channel closed|Failed to fetch|Chrome Extension이 설치되지 않았습니다|브리지가 활성화되지 않았습니다|응답 시간 초과|확장 프로그램에 연결/i.test(message);
}

function isRateLimitedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|요청이 너무 많습니다/i.test(message);
}

function matchesAuctionFilter(item: AuctionRawItem, filters: AuctionItemFilter, ignoreStarforce = false, ignoreEnhancementGrades = false): boolean {
  const price = parseAuctionPrice(item.pricePerItem || item.price);
  const tooltip = item.toolTip;
  // enhancementOption은 옥션 API에 이미 전달된다. 응답 툴팁에 등급 필드가
  // 생략된 경우에는 '0등급'으로 간주하면 정상 매물까지 전부 탈락하므로,
  // 확인 가능한 값이 있을 때만 로컬에서 다시 비교한다.
  const rawItem = item as AuctionRawItem & {
    potentialGrade?: number;
    additionalPotentialGrade?: number;
    potential?: { grade?: number };
    additionalPotential?: { grade?: number };
    cuttableCount?: number;
    etcOption?: { cuttableCount?: number; cuttableCountRemaining?: number };
  };
  const starforce = toOptionalNumber(
    tooltip?.upgradeInfo?.starForce?.current ?? tooltip?.starforce ?? item.starforce,
  );
  const potentialGrade = toOptionalNumber(
    tooltip?.upgradeInfo?.potential?.grade ?? rawItem.potentialGrade ?? rawItem.potential?.grade,
  );
  const additionalPotentialGrade = toOptionalNumber(
    tooltip?.upgradeInfo?.additionalPotential?.grade ??
      rawItem.additionalPotentialGrade ??
      rawItem.additionalPotential?.grade,
  );
  const cuttableCount = getCuttableCount(item);
  const minPrice = toNumber(filters.minPrice);
  const maxPrice = toNumber(filters.maxPrice);
  const minStarforce = toNumber(filters.minStarforce);
  const maxStarforce = toNumber(filters.maxStarforce);
  const minPotentialGrade = toNumber(filters.minPotentialGrade);
  const minAdditionalPotentialGrade = toNumber(filters.minAdditionalPotentialGrade);
  const minCuttableCount = toNumber(filters.minCuttableCount);
  const maxCuttableCount = toNumber(filters.maxCuttableCount);

  if (minPrice > 0 && price < minPrice) return false;
  if (maxPrice > 0 && price > maxPrice) return false;
  if (!ignoreStarforce && minStarforce > 0 && starforce !== undefined && starforce < minStarforce) return false;
  if (!ignoreStarforce && maxStarforce > 0 && starforce !== undefined && starforce > maxStarforce) return false;
   if (!ignoreEnhancementGrades && minPotentialGrade > 0 && potentialGrade !== undefined && potentialGrade < minPotentialGrade) return false;
  if (!ignoreEnhancementGrades && minAdditionalPotentialGrade > 0 && additionalPotentialGrade !== undefined && additionalPotentialGrade < minAdditionalPotentialGrade) return false;
  if (minCuttableCount > 0 && cuttableCount !== undefined && cuttableCount < minCuttableCount) return false;
  if (maxCuttableCount > 0 && cuttableCount !== undefined && cuttableCount > maxCuttableCount) return false;
  return true;
}

function optimizeEquipmentSet(
  candidatesByPart: Record<string, EquipmentSearchResult[]>,
  budget: number,
  targetPower: number,
  preferTargetPower: boolean,
): OptimizationState {
  let states: OptimizationState[] = [{ cost: 0, power: 0, selections: [] }];

  for (const candidates of Object.values(candidatesByPart)) {
    // 반지 4칸/펜던트 2칸은 모두 채워야 하는 필수 슬롯이 아니다.
    // 같은 장비를 중복 장착할 수 없으므로 후보가 1개뿐인 경우에도
    // 다음 슬롯을 빈칸으로 건너뛸 수 있어야 한다.
    const nextStates: OptimizationState[] = [...states];
    for (const state of states) {
      for (const candidate of candidates) {
        const price = candidate.recommendedPrice || 0;
        if (state.selections.some((selected) => selected.part === candidate.part && selected.equipment.name === candidate.equipment.name)) continue;
        if (!price || state.cost + price > budget) continue;
        nextStates.push({
          cost: state.cost + price,
          power: state.power + candidate.recommendedPower,
          selections: [...state.selections, candidate],
        });
      }
    }

    states = nextStates
      .sort((left, right) => {
        if (preferTargetPower && targetPower > 0) {
          const leftGap = Math.abs(targetPower - left.power);
          const rightGap = Math.abs(targetPower - right.power);
          return leftGap - rightGap ||
            (right.power / Math.max(right.cost, 1)) - (left.power / Math.max(left.cost, 1));
        }
        const leftScore = targetPower > 0 && left.power >= targetPower
          ? 1_000_000_000_000 - left.cost
          : left.power / Math.max(left.cost, 1);
        const rightScore = targetPower > 0 && right.power >= targetPower
          ? 1_000_000_000_000 - right.cost
          : right.power / Math.max(right.cost, 1);
        return rightScore - leftScore;
      })
      .slice(0, 3000);
  }

  if (preferTargetPower && targetPower > 0) {
    return states.sort((left, right) => {
      const leftGap = Math.abs(targetPower - left.power);
      const rightGap = Math.abs(targetPower - right.power);
      return leftGap - rightGap ||
        (right.power / Math.max(right.cost, 1)) - (left.power / Math.max(left.cost, 1)) ||
        left.cost - right.cost;
    })[0] || { cost: 0, power: 0, selections: [] };
  }

  const reachedTarget = states.filter((state) => targetPower > 0 && state.power >= targetPower);
  if (reachedTarget.length) {
    return reachedTarget.sort((left, right) => left.cost - right.cost || right.power - left.power)[0];
  }
  return states.sort((left, right) => right.power - left.power || left.cost - right.cost)[0] || {
    cost: 0,
    power: 0,
    selections: [],
  };
}

const SEARCH_PARTS = ['반지', '펜던트', '훈장', '귀고리', '얼굴장식', '눈장식', '벨트', '포켓', '기계 심장', '모자', '상의', '하의', '장갑', '신발', '망토', '어깨장식', '엠블렘'];
SEARCH_PARTS.push('보조무기');
const ALL_SEARCHABLE_EQUIPMENT = SEARCH_PARTS.flatMap((part) => getAllEquipmentOptions(part));
const EQUIPMENT_SLOT_COUNTS: Record<string, number> = { 반지: 4, 펜던트: 2 };
const JOB_SUFFIX_BY_CLASS: Record<string, string> = {
  나이트: '나이트',
  메이지: '메이지',
  아처: '아처',
  시프: '시프',
  파이렛: '파이렛',
};

const AUCTION_SUB_WEAPON_CATEGORY_BY_NAME: Record<string, string> = {
  '봄버드 센터파이어': 'WEAPON_SUB_CANNON_GUN_POWDER',
  '녹스 마법깃펜': 'WEAPON_SUB_DEMON_MAGE',
};

function isVisibleForJob(equipment: EquipmentOption, jobClass: string, exactJob?: string): boolean {
  // 보조무기/엠블렘은 장비명 접미사가 아니라 직업별 고유 이름으로 관리한다.
  // 목록에서 숨기면 사용자가 원하는 직업의 보조무기를 직접 선택할 수 없으므로
  // 직업 필터와 관계없이 표시하고, 실제 검색 여부는 체크박스 선택으로 결정한다.
  if (equipment.job) return true;
  const jobSuffixes = Object.values(JOB_SUFFIX_BY_CLASS);
  const isJobSpecific = jobSuffixes.some((suffix) => equipment.name.includes(suffix));
  return !isJobSpecific || equipment.name.includes(JOB_SUFFIX_BY_CLASS[jobClass] || '');
}

export function AuctionSearch({ benchmark, characterClass, currentCombatPower }: { benchmark?: BenchmarkComparison; characterClass?: string; currentCombatPower?: number | string }) {
  const searchLockRef = useRef(false);
  const [profile, setProfile] = useState<AuctionProfile>({
    accountId: 0,
    characterId: 0,
    worldId: 5,
  });
  const [jobClass, setJobClass] = useState<string>('파이렛'); // 옥션 장비 접미사 기준 직업 선택
  const [budgetEok, setBudgetEok] = useState('20');
  const [targetPowerEok, setTargetPowerEok] = useState('2');
  const [preferTargetPower, setPreferTargetPower] = useState(false);
  const [auctionFilters, setAuctionFilters] = useState<AuctionItemFilter>({
    minPrice: '',
    maxPrice: '',
    minStarforce: '',
    maxStarforce: '',
    minPotentialGrade: '0',
    minAdditionalPotentialGrade: '0',
    minCuttableCount: '',
    maxCuttableCount: '',
  });
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optimalSets, setOptimalSets] = useState<OptimalSet[]>([]);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [selectedEquipmentNames, setSelectedEquipmentNames] = useState<Set<string>>(
    () => new Set(ALL_SEARCHABLE_EQUIPMENT
      .filter((equipment) => !equipment.job && isVisibleForJob(equipment, '파이렛', characterClass || '해적'))
      .map((equipment) => equipment.name))
  );
  const visibleEquipment = ALL_SEARCHABLE_EQUIPMENT.filter((equipment) => isVisibleForJob(equipment, jobClass, characterClass));
  const filteredEquipment = visibleEquipment.filter((equipment) =>
    equipment.name.toLocaleLowerCase().includes(equipmentSearchQuery.trim().toLocaleLowerCase())
  );

  const setNumber = (key: keyof AuctionProfile, value: string) => {
    setProfile((current) => ({ ...current, [key]: Number(value) || 0 }));
  };

  // Delay helper
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 각 부위별로 모든 장비 옵션 검색
  const searchAllEquipmentOptions = async () => {
    if (searchLockRef.current || isSearching) {
      console.warn('⏳ 이미 검색 중인 요청은 중복 실행하지 않습니다.');
      return;
    }
    searchLockRef.current = true;
    console.log('🚀 검색 시작!', { benchmark, profile });
    
    if (!benchmark) {
      console.error('❌ benchmark가 없습니다');
      searchLockRef.current = false;
      return;
    }
    if (!Number.isInteger(profile.accountId) || !Number.isInteger(profile.characterId) || !Number.isInteger(profile.worldId) || profile.accountId <= 0 || profile.characterId <= 0 || profile.worldId <= 0) {
      setError('Account ID, Character ID, World ID를 모두 입력해주세요.');
      console.error('❌ Profile 정보가 올바르지 않습니다', profile);
      searchLockRef.current = false;
      return;
    }

    console.log('✅ 검색 조건 확인 완료, 검색 시작합니다');
    setIsSearching(true);
    setError(null);
    setOptimalSets([]);
    
    if (selectedEquipmentNames.size === 0) {
      setError('검색할 아이템을 하나 이상 선택해주세요.');
      setIsSearching(false);
      searchLockRef.current = false;
      return;
    }

    // 선택된 아이템이 있는 부위만 검색
    // 선택된 장비가 실제로 속한 부위만 순회한다.
    // 예: 고통의 근원 → 펜던트, 미트라의 분노 → 엠블렘
    const partsToSearch = SEARCH_PARTS.filter((part) =>
      getAllEquipmentOptions(part).some((equipment) => selectedEquipmentNames.has(equipment.name))
    );
    const allOptimalSets: OptimalSet[] = [];
    const candidatesByPart: Record<string, EquipmentSearchResult[]> = {};
    const budget = Math.max(0, toNumber(budgetEok)) * 100000000;
    const targetPowerTotal = Math.max(0, toNumber(targetPowerEok)) * 100000000;
    const currentPower = parseMesos(currentCombatPower);
    const targetPower = Math.max(0, targetPowerTotal - currentPower);

    if (budget <= 0) {
      setError('사용할 메소를 0보다 크게 입력해주세요. 단위는 억 메소입니다.');
      setIsSearching(false);
      searchLockRef.current = false;
      return;
    }

    try {
      let searchCount = 0;
      let totalSearched = 0; // 전체 검색 카운트 (Rate Limiting용)
      
      for (const part of partsToSearch) {
        console.log(`\n📦 ${part} 부위 검색 중...`);
        const equipmentOptions = getAllEquipmentOptions(part)
          .filter((equipment) => selectedEquipmentNames.has(equipment.name));
        console.log(`  └─ 검색할 장비 옵션 ${equipmentOptions.length}개:`, equipmentOptions.map(e => e.name));
        
        if (equipmentOptions.length === 0) {
          console.warn(`  └─ ⚠️ ${part} 부위에 검색할 장비가 없습니다`);
          continue;
        }

        setProgress(`${part} 검색 중... (${searchCount}/${partsToSearch.length})`);
        
        const partResults: EquipmentSearchResult[] = [];

        // 각 부위의 모든 장비 옵션 검색
        for (const equipment of equipmentOptions) {
          // 직업별 장비 필터링 (방어구/무기만)
          const isArmorOrWeapon = ['모자', '상의', '하의', '장갑', '신발', '망토', '어깨장식', '무기', '엠블렘'].includes(part);
          const jobSuffixes = ['나이트', '메이지', '아처', '시프', '파이렛'];
          
          // 방어구/무기는 직업에 맞는 것만 검색
          if (isArmorOrWeapon) {
            const hasJobSuffix = jobSuffixes.some(suffix => equipment.name.includes(suffix));
            if (hasJobSuffix) {
              const jobMapping: Record<string, string> = {
                '나이트': '나이트',
                '메이지': '메이지',
                '아처': '아처',
                '시프': '시프',
                '파이렛': '파이렛',
              };
              const targetSuffix = jobMapping[jobClass] || jobClass;
              if (!equipment.name.includes(targetSuffix)) {
                console.log(`  └─ ⏭️ ${equipment.name} 스킵 (${jobClass}가 아님)`);
                continue; // 다른 직업 장비는 스킵
              }
            }
          }
          
          try {
            // 넥슨 Rate Limiting 방지: 각 새로운 장비 검색 사이에 충분히 대기
            if (totalSearched > 0) {
              console.log(`⏳ 8초 대기 중... (Rate Limiting 방지)`);
              await delay(8000);
            }
            
            console.log(`  🔍 ${equipment.name} 검색 시작...`);
            // 엠블렘과 대부분의 보조무기는 스타포스 대상이 아니다.
            // 전체 검색 조건에 스타포스를 입력해도 해당 부위에는 보내지 않는다.
            const ignoreStarforce =
              part === '엠블렘' ||
              part === '훈장' ||
              part === '포켓' ||
              (part === '보조무기' && equipment.name !== '아케인셰이드 블레이드');
            const ignoreEnhancementGrades = part === '훈장' || part === '포켓';
            // 엠블렘/훈장/포켓/기계 심장은 교환불가 슬롯이라 가위 사용 횟수 조건이 의미 없다.
            // 해당 부위에 etcOption을 보내면 넥슨 API가 매물을 0개로 반환할 수 있다.
            const ignoreCuttableCount = part === '엠블렘' || part === '훈장' || part === '포켓' || part === '기계 심장';
            const itemDetailCategory = part === '보조무기'
              ? (AUCTION_SUB_WEAPON_CATEGORY_BY_NAME[equipment.name] || 'WEAPON')
              : 'ARMOR';
            // 훈장은 일반 방어구 카테고리로 조회하면 넥슨 API에서 누락될 수 있다.
            // 카테고리 제한 없이 정확한 아이템명으로 검색한다.
            const itemCategory = part === '훈장' ? undefined : { itemDetailCategory };
            
            // 첫 페이지 검색
            let allItems: AuctionRawItem[] = [];
            let currentPage = 1;
            let hasMorePages = true;
            let remainingCount = 0;
            
            while (hasMorePages) {
              const result = await searchAuction(profile, {
                keyword: equipment.name,
                page: currentPage,
                limit: 20,
                exactMatch: true,
                minPrice: toNumber(auctionFilters.minPrice),
                maxPrice: toNumber(auctionFilters.maxPrice),
                minStarforce: ignoreStarforce ? undefined : toNumber(auctionFilters.minStarforce),
                maxStarforce: ignoreStarforce ? undefined : toNumber(auctionFilters.maxStarforce),
                minPotentialGrade: ignoreEnhancementGrades ? undefined : toNumber(auctionFilters.minPotentialGrade),
                minAdditionalPotentialGrade: ignoreEnhancementGrades ? undefined : toNumber(auctionFilters.minAdditionalPotentialGrade),
                cuttableCountMin: ignoreCuttableCount ? undefined : toNumber(auctionFilters.minCuttableCount),
                cuttableCountMax: ignoreCuttableCount ? undefined : toNumber(auctionFilters.maxCuttableCount),
                itemCategory,
                enhancementOption: {
                  starforceMin: ignoreStarforce ? undefined : (toNumber(auctionFilters.minStarforce) || undefined),
                  starforceMax: ignoreStarforce ? undefined : (toNumber(auctionFilters.maxStarforce) || undefined),
                  potentialGrade: ignoreEnhancementGrades ? undefined : (toNumber(auctionFilters.minPotentialGrade) || undefined),
                  additionalPotentialGrade: ignoreEnhancementGrades ? undefined : (toNumber(auctionFilters.minAdditionalPotentialGrade) || undefined),
                },
                etcOption: ignoreCuttableCount ? undefined : {
                  cuttableCountMin: toNumber(auctionFilters.minCuttableCount) || undefined,
                  cuttableCountMax: toNumber(auctionFilters.maxCuttableCount) || undefined,
                },
              });

              setProgress(`${equipment.name} 검색 중... (${currentPage}/${result.data.totalPages || '?'}페이지, 현재 ${allItems.length + result.data.items.length}개 매물 수집)`);
              
              // 첫 페이지만 카운트 소모
              if (currentPage === 1) {
                totalSearched++;
                setRemaining(result.remaining);
                console.log(`  └─ 총 ${result.data.total}개 매물 발견, ${result.data.totalPages}페이지`);
              }
              
              allItems.push(...result.data.items);
              
              // 다음 페이지 확인
              if (result.data.hasNext && currentPage < result.data.totalPages) {
                currentPage++;
                console.log(`  └─ ${currentPage}페이지 로딩 중...`);
                // 페이지 이동도 단기 요청 제한에 포함될 수 있으므로 대기한다.
                await delay(1500);
              } else {
                hasMorePages = false;
                console.log(`  ✅ ${equipment.name}: 총 ${allItems.length}개 아이템 수집 완료`);
              }
            }
            
            const filteredItems = allItems.filter((item) => matchesAuctionFilter(item, auctionFilters, ignoreStarforce, ignoreEnhancementGrades));

            if (filteredItems.length === 0) {
              console.log(`  └─ ⚠️ ${equipment.name}: 조건 통과 매물 없음 (수집 ${allItems.length}개)`);
              continue;
            }

            setProgress(`${equipment.name} 조건 매칭 완료 (${filteredItems.length}/${allItems.length}개 매물) · 분석 중...`);

            const prices = filteredItems
              .map((item) => parseAuctionPrice(item.pricePerItem || item.price))
              .filter((price) => price > 0);
            
            const attackPowers = filteredItems
              .map((item) => item.attackPowerDiff || 0)
              .filter((power) => power > 0);

            const lowestPrice = prices.length ? Math.min(...prices) : null;
            const avgAttackPower = attackPowers.length ? Math.round(attackPowers.reduce((sum, p) => sum + p, 0) / attackPowers.length) : 0;
            const valueListing = filteredItems
              .map((item) => ({
                item,
                price: parseAuctionPrice(item.pricePerItem || item.price),
                power: Number(item.attackPowerDiff || 0),
              }))
              .filter((listing) => listing.price > 0)
              // 최적화 대표 매물도 입력 예산 안에서 선택해야 한다.
              // 기존에는 효율이 높은 고가 매물이 대표로 잡혀, 같은 검색 결과에
              // 예산 내 최저가 매물이 있어도 전체 부위가 탈락했다.
              .filter((listing) => listing.price <= budget)
              .sort((left, right) => {
                const leftEfficiency = left.power > 0 ? left.power / left.price : 0;
                const rightEfficiency = right.power > 0 ? right.power / right.price : 0;
                return rightEfficiency - leftEfficiency || left.price - right.price;
              })[0];
            const recommendedPrice = valueListing?.price || lowestPrice;
            const recommendedPower = valueListing?.power || avgAttackPower;
            const efficiency = recommendedPrice && recommendedPower ? (recommendedPower / recommendedPrice) * 1000000000 : 0;

            console.log(`  💰 ${equipment.name} 가격 확인`, {
              budget,
              budgetInEok: budget / 100000000,
              lowestPrice,
              recommendedPrice,
              recommendedPriceInEok: recommendedPrice ? recommendedPrice / 100000000 : null,
              rawPrice: filteredItems[0]?.pricePerItem || filteredItems[0]?.price,
            });

            partResults.push({
              part,
              equipment,
              lowestPrice,
              medianPrice: median(prices),
              avgAttackPowerDiff: avgAttackPower,
              recommendedPrice,
              recommendedPower,
              listingCount: filteredItems.length,
              efficiency,
              topItem: valueListing?.item || filteredItems[0],
            });
          } catch (err) {
            // 로그인 세션이 끊긴 뒤에는 다음 아이템 검색도 모두 실패하므로
            // 추가 요청을 보내지 않고 전체 검색을 즉시 중단한다.
            if (isRateLimitedError(err)) {
              throw new Error('옥션 요청이 너무 많아 검색을 중단했습니다(429). 1~2분 기다린 뒤 다시 시작해주세요.');
            }
            if (isFatalAuctionError(err)) {
              console.error('🧩 세션 오류 원본:', err instanceof Error ? err.message : String(err));
              throw new Error('메이플 옥션 세션이 끊겼습니다. 옥션 탭에서 다시 로그인하고 검색을 재시작해주세요.');
            }
            console.error(`${equipment.name} 검색 실패:`, err);
          }
        }

        // 효율 높은 순으로 정렬
        partResults.sort((a, b) => b.efficiency - a.efficiency);

        if (partResults.length > 0) {
          candidatesByPart[part] = partResults;
          allOptimalSets.push({
            part,
            selected: partResults[0], // 가장 효율 좋은 것
            alternatives: partResults.slice(1), // 검색 조건을 통과한 모든 대안
          });
        }

        searchCount++;
        setOptimalSets([...allOptimalSets]);
      }

      const optimizationGroups: Record<string, EquipmentSearchResult[]> = {};
      Object.entries(candidatesByPart).forEach(([part, candidates]) => {
        const slotCount = EQUIPMENT_SLOT_COUNTS[part] || 1;
        for (let slot = 1; slot <= slotCount; slot += 1) {
          optimizationGroups[`${part}-${slot}`] = candidates;
        }
      });

      const optimized = optimizeEquipmentSet(optimizationGroups, budget, targetPower, preferTargetPower);
      const usedSlots: Record<string, number> = {};
      const optimizedSets = optimized.selections.map((selected) => {
        const basePart = selected.part.replace(/-\d+$/, '');
        const slot = (usedSlots[basePart] || 0) + 1;
        usedSlots[basePart] = slot;
        const candidates = candidatesByPart[basePart] || [];
        return {
          part: EQUIPMENT_SLOT_COUNTS[basePart] ? `${basePart} ${slot}` : basePart,
          selected: { ...selected, part: basePart },
          alternatives: candidates.filter((candidate) => candidate.equipment.name !== selected.equipment.name),
        };
      });

      setOptimalSets(optimizedSets);
      if (optimizedSets.length === 0) {
        const searchedCandidateCount = Object.values(candidatesByPart)
          .reduce((sum, candidates) => sum + candidates.length, 0);
        if (searchedCandidateCount === 0) {
          setProgress('⚠️ 옥션 매물은 찾았지만 현재 구매 조건을 통과한 매물이 없습니다. 잠재/에디셔널/스타포스 조건을 낮춰 다시 검색해주세요.');
        } else {
          setProgress(`⚠️ 조건을 통과한 매물 ${searchedCandidateCount}개는 찾았지만 입력한 예산(${formatMesos(budget)}) 안에 들어오는 조합이 없습니다. 예산을 늘리거나 가격 조건을 낮춰주세요.`);
        }
      } else {
        setProgress(`✓ 최적 조합 계산 완료! ${optimizedSets.length}개 부위 · ${formatMesos(optimized.cost)} 사용 · 전투력 +${optimized.power.toLocaleString()}`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '옥션 검색에 실패했습니다.');
      setProgress('');
    } finally {
      setIsSearching(false);
      searchLockRef.current = false;
    }
  };

  if (!benchmark) return null;

  const isProfileValid = Number.isInteger(profile.accountId) && Number.isInteger(profile.characterId) && Number.isInteger(profile.worldId) && profile.accountId > 0 && profile.characterId > 0 && profile.worldId > 0;
  const selectedCost = optimalSets.reduce((sum, set) => sum + (set.selected.recommendedPrice || 0), 0);
  const selectedPower = optimalSets.reduce((sum, set) => sum + set.selected.recommendedPower, 0);
  const targetPowerTotal = Math.max(0, toNumber(targetPowerEok)) * 100000000;
  const currentPower = parseMesos(currentCombatPower);
  const targetPower = Math.max(0, targetPowerTotal - currentPower);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-maple-orange/10 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-maple-orange" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">🎯 옥션 기반 최적 템셋 자동 추천</h3>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            메이플 옥션에서 {benchmark.minimum_plan.length}개 핵심 장비의 실시간 시세를 자동으로 검색하여 최적의 템셋을 추천합니다.
          </p>
        </div>
        {remaining !== null && (
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">오늘 잔여 {remaining}회</span>
          </div>
        )}
      </div>

      {/* 안내 메시지 */}
      <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-blue-900">자동 템셋 추천 시스템</p>
            <p className="mt-1 text-sm text-blue-700">
              1. Chrome 확장 프로그램 설치 및 메이플 옥션 로그인<br/>
              2. Account ID, Character ID, World ID 입력<br/>
              3. "자동 템셋 검색 시작" 버튼 클릭<br/>
              4. 옥션에서 실시간 가격을 자동으로 검색하여 최적의 조합을 보여드립니다
            </p>
          </div>
        </div>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl bg-gray-50 p-6 mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-4">📋 옥션 연결 정보 입력</p>
        
        <div className="grid gap-4 md:grid-cols-4 mb-4">
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 mb-1 block">Account ID</span>
            <input 
              value={profile.accountId || ''} 
              onChange={(event) => setNumber('accountId', event.target.value)} 
              inputMode="numeric" 
              placeholder="" 
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20 outline-none transition placeholder:text-gray-400" 
              disabled={isSearching}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 mb-1 block">Character ID</span>
            <input 
              value={profile.characterId || ''} 
              onChange={(event) => setNumber('characterId', event.target.value)} 
              inputMode="numeric" 
              placeholder="" 
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20 outline-none transition placeholder:text-gray-400" 
              disabled={isSearching}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 mb-1 block">World ID</span>
            <input 
              value={profile.worldId || ''} 
              onChange={(event) => setNumber('worldId', event.target.value)} 
              inputMode="numeric" 
              placeholder="예: 8"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20 outline-none transition placeholder:text-gray-400" 
              disabled={isSearching}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 mb-1 block">직업</span>
            <select
              value={jobClass}
              onChange={(e) => {
                const nextJob = e.target.value;
                setJobClass(nextJob);
                setSelectedEquipmentNames((current) => new Set(
                  ALL_SEARCHABLE_EQUIPMENT
                    .filter((equipment) => isVisibleForJob(equipment, nextJob, characterClass) && current.has(equipment.name))
                    .map((equipment) => equipment.name)
                ));
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20 outline-none transition bg-white"
              disabled={isSearching}
            >
              <option value="나이트">나이트</option>
              <option value="메이지">메이지</option>
              <option value="아처">아처</option>
              <option value="시프">시프</option>
              <option value="파이렛">파이렛</option>
            </select>
          </label>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 mb-1 block">💰 사용할 메소 (억)</span>
            <input
              value={budgetEok}
              onChange={(event) => setBudgetEok(event.target.value)}
              inputMode="decimal"
              placeholder="예: 20"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20 outline-none transition placeholder:text-gray-400"
              disabled={isSearching}
            />
            <span className="mt-1 block text-xs text-gray-500">예: 20 입력 시 20억 메소까지 사용</span>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 mb-1 block">🎯 목표 전투력 (억)</span>
            <input
              value={targetPowerEok}
              onChange={(event) => setTargetPowerEok(event.target.value)}
              inputMode="decimal"
              placeholder="예: 2"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20 outline-none transition placeholder:text-gray-400"
              disabled={isSearching}
            />
            <span className="mt-1 block text-xs text-gray-500">현재 전투력 {formatMesos(currentPower)} 기준으로 필요한 증가량을 계산</span>
            <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={preferTargetPower}
                onChange={(event) => setPreferTargetPower(event.target.checked)}
                disabled={isSearching}
                className="h-4 w-4 accent-maple-orange"
              />
              목표 전투력에 가까운 조합 우선 추천
            </label>
          </label>
        </div>

        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3">
            <p className="text-sm font-semibold text-gray-700">⚙️ 옥션 구매 조건</p>
            <p className="mt-1 text-xs text-gray-500">검색한 매물 중 아래 조건을 만족하는 장비만 최적 조합에 포함합니다.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">최소 가격</span>
              <input
                value={auctionFilters.minPrice}
                onChange={(event) => setAuctionFilters((current) => ({ ...current, minPrice: event.target.value }))}
                inputMode="numeric"
                placeholder="제한 없음"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-maple-orange"
                disabled={isSearching}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">최대 가격</span>
              <input
                value={auctionFilters.maxPrice}
                onChange={(event) => setAuctionFilters((current) => ({ ...current, maxPrice: event.target.value }))}
                inputMode="numeric"
                placeholder="제한 없음"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-maple-orange"
                disabled={isSearching}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">최소 스타포스</span>
              <input
                value={auctionFilters.minStarforce}
                onChange={(event) => setAuctionFilters((current) => ({ ...current, minStarforce: event.target.value }))}
                inputMode="numeric"
                placeholder="예: 17"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-maple-orange"
                disabled={isSearching}
              />
              <span className="mt-1 block text-[10px] text-gray-400">엠블렘·일부 보조무기에는 자동 적용되지 않습니다.</span>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">최대 스타포스</span>
              <input
                value={auctionFilters.maxStarforce}
                onChange={(event) => setAuctionFilters((current) => ({ ...current, maxStarforce: event.target.value }))}
                inputMode="numeric"
                placeholder="제한 없음"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-maple-orange"
                disabled={isSearching}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">잠재 등급</span>
              <select
                value={auctionFilters.minPotentialGrade}
                onChange={(event) => setAuctionFilters((current) => ({ ...current, minPotentialGrade: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-maple-orange"
                disabled={isSearching}
              >
                <option value="0">전체</option><option value="1">레어</option><option value="2">에픽</option><option value="3">유니크</option><option value="4">레전드리</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">에디셔널 등급</span>
              <select
                value={auctionFilters.minAdditionalPotentialGrade}
                onChange={(event) => setAuctionFilters((current) => ({ ...current, minAdditionalPotentialGrade: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-maple-orange"
                disabled={isSearching}
              >
                <option value="0">전체</option><option value="1">레어</option><option value="2">에픽</option><option value="3">유니크</option><option value="4">레전드리</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">가위 사용 가능 횟수 최소</span>
              <input
                value={auctionFilters.minCuttableCount}
                onChange={(event) => setAuctionFilters((current) => ({ ...current, minCuttableCount: event.target.value }))}
                inputMode="numeric"
                placeholder="제한 없음"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-maple-orange"
                disabled={isSearching}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">가위 사용 가능 횟수 최대</span>
              <input
                value={auctionFilters.maxCuttableCount}
                onChange={(event) => setAuctionFilters((current) => ({ ...current, maxCuttableCount: event.target.value }))}
                inputMode="numeric"
                placeholder="제한 없음"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-maple-orange"
                disabled={isSearching}
              />
            </label>
          </div>
        </div>

        {/* 검색할 아이템 선택 */}
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-700">🔎 검색할 아이템 선택</p>
              <p className="mt-1 text-xs text-gray-500">
                선택된 아이템만 옥션에서 검색합니다. 현재 {selectedEquipmentNames.size}/{ALL_SEARCHABLE_EQUIPMENT.length}개 선택
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedEquipmentNames(new Set(visibleEquipment.map((equipment) => equipment.name)))}
                disabled={isSearching}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={() => setSelectedEquipmentNames(new Set())}
                disabled={isSearching}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                전체 해제
              </button>
            </div>
          </div>

          <div className="relative mb-3">
            <input
              type="search"
              value={equipmentSearchQuery}
              onChange={(event) => setEquipmentSearchQuery(event.target.value)}
              placeholder="아이템 이름으로 검색"
              disabled={isSearching}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20"
            />
          </div>

          <div className="mb-2 text-xs text-gray-500">
            검색 결과 {filteredEquipment.length}개
          </div>

          <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {filteredEquipment.map((equipment) => {
              const isSelected = selectedEquipmentNames.has(equipment.name);
              return (
                <label
                  key={equipment.name}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    isSelected
                      ? 'border-maple-orange bg-orange-50 text-gray-900'
                      : 'border-gray-200 bg-gray-50 text-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      setSelectedEquipmentNames((current) => {
                        const next = new Set(current);
                        if (next.has(equipment.name)) next.delete(equipment.name);
                        else next.add(equipment.name);
                        return next;
                      });
                    }}
                    disabled={isSearching}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span className="min-w-0 flex-1 truncate">{equipment.name}</span>
                  <span className="shrink-0 text-[10px] text-gray-400">{equipment.part ?? equipment.set}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 mb-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">개인정보 보호</p>
            <p className="mt-1">이 값들은 브라우저 확장 프로그램에서만 사용되며, 서버로 전송되거나 저장되지 않습니다.</p>
          </div>
        </div>

        {/* 메인 검색 버튼 */}
        <button 
          onClick={searchAllEquipmentOptions} 
          disabled={isSearching || !isProfileValid || selectedEquipmentNames.size === 0}
          className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-maple-orange to-orange-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:shadow-xl hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              옥션 검색 중...
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" />
              🚀 선택 아이템 자동 검색 & 최적 템셋 추천
            </>
          )}
        </button>

        {!isProfileValid && !isSearching && (
          <p className="mt-3 text-center text-sm text-gray-500">
            ⬆️ Account ID, Character ID, World ID를 모두 입력해주세요
          </p>
        )}
        {isProfileValid && selectedEquipmentNames.size === 0 && !isSearching && (
          <p className="mt-3 text-center text-sm text-gray-500">
            ⬆️ 검색할 아이템을 하나 이상 선택해주세요
          </p>
        )}
      </div>

      {/* 진행 상태 */}
      {progress && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center gap-3">
            {isSearching && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
            {!isSearching && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
            <div className="flex-1">
              <p className="font-semibold text-blue-900">{progress}</p>
              {isSearching && (
                <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${(optimalSets.length / 12) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      {/* 최적 템셋 결과 */}
      {optimalSets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-2xl font-bold text-gray-900">⚡ 최적 템셋 추천</h4>
            <p className={`text-sm font-semibold ${selectedPower >= targetPower ? 'text-emerald-600' : 'text-amber-600'}`}>
              {selectedPower >= targetPower ? '목표 달성 조합' : '예산 내 최대 전투력 조합'} · {optimalSets.length}개 부위
            </p>
          </div>

          {/* 총 예상 비용 */}
          <div className="mb-6 rounded-xl bg-gradient-to-r from-maple-orange/10 to-orange-100 border-2 border-maple-orange p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">💰 총 예상 비용</p>
                <p className="text-3xl font-extrabold text-maple-orange">
                  {formatMesos(selectedCost)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">⚡ 총 전투력 증가</p>
                <p className="text-3xl font-extrabold text-blue-600">
                  +{selectedPower.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">📊 평균 효율</p>
                <p className="text-3xl font-extrabold text-emerald-600">
                  {(optimalSets.reduce((sum, set) => sum + set.selected.efficiency, 0) / optimalSets.length).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* 부위별 최적 장비 */}
          <div className="space-y-4">
            {optimalSets.map((optimalSet) => (
              <div key={optimalSet.part} className="rounded-xl border-2 border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <h5 className="text-lg font-bold text-gray-900">{optimalSet.part}</h5>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                    최고 효율
                  </span>
                </div>

                {/* 선택된 장비 */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex min-w-0 items-center gap-3">
                      {optimalSet.selected.topItem?.itemIcon?.fallBackUrl && (
                        <img
                          src={optimalSet.selected.topItem.itemIcon.fallBackUrl}
                          alt=""
                          className="h-12 w-12 rounded-lg border border-emerald-200 bg-white object-contain"
                        />
                      )}
                      <p className="text-sm font-bold text-gray-900">{optimalSet.selected.equipment.name}</p>
                      <p className="text-xs text-gray-500">{optimalSet.selected.equipment.part ?? `${optimalSet.selected.equipment.set} 세트`}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-maple-orange">
                        {formatMesos(optimalSet.selected.recommendedPrice)}
                      </p>
                      <p className="text-xs text-gray-500">매물 {optimalSet.selected.listingCount}개</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-emerald-200">
                    <div>
                      <p className="text-xs text-gray-500">전투력</p>
                      <p className="text-sm font-bold text-blue-600">+{optimalSet.selected.recommendedPower.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">효율</p>
                      <p className="text-sm font-bold text-emerald-600">{optimalSet.selected.efficiency.toFixed(2)}</p>
                    </div>
                  </div>

                  {optimalSet.selected.topItem && <AuctionTooltipDetails item={optimalSet.selected.topItem} />}
                  {optimalSet.selected.topItem?.toolTip && (false ? (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-white/80 p-3 text-xs text-gray-700">
                      <p className="mb-2 font-bold text-gray-900">🔍 추천 매물 상세</p>
                      <div className="grid gap-1 sm:grid-cols-2">
                        <p>
                          ⭐ 스타포스:{' '}
                          {optimalSet.selected.topItem?.toolTip?.upgradeInfo?.starForce?.description ||
                            `${optimalSet.selected.topItem?.toolTip?.starforce || optimalSet.selected.topItem?.starforce || 0}성`}
                        </p>
                        <p>
                          📜 주문서:{' '}
                          {optimalSet.selected.topItem?.toolTip?.upgradeInfo?.scroll?.description || '정보 없음'}
                        </p>
                        <p>
                          🔥 추가옵션:{' '}
                          {optimalSet.selected.topItem?.toolTip?.upgradeInfo?.exOption?.description || '정보 없음'}
                        </p>
                        <p>
                          🟨 잠재능력:{' '}
                          {optimalSet.selected.topItem?.toolTip?.upgradeInfo?.potential?.description || '없음'}
                        </p>
                        <p className="sm:col-span-2">
                          🟦 에디셔널:{' '}
                          {optimalSet.selected.topItem?.toolTip?.upgradeInfo?.additionalPotential?.description || '없음'}
                        </p>
                      </div>
                    </div>
                  ) : null)}
                </div>

              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
