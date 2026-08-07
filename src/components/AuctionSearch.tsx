'use client';

import { useState } from 'react';
import { ExternalLink, Search, ShoppingCart } from 'lucide-react';
import type { BenchmarkComparison, BenchmarkItem } from '@/types';

// 잠재옵션 등급을 URL 파라미터로 변환
function getPotentialGradeParam(grade: string): string {
  if (grade.includes('유니크')) return 'unique';
  if (grade.includes('레어')) return 'rare';
  if (grade.includes('에픽')) return 'epic';
  if (grade.includes('레전드')) return 'legendary';
  return 'unique'; // 기본값
}

// 경매장 검색 URL 생성
function buildAuctionURL(plan: BenchmarkItem): string {
  const baseURL = 'https://auction.maplestory.nexon.com/buy';
  const params = new URLSearchParams({
    searchTab: 'condition',
    keyword: plan.target_item,
    isExactMatch: 'false',
    page: '1',
    limit: '20',
    sortType: 'PRICE_PER_ITEM_ASC',
    itemCategory: 'ARMOR',
    'enhancementOption::starforceMin': plan.target_starforce.toString(),
    'enhancementOption::starforceMax': plan.target_starforce.toString(),
    'enhancementOption::potentialGrade': getPotentialGradeParam(plan.target_potential),
  });
  
  // 에디셔널 잠재 조건 추가 (있는 경우)
  if (plan.target_potential.includes('에디')) {
    params.append('enhancementOption::additionalPotentialGrade', 'epic');
  }
  
  return `${baseURL}?${params.toString()}`;
}

export function AuctionSearch({ benchmark }: { benchmark?: BenchmarkComparison }) {
  const [openedItems, setOpenedItems] = useState<Set<string>>(new Set());

  const handleOpenAuction = (plan: BenchmarkItem) => {
    const url = buildAuctionURL(plan);
    window.open(url, '_blank');
    setOpenedItems(prev => new Set(prev).add(plan.target_item));
  };

  const handleOpenAllAuctions = () => {
    if (!benchmark) return;
    benchmark.minimum_plan.forEach((plan, index) => {
      setTimeout(() => {
        handleOpenAuction(plan);
      }, index * 300); // 300ms 간격으로 열기
    });
  };

  if (!benchmark) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-maple-orange/10 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-maple-orange" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">경매장 시세 확인</h3>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            목표 세팅 {benchmark.minimum_plan.length}개의 실시간 경매장 가격을 직접 확인하세요.
          </p>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <Search className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-blue-900">경매장에서 직접 확인하는 방법</p>
            <p className="mt-1 text-sm text-blue-700">
              각 장비의 "경매장에서 보기" 버튼을 클릭하면 해당 조건으로 검색된 경매장 페이지가 새 탭으로 열립니다.
              메이플스토리 경매장에 로그인되어 있어야 가격을 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 일괄 열기 버튼 */}
      <div className="mb-6">
        <button 
          onClick={handleOpenAllAuctions}
          className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-maple-orange to-orange-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:shadow-xl hover:scale-[1.02]"
        >
          <ExternalLink className="h-5 w-5" />
          🎯 전체 {benchmark.minimum_plan.length}개 경매장에서 한번에 열기
        </button>
        <p className="mt-2 text-center text-xs text-gray-500">
          각 아이템이 새 탭으로 열립니다 (팝업 차단을 해제해주세요)
        </p>
      </div>

      {/* 아이템 목록 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {benchmark.minimum_plan.map((plan) => {
          const isOpened = openedItems.has(plan.target_item);
          return (
            <article 
              key={plan.target_item} 
              className={`rounded-xl border-2 p-5 transition ${
                isOpened 
                  ? 'border-emerald-300 bg-emerald-50' 
                  : 'border-gray-200 bg-white hover:border-maple-orange'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-bold text-gray-500">{plan.equipment_part}</p>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">
                  ★{plan.target_starforce}
                </span>
              </div>
              
              <p className="text-sm font-bold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                {plan.target_item}
              </p>
              
              <div className="mb-3 pb-3 border-b border-gray-100">
                <p className="text-xs text-gray-500 mb-1">목표 옵션</p>
                <p className="text-xs font-semibold text-gray-700">{plan.target_potential}</p>
              </div>
              
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">예상 비용</p>
                <p className="text-base font-bold text-maple-orange">
                  {plan.estimated_cost >= 100000000 
                    ? `${(plan.estimated_cost / 100000000).toFixed(1)}억` 
                    : `${(plan.estimated_cost / 10000).toFixed(0)}만`}
                </p>
              </div>
              
              <button
                onClick={() => handleOpenAuction(plan)}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                  isOpened
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-maple-orange text-white hover:bg-maple-orange/90'
                }`}
              >
                <ExternalLink className="h-4 w-4" />
                {isOpened ? '다시 보기' : '경매장에서 보기'}
              </button>
              
              {isOpened && (
                <p className="mt-2 text-center text-xs text-emerald-600 font-semibold">
                  ✓ 새 탭으로 열림
                </p>
              )}
            </article>
          );
        })}
      </div>

      {/* 하단 안내 */}
      <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
        <p className="font-semibold mb-2">💡 팁</p>
        <ul className="space-y-1 text-xs">
          <li>• 경매장에 로그인되어 있어야 가격을 확인할 수 있습니다</li>
          <li>• 각 아이템의 최저가와 평균가를 비교해서 구매하세요</li>
          <li>• 예상 비용은 참고용이며, 실제 시세는 서버마다 다를 수 있습니다</li>
          <li>• 여러 개의 탭이 열리므로 팝업 차단을 해제해주세요</li>
        </ul>
      </div>
    </section>
  );
}
