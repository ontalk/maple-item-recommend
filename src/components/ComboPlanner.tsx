'use client';

import { useMemo, useState } from 'react';
import { Plus, Sparkles, Target, Trash2, TrendingUp, Wallet } from 'lucide-react';
import type { CharacterItem } from '@/types';
import { formatPower, type CombatModel } from '@/lib/combat-power';
import { getAllEquipmentOptions } from '@/lib/equipment-database';
import {
  EMPTY_ITEM_STATS,
  marginalValues,
  rankPlans,
  type CandidateItem,
  type ItemStats,
  type PlanEvaluation,
} from '@/lib/item-planner';

const PARTS = [
  '반지', '펜던트', '얼굴장식', '눈장식', '귀고리', '벨트', '어깨장식', '포켓',
  '기계 심장', '엠블렘', '뱃지', '훈장', '모자', '상의', '하의', '장갑', '신발', '망토', '무기',
];

const NUM_FIELDS: Array<{ key: keyof ItemStats; label: string; placeholder: string }> = [
  { key: 'attack', label: '공격력', placeholder: '1122' },
  { key: 'mainPct', label: '주스탯%', placeholder: '13' },
  { key: 'bossDamage', label: '보공%', placeholder: '40' },
  { key: 'critDamage', label: '크뎀%', placeholder: '8' },
  { key: 'finalDamage', label: '최종뎀%', placeholder: '0' },
  { key: 'ignoreDefense', label: '방무%', placeholder: '30' },
  { key: 'mainFlat', label: '주스탯', placeholder: '0' },
];

