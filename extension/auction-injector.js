// 옥션 페이지에 주입되어 검색 요청을 처리하는 스크립트
// CSP 우회: CustomEvent를 사용한 통신

if (globalThis.__mapleAuctionInjectorInstalled) {
  console.warn('⚠️ Maple Auction injector already installed');
} else {
globalThis.__mapleAuctionInjectorInstalled = true;

console.log('🎯 Maple Auction Injector 로딩 중...');

// 페이지 컨텍스트에서 실행될 함수를 window.eval 없이 주입
const scriptSrc = chrome.runtime.getURL('auction-page-script.js');
const script = document.createElement('script');
script.src = scriptSrc;
script.onload = function() {
  console.log('✅ 페이지 스크립트 로드 완료');
  this.remove();
};
script.onerror = function() {
  console.error('❌ 페이지 스크립트 로드 실패');
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Content Script: background와 페이지 사이의 브릿지 역할
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content Script에서 메시지 수신:', message);

  if (message?.source !== 'maple-item-recommend' || message?.type !== 'AUCTION_SEARCH') {
    return;
  }

  const payload = message.payload;
  console.log('🔍 페이지로 검색 요청 전달:', payload.filters.keyword);

  // 응답 대기
  const requestId = crypto.randomUUID();
  let responded = false;
  let timeoutId;
  
  const handleResponse = (event) => {
    if (responded || event.detail?.requestId !== requestId) return;
    
    console.log('✅ 페이지로부터 응답 수신:', event.detail);
    responded = true;
    clearTimeout(timeoutId);
    window.removeEventListener('maple-auction-response', handleResponse);
    sendResponse(event.detail.result);
  };
  
  window.addEventListener('maple-auction-response', handleResponse);
  
  // 타임아웃 설정
  timeoutId = setTimeout(() => {
    if (responded) return;
    responded = true;
    window.removeEventListener('maple-auction-response', handleResponse);
    sendResponse({ ok: false, error: '옥션 검색 시간 초과' });
  }, 120000);
  
  // 페이지로 요청 전달
  window.dispatchEvent(new CustomEvent('maple-auction-request', {
    detail: { requestId, payload }
  }));

  return true; // 비동기 응답
});

console.log('✅ Maple Auction Injector 준비 완료');
}
