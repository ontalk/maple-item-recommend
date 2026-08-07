window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.source !== 'maple-item-recommend' || event.data?.type !== 'AUCTION_SEARCH') return;

  chrome.runtime.sendMessage(event.data, (response) => {
    const error = chrome.runtime.lastError?.message;
    window.postMessage({
      source: 'maple-item-recommend-extension',
      type: 'AUCTION_SEARCH_RESULT',
      requestId: event.data.requestId,
      ...(error ? { ok: false, error: error } : response),
    }, window.location.origin);
  });
});