function PlanCard({
  title,
  icon,
  plan,
  accent,
  note,
}: {
  title: string;
  icon: React.ReactNode;
  plan: PlanEvaluation | null;
  accent: string;
  note: string;
}) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${plan ? 'border-gray-200' : 'border-dashed border-gray-200'}`}>
      <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600">{icon}{title}</p>
      {plan ? (
        <>
          <p className={`mt-1.5 text-xl font-extrabold ${accent}`}>
            {plan.totalGain >= 0 ? '+' : ''}{formatPower(Math.round(plan.totalGain))}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-gray-700">
            {plan.picks.map((pick) => pick.name).join(' + ')}
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            {plan.costEok > 0 ? `${plan.costEok.toLocaleString()}억` : '가격 미입력'}
            {plan.costEok > 0 && ` · 억당 +${formatPower(Math.round(plan.valuePerEok))}`}
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs text-gray-400">{note}</p>
      )}
    </div>
  );
}

export default function ComboPlanner({ model, items }: { model: CombatModel; items: CharacterItem[] }) {
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [filter, setFilter] = useState('');
  const [targetEok, setTargetEok] = useState('');

  const catalog = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{ part: string; name: string; key: string }> = [];
    for (const part of PARTS) {
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

  const marginal = useMemo(() => marginalValues(model), [model]);

  const targetGain = Math.round((Number(targetEok) || 0) * 100000000);
  const ranked = useMemo(
    () => rankPlans(model, items, candidates, { targetGain }),
    [model, items, candidates, targetGain],
  );

  const addCandidate = (key: string) => {
    const row = catalog.find((candidate) => candidate.key === key);
    if (!row) return;
    setCandidates((current) => [
      ...current,
      {
        id: `${key}-${current.length}-${Date.now()}`,
        part: row.part,
        name: row.name,
        priceEok: 0,
        stats: { ...EMPTY_ITEM_STATS },
      },
    ]);
    setSelectedKey('');
  };

  const updateCandidate = (id: string, patch: Partial<CandidateItem>) => {
    setCandidates((current) => current.map((candidate) => (candidate.id === id ? { ...candidate, ...patch } : candidate)));
  };

  const updateStat = (id: string, key: keyof ItemStats, raw: string) => {
    const value = Number(raw);
    const next = Number.isFinite(value) ? value : 0;
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id ? { ...candidate, stats: { ...candidate.stats, [key]: next } } : candidate,
      ),
    );
  };

  const removeCandidate = (id: string) => {
    setCandidates((current) => current.filter((candidate) => candidate.id !== id));
  };

  const topPlans = ranked.plans.slice(0, 8);

  return (
    <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-lg font-bold text-gray-900">🧾 후보 장비 조합 · 가성비 비교</h4>
          <p className="mt-1.5 max-w-3xl text-sm text-gray-600">
            사려는 장비를 여러 개 담고 각 장비의 옵션(공격력·보공·크뎀 등)과 가격을 넣으면,
            현재 스탯에서의 한계 기여도로 <b className="text-gray-800">모든 조합의 예상 전투력</b>을
            다시 계산합니다. 세트 효과와 이미 착용 중인 장비의 손실까지 함께 반영합니다.
          </p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
          <p className="text-[11px] font-semibold text-gray-500">공격력 1의 가치</p>
          <p className="text-sm font-extrabold text-indigo-600">
            주스탯 {marginal.attackToMainStat.toFixed(2)}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-400">
            보공 1% = {formatPower(Math.round(marginal.perBossDamage))} · 크뎀 1% = {formatPower(Math.round(marginal.perCritDamage))}
          </p>
        </div>
      </div>

      {/* 후보 추가 */}
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="장비 이름 검색 (예: 몽환의 벨트)"
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20"
        />
        <select
          value={selectedKey}
          onChange={(event) => {
            const key = event.target.value;
            setSelectedKey(key);
            if (key) addCandidate(key);
          }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20"
        >
          <option value="">후보 장비 선택…</option>
          {PARTS.map((part) => {
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
          onClick={() => addCandidate(selectedKey)}
          disabled={!selectedKey}
          className="flex items-center justify-center gap-2 rounded-lg bg-maple-orange px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-maple-orange/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> 후보 추가
        </button>
      </div>

      {candidates.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-indigo-200 bg-white/60 py-8 text-center text-sm text-gray-400">
          후보 장비를 추가하고 옵션·가격을 입력하면 조합별 예상 전투력과 가성비를 비교해 드립니다.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{candidate.name}</p>
                  <p className="text-xs text-gray-500">{candidate.part}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <Wallet className="h-3.5 w-3.5" />
                    <input
                      value={candidate.priceEok || ''}
                      onChange={(event) => updateCandidate(candidate.id, { priceEok: Number(event.target.value) || 0 })}
                      inputMode="decimal"
                      placeholder="가격"
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-right text-sm font-semibold text-gray-900 outline-none focus:border-maple-orange"
                    />
                    억
                  </label>
                  <button
                    type="button"
                    onClick={() => removeCandidate(candidate.id)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {NUM_FIELDS.map((field) => (
                  <label key={field.key} className="flex flex-col gap-1 text-[11px] font-semibold text-gray-500">
                    {field.label}
                    <input
                      value={candidate.stats[field.key] || ''}
                      onChange={(event) => updateStat(candidate.id, field.key, event.target.value)}
                      inputMode="decimal"
                      placeholder={field.placeholder}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-right text-sm font-semibold text-gray-900 outline-none focus:border-maple-orange"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-white p-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <Target className="h-3.5 w-3.5" /> 목표 전투력 증가
              <input
                value={targetEok}
                onChange={(event) => setTargetEok(event.target.value)}
                inputMode="decimal"
                placeholder="예: 1.5"
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-900 outline-none focus:border-maple-orange"
              />
              억
            </label>
            <span className="text-[11px] text-gray-500">
              목표를 입력하면 그 증가분을 가장 싸게 달성하는 조합을 함께 찾습니다.
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <PlanCard
              title="최고 전투력"
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              plan={ranked.bestPower}
              accent="text-maple-orange"
              note="후보를 추가해 주세요."
            />
            <PlanCard
              title="최고 가성비 (억당)"
              icon={<Wallet className="h-3.5 w-3.5" />}
              plan={ranked.bestValue}
              accent="text-emerald-600"
              note="가격을 입력하면 계산됩니다."
            />
            <PlanCard
              title="목표 달성 최소 비용"
              icon={<Target className="h-3.5 w-3.5" />}
              plan={ranked.bestForTarget}
              accent="text-indigo-600"
              note="목표 전투력 증가를 입력해 주세요."
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="px-4 py-2 text-left font-semibold">조합</th>
                  <th className="px-3 py-2 text-right font-semibold">비용</th>
                  <th className="px-3 py-2 text-right font-semibold">아이템</th>
                  <th className="px-3 py-2 text-right font-semibold">세트</th>
                  <th className="px-3 py-2 text-right font-semibold">예상 전투력</th>
                  <th className="px-3 py-2 text-right font-semibold">증가</th>
                  <th className="px-3 py-2 text-right font-semibold">억당</th>
                  <th className="px-4 py-2 text-right font-semibold">환산 주스탯</th>
                </tr>
              </thead>
              <tbody>
                {topPlans.map((plan) => (
                  <tr key={plan.picks.map((pick) => pick.id).join('|')} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-gray-800">
                        {plan.picks.map((pick) => pick.name).join(' + ')}
                      </span>
                      {plan.activeTiers.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {plan.activeTiers.map((label) => (
                            <span
                              key={label}
                              className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-600">
                      {plan.costEok > 0 ? `${plan.costEok.toLocaleString()}억` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-blue-600">
                      {plan.itemPowerGain >= 0 ? '+' : ''}{formatPower(Math.round(plan.itemPowerGain))}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-semibold ${
                      plan.setPowerGain > 0 ? 'text-indigo-600' : plan.setPowerGain < 0 ? 'text-red-500' : 'text-gray-300'
                    }`}>
                      {plan.setPowerGain >= 0 ? '+' : ''}{formatPower(Math.round(plan.setPowerGain))}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-gray-900">{formatPower(plan.finalPower)}</td>
                    <td className="px-3 py-2.5 text-right font-extrabold text-maple-orange">
                      {plan.totalGain >= 0 ? '+' : ''}{formatPower(Math.round(plan.totalGain))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-600">
                      {plan.costEok > 0 ? `+${formatPower(Math.round(plan.valuePerEok))}` : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      +{Math.round(plan.equivalentMainStat).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] leading-relaxed text-gray-500">
            <Sparkles className="mr-1 inline h-3 w-3" />
            방무는 인게임 전투력 공식에 포함되지 않아 증가분에 직접 반영되지 않습니다(세트에 포함된 방무도 동일).
            이미 착용 중인 부위를 교체하는 조합은 기존 장비의 옵션 기여분을 빼고 순증가로 계산합니다.
            {ranked.truncated && ` 후보가 10개를 넘어 앞의 10개만 조합합니다.`}
          </p>
        </div>
      )}
    </div>
  );
}
