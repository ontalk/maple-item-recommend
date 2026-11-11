// 페이지 컨텍스트에서 실행되는 스크립트 (CSP 제한 없음)
//
// 왜 직접 API를 호출하지 않는가:
// api.mskr.nexon.com 의 검색 API 를 확장이 직접 호출하면 Nexon 이 HTTP 426 +
// {"code":6013} 로 응답하고 로그인 세션을 끊어버린다(비정상 클라이언트 차단).
// 그래서 공식 페이지의 검색 UI 를 그대로 조작하고, 그 요청의 응답만 가로채서 쓴다.
// 페이지 2 이상도 공식 페이저 버튼을 눌러 이동하므로 전 페이지를 모을 수 있다.
(function() {
  if (window.__mapleAuctionPageScriptInstalled) {
    console.warn('⚠️ Maple Auction page script already installed');
    return;
  }
  window.__mapleAuctionPageScriptInstalled = true;

  const PAGE_LIMIT = 20;
  const SEARCH_CAPTURE_TIMEOUT_MS = 9000;
  const PAGE_CAPTURE_TIMEOUT_MS = 8000;
  const SEARCH_BUTTON_FALLBACK_MS = 1200;

  // 공식 페이지가 스스로 보낸 검색 응답을 여기에 보관한다.
  let lastToolTipCapture = null;
  // 현재 공식 화면이 어떤 검색어의 몇 페이지를 보여주고 있는지.
  let uiState = { keyword: '', page: 0, totalPages: 0 };

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
      return label.includes('필터검색') || label.includes('빠른검색') || label === '검색';
    });
    if (!target) return false;
    target.click();
    return true;
  }

  /** 공식 페이저의 다음 페이지 버튼을 찾아 누른다. */
  function clickNextPage() {
    const candidates = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    const target = candidates.find((element) => {
      if (element.disabled) return false;
      const label = [
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.textContent,
      ].filter(Boolean).join(' ').trim();
      if (!label) return false;
      const compact = label.replace(/\s+/g, '');
      if (compact === '>' || compact === '›' || compact === '→') return true;
      return /다음\s*페이지|다음페이지|next\s*page/i.test(label);
    });

    if (!target) return false;
    target.click();
    return true;
  }

  function waitForCapture(startedAt, timeoutMs, hint) {
    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        if (lastToolTipCapture && lastToolTipCapture.at >= startedAt) {
          clearInterval(timer);
          resolve(lastToolTipCapture.data);
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          clearInterval(timer);
          reject(new Error(hint || '옥션 화면에서 검색 결과를 받지 못했습니다. 옥션 탭에서 직접 검색이 되는지 확인한 뒤 다시 시도해주세요.'));
        }
      }, 200);
    });
  }

  function normalizePage(data, page) {
    const items = Array.isArray(data.items) ? data.items : [];
    const limit = Number(data.limit) || PAGE_LIMIT;
    const total = Number(data.total);
    const safeTotal = Number.isFinite(total) && total >= 0 ? total : items.length;
    const totalPages = Math.max(1, Math.ceil(safeTotal / limit));

    return {
      ...data,
      items,
      page,
      limit,
      total: safeTotal,
      totalPages,
      hasNext: page < totalPages,
    };
  }

  /** 검색어를 처음부터 검색해 1페이지를 받는다. */
  async function searchFirstPage(keyword) {
    const input = findSearchInput();
    if (!input) {
      throw new Error('옥션 검색창을 찾지 못했습니다. 옥션 탭을 새로고침한 뒤 다시 시도해주세요.');
    }

    const previousValue = input.value;
    lastToolTipCapture = null;
    uiState = { keyword: '', page: 0, totalPages: 0 };

    const startedAt = Date.now();
    input.focus();
    setInputValue(input, keyword);
    pressEnter(input);

    // Enter 로 검색되지 않는 화면을 위해 잠시 뒤 검색 버튼도 눌러 본다.
    const fallback = window.setTimeout(() => {
      if (!lastToolTipCapture) clickSearchButton();
    }, SEARCH_BUTTON_FALLBACK_MS);

    try {
      let data;
      try {
        data = await waitForCapture(startedAt, SEARCH_CAPTURE_TIMEOUT_MS);
      } catch (error) {
        // 한 번 더 시도: 입력값을 다시 넣고 검색 버튼을 눌러 본다.
        console.warn('🔁 첫 검색 응답이 없어 재시도합니다:', keyword);
        lastToolTipCapture = null;
        const retryAt = Date.now();
        setInputValue(input, keyword);
        if (!clickSearchButton()) pressEnter(input);
        data = await waitForCapture(retryAt, SEARCH_CAPTURE_TIMEOUT_MS);
      }

      const normalized = normalizePage(data, 1);
      uiState = { keyword, page: 1, totalPages: normalized.totalPages };
      return normalized;
    } finally {
      window.clearTimeout(fallback);
      try {
        setInputValue(input, previousValue);
      } catch (error) {
        // 되돌리기 실패는 무시
      }
    }
  }

  /** 공식 페이저를 눌러 다음 페이지로 이동한다. */
  async function searchNextPage() {
    lastToolTipCapture = null;
    const startedAt = Date.now();

    if (!clickNextPage()) {
      throw new Error('옥션 다음 페이지 버튼을 찾지 못했습니다. 옥션 탭에서 직접 다음 페이지로 넘어가는지 확인해주세요.');
    }

    const data = await waitForCapture(startedAt, PAGE_CAPTURE_TIMEOUT_MS, '옥션 다음 페이지 응답을 받지 못했습니다.');
    const nextPage = uiState.page + 1;
    const normalized = normalizePage(data, nextPage);
    uiState = { ...uiState, page: nextPage, totalPages: normalized.totalPages };
    return normalized;
  }

  async function searchThroughOfficialUi(keyword, targetPage) {
    const wantPage = Math.max(1, Number(targetPage) || 1);

    // 다른 검색어이거나 이미 지나온 페이지를 다시 요청하면 1페이지부터 새로 한다.
    const isSameSearch = uiState.keyword === keyword && uiState.page > 0;
    const canStepForward = isSameSearch && wantPage > uiState.page;

    if (!canStepForward) {
      const first = await searchFirstPage(keyword);
      if (wantPage === 1) return first;
    }

    while (uiState.page < wantPage) {
      await searchNextPage();
    }

    if (!lastToolTipCapture) {
      throw new Error('옥션 페이지 응답이 없습니다. 다시 시도해주세요.');
    }
    return normalizePage(lastToolTipCapture.data, uiState.page);
  }

  console.log('🎯 Maple Auction Page Script 활성화됨 (공식 UI 검색 모드)');

  window.addEventListener('maple-auction-request', async (event) => {
    const { requestId, payload } = event.detail;
    const keyword = payload.filters?.keyword || '';
    const page = Number(payload.page || 1);
    console.log('🔍 공식 옥션 UI로 검색 시작:', keyword, `(페이지 ${page})`);

    try {
      if (!keyword) throw new Error('검색어가 비어 있습니다.');

      const data = await searchThroughOfficialUi(keyword, page);
      console.log(`✅ 검색 성공: ${data.total}개 중 ${data.items.length}개 (${keyword}, ${data.page}/${data.totalPages}p)`);

      window.dispatchEvent(new CustomEvent('maple-auction-response', {
        detail: { requestId, result: { ok: true, data } },
      }));
    } catch (err) {
      console.error(`❌ 옥션 UI 검색 실패 (${keyword} p${page}):`, err);
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
