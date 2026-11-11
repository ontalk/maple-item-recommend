// 페이지 컨텍스트에서 실행되는 스크립트 (CSP 제한 없음)
//
// 왜 직접 API를 호출하지 않는가:
// 검색 API 를 확장이 직접 호출하면 Nexon 이 HTTP 426 + {"code":6013} 로 응답하고
// 로그인 세션을 끊어버린다(비정상 클라이언트 차단). 그래서 공식 페이지의 검색 UI 를
// 조작하고, 그 요청의 응답만 가로채서 쓴다. 다음 페이지는 공식 페이저를 누르거나
// URL 의 page 파라미터로 이동한다.
(function() {
  if (window.__mapleAuctionPageScriptInstalled) {
    console.warn('⚠️ Maple Auction page script already installed');
    return;
  }
  window.__mapleAuctionPageScriptInstalled = true;

  const PAGE_LIMIT = 20;
  const SEARCH_CAPTURE_TIMEOUT_MS = 9000;
  const PAGE_CAPTURE_TIMEOUT_MS = 7000;
  const SEARCH_BUTTON_FALLBACK_MS = 1200;

  let lastToolTipCapture = null;
  let uiState = { keyword: '', page: 0, totalPages: 0 };

  function StopPaging(message) {
    this.message = message;
  }

  function resolveUrl(input) {
    try {
      const raw = typeof input === 'string' ? input : (input && input.url) || '';
      if (!raw) return '';
      return new URL(raw, window.location.href).href;
    } catch (error) {
      return '';
    }
  }

  // 호스트가 아니라 경로로 판별한다(상대경로 · 프록시 · XHR 모두 대응).
  function isToolTipUrl(url) {
    if (!url) return false;
    return url.includes('tool-tip') && url.includes('/searches');
  }

  function rememberCapture(url, data) {
    if (!data) return;
    const hasItems = Array.isArray(data.items);
    const hasTotal = typeof data.total === 'number';
    if (!hasItems && !hasTotal) return;
    lastToolTipCapture = { at: Date.now(), url, data };
    console.log(`📦 옥션 응답 가로채기: ${data.total ?? data.items?.length ?? 0}개`, url.slice(0, 90));
  }

  // 1) fetch 가로채기
  try {
    const originalFetch = window.fetch;
    if (typeof originalFetch === 'function') {
      window.fetch = function(input, init) {
        const url = resolveUrl(input);
        const result = originalFetch.apply(this, arguments);

        try {
          if (isToolTipUrl(url)) {
            result.then((response) => {
              if (!response || !response.ok) {
                console.warn('⚠️ 옥션 응답 실패:', response && response.status, url.slice(0, 90));
                return null;
              }
              return response.clone().json()
                .then((data) => rememberCapture(url, data))
                .catch(() => null);
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

  // 2) XHR 가로채기 (페이지가 axios/XHR 을 쓰는 경우)
  try {
    const OriginalXHR = window.XMLHttpRequest;
    if (OriginalXHR && OriginalXHR.prototype) {
      const originalOpen = OriginalXHR.prototype.open;
      const originalSend = OriginalXHR.prototype.send;

      OriginalXHR.prototype.open = function(method, url) {
        try {
          this.__mapleUrl = resolveUrl(url);
        } catch (error) {
          this.__mapleUrl = '';
        }
        return originalOpen.apply(this, arguments);
      };

      OriginalXHR.prototype.send = function() {
        try {
          if (isToolTipUrl(this.__mapleUrl)) {
            this.addEventListener('load', () => {
              try {
                const text = this.responseType === '' || this.responseType === 'text'
                  ? this.responseText
                  : JSON.stringify(this.response);
                if (!text) return;
                rememberCapture(this.__mapleUrl, JSON.parse(text));
              } catch (error) {
                // 파싱 실패는 무시
              }
            });
          }
        } catch (error) {
          // 무시
        }
        return originalSend.apply(this, arguments);
      };
    }
  } catch (error) {
    console.warn('🪝 XHR 가로채기 설치 실패:', error);
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

  function labelOf(element) {
    return [
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.textContent,
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  function findNextPageButton() {
    const scoped = Array.from(document.querySelectorAll(
      '[class*="pagination"], [class*="paging"], [class*="pageNum"], [class*="page-num"], [class*="pager"], nav',
    )).flatMap((scope) => Array.from(scope.querySelectorAll('button, a, [role="button"]')));

    const global = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    const candidates = Array.from(new Set([...scoped, ...global]));

    return candidates.find((element) => {
      if (element.disabled) return false;
      if (element.getAttribute('aria-disabled') === 'true') return false;
      const label = labelOf(element);
      if (!label || label.length > 24) return false;

      const compact = label.replace(/\s+/g, '');
      if (['>', '›', '→', '⟩', '»', '▶'].includes(compact)) return true;
      return /^다음(페이지)?$|^next$/i.test(compact) || /다음페이지|nextpage/i.test(compact);
    });
  }

  function clickNextPage() {
    const target = findNextPageButton();
    if (!target) return false;
    console.log('➡️ 옥션 다음 페이지 버튼 클릭:', labelOf(target) || target.tagName);
    target.click();
    return true;
  }

  function goToPageViaUrl(page) {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('page') && !url.searchParams.has('keyword')) return false;
      url.searchParams.set('page', String(page));
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      console.log('🧭 URL page 파라미터로 이동 시도:', page);
      return true;
    } catch (error) {
      return false;
    }
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

    const fallback = window.setTimeout(() => {
      if (!lastToolTipCapture) clickSearchButton();
    }, SEARCH_BUTTON_FALLBACK_MS);

    try {
      let data;
      try {
        data = await waitForCapture(startedAt, SEARCH_CAPTURE_TIMEOUT_MS);
      } catch (error) {
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

  async function searchNextPage() {
    const nextPage = uiState.page + 1;
    lastToolTipCapture = null;
    const startedAt = Date.now();

    let triggered = clickNextPage();
    if (!triggered) triggered = goToPageViaUrl(nextPage);
    if (!triggered) throw new StopPaging('옥션 다음 페이지 버튼을 찾지 못했습니다.');

    let data = await waitForCapture(startedAt, PAGE_CAPTURE_TIMEOUT_MS).catch(() => null);

    if (!data) {
      lastToolTipCapture = null;
      const retryAt = Date.now();
      if (goToPageViaUrl(nextPage)) {
        data = await waitForCapture(retryAt, PAGE_CAPTURE_TIMEOUT_MS).catch(() => null);
      }
    }

    if (!data) throw new StopPaging('옥션 다음 페이지 응답을 받지 못했습니다.');

    const normalized = normalizePage(data, nextPage);
    uiState = { ...uiState, page: nextPage, totalPages: normalized.totalPages };
    console.log(`📄 옥션 ${nextPage}/${normalized.totalPages} 페이지 확보`);
    return normalized;
  }

  async function searchThroughOfficialUi(keyword, targetPage) {
    const wantPage = Math.max(1, Number(targetPage) || 1);

    const isSameSearch = uiState.keyword === keyword && uiState.page > 0;
    const canStepForward = isSameSearch && wantPage > uiState.page;

    if (!canStepForward) {
      const first = await searchFirstPage(keyword);
      if (wantPage === 1) return first;
    }

    try {
      while (uiState.page < wantPage) {
        await searchNextPage();
      }
    } catch (error) {
      if (error instanceof StopPaging) {
        console.warn('⚠️ 다음 페이지를 받지 못해 여기서 마무리합니다:', error.message);
        if (lastToolTipCapture) {
          const normalized = normalizePage(lastToolTipCapture.data, uiState.page);
          return { ...normalized, totalPages: uiState.page, hasNext: false };
        }
      }
      throw error;
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
