'use client';

import { useState } from 'react';
import { useAuctionWebSocket } from '@/hooks/useAuctionWebSocket';
import type { AuctionItem } from '@/lib/maple-websocket';

export function AuctionSearch() {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  
  const { 
    isConnected, 
    connecting, 
    lastItems, 
    connect, 
    disconnect, 
    search,
    subscribe,
    error 
  } = useAuctionWebSocket({
    autoConnect: false,
    onAuctionUpdate: (items) => {
      console.log('받은 경매장 데이터:', items.length, '개');
    },
    onError: (err) => {
      console.error('WebSocket 에러:', err);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      search(keyword.trim(), page);
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
      // 연결 후 기본 구독 (전체 카테고리)
      subscribe(undefined, ['weapon', 'armor', 'accessory', 'etc']);
    } catch (err) {
      console.error('연결 실패:', err);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
      <div className="flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : connecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="font-medium">
          {isConnected ? '연결됨' : connecting ? '연결 중...' : '연결 안 됨'}
        </span>
        {error && (
          <span className="text-red-500 text-sm">에러: {error.message}</span>
        )}
      </div>

      {!isConnected && !connecting ? (
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          웹소켓 연결
        </button>
      ) : (
        <button
          onClick={disconnect}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          연결 해제
        </button>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="검색할 아이템명 입력 (예: 아케인, 앱솔, 보스장신구...)"
          className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          disabled={!isConnected}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          disabled={!isConnected || !keyword.trim()}
        >
          검색
        </button>
      </form>

      <div className="flex gap-2">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-3 py-1 text-sm border rounded disabled:opacity-50"
        >
          이전
        </button>
        <span className="px-3 py-1 text-sm">페이지 {page}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          className="px-3 py-1 text-sm border rounded"
        >
          다음
        </button>
      </div>

      {lastItems.length > 0 && (
        <div className="max-h-96 overflow-y-auto">
          <h4 className="font-medium mb-2">검색 결과 ({lastItems.length}개)</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lastItems.map((item: AuctionItem) => (
              <div
                key={`${item.item_id}-${item.price}`}
                className="p-3 border rounded bg-gray-50 dark:bg-gray-700"
              >
                <div className="flex items-center gap-2 mb-1">
                  <img 
                    src={item.item_icon} 
                    alt={item.item_name} 
                    className="w-10 h-10 rounded" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.item_name}</p>
                    <p className="text-xs text-gray-500">Lv.{item.item_level} • {item.item_rarity}</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {item.price.toLocaleString()} 메소
                  </span>
                  <span className="text-gray-500">x{item.quantity}</span>
                </div>
                {item.seller_name && (
                  <p className="text-xs text-gray-400 mt-1">판매자: {item.seller_name}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {lastItems.length === 0 && isConnected && (
        <p className="text-gray-500 text-center py-8">검색 결과가 없습니다.</p>
      )}
    </div>
  );
}