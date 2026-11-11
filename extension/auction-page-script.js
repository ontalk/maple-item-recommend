// 페이지 컨텍스트에서 실행되는 스크립트 (CSP 제한 없음)
//
// 왜 직접 API를 호출하지 않는가:
// api.mskr.nexon.com 의 검색 API 를 확장이 직접 호출하면 Nexon 이 HTTP 426 +
// {"code":6013} 로 응답하고 로그인 세션을 끊어버린다(비정상 클라이언트 차단).
// 그래서 공식 페이지의 검색 UI 를 그대로 조작하고, 그 요청의 응답만 가로채서 쓴다.
// 요청 주체가 공식 페이지이므로 세션이 유지된다.
(function() {
  if (window.__mapleAuctionPageScriptInstalled) {
    console.warn('⚠️ Maple Auction page script already installed');
    return;
  }
  window.__mapleAuctionPageScriptInstalled = true;

  const SEARCH_CAPTURE_TIMEOUT_MS = 15000;
  const SEARCH_BUTTON_FALLBACK_MS = 1200;

  // 공식 페이지가 스스로 보낸 검색 응답을 여기에 보관한다.
  let lastToolTipCapture = null;

  function isToolTipUrl(url) {
    return typeof url === 'string'
      && url.includes('api.mskr.nexon.com')
      && url.includes('tool-tip');
  }

  // 공식 페이지의 fetch 를 가로채 응답 JSON 을 복사해 둔다(페이지 동작은 그대로).
  try {
    const originalFetch = window.fetch;
    if (typeof originalFetch === 'function') {
      window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const result = originalFetch.apply(this, arguments);

        try {
          if (isToolTipUrl(url)) {
            result.then((response) => {
              if (!response || !response.ok) return null;
              return response.clone().json().then((data) => {
                if (data && (Array.isArray(data.items) || typeof data.total === 'number')) {
                  lastToolTipCapture = { at: Date.now(), url, data };
                  console.log(`📦 옥션 응답 가로채기: ${data.total ?? data.items?.length ?? 0}개`);
                }
              }).catch(() => null);
            }).catch(() => null);
          }
        } catch (error) {
          // 가로채기 실패는 페이지 동작에 영향을 주지 않는다.
        }

        return result;
      };
    }
  } catch (error) {
    console.warn('🪝 fetch 가로채기 설치 실패:', error);
  }

  function findSearchInput() {
    return (
      document.querySelector('input[placeholder*="아이템명"]') ||
      document.querySelector('input[placeholder*="아이템"]') ||
      document.querySelector('input[type="search"]')
    );
  }

  function setInputValue(input, value) {
    const descriptor = window.HTMLInputElement
      ? Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
      : null;
    if (descriptor && descriptor.set) descriptor.set.call(input, value);
    else input.value = value;

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function pressEnter(input) {
    const options = {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    };
    input.dispatchEvent(new KeyboardEvent('keydown', options));
    input.dispatchEvent(new KeyboardEvent('keypress', options));
    input.dispatchEvent(new KeyboardEvent('keyup', options));
  }

  function clickSearchButton() {
    const buttons = Array.from(document.querySelectorAll('button'));
    const target = buttons.find((button) => {
      if (button.disabled) return false;
      const label = (button.textContent || '').replace(/\s+/g, '');
      return label.includes('필터검색') || label.includes('빠른검색');
    });
    if (!target) return false;
    target.click();
    return true;
  }

  function waitForCapture(startedAt, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        if (lastToolTipCapture && lastToolTipCapture.at >= startedAt) {
          clearInterval(timer);
          resolve(lastToolTipCapture.data);
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          clearInterval(timer);
          reject(new Error('옥션 화면에서 검색 결과를 받지 못했습니다. 옥션 탭에서 직접 검색이 되는지 확인한 뒤 다시 시도해주세요.'));
        }
      }, 200);
    });
  }

  async function searchThroughOfficialUi(keyword) {
    const input = findSearchInput();
    if (!input) {
      throw new Error('옥션 검색창을 찾지 못했습니다. 옥션 탭을 새로고침한 뒤 다시 시도해주세요.');
    }

    const previousValue = input.value;
    const startedAt = Date.now();
    lastToolTipCapture = null;

    input.focus();
    setInputValue(input, keyword);
    pressEnter(input);

    // Enter 로 시작되지 않는 화면을 위해 잠시 뒤 검색 버튼도 눌러 본다.
    const fallback = window.setTimeout(() => {
      if (!lastToolTipCapture) clickSearchButton();
    }, SEARCH_BUTTON_FALLBACK_MS);

    try {
      const data = await waitForCapture(startedAt, SEARCH_CAPTURE_TIMEOUT_MS);
      return data;
    } finally {
      window.clearTimeout(fallback);
      // 사용자가 보던 검색어를 되돌려 화면을 어지럽히지 않는다.
      try {
        setInputValue(input, previousValue);
      } catch (error) {
        // 되돌리기 실패는 무시
      }
    }
  }

  console.log('🎯 Maple Auction Page Script 활성화됨 (공식 UI 검색 모드)');

  // Content Script로부터 요청 수신
  window.addEventListener('maple-auction-request', async (event) => {
    const { requestId, payload } = event.detail;
    const keyword = payload.filters?.keyword || '';
    console.log('🔍 공식 옥션 UI로 검색 시작:', keyword);

    try {
      if (!keyword) throw new Error('검색어가 비어 있습니다.');

      const data = await searchThroughOfficialUi(keyword);

      // 공식 UI 는 1페이지(20개)만 보여주므로, 앱이 다음 페이지를 요청하지 않도록 알린다.
      const response = {
        ...data,
        page: 1,
        limit: Number(payload.limit || 20),
        totalPages: 1,
        hasNext: false,
      };

      console.log(`✅ 검색 성공: ${response.total ?? response.items?.length ?? 0}개 (${keyword})`);
      window.dispatchEvent(new CustomEvent('maple-auction-response', {
        detail: { requestId, result: { ok: true, data: response } },
      }));
    } catch (err) {
      console.error(`❌ 옥션 UI 검색 실패 (${keyword}):`, err);
      window.dispatchEvent(new CustomEvent('maple-auction-response', {
        detail: {
          requestId,
          result: { ok: false, error: err instanceof Error ? err.message : String(err) },
        },
      }));
    }
  });

  console.log('✅ Maple Auction Page Script 준비 완료');
})();
