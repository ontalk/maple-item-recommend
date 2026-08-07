const AUCTION_ORIGIN = 'https://auction.maplestory.nexon.com/*';
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
  
  console.log(`🔍 옥션 탭 검색 결과: ${tabs.length}개 발견`);
  tabs.forEach((t, i) => console.log(`  탭 ${i + 1}: ID=${t.id}, active=${t.active}, title=${t.title}`));
  
  // 활성 탭 우선, 없으면 가장 최근 탭
  const activeTab = tabs.find((t) => t.active);
  const tab = activeTab || tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  
  if (!tab?.id) {
    throw new Error('메이플 옥션 탭을 열고 로그인한 뒤 다시 시도해주세요. (현재 열린 옥션 탭: 0개)');
  }

  console.log(`✅ 선택된 옥션 탭: ID=${tab.id}, active=${tab.active}, title=${tab.title}`);
  console.log(`📤 검색 요청 전송: ${payload.filters.keyword}`);

  // executeScript 대신 메시지 전송 (content script가 처리)
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, {
      source: 'maple-item-recommend',
      type: 'AUCTION_SEARCH',
      payload,
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(`❌ 메시지 전송 실패 (${payload.filters.keyword}):`, chrome.runtime.lastError);
        reject(new Error(`옥션 탭 통신 실패: ${chrome.runtime.lastError.message}`));
        return;
      }

      if (!response) {
        console.error(`❌ 응답 없음 (${payload.filters.keyword})`);
        reject(new Error('옥션 탭에서 응답이 없습니다. 페이지를 새로고침해주세요.'));
        return;
      }

      if (!response.ok) {
        console.error(`❌ 검색 실패 (${payload.filters.keyword}):`, response.error);
        reject(new Error(response.error));
        return;
      }

      console.log(`✅ 검색 성공: ${payload.filters.keyword}`, response.data ? `${response.data.total || 0}개 아이템` : 'data 없음');
      resolve(response.data);
    });
  });
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
