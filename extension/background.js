const AUCTION_ORIGIN = 'https://auction.maplestory.nexon.com/*';
const SEARCH_URL = 'https://api.mskr.nexon.com/v1/market/web/items/searches/tool-tip';
const MAX_DAILY_SEARCHES = 100; // 넥슨 API 하루 100회 제한
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const cache = new Map();
let usage = { day: '', count: 0 };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function resetUsageIfNeeded() {
  if (usage.day !== today()) usage = { day: today(), count: 0 };
}

function getPayload(message) {
  const payload = message.payload;
  if (!payload || !Number.isInteger(payload.accountId) || !Number.isInteger(payload.characterId) || !Number.isInteger(payload.worldId)) {
    throw new Error('경매장 연결 정보(accountId, characterId, worldId)가 올바르지 않습니다.');
  }
  if (typeof payload.filters?.keyword !== 'string' || !payload.filters.keyword.trim()) {
    throw new Error('검색할 아이템명이 없습니다.');
  }

  return {
    accountId: payload.accountId,
    characterId: payload.characterId,
    worldId: payload.worldId,
    filters: payload.filters,
    page: Math.max(1, Math.min(Number(payload.page) || 1, 100)),
    limit: Math.max(1, Math.min(Number(payload.limit) || 20, 20)),
    sortType: 'PRICE_PER_ITEM_ASC',
    saveRecentKeyword: false,
  };
}

async function runSearchInAuctionPage(payload) {
  const tabs = await chrome.tabs.query({ url: [AUCTION_ORIGIN] });
  
  // 활성 탭 우선, 없으면 가장 최근 탭
  const activeTab = tabs.find((t) => t.active);
  const tab = activeTab || tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  
  if (!tab?.id) {
    throw new Error('메이플 옥션 탭을 열고 로그인한 뒤 다시 시도해주세요. (현재 열린 옥션 탭: 0개)');
  }

  console.log(`🔍 옥션 탭 발견 (ID: ${tab.id}, 제목: ${tab.title})`);

  try {
    // ISOLATED world 사용 (더 안전)
    const execution = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'ISOLATED', // MAIN 대신 ISOLATED 사용
      args: [SEARCH_URL, payload],
      func: async (url, body) => {
        try {
          console.log('🔍 옥션 검색 요청 시작:', body);
          const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          
          const text = await response.text();
          console.log('📦 옥션 API 응답:', response.status, text.slice(0, 200));
          
          if (!response.ok) {
            throw new Error(`경매장 검색 실패 (${response.status}): ${text.slice(0, 200)}`);
          }
          
          return JSON.parse(text);
        } catch (err) {
          console.error('❌ 옥션 검색 에러:', err);
          throw err;
        }
      },
    });

    return execution[0]?.result;
  } catch (err) {
    console.error('❌ executeScript 실패:', err);
    throw new Error(`스크립트 실행 실패: ${err.message}`);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.source !== 'maple-item-recommend' || message?.type !== 'AUCTION_SEARCH') return;

  (async () => {
    const payload = getPayload(message);
    const cacheKey = JSON.stringify(payload);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      resetUsageIfNeeded();
      return { ok: true, data: cached.data, cached: true, remaining: MAX_DAILY_SEARCHES - usage.count };
    }

    resetUsageIfNeeded();
    if (usage.count >= MAX_DAILY_SEARCHES) {
      throw new Error(`오늘의 안전 검색 한도(${MAX_DAILY_SEARCHES}회)에 도달했습니다.`);
    }

    const data = await runSearchInAuctionPage(payload);
    usage.count += 1;
    cache.set(cacheKey, { createdAt: Date.now(), data });
    return { ok: true, data, cached: false, remaining: MAX_DAILY_SEARCHES - usage.count };
  })()
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : '경매장 검색에 실패했습니다.' }));

  return true;
});
