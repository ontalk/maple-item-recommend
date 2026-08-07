// 옥션 페이지에 주입되어 검색 요청을 처리하는 스크립트
const SEARCH_URL = 'https://api.mskr.nexon.com/v1/market/web/items/searches/tool-tip';

console.log('🎯 Maple Auction Injector 활성화됨');

// background에서 오는 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 옥션 탭에서 메시지 수신:', message);

  if (message?.source !== 'maple-item-recommend' || message?.type !== 'AUCTION_SEARCH') {
    return;
  }

  const payload = message.payload;
  
  console.log('🔍 옥션 검색 시작:', payload.filters.keyword);

  // 비동기 작업이므로 true 반환
  (async () => {
    try {
      const response = await fetch(SEARCH_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: payload.accountId,
          characterId: payload.characterId,
          worldId: payload.worldId,
          filters: payload.filters,
          page: payload.page,
          limit: payload.limit,
          sortType: payload.sortType || 'PRICE_PER_ITEM_ASC',
          saveRecentKeyword: false,
        }),
      });
      
      const text = await response.text();
      console.log(`📦 옥션 API 응답: ${response.status} (${payload.filters.keyword})`);
      
      if (!response.ok) {
        const preview = text.slice(0, 200);
        console.error(`❌ 응답 실패 (${response.status}):`, preview);
        throw new Error(`경매장 검색 실패 (${response.status}): ${preview}`);
      }
      
      const data = JSON.parse(text);
      console.log(`✅ 검색 성공: ${data.total || 0}개 아이템 (${payload.filters.keyword})`);
      
      sendResponse({ ok: true, data });
    } catch (err) {
      console.error(`❌ 옥션 검색 에러 (${payload.filters.keyword}):`, err);
      sendResponse({ ok: false, error: err.message });
    }
  })();

  return true; // 비동기 응답을 위해 true 반환
});

console.log('✅ Maple Auction Injector 준비 완료');
