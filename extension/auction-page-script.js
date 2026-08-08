// 페이지 컨텍스트에서 실행되는 스크립트 (CSP 제한 없음)
(function() {
  const SEARCH_URL = 'https://api.mskr.nexon.com/v1/market/web/items/searches/tool-tip';
  const DEVICE_ID_KEY = 'maple-auction-device-id';

  function getDeviceId() {
    const stored = window.localStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;

    const deviceId = crypto.randomUUID().replaceAll('-', '');
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  }

  console.log('🎯 Maple Auction Page Script 활성화됨 (페이지 컨텍스트)');

  // Content Script로부터 요청 수신
  window.addEventListener('maple-auction-request', async (event) => {
    const { requestId, payload } = event.detail;
    console.log('🔍 페이지 컨텍스트에서 옥션 검색 시작:', payload.filters.keyword);
    
    try {
      const requestFilters = {
        keyword: payload.filters?.keyword || '',
        ...(payload.filters?.itemCategory ? { itemCategory: payload.filters.itemCategory } : {}),
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
          saveRecentKeyword: false,
        }),
      });

      // 공식 옥션 웹 요청과 동일하게 검색어/카테고리만 전송한다.
      // 별·잠재 필터는 검색 결과를 받은 뒤 추천 로직에서 처리한다.
      let response = await makeRequest(requestFilters);
      
      let text = await response.text();

      // 일부 장비는 ARMOR 카테고리와 함께 검색하면 4006을 반환한다.
      // 해당 아이템에 한해 카테고리를 제거하고 딱 한 번 재시도한다.
      if (response.status === 400 && text.includes('4006') && requestFilters.itemCategory) {
        console.warn(`⚠️ ${payload.filters.keyword}: 카테고리 없이 재검색합니다.`);
        response = await makeRequest({ keyword: requestFilters.keyword });
        text = await response.text();
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
