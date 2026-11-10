'use client';

import { useMemo, useState } from 'react';
import { Plus, Sparkles, Trash2, TrendingUp } from 'lucide-react';
import type { CharacterItem } from '@/types';
import { getAllEquipmentOptions } from '@/lib/equipment-database';
import {
  buildCombatModel,
  formatPower,
  simulatePurchases,
  type FinalStats,
  type PlannedPurchase,
} from '@/lib/combat-power';
import { formatStatBag, type ActiveSet } from '@/lib/set-effects';
import ComboPlanner from '@/components/ComboPlanner';

const SIM_PARTS = [
  '반지', '펜던트', '얼굴장식', '눈장식', '귀고리', '벨트', '어깨장식', '포켓',
  '기계 심장', '엠블렘', '뱃지', '훈장', '모자', '상의', '하의', '장갑', '신발', '망토', '무기',
];

interface LoadoutSimulatorProps {
  items: CharacterItem[];
  stats: FinalStats | null;
  characterClass: string;
  currentPower?: number;
}

function SetChips({ sets }: { sets: ActiveSet[] }) {
  if (!sets.length) {
    return <span className="text-xs text-gray-400">발동 중인 세트 효과 없음</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {sets.map((set) => (
        <span
          key={set.id}
          title={formatStatBag(set.effects).join(' · ')}
          className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-100"
        >
          {set.name} {set.count}
          <span className="text-indigo-400">/{set.maxCount}</span>
        </span>
      ))}
    </div>
  );
}

