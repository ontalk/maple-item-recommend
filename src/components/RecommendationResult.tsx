'use client';

import { 
  Sword, Shield, Gem, ArrowUp, ArrowDown, AlertTriangle, 
  CheckCircle, XCircle, Info, Loader2, Coins, TrendingUp
} from 'lucide-react';
import type { RecommendationResponse, EquipmentRecommendation, RecommendationOption } from '@/types';
import { formatMesos, getRiskLevelKorean, getPriorityKorean } from '@/lib/recommendation-engine';

const TYPE_ICONS: Record<string, any> = {
  starforce: Sword,
  potential: Gem,
  additional_potential: Gem,
  replace: ArrowUp,
};

const TYPE_COLORS: Record<string, string> = {
  starforce: 'bg-orange-100 text-orange-700 border-orange-200',
  potential: 'bg-purple-100 text-purple-700 border-purple-200',
  additional_potential: 'bg-pink-100 text-pink-700 border-pink-200',
  replace: 'bg-blue-100 text-blue-700 border-blue-200',
};

const TYPE_LABELS: Record<string, string> = {
  starforce: '스타포스',
  potential: '잠재옵션',
  additional_potential: '에디셔널',
  replace: '교체',
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

interface RecommendationResultProps {
  data: RecommendationResponse | null;
  isLoading: boolean;
  error: string | null;
  onNewSearch: () => void;
}

export default function RecommendationResult({ data, isLoading, error, onNewSearch }: RecommendationResultProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-10 h-10 animate-spin text-maple-orange" />
        <p className="mt-4 text-lg text-gray-600">캐릭터 정보를 분석 중입니다...</p>
        <p className="text-sm text-gray-400">잠시만 기다려 주세요.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">오류가 발생했습니다</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onNewSearch}
          className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 캐릭터 헤더 */}
      <div className="bg-gradient-to-r from-maple-orange to-maple-red rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{data.character_name}</h2>
            <div className="flex flex-wrap gap-3 mt-2 text-maple-orange/80">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{data.world_name}</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{data.summary.main_stat_focus} 주스탯</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Lv.{data.recommendations[0]?.current_item?.item_equip_level || '?'}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{formatMesos(data.total_estimated_cost)}</p>
            <p className="text-maple-orange/80 text-sm">예상 총 비용</p>
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard 
          icon={TrendingUp} 
          label="예상 스탯 상승" 
          value={data.summary.expected_stat_increase.toLocaleString()} 
          color="bg-blue-500" 
        />
        <SummaryCard 
          icon={AlertTriangle} 
          label="높은 우선순위" 
          value={data.summary.high_priority_count} 
          color="bg-red-500" 
        />
        <SummaryCard 
          icon={Info} 
          label="보통 우선순위" 
          value={data.summary.medium_priority_count} 
          color="bg-yellow-500" 
        />
        <SummaryCard 
          icon={CheckCircle} 
          label="낮은 우선순위" 
          value={data.summary.low_priority_count} 
          color="bg-green-500" 
        />
      </div>

      {/* 장비별 추천 */}
      <div className="space-y-4">
        {data.recommendations.map((rec, index) => (
          <EquipmentRecommendationCard 
            key={`${rec.equipment_part}-${index}`}
            recommendation={rec}
            index={index}
          />
        ))}
      </div>

      {/* 다시 검색 버튼 */}
      <div className="text-center pt-4">
        <button
          onClick={onNewSearch}
          className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2 mx-auto"
        >
          <Sword className="w-5 h-5" />
          다른 캐릭터 조회하기
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { 
  icon: any; 
  label: string; 
  value: string | number; 
  color: string; 
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <div className={`${color} w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function EquipmentRecommendationCard({ recommendation, index }: { 
  recommendation: EquipmentRecommendation; 
  index: number; 
}) {
  const { equipment_part, current_item, recommendations: options, priority, reason } = recommendation;
  const Icon = TYPE_ICONS[options[0]?.type] || Sword;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* 장비 헤더 */}
      <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between ${PRIORITY_COLORS[priority]}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-gray-800">{index + 1}.</span>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {current_item.item_icon ? (
                <img 
                  src={current_item.item_icon} 
                  alt={current_item.item_name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Icon className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{equipment_part}</p>
              <p className="text-sm text-gray-500">{current_item.item_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 현재 상태 배지 */}
            <div className="flex gap-1">
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{current_item.item_starforce}성</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">{current_item.item_potential_option_grade}</span>
              <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded">{current_item.item_add_potential_option_grade}</span>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium">
              우선순위: {getPriorityKorean(priority)}
            </span>
          </div>
        </div>
      </div>

      {/* 추천 사유 */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-sm text-gray-600 flex items-center gap-1">
          <Info className="w-4 h-4" /> {reason}
        </p>
      </div>

      {/* 추천 옵션들 */}
      <div className="px-6 py-4 space-y-3">
        {options.map((opt, optIndex) => (
          <RecommendationOptionCard 
            key={`${opt.type}-${optIndex}`}
            option={opt}
            type={opt.type}
          />
        ))}
        
        {options.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p>현재 장비 상태가 양호합니다. 추가 강화가 큰 효율이 없을 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationOptionCard({ option, type }: { 
  option: RecommendationOption; 
  type: string; 
}) {
  const Icon = TYPE_ICONS[type] || Sword;

  return (
    <div className={`border rounded-xl p-4 hover:bg-gray-50 transition-colors ${TYPE_COLORS[type]} border-opacity-50`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/50">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{TYPE_LABELS[type]}: {option.action}</p>
            <p className="text-sm text-gray-600 mt-1">{option.description}</p>
          </div>
        </div>
        
        <div className="flex flex-col md:items-end gap-2 md:flex-row md:gap-4">
          {/* 비용 */}
          <div className="flex items-center gap-2 text-right">
            <Coins className="w-5 h-5 text-maple-orange" />
            <span className="font-bold text-lg text-gray-800">{formatMesos(option.estimated_cost)}</span>
          </div>
          
          {/* 스탯 상승 */}
          <div className="flex items-center gap-2 text-right">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-green-600">
              +{option.expected_stat_gain.reduce((sum, s) => sum + s.gain, 0).toLocaleString()}
            </span>
          </div>
          
          {/* 성공률 & 위험도 */}
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              성공률: {(option.success_rate * 100).toFixed(1)}%
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${RISK_COLORS[option.risk_level]}`}>
              위험도: {getRiskLevelKorean(option.risk_level)}
            </span>
          </div>
        </div>
      </div>

      {/* 상세 스탯 상승 */}
      <div className="mt-3 pt-3 border-t border-white/50 grid grid-cols-2 md:grid-cols-4 gap-2">
        {option.expected_stat_gain.map((stat, i) => (
          <div key={i} className="text-center p-2 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-500">{stat.stat_name}</p>
            <p className="font-semibold text-gray-800">
              {stat.current_value > 0 ? `${stat.current_value} → ${stat.expected_value}` : `+${stat.gain}`}
            </p>
            {stat.current_value > 0 && (
              <p className="text-xs text-green-600">+{stat.gain}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}