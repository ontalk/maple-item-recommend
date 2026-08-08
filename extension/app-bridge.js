window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.source !== 'maple-item-recommend' || event.data?.type !== 'AUCTION_SEARCH') return;

  const runtime = globalThis.chrome?.runtime;

  if (!runtime?.sendMessage) {
    window.postMessage({
      source: 'maple-item-recommend-extension',
      type: 'AUCTION_SEARCH_RESULT',
      requestId: event.data.requestId,
      ok: false,
      error: '확장 프로그램 브리지가 활성화되지 않았습니다. chrome://extensions에서 확장 프로그램을 새로고침한 뒤 이 페이지도 새로고침해주세요.',
    }, window.location.origin);
    return;
  }

  runtime.sendMessage(event.data, (response) => {
    const error = runtime.lastError?.message;
    window.postMessage({
      source: 'maple-item-recommend-extension',
      type: 'AUCTION_SEARCH_RESULT',
      requestId: event.data.requestId,
      ...(error ? { ok: false, error: error } : response),
    }, window.location.origin);
  });
});
