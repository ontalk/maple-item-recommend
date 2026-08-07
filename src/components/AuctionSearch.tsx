'use client';

import { useState } from 'react';
import { Loader2, Search, ShieldCheck } from 'lucide-react';
import type { BenchmarkComparison, BenchmarkItem } from '@/types';
import { searchAuction, type AuctionProfile, type AuctionRawItem } from '@/lib/auction-extension';

interface PriceResult {
  plan: BenchmarkItem;
  lowestPrice: number | null;
  medianPrice: number | null;
  listingCount: number;
  cached: boolean;
  sample?: AuctionRawItem;
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
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PriceResult[]>([]);

  const setNumber = (key: keyof AuctionProfile, value: string) => {
    setProfile((current) => ({ ...current, [key]: Number(value) || 0 }));
  };

  const searchPlans = async () => {
    if (!benchmark) return;
    if (!Number.isInteger(profile.accountId) || !Number.isInteger(profile.characterId) || !Number.isInteger(profile.worldId) || profile.accountId <= 0 || profile.characterId <= 0 || profile.worldId <= 0) {
      setError('경매장 Network에서 확인한 accountId, characterId, worldId를 모두 입력해주세요. 이 값은 서버에 저장되지 않습니다.');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults([]);
    const nextResults: PriceResult[] = [];

    try {
      for (const [index, plan] of benchmark.minimum_plan.entries()) {
        setProgress(`${index + 1}/${benchmark.minimum_plan.length} · ${plan.target_item} 시세 조회 중`);
        const result = await searchAuction(profile, {
          keyword: plan.target_item,
          itemCategory: { itemDetailCategory: 'ARMOR' },
          enhancementOption: {
            starforceMin: plan.target_starforce,
            starforceMax: plan.target_starforce,
            potentialGrade: 3,
            additionalPotentialGrade: 2,
          },
        });
        const prices = result.data.items.map((item) => toNumber(item.pricePerItem || item.price)).filter((price) => price > 0);
        nextResults.push({
          plan,
          lowestPrice: prices.length ? Math.min(...prices) : null,
          medianPrice: median(prices),
          listingCount: result.data.total,
          cached: result.cached,
          sample: result.data.items[0],
        });
        setResults([...nextResults]);
        setRemaining(result.remaining);
      }
      setProgress('조회 완료 · 가격은 최저가와 표시된 20개 매물의 중앙값입니다.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '경매장 시세를 조회하지 못했습니다.');
      setProgress('');
    } finally {
      setIsSearching(false);
    }
  };

  if (!benchmark) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-maple-orange">
            <Search className="h-5 w-5" />
            <p className="text-sm font-bold">로그인된 메이플 옥션으로 자동 시세 조회</p>
          </div>
          <p className="mt-1 max-w-3xl text-xs text-gray-500">목표 세팅의 핵심 {benchmark.minimum_plan.length}개를 순차 검색합니다. 로그인 쿠키·비밀번호는 앱이나 서버로 전달·저장하지 않습니다.</p>
        </div>
        {remaining !== null && <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">오늘 안전 검색 잔여 {remaining}회</span>}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <label className="text-xs font-semibold text-gray-600">Account ID
          <input value={profile.accountId || ''} onChange={(event) => setNumber('accountId', event.target.value)} inputMode="numeric" placeholder="Network의 accountId" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-gray-600">Character ID
          <input value={profile.characterId || ''} onChange={(event) => setNumber('characterId', event.target.value)} inputMode="numeric" placeholder="Network의 characterId" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-gray-600">World ID
          <input value={profile.worldId || ''} onChange={(event) => setNumber('worldId', event.target.value)} inputMode="numeric" placeholder="예: 5" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <button onClick={searchPlans} disabled={isSearching} className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-maple-orange px-4 py-2 text-sm font-bold text-white transition hover:bg-maple-orange/90 disabled:cursor-not-allowed disabled:opacity-60">
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {isSearching ? '조회 중' : '목표 세팅 자동 조회'}
        </button>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p>Chrome 확장 프로그램을 먼저 설치하고, 별도 탭에서 메이플 옥션에 로그인해 두세요. Account/Character ID는 현재 브라우저 메모리에만 사용됩니다.</p>
      </div>

      {progress && <p className="mt-4 text-sm font-medium text-gray-700">{progress}</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {results.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((result) => (
            <article key={result.plan.target_item} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-[11px] font-bold text-gray-500">{result.plan.equipment_part} · ★{result.plan.target_starforce}</p>
              <p className="mt-1 truncate text-sm font-bold text-gray-900">{result.plan.target_item}</p>
              <p className="mt-3 text-xs text-gray-500">최저가</p>
              <p className="text-lg font-extrabold text-maple-orange">{formatMesos(result.lowestPrice)}</p>
              <p className="mt-2 text-xs text-gray-500">표시 20개 중앙값 · 전체 {result.listingCount.toLocaleString()}개</p>
              <p className="text-sm font-semibold text-gray-700">{formatMesos(result.medianPrice)} {result.cached && <span className="text-[10px] text-emerald-600">캐시</span>}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
