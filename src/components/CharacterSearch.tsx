'use client';

import { useState, FormEvent } from 'react';
import { Search, Loader2 } from 'lucide-react';

export default function CharacterSearch({ onSearch }: { onSearch: (name: string) => void }) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      setIsLoading(true);
      onSearch(name.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="캐릭터 닉네임을 입력하세요"
          className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-maple-orange focus:ring-2 focus:ring-maple-orange/20 transition-all duration-200 bg-white"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-maple-orange text-white rounded-lg font-semibold hover:bg-maple-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              조회 중...
            </>
          ) : (
            '조회'
          )}
        </button>
      </div>
      <p className="text-center text-gray-500 mt-3 text-sm">
        닉네임을 입력하면 캐릭터 분석을 함께 진행하고, 비워두면 옥션 템셋 검색부터 시작합니다.
      </p>
    </form>
  );
}
