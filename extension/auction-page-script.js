// 페이지 컨텍스트에서 실행되는 스크립트 (CSP 제한 없음)
(function() {
  if (window.__mapleAuctionPageScriptInstalled) {
    console.warn('⚠️ Maple Auction page script already installed');
    return;
  }
  window.__mapleAuctionPageScriptInstalled = true;

  const SEARCH_URL = 'https://api.mskr.nexon.com/v1/market/web/items/searches/tool-tip';
  const DEVICE_ID_KEY = 'maple-auction-device-id';

  function getDeviceId() {
    const stored = window.localStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;

    const deviceId = crypto.randomUUID().replaceAll('-', '');
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  console.log('🎯 Maple Auction Page Script 활성화됨 (페이지 컨텍스트)');

  // Content Script로부터 요청 수신
  window.addEventListener('maple-auction-request', async (event) => {
    const { requestId, payload } = event.detail;
    console.log('🔍 페이지 컨텍스트에서 옥션 검색 시작:', payload.filters.keyword);
    
    try {
      // 현재 공식 옥션 요청의 기본 Payload와 동일하게 검색어만 전송한다.
      const requestFilters = {
        keyword: payload.filters?.keyword || '',
      };

      const makeRequest = (filters) => fetch(SEARCH_URL, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'x-client-version': '1.0.1',
          'x-device-id': getDeviceId(),
          'x-platform': 'PC_WEB',
        },
        body: JSON.stringify({
          accountId: payload.accountId,
          characterId: payload.characterId,
          worldId: payload.worldId,
          filters,
          page: payload.page || 1,
          limit: payload.limit || 20,
          sortType: payload.sortType || 'PRICE_PER_ITEM_ASC',
          saveRecentKeyword: true,
        }),
      });

      // 공식 옥션 웹 요청과 동일하게 검색어/카테고리만 전송한다.
      // 별·잠재 필터는 검색 결과를 받은 뒤 추천 로직에서 처리한다.
      let response;
      let text;
      const maxRateLimitRetries = 3;

      for (let attempt = 0; attempt <= maxRateLimitRetries; attempt += 1) {
        response = await makeRequest(requestFilters);
        text = await response.text();

        if (response.status !== 429 || attempt === maxRateLimitRetries) break;

        const retryAfter = Number(response.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 15000 * (attempt + 1);
        console.warn(`⏳ 요청 제한(429). ${Math.ceil(waitMs / 1000)}초 후 같은 페이지를 재시도합니다. (${attempt + 1}/${maxRateLimitRetries})`);
        await delay(waitMs);
      }

      console.log(`📦 옥션 API 응답: ${response.status} (${payload.filters.keyword})`);
      
      if (!response.ok) {
        const preview = text.slice(0, 200);
        console.error(`❌ 응답 실패 (${response.status}):`, preview);

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const waitMessage = retryAfter ? `${retryAfter}초 후` : '잠시 후';
          window.dispatchEvent(new CustomEvent('maple-auction-response', {
            detail: {
              requestId,
              result: { ok: false, error: `옥션 요청이 너무 많습니다(429). ${waitMessage} 다시 시도해주세요.` }
            }
          }));
          return;
        }
        
        // 응답 전송
        window.dispatchEvent(new CustomEvent('maple-auction-response', {
          detail: {
            requestId,
            result: { ok: false, error: `경매장 검색 실패 (${response.status}): ${preview}` }
          }
        }));
        return;
      }
      
      const data = JSON.parse(text);
      console.log(`✅ 검색 성공: ${data.total || 0}개 아이템 (${payload.filters.keyword})`);
      
      // 응답 전송
      window.dispatchEvent(new CustomEvent('maple-auction-response', {
        detail: {
          requestId,
          result: { ok: true, data }
        }
      }));
    } catch (err) {
      console.error(`❌ 옥션 검색 에러 (${payload.filters.keyword}):`, err);
      
      // 응답 전송
      window.dispatchEvent(new CustomEvent('maple-auction-response', {
        detail: {
          requestId,
          result: { ok: false, error: err.message }
        }
      }));
    }
  });

  console.log('✅ Maple Auction Page Script 준비 완료');
})();
