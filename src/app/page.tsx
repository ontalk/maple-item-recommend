'use client';

import { useState } from 'react';
import { Sparkles, Shield, TrendingUp, Coins, ShoppingCart } from 'lucide-react';
import CharacterSearch from '@/components/CharacterSearch';
import RecommendationResult from '@/components/RecommendationResult';
import { AuctionSearch } from '@/components/AuctionSearch';

export default function Home() {
  const [searchData, setSearchData] = useState<{
    data: any;
    isLoading: boolean;
    error: string | null;
  }>({
    data: null,
    isLoading: false,
    error: null,
  });
  const [lastSearchedName, setLastSearchedName] = useState('');
  const [targetPower, setTargetPower] = useState('2');

  const handleSearch = async (name: string, target = targetPower) => {
    setSearchData({ data: null, isLoading: true, error: null });
    setLastSearchedName(name);
    
    try {
      const response = await fetch(`/api/character?name=${encodeURIComponent(name)}&target=${encodeURIComponent(target)}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '조회에 실패했습니다.');
      }
      
      setSearchData({ data: result, isLoading: false, error: null });
    } catch (err) {
      setSearchData({ 
        data: null, 
        isLoading: false, 
        error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.' 
      });
    }
  };

  const handleNewSearch = () => {
    setSearchData({ data: null, isLoading: false, error: null });
  };

  const handleTargetApply = (nextTarget: string) => {
    setTargetPower(nextTarget);
    handleSearch(lastSearchedName, nextTarget);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 히어로 섹션 */}
      <section className="relative bg-gradient-to-b from-maple-orange/10 via-white to-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-maple-orange/10 text-maple-orange rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              메이플스토리 장비 강화 추천 시스템
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              최소 비용으로 <span className="text-maple-orange">최대 전투력</span> 상승
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              캐릭터 닉네임을 입력하면 현재 장비를 분석하고, 비워두면 옥션 템셋 검색부터 시작할 수 있습니다.
            </p>

            {/* 특징 카드들 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <FeatureCard 
                icon={Shield} 
                title="실시간 데이터" 
                desc="넥슨 공식 API로 현재 장비 상태 정확히 조회" 
              />
              <FeatureCard 
                icon={TrendingUp} 
                title="효율성 분석" 
                desc="비용 대비 스탯 상승 효율로 최적 경로 추천" 
              />
              <FeatureCard 
                icon={Coins} 
                title="비용 계산" 
                desc="스타포스/잠재/에디셔널/교체 모두 메소 단위 계산" 
              />
            </div>

            {/* 검색 폼 */}
            <CharacterSearch onSearch={handleSearch} />
          </div>
        </div>

        {/* 배경 장식 */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* 결과 섹션 */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <RecommendationResult 
            data={searchData.data}
            isLoading={searchData.isLoading}
            error={searchData.error}
            onNewSearch={handleNewSearch}
            targetPower={targetPower}
            onTargetApply={handleTargetApply}
          />
        </div>
      </section>

      {/* 로그인된 경매장 탭에서만 실행되는 가격 조회 */}
      {searchData.data?.benchmark && <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingCart className="w-8 h-8 text-maple-orange" />
            <h2 className="text-2xl font-bold text-gray-900">경매장 기반 목표 세팅</h2>
          </div>
          <p className="text-gray-600 mb-6 max-w-2xl">목표 전투력 기준의 최소 세팅을 로그인된 메이플 옥션에서 직접 조회해, 실제 매물 가격으로 비교합니다.</p>
          <AuctionSearch benchmark={searchData.data.benchmark} />
        </div>
      </section>}

      {/* 푸터 정보 */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">데이터 출처</h4>
              <ul className="space-y-2 text-sm">
                <li>넥슨 메이플스토리 Open API</li>
                <li>인벤/남붕이 스타포스 비용표</li>
                <li>커뮤니티 공유 큐브 확률 데이터</li>
                <li>경매장 시세 참고 (서버별 상이)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">주의사항</h4>
              <ul className="space-y-2 text-sm">
                <li>예상 비용은 확률 기반 계산값입니다</li>
                <li>실제 강화 결과와 다를 수 있습니다</li>
                <li>큐브/스타포스 가격은 서버/시기별 변동</li>
                <li>투자 전 본인 판단 하에 결정하세요</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">기능</h4>
              <ul className="space-y-2 text-sm">
                <li>스타포스 강화 비용/확률 시뮬레이션</li>
                <li>잠재옵션 등업/리롤 예상 비용</li>
                <li>에디셔널 잠재옵션 추천</li>
                <li>장비 교체 시점 가이드</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>메이플스토리 장비 강화 추천 시스템 &copy; 2024</p>
            <p className="mt-1">이 서비스는 넥슨과 무관한 비공식 팬 프로젝트입니다.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow duration-200">
      <div className="w-12 h-12 bg-maple-orange/10 rounded-lg flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-maple-orange" />
      </div>
      <h4 className="font-semibold text-gray-800 mb-2">{title}</h4>
      <p className="text-sm text-gray-600">{desc}</p>
    </div>
  );
}
