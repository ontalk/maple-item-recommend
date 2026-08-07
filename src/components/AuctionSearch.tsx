'use client';

import { useState } from 'react';
import { Loader2, Search, ShoppingCart, AlertCircle, CheckCircle2, TrendingUp, Zap } from 'lucide-react';
import type { BenchmarkComparison, BenchmarkItem } from '@/types';
import { searchAuction, type AuctionProfile, type AuctionRawItem } from '@/lib/auction-extension';
import { getAllEquipmentOptions, type EquipmentOption } from '@/lib/equipment-database';

interface EquipmentSearchResult {
  equipment: EquipmentOption;
  lowestPrice: number | null;
  medianPrice: number | null;
  avgAttackPowerDiff: number; // 평균 전투력 증가량
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

export function AuctionSearch({ benchmark }: { benchmark?: BenchmarkComparison }) {
  const [profile, setProfile] = useState<AuctionProfile>({ accountId: 0, characterId: 0, worldId: 5 });
  const [jobClass, setJobClass] = useState<string>('파이렛'); // 직업 선택
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optimalSets, setOptimalSets] = useState<OptimalSet[]>([]);

  const setNumber = (key: keyof AuctionProfile, value: string) => {
    setProfile((current) => ({ ...current, [key]: Number(value) || 0 }));
  };

