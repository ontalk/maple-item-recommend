'use client';

import { useState } from 'react';
import type { BenchmarkItem } from '@/types';

interface RecommendationResultProps {
  data: any;
  isLoading?: boolean;
  error?: string | null;
  onNewSearch?: () => void;
  targetPower: string;
  onTargetApply: (target: string) => void;
}

const SLOT_LAYOUT = [
  ['반지1', '', '', '모자', '', '', '엠블렘'],
  ['반지2', '', '', '얼굴장식', '', '', '뱃지'],
  ['반지3', '펜던트', '', '눈장식', '', '귀고리', '훈장'],
  ['반지4', '펜던트2', '', '상의', '', '어깨장식', '기계 심장'],
  ['포켓 아이템', '벨트', '', '하의', '', '장갑', '예비 특수 반지'],
  ['무기', '', '', '신발', '', '망토', '보조무기']
];

function formatCombatPower(value: string | number): string {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || num <= 0) return '0';

  const uk = Math.floor(num / 100000000);
  const man = Math.floor((num % 100000000) / 10000);
  const rest = num % 10000;

  let result = '';
  if (uk > 0) result += `${uk}억 `;
  if (man > 0) result += `${man.toLocaleString()}만 `;
  if (rest > 0 || result === '') result += `${rest.toLocaleString()}`;

  return result.trim();
}

