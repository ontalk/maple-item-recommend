// Background Service Worker: 메시지 라우팅
console.log('🎯 Maple Auction Background Service Worker 시작');

const AUCTION_ORIGIN = 'https://auction.maplestory.nexon.com/*';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6시간
const MAX_DAILY_SEARCHES = 100;

const cache = new Map();
const inFlight = new Map();
let usage = { day: '', count: 0 };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function resetUsageIfNeeded() {
  if (usage.day !== today()) {
    usage = { day: today(), count: 0 };
  }
}

// 옥션 탭 찾기
async function findAuctionTab() {
  const tabs = await chrome.tabs.query({ url: [AUCTION_ORIGIN] });
  console.log(`🔍 옥션 탭 검색: ${tabs.length}개 발견`);
  
  // 활성 탭 우선, 없으면 가장 최근 탭
  const activeTab = tabs.find((t) => t.active);
  const tab = activeTab || tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  
  if (!tab?.id) {
    throw new Error('메이플 옥션 탭을 열고 로그인한 뒤 다시 시도해주세요. (현재 열린 옥션 탭: 0개)');
  }
  
  console.log(`✅ 옥션 탭 선택: ID=${tab.id}, title=${tab.title}`);
  return tab;
}

async function ensureAuctionContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['auction-injector.js'],
    });
    console.log(`✅ 옥션 인젝터 확인/주입 완료: 탭 ${tabId}`);
  } catch (error) {
    console.error('❌ 옥션 인젝터 주입 실패:', error);
    throw new Error('옥션 탭에 확장 프로그램을 연결하지 못했습니다. 옥션 탭을 새로고침해주세요.');
  }
}

// 옥션 검색 실행
async function searchAuction(payload) {
  const tab = await findAuctionTab();
  await ensureAuctionContentScript(tab.id);
  
  console.log(`📤 검색 요청 전송: ${payload.filters?.keyword} (페이지: ${payload.page || 1})`);
  
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, {
      source: 'maple-item-recommend',
      type: 'AUCTION_SEARCH',
      payload,
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(`❌ 메시지 전송 실패:`, chrome.runtime.lastError);
        reject(new Error(`옥션 탭 통신 실패: ${chrome.runtime.lastError.message}`));
        return;
      }
      
      if (!response) {
        console.error(`❌ 응답 없음`);
        reject(new Error('옥션 탭에서 응답이 없습니다. 페이지를 새로고침해주세요.'));
        return;
      }
      
      if (!response.ok) {
        console.error(`❌ 검색 실패:`, response.error);
        reject(new Error(response.error));
        return;
      }
      
      console.log(`✅ 검색 성공: ${response.data?.total || 0}개 아이템`);
      resolve(response.data);
    });
  });
}

// 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.source !== 'maple-item-recommend' || message?.type !== 'AUCTION_SEARCH') {
    return;
  }
  
  (async () => {
    const page = Number(message.payload?.page || 1);
    const isNewSearch = page === 1;
    const cacheKey = JSON.stringify(message.payload);

    // 캐시 확인
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      resetUsageIfNeeded();
      console.log('📦 캐시에서 데이터 반환');
      return { ok: true, data: cached.data, cached: true, remaining: MAX_DAILY_SEARCHES - usage.count };
    }

    // 같은 검색어·페이지 요청이 동시에 들어오면 API 요청을 하나로 합친다.
    // 중복 브리지/리스너가 있어도 검색 횟수가 중복 차감되지 않도록 한다.
    const existingRequest = inFlight.get(cacheKey);
    if (existingRequest) {
      console.log('🔁 중복 요청 병합:', message.payload.filters?.keyword, `(페이지: ${page})`);
      const shared = await existingRequest;
      return { ...shared, cached: true };
    }

    const requestPromise = (async () => {
      // 공식 옥션은 같은 검색어의 페이지 이동을 검색 횟수로 차감하지 않는다.
      // 따라서 최초 검색(page 1)만 일일 검색 한도를 확인한다.
      resetUsageIfNeeded();
      if (isNewSearch && usage.count >= MAX_DAILY_SEARCHES) {
        throw new Error(`오늘의 안전 검색 한도(${MAX_DAILY_SEARCHES}회)에 도달했습니다.`);
      }

      const data = await searchAuction(message.payload);

      // 페이지별 결과는 각각 캐시하지만, 검색 횟수는 최초 페이지에서만 차감한다.
      if (isNewSearch) {
        usage.count += 1;
      }
      cache.set(cacheKey, { createdAt: Date.now(), data });

      return { ok: true, data, cached: false, remaining: MAX_DAILY_SEARCHES - usage.count };
    })();

    inFlight.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      inFlight.delete(cacheKey);
    }
  })()
    .then(sendResponse)
    .catch((error) => {
      console.error('❌ 검색 에러:', error);
      sendResponse({ 
        ok: false, 
        error: error instanceof Error ? error.message : '경매장 검색에 실패했습니다.' 
      });
    });
  
  return true; // 비동기 응답
});

console.log('✅ Maple Auction Background Service Worker 준비 완료');