export default function LoadoutSimulator({ items, stats, characterClass, currentPower }: LoadoutSimulatorProps) {
  const [purchases, setPurchases] = useState<PlannedPurchase[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [filter, setFilter] = useState('');

  const model = useMemo(
    () => buildCombatModel(stats, items, characterClass),
    [stats, items, characterClass],
  );

  const catalog = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{ part: string; name: string; key: string }> = [];
    for (const part of SIM_PARTS) {
      for (const equipment of getAllEquipmentOptions(part)) {
        if (seen.has(equipment.name)) continue;
        seen.add(equipment.name);
        rows.push({ part, name: equipment.name, key: `${part}|${equipment.name}` });
      }
    }
    return rows;
  }, []);

  const filteredCatalog = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    if (!keyword) return catalog;
    return catalog.filter((row) => row.name.toLowerCase().includes(keyword));
  }, [catalog, filter]);

  const simulation = useMemo(
    () => (model ? simulatePurchases(model, items, purchases) : null),
    [model, items, purchases],
  );

  const addPurchase = (key: string) => {
    const row = catalog.find((candidate) => candidate.key === key);
    if (!row) return;
    if (purchases.some((purchase) => purchase.part === row.part && purchase.itemName === row.name)) return;
    setPurchases((current) => [...current, { part: row.part, itemName: row.name, itemPowerGain: 0 }]);
    setSelectedKey('');
  };

  const updateGain = (index: number, eok: string) => {
    const man = Number(eok);
    setPurchases((current) =>
      current.map((purchase, purchaseIndex) =>
        purchaseIndex === index
          ? { ...purchase, itemPowerGain: Number.isFinite(man) ? Math.round(man * 10000) : 0 }
          : purchase,
      ),
    );
  };

  const removePurchase = (index: number) => {
    setPurchases((current) => current.filter((_, purchaseIndex) => purchaseIndex !== index));
  };

  if (!model) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900">🧮 전투력 시뮬레이터</h3>
        <p className="mt-2 text-sm text-gray-500">
          캐릭터를 먼저 조회하면 현재 스탯을 기준으로 장비 교체 · 세트 효과를 반영한 전투력을 계산합니다.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">🧮 전투력 시뮬레이터</h3>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            사려는 장비를 순서대로 담아보세요. 장비를 담을 때마다 세트 개수를 다시 세고,
            세트 효과로 늘어나는 전투력을 함께 계산합니다. 아이템 효과를 더한 값이 아니라
            <b className="text-gray-800"> 매 단계 전체를 다시 계산한 값</b>입니다.
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 px-4 py-3 text-right">
          <p className="text-xs text-gray-500">현재 전투력 (API)</p>
          <p className="text-xl font-extrabold text-amber-500">{formatPower(model.apiPower)}</p>
        </div>
      </div>

      {model.approximate && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          제논·데몬어벤져처럼 주스탯 계산식이 다른 직업은 변화량이 근사값으로 표시됩니다.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
        <span className="text-xs font-bold text-gray-600">발동 중인 세트 효과</span>
        <SetChips sets={model.activeSets} />
      </div>

      {/* 장비 담기 */}
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="장비 이름 검색 (예: 거대한 공포)"
          className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20"
        />
        <select
          value={selectedKey}
          onChange={(event) => {
            const key = event.target.value;
            setSelectedKey(key);
            if (key) addPurchase(key);
          }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20"
        >
          <option value="">장비 선택…</option>
          {SIM_PARTS.map((part) => {
            const options = filteredCatalog.filter((row) => row.part === part);
            if (!options.length) return null;
            return (
              <optgroup key={part} label={part}>
                {options.map((row) => (
                  <option key={row.key} value={row.key}>{row.name}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <button
          type="button"
          onClick={() => addPurchase(selectedKey)}
          disabled={!selectedKey}
          className="flex items-center justify-center gap-2 rounded-lg bg-maple-orange px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-maple-orange/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> 추가
        </button>
      </div>

      {/* 구매 계획 */}
      {purchases.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
          장비를 추가하면 아이템 효과와 세트 효과를 분리해서 계산해 드립니다.
        </p>
      ) : (
        <div className="mt-5 space-y-2">
          {purchases.map((purchase, index) => {
            const step = simulation?.steps[index];
            return (
              <div
                key={`${purchase.part}-${purchase.itemName}`}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{purchase.itemName}</p>
                    <p className="text-xs text-gray-500">{purchase.part}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    아이템 전투력 증가
                    <input
                      value={purchase.itemPowerGain ? purchase.itemPowerGain / 10000 : ''}
                      onChange={(event) => updateGain(index, event.target.value)}
                      inputMode="decimal"
                      placeholder="예: 500"
                      className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-900 outline-none focus:border-maple-orange"
                    />
                    만
                  </label>

                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    (step?.setPowerGain ?? 0) > 0
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    세트 효과 {step ? `${step.setPowerGain >= 0 ? '+' : ''}${formatPower(step.setPowerGain)}` : '-'}
                  </span>

                  <button
                    type="button"
                    onClick={() => removePurchase(index)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 결과 */}
      {simulation && purchases.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="py-2 text-left font-semibold">단계</th>
                <th className="py-2 text-left font-semibold">구매</th>
                <th className="py-2 text-right font-semibold">아이템 효과</th>
                <th className="py-2 text-right font-semibold">세트 효과</th>
                <th className="py-2 text-right font-semibold">누적 전투력</th>
              </tr>
            </thead>
            <tbody>
              {simulation.steps.map((step) => (
                <tr key={step.index} className="border-b border-gray-100">
                  <td className="py-2.5 text-gray-400">{step.index}</td>
                  <td className="py-2.5">
                    <span className="font-semibold text-gray-800">{step.itemName}</span>
                    {step.activatedTiers.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {step.activatedTiers.map((label) => (
                          <span
                            key={label}
                            className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100"
                          >
                            ✦ {label} 발동
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-blue-600">
                    +{formatPower(step.itemPowerGain)}
                  </td>
                  <td className={`py-2.5 text-right font-semibold ${
                    step.setPowerGain > 0 ? 'text-indigo-600' : step.setPowerGain < 0 ? 'text-red-500' : 'text-gray-300'
                  }`}>
                    {step.setPowerGain >= 0 ? '+' : ''}{formatPower(step.setPowerGain)}
                  </td>
                  <td className="py-2.5 text-right font-bold text-gray-900">{formatPower(step.powerAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 grid gap-4 rounded-2xl border-2 border-maple-orange bg-gradient-to-r from-maple-orange/10 to-orange-50 p-6 md:grid-cols-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <TrendingUp className="h-3.5 w-3.5" /> 아이템 효과 합계
              </p>
              <p className="text-2xl font-extrabold text-blue-600">+{formatPower(simulation.itemPowerTotal)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <Sparkles className="h-3.5 w-3.5" /> 세트 효과 (중첩 반영)
              </p>
              <p className="text-2xl font-extrabold text-indigo-600">
                {simulation.setPowerTotal >= 0 ? '+' : ''}{formatPower(simulation.setPowerTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600">최종 전투력</p>
              <p className="text-2xl font-extrabold text-maple-orange">{formatPower(simulation.finalPower)}</p>
              <p className="mt-0.5 text-xs font-semibold text-gray-500">
                총 +{formatPower(simulation.totalGain)} ({formatPower(simulation.basePower)} → {formatPower(simulation.finalPower)})
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-xs font-bold text-gray-600">구매 후 세트 상태</p>
            <div className="mt-2">
              <SetChips sets={simulation.finalSets} />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
              아이템 효과 칸은 옥션 툴팁의 &lsquo;전투력 증가량&rsquo;을 넣으면 됩니다. 세트 효과는
              스탯·공격력·보공·크뎀 변화를 공식으로 다시 계산한 값이라, 같은 아이템이라도
              앞서 산 장비에 따라 증가폭이 달라집니다.
            </p>
          </div>
        </div>
      )}

      <ComboPlanner model={model} items={items} />

      {model.rawPower > 0 && Math.abs(model.calibration - 1) > 0.02 && (
        <p className="mt-4 text-[11px] text-gray-400">
          현재 스탯으로 계산한 값과 인게임 전투력의 차이를 보정 계수({model.calibration.toFixed(3)})로 맞춰
          변화량을 계산합니다. 직업 패시브·링크·유니온처럼 API 스탯에 이미 포함된 요소는 그대로 유지됩니다.
        </p>
      )}
      {currentPower !== undefined && currentPower > 0 && model.apiPower !== currentPower && (
        <p className="mt-1 text-[11px] text-gray-400">
          표시 전투력은 API 응답값 {formatPower(currentPower)} 기준입니다.
        </p>
      )}
    </section>
  );
}