export default function RecommendationResult({ data, error, onNewSearch, targetPower, onTargetApply }: RecommendationResultProps) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [draftTargetPower, setDraftTargetPower] = useState(targetPower);

  const getItemBySlot = (slotName: string) => {
    if (!slotName || !data?.recommendations) return null;
    const cleanTarget = slotName.replace(/\s+/g, '').toLowerCase();

    return data.recommendations.find((rec: any) => {
      const item = rec.current_item;
      if (!item) return false;

      const itemSlot = (item.item_slot || '').replace(/\s+/g, '').toLowerCase();
      const equipPart = (rec.equipment_part || '').replace(/\s+/g, '').toLowerCase();

      if (itemSlot === cleanTarget || equipPart === cleanTarget) return true;
      if (cleanTarget.includes('포켓') && (itemSlot.includes('포켓') || equipPart.includes('포켓'))) return true;
      if (cleanTarget.includes('기계') && (itemSlot.includes('기계') || equipPart.includes('기계'))) return true;

      return false;
    });
  };

  // 모든 추천 항목을 모아서 '가성비/효율 순'으로 스펙업 순서 타임라인 생성
  const getAllTimelineRecommendations = () => {
    if (!data?.recommendations) return [];
    const allRecs: Array<{ part: string; action: string; cost: number; desc: string; icon?: string }> = [];

    data.recommendations.forEach((rec: any) => {
      rec.recommendations?.forEach((opt: any) => {
        allRecs.push({
          part: rec.equipment_part,
          action: opt.action,
          cost: opt.estimated_cost,
          desc: opt.description,
          icon: rec.current_item?.item_icon,
        });
      });
    });

    // 비용 대비 효율순 정렬 (임의로 비용 낮은 순 혹은 효율순)
    return allRecs.sort((a, b) => a.cost - b.cost);
  };

  const timelineSteps = getAllTimelineRecommendations();

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
        <p className="text-red-600 font-bold mb-4">{error}</p>
        {onNewSearch && (
          <button onClick={onNewSearch} className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-xl">
            다시 검색하기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* 1. 상단 프로필 영역 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 bg-gray-50 rounded-2xl flex items-center justify-center p-1 border border-gray-200 overflow-hidden shadow-inner">
            {data?.character_image ? (
              <img src={data.character_image} alt={data.character_name} className="w-full h-full object-contain scale-125 translate-y-1" />
            ) : (
              <span className="text-4xl">🧙‍♀️</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{data?.character_name || '캐릭터'}</h1>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">실시간 조회</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Lv.{data?.character_level || 0} · {data?.character_class || '직업'} · {data?.world_name || '스카니아'}
            </p>
            <p className="text-2xl font-extrabold text-amber-500 mt-1">
              {formatCombatPower(data?.combat_power)} <span className="text-xs text-gray-400 font-normal">전투력</span>
            </p>
          </div>
        </div>

        {/* 목표 전투력 입력창 */}
        <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
          <span className="text-sm font-medium text-gray-600">🎯 목표 전투력</span>
          <input
            type="number"
            placeholder="2"
            value={draftTargetPower}
            onChange={(e) => setDraftTargetPower(e.target.value)}
            className="w-20 px-2 py-1 text-sm bg-white border border-gray-300 rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <span className="text-sm font-bold text-gray-700">억</span>
          <button onClick={() => onTargetApply(draftTargetPower)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-3.5 py-1.5 rounded-lg transition-colors shadow-sm">
            적용
          </button>
        </div>
      </div>

      {data?.benchmark && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold text-amber-600">비교 기준 · {data.benchmark.range_label}</p>
              <h2 className="mt-1 text-lg font-bold text-gray-900">최소 템세팅과 여명/칠흑 비교</h2>
              <p className="mt-1 text-xs text-gray-500 max-w-3xl">{data.benchmark.source_label}</p>
            </div>
            <span className="w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">권장: {data.benchmark.recommended_track}</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-xs font-bold text-amber-800">현재 여명 장비</p>
              <p className="mt-1 text-sm text-gray-700">{data.benchmark.dawn_items_equipped.length ? data.benchmark.dawn_items_equipped.join(' · ') : '감지된 여명 장비가 없습니다.'}</p>
              <p className="mt-2 text-xs text-gray-500">2억 목표에서는 세트 효과를 유지한 뒤, 예산과 해방·보스 진행도에 맞춰 칠흑으로 한 부위씩 바꾸는 흐름을 제시합니다.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-700">현재 칠흑 장비</p>
              <p className="mt-1 text-sm text-gray-700">{data.benchmark.black_items_equipped.length ? data.benchmark.black_items_equipped.join(' · ') : '감지된 칠흑 장비가 없습니다.'}</p>
              <p className="mt-2 text-xs text-gray-500">칠흑은 획득·작·거래 비용 편차가 커서, 최소 목표를 이미 충족한 뒤에 비교 대상으로 잡습니다.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.benchmark.minimum_plan.slice(0, 8).map((plan: BenchmarkItem) => (
              <div key={`${plan.equipment_part}-${plan.target_item}`} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[11px] font-bold text-gray-500">{plan.equipment_part} · {plan.track}</p>
                <p className="mt-1 text-sm font-bold text-gray-800">{plan.target_item}</p>
                <p className="mt-1 text-[11px] text-gray-500">★{plan.target_starforce} / {plan.target_potential}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. 메이플스토리 인게임 장비창 그리드 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
          🎒 장비창 <span className="text-xs font-normal text-gray-400">— 아이템을 클릭하면 상세 강화/교체 추천이 표시됩니다.</span>
        </h2>
        <p className="text-xs text-amber-600 mb-4 font-medium">💡 목표 전투력 {targetPower}억 달성을 위한 최적의 빌드가 계산되어 있습니다.</p>

        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[760px] grid-cols-7 gap-2">
            {SLOT_LAYOUT.flatMap((row, rowIndex) =>
              row.map((slotName, colIndex) => {
              if (!slotName) {
                return <div key={`${rowIndex}-${colIndex}`} className="h-32 opacity-0 pointer-events-none" />;
              }

              const itemData = getItemBySlot(slotName);
              const currentItem = itemData?.current_item;
              const starforce = Number(currentItem?.item_starforce || 0);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => itemData && setSelectedItem(itemData)}
                    className={`h-32 bg-gray-50 hover:bg-amber-50/40 border rounded-xl p-1.5 flex flex-col justify-between items-center cursor-pointer transition-all hover:scale-105 hover:shadow-md relative ${
                    selectedItem?.equipment_part === slotName ? 'border-amber-500 ring-2 ring-amber-200 bg-amber-50/30' : 'border-gray-200'
                  }`}
                >
                  <span className="text-[11px] text-gray-400 font-medium">{slotName}</span>
                  
                  {currentItem ? (
                    <>
                      {currentItem.item_icon ? (
                        <img src={currentItem.item_icon} alt={currentItem.item_name} className="w-12 h-12 object-contain drop-shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      )}

                      <div className="text-center w-full truncate">
                        <p className="text-xs font-bold text-gray-800 truncate px-1">
                          {currentItem.item_name}
                        </p>
                        {starforce > 0 ? (
                          <span className="text-[11px] font-extrabold text-blue-500">
                            ★{starforce}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300">★0</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-gray-300 my-auto">미장착</span>
                  )}
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. 하단 스펙업 순서 타임라인 (요청하신 사진 스타일 반영) */}
      <div className="bg-gray-900 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            🚀 스펙업 순서 추천 <span className="text-xs text-amber-400 font-normal">— 가성비 효율순 최적 루트</span>
          </h3>
          <span className="text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full border border-gray-700">
            목표: {targetPower}억 달성
          </span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex items-center gap-3 min-w-max">
            {timelineSteps.length > 0 ? (
              timelineSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 w-44 flex flex-col justify-between shadow-md relative hover:border-amber-500 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold text-amber-400">{step.part}</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                        순서 {idx + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 my-1">
                      {step.icon ? (
                        <img src={step.icon} alt="" className="w-10 h-10 object-contain bg-gray-900 rounded-lg p-1 border border-gray-700" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-700 rounded-lg" />
                      )}
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold truncate text-gray-100">{step.action}</p>
                        <p className="text-[10px] text-gray-400 truncate">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                  {idx < timelineSteps.length - 1 && (
                    <div className="text-gray-600 font-bold">➔</div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 py-4">추천 스펙업 경로가 없습니다. 장비를 확인해주세요.</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. 클릭 시 뜨는 상세 모달 팝업 */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold transition-colors"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-4">{selectedItem.equipment_part}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-emerald-500/30 bg-emerald-50/20 rounded-2xl p-4">
                <span className="text-xs font-bold text-emerald-600 mb-2 inline-block">📦 현재 장비</span>
                <div className="text-center pb-4 border-b border-gray-200/60">
                  <h4 className="font-bold text-emerald-800 text-base">{selectedItem.current_item?.item_name}</h4>
                  {selectedItem.current_item?.item_icon && (
                    <img src={selectedItem.current_item.item_icon} alt="" className="w-16 h-16 mx-auto my-2 object-contain drop-shadow" />
                  )}
                  {Number(selectedItem.current_item?.item_starforce || 0) > 0 && (
                    <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      ★{selectedItem.current_item.item_starforce}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                    <span className="font-bold text-emerald-600 block mb-1">
                      잠재옵션 ({selectedItem.current_item?.item_potential_option_grade || '없음'})
                    </span>
                    {selectedItem.current_item?.item_potential_option?.length > 0 ? (
                      selectedItem.current_item.item_potential_option.map((opt: any, idx: number) => (
                        <p key={idx} className="text-gray-700">{opt.potential_option_value}</p>
                      ))
                    ) : (
                      <p className="text-gray-400">잠재옵션 없음</p>
                    )}
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                    <span className="font-bold text-emerald-600 block mb-1">
                      에디셔널 잠재옵션 ({selectedItem.current_item?.item_add_potential_option_grade || '없음'})
                    </span>
                    {selectedItem.current_item?.item_add_potential_option?.length > 0 ? (
                      selectedItem.current_item.item_add_potential_option.map((opt: any, idx: number) => (
                        <p key={idx} className="text-gray-700">{opt.potential_option_value}</p>
                      ))
                    ) : (
                      <p className="text-gray-400">에디셔널 잠재옵션 없음</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-amber-600 block">🎯 추천 스펙업 빌드 (목표 {targetPower}억 기준)</span>
                
                {selectedItem.recommendations?.length > 0 ? (
                  selectedItem.recommendations.map((rec: any, idx: number) => (
                    <div key={idx} className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-amber-900 text-xs">{rec.action}</span>
                        <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                          추천 {idx + 1}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 p-6 rounded-2xl text-center text-xs text-gray-400 border border-gray-100">
                    현재 스펙에서는 추가 강화를 추천하지 않습니다.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-gray-100">
              <button 
                onClick={() => setSelectedItem(null)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                + 적용 목록에 담기
              </button>
              <button 
                onClick={() => setSelectedItem(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs px-4 py-2 rounded-xl transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
