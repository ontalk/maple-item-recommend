// 페이지 컨텍스트에서 실행되는 스크립트 (CSP 제한 없음)
(function() {
  if (window.__mapleAuctionPageScriptInstalled) {
    console.warn('⚠️ Maple Auction page script already installed');
    return;
  }
  window.__mapleAuctionPageScriptInstalled = true;

  const SEARCH_URL = 'https://api.mskr.nexon.com/v1/market/web/items/searches/tool-tip';
  const DEVICE_ID_KEY = 'maple-auction-device-id';
  const DEVICE_ID_PATTERN = /^[a-f0-9]{32}$/i;
  const LAST_KNOWN_OFFICIAL_DEVICE_ID = 'bd262901bfdd472e87f92054eb1edb85';
  const SEARCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // 401/403/426 은 대부분 "이 브라우저의 디바이스 ID가 세션과 맞지 않음"을 뜻한다.
  // 공식 옥션은 ID를 주기적으로 회전시키므로, 거부되면 다른 후보로 한 번 더 시도한다.
  const REJECTED_DEVICE_STATUS = new Set([401, 403, 426]);
  const MAX_DEVICE_CANDIDATES = 5;
  const searchSessions = new Map();

  // 공식 옥션 페이지가 실제로 보낸 x-device-id 를 그대로 관찰해 쓴다.
  // 하드코딩된 값은 Nexon이 디바이스 ID를 회전시키는 순간 거부되기 때문이다.
  let observedDeviceId = '';
  // 우리 확장이 직접 보낸 요청은 관찰 대상에서 제외한다(자기 값으로 오염되지 않도록).
  let internalRequestDepth = 0;

  function officialFetch(input, init) {
    internalRequestDepth += 1;
    try {
      return fetch(input, init);
    } finally {
      internalRequestDepth -= 1;
    }
  }

  function rememberDeviceId(value) {
    const text = String(value ?? '').trim();
    if (!DEVICE_ID_PATTERN.test(text) || text === observedDeviceId) return;
    observedDeviceId = text;
    try {
      window.localStorage.setItem(DEVICE_ID_KEY, text);
    } catch (error) {
      // 저장 실패는 무시한다(관찰값 자체는 메모리에 남는다).
    }
    console.log('🆔 옥션 디바이스 ID 관찰:', text);
  }

  function readHeader(headers, name) {
    if (!headers) return '';
    try {
      if (typeof headers.get === 'function') return headers.get(name) || '';
      if (Array.isArray(headers)) {
        const found = headers.find((entry) => String(entry?.[0] ?? '').toLowerCase() === name);
        return found ? String(found[1] ?? '') : '';
      }
      if (typeof headers === 'object') {
        const entry = Object.entries(headers).find(([key]) => String(key).toLowerCase() === name);
        return entry ? String(entry[1] ?? '') : '';
      }
    } catch (error) {
      // 헤더 형태가 예상과 다르면 조용히 넘어간다.
    }
    return '';
  }

  // 공식 페이지의 요청에서 x-device-id 를 엿본다.
  try {
    const originalFetch = window.fetch;
    if (typeof originalFetch === 'function') {
      window.fetch = function(input, init) {
        try {
          const url = typeof input === 'string' ? input : (input && input.url) || '';
          if (internalRequestDepth === 0 && url.includes('api.mskr.nexon.com')) {
            rememberDeviceId(
              readHeader(init && init.headers, 'x-device-id') ||
              readHeader(input && input.headers, 'x-device-id'),
            );
          }
        } catch (error) {
          // 관찰 실패는 검색 자체를 막지 않는다.
        }
        return originalFetch.apply(this, arguments);
      };
    }

    const originalSetRequestHeader = window.XMLHttpRequest && window.XMLHttpRequest.prototype.setRequestHeader;
    if (typeof originalSetRequestHeader === 'function') {
      window.XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
        try {
          if (String(name).toLowerCase() === 'x-device-id') rememberDeviceId(value);
        } catch (error) {
          // 무시
        }
        return originalSetRequestHeader.apply(this, arguments);
      };
    }
  } catch (error) {
    console.warn('🆔 디바이스 ID 관찰 훅 설치 실패:', error);
  }

  function collectDeviceIds() {
    const ids = [];
    const push = (value) => {
      const text = String(value ?? '').trim();
      if (DEVICE_ID_PATTERN.test(text) && !ids.includes(text) && ids.length < MAX_DEVICE_CANDIDATES) {
        ids.push(text);
      }
    };

    // 1순위: 공식 페이지가 실제로 보낸 값
    push(observedDeviceId);
    // 2순위: 지난번에 성공했던 값
    push(window.localStorage.getItem(DEVICE_ID_KEY));
    // 3순위: 옥션이 localStorage 에 저장해 둔 값들
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key) push(window.localStorage.getItem(key));
    }
    // 4순위: 쿠키에 들어 있는 경우
    for (const part of String(document.cookie || '').split(';')) {
      const separator = part.indexOf('=');
      if (separator >= 0) push(part.slice(separator + 1));
    }
    // 마지막 fallback: 마지막으로 확인된 공식 값
    push(LAST_KNOWN_OFFICIAL_DEVICE_ID);

    return ids.length ? ids : [LAST_KNOWN_OFFICIAL_DEVICE_ID];
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function searchSessionKey(payload) {
    return `${payload.accountId}:${payload.characterId}:${payload.filters?.keyword || ''}`;
  }

  function findSearchId(value) {
    if (typeof value === 'string' && SEARCH_ID_PATTERN.test(value)) return value;
    if (!value || typeof value !== 'object') return null;

    for (const child of Object.values(value)) {
      const found = findSearchId(child);
      if (found) return found;
    }
    return null;
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
        exactMatch: payload.filters?.exactMatch !== false,
        ...(payload.filters?.itemCategory ? { itemCategory: payload.filters.itemCategory } : {}),
        ...(payload.filters?.enhancementOption ? { enhancementOption: payload.filters.enhancementOption } : {}),
        ...(payload.filters?.etcOption ? { etcOption: payload.filters.etcOption } : {}),
      };
      const sessionKey = searchSessionKey(payload);

      const makeRequest = (filters, deviceId) => {
        const page = Number(payload.page || 1);
        const headers = {
          'Accept': 'application/json, text/plain, */*',
          'x-client-version': '1.0.1',
          'x-device-id': deviceId,
          'x-platform': 'PC_WEB',
        };

        // 공식 옥션은 페이지 2부터 POST 검색이 아니라 GET으로 기존 검색 결과를 넘긴다.
        if (page > 1) {
          const searchId = payload.searchId || searchSessions.get(sessionKey);
          if (!searchId) {
            throw new Error('페이지 검색 세션 ID를 찾지 못했습니다. 1페이지 검색부터 다시 실행해주세요.');
          }

          const query = new URLSearchParams({
            accountId: String(payload.accountId),
            page: String(page),
            limit: String(payload.limit || 20),
            sortType: payload.sortType || 'PRICE_PER_ITEM_ASC',
            characterId: String(payload.characterId),
          });
          return officialFetch(`${SEARCH_URL.replace('/searches/tool-tip', `/searches/${searchId}/tool-tip`)}?${query.toString()}`, {
            method: 'GET',
            credentials: 'include',
            headers,
          });
        }

        return officialFetch(SEARCH_URL, {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: payload.accountId,
            characterId: payload.characterId,
            worldId: payload.worldId,
            filters,
            page: 1,
            limit: payload.limit || 20,
            sortType: payload.sortType || 'PRICE_PER_ITEM_ASC',
            saveRecentKeyword: true,
          }),
        });
      };

      // 공식 옥션 웹 요청과 동일하게 검색어/카테고리만 전송한다.
      // 별·잠재 필터는 검색 결과를 받은 뒤 추천 로직에서 처리한다.
      let response;
      let text;
      let usedDeviceId = '';
      const deviceIds = collectDeviceIds();
      const maxRateLimitRetries = 3;

      for (let candidateIndex = 0; candidateIndex < deviceIds.length; candidateIndex += 1) {
        const deviceId = deviceIds[candidateIndex];

        for (let attempt = 0; attempt <= maxRateLimitRetries; attempt += 1) {
          response = await makeRequest(requestFilters, deviceId);
          text = await response.text();
          usedDeviceId = deviceId;

          if (response.status !== 429 || attempt === maxRateLimitRetries) break;

          const retryAfter = Number(response.headers.get('retry-after'));
          const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 15000 * (attempt + 1);
          console.warn(`⏳ 요청 제한(429). ${Math.ceil(waitMs / 1000)}초 후 같은 페이지를 재시도합니다. (${attempt + 1}/${maxRateLimitRetries})`);
          await delay(waitMs);
        }

        if (response.ok) break;
        if (!REJECTED_DEVICE_STATUS.has(response.status)) break;
        if (candidateIndex === deviceIds.length - 1) break;

        console.warn(`⚠️ 디바이스 ID 거부(${response.status}). 다음 후보로 재시도합니다. (${candidateIndex + 1}/${deviceIds.length})`);
      }

      // 성공한 디바이스 ID를 기억해 다음 요청은 한 번에 통과시키다.
      if (response.ok && usedDeviceId) {
        try {
          window.localStorage.setItem(DEVICE_ID_KEY, usedDeviceId);
        } catch (error) {
          // 저장 실패는 무시
        }
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
      if (Number(payload.page || 1) === 1) {
        const location = response.headers.get('location') || '';
        const locationMatch = location.match(SEARCH_ID_PATTERN);
        const searchId = locationMatch?.[0] || findSearchId(data);
        if (searchId) {
          searchSessions.set(sessionKey, searchId);
          console.log(`🧩 검색 세션 ID 저장: ${searchId}`);
        } else {
          console.warn('⚠️ 1페이지 응답에서 검색 세션 ID를 찾지 못했습니다.');
        }
      }
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