  // 각 부위별로 모든 장비 옵션 검색
  const searchAllEquipmentOptions = async () => {
    console.log('🚀 검색 시작!', { benchmark, profile });
    
    if (!benchmark) {
      console.error('❌ benchmark가 없습니다');
      return;
    }
    if (!Number.isInteger(profile.accountId) || !Number.isInteger(profile.characterId) || !Number.isInteger(profile.worldId) || profile.accountId <= 0 || profile.characterId <= 0 || profile.worldId <= 0) {
      setError('Account ID, Character ID, World ID를 모두 입력해주세요.');
      console.error('❌ Profile 정보가 올바르지 않습니다', profile);
      return;
    }

    console.log('✅ 검색 조건 확인 완료, 검색 시작합니다');
    setIsSearching(true);
    setError(null);
    setOptimalSets([]);
    
    // 검색할 부위 목록
    const partsToSearch = ['반지', '펜던트', '귀고리', '얼굴장식', '벨트', '모자', '상의', '하의', '장갑', '신발', '망토', '어깨장식'];
    const allOptimalSets: OptimalSet[] = [];

    try {
      let searchCount = 0;
      
      for (const part of partsToSearch) {
        console.log(`\n📦 ${part} 부위 검색 중...`);
        const equipmentOptions = getAllEquipmentOptions(part);
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
          const isArmorOrWeapon = ['모자', '상의', '하의', '장갑', '신발', '망토', '어깨장식', '무기'].includes(part);
          const jobSuffixes = ['나이트', '메이지', '아처', '시프', '파이렛'];
          
          // 방어구/무기는 직업에 맞는 것만 검색
          if (isArmorOrWeapon) {
            const hasJobSuffix = jobSuffixes.some(suffix => equipment.name.includes(suffix));
            if (hasJobSuffix) {
              const jobMapping: Record<string, string> = {
                '워리어': '나이트',
                '마법사': '메이지',
                '궁수': '아처',
                '도적': '시프',
                '해적': '파이렛',
              };
              const targetSuffix = jobMapping[jobClass] || jobClass;
              if (!equipment.name.includes(targetSuffix)) {
                console.log(`  └─ ⏭️ ${equipment.name} 스킵 (${jobClass}가 아님)`);
                continue; // 다른 직업 장비는 스킵
              }
            }
          }
          
          try {
            // 넥슨 Rate Limiting 방지: 각 새로운 장비 검색 사이에 2초 대기
            if (totalSearched > 0) {
              console.log(`⏳ 2초 대기 중... (Rate Limiting 방지)`);
              await delay(2000);
            }
            
            console.log(`  🔍 ${equipment.name} 검색 시작...`);
            
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
                itemCategory: { itemDetailCategory: 'ARMOR' },
                enhancementOption: {
                  starforceMin: 17,
                  starforceMax: 17,
                  potentialGrade: 3, // 유니크
                  additionalPotentialGrade: 2, // 에픽
                },
              });
              
              // 첫 페이지만 카운트 소모
              if (currentPage === 1) {
                totalSearched++;
                remainingCount = result.remaining;
                setRemaining(result.remaining);
                console.log(`  └─ 총 ${result.data.total}개 매물 발견, ${result.data.totalPages}페이지`);
              }
              
              allItems.push(...result.data.items);
              
              // 다음 페이지 확인
              if (result.data.hasNext && currentPage < result.data.totalPages) {
                currentPage++;
                console.log(`  └─ ${currentPage}페이지 로딩 중...`);
                // 페이지 넘김은 빠르게 (카운트 소모 없으므로)
                await delay(300);
              } else {
                hasMorePages = false;
                console.log(`  ✅ ${equipment.name}: 총 ${allItems.length}개 아이템 수집 완료`);
              }
            }
            
            if (allItems.length === 0) {
              console.log(`  └─ ⚠️ ${equipment.name}: 매물 없음`);
              continue;
            }

            const prices = allItems
              .map((item) => toNumber(item.pricePerItem || item.price))
              .filter((price) => price > 0);
            
            const attackPowers = allItems
              .map((item) => item.attackPowerDiff || 0)
              .filter((power) => power > 0);

            const lowestPrice = prices.length ? Math.min(...prices) : null;
            const avgAttackPower = attackPowers.length ? Math.round(attackPowers.reduce((sum, p) => sum + p, 0) / attackPowers.length) : 0;
            const efficiency = lowestPrice && avgAttackPower ? (avgAttackPower / lowestPrice) * 1000000000 : 0;

            partResults.push({
              equipment,
              lowestPrice,
              medianPrice: median(prices),
              avgAttackPowerDiff: avgAttackPower,
              listingCount: allItems.length,
              efficiency,
              topItem: allItems[0],
            });
          } catch (err) {
            console.error(`${equipment.name} 검색 실패:`, err);
          }
        }

        // 효율 높은 순으로 정렬
        partResults.sort((a, b) => b.efficiency - a.efficiency);

        if (partResults.length > 0) {
          allOptimalSets.push({
            part,
            selected: partResults[0], // 가장 효율 좋은 것
            alternatives: partResults.slice(1, 5), // 대안 4개
          });
        }

        searchCount++;
        setOptimalSets([...allOptimalSets]);
      }

      setProgress(`✓ 검색 완료! ${partsToSearch.length}개 부위의 최적 템셋을 분석했습니다.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '옥션 검색에 실패했습니다.');
      setProgress('');
    } finally {
      setIsSearching(false);
    }
  };

  if (!benchmark) return null;

  const isProfileValid = Number.isInteger(profile.accountId) && Number.isInteger(profile.characterId) && Number.isInteger(profile.worldId) && profile.accountId > 0 && profile.characterId > 0 && profile.worldId > 0;

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
              placeholder="예: 108912176" 
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
              placeholder="예: 29662388" 
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
              placeholder="예: 8 (크로아)" 
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20 outline-none transition placeholder:text-gray-400" 
              disabled={isSearching}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 mb-1 block">직업</span>
            <select
              value={jobClass}
              onChange={(e) => setJobClass(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20 outline-none transition bg-white"
              disabled={isSearching}
            >
              <option value="워리어">워리어 (전사)</option>
              <option value="마법사">마법사</option>
              <option value="궁수">궁수</option>
              <option value="도적">도적</option>
              <option value="해적">해적</option>
            </select>
          </label>
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
          disabled={isSearching || !isProfileValid}
          className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-maple-orange to-orange-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:shadow-xl hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              옥션 검색 중... ({optimalSets.length}/12개 부위)
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" />
              🚀 모든 장비 자동 검색 & 최적 템셋 추천
            </>
          )}
        </button>

        {!isProfileValid && !isSearching && (
          <p className="mt-3 text-center text-sm text-gray-500">
            ⬆️ Account ID, Character ID, World ID를 모두 입력해주세요
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
            <p className="text-sm text-gray-600">{optimalSets.length}개 부위 분석 완료</p>
          </div>

          {/* 총 예상 비용 */}
          <div className="mb-6 rounded-xl bg-gradient-to-r from-maple-orange/10 to-orange-100 border-2 border-maple-orange p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">💰 총 예상 비용</p>
                <p className="text-3xl font-extrabold text-maple-orange">
                  {formatMesos(optimalSets.reduce((sum, set) => sum + (set.selected.lowestPrice || 0), 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">⚡ 총 전투력 증가</p>
                <p className="text-3xl font-extrabold text-blue-600">
                  +{optimalSets.reduce((sum, set) => sum + set.selected.avgAttackPowerDiff, 0).toLocaleString()}만
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
                    <div>
                      <p className="text-sm font-bold text-gray-900">{optimalSet.selected.equipment.name}</p>
                      <p className="text-xs text-gray-500">{optimalSet.selected.equipment.set} 세트</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-maple-orange">
                        {formatMesos(optimalSet.selected.lowestPrice)}
                      </p>
                      <p className="text-xs text-gray-500">매물 {optimalSet.selected.listingCount}개</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-emerald-200">
                    <div>
                      <p className="text-xs text-gray-500">전투력</p>
                      <p className="text-sm font-bold text-blue-600">+{optimalSet.selected.avgAttackPowerDiff.toLocaleString()}만</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">효율</p>
                      <p className="text-sm font-bold text-emerald-600">{optimalSet.selected.efficiency.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* 대안 장비들 */}
                {optimalSet.alternatives.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 font-semibold">
                      다른 옵션 {optimalSet.alternatives.length}개 보기
                    </summary>
                    <div className="mt-2 space-y-2">
                      {optimalSet.alternatives.map((alt, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{alt.equipment.name}</p>
                              <p className="text-xs text-gray-500">{alt.equipment.set} · 효율 {alt.efficiency.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-700">{formatMesos(alt.lowestPrice)}</p>
                              <p className="text-xs text-gray-500">+{alt.avgAttackPowerDiff.toLocaleString()}만</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
