export interface AuctionProfile {
  accountId: number;
  characterId: number;
  worldId: number;
}

export interface AuctionSearchFilters {
  keyword: string;
  itemCategory?: { itemDetailCategory: 'ARMOR' };
  enhancementOption?: {
    starforceMin?: number;
    starforceMax?: number;
    potentialGrade?: number;
    additionalPotentialGrade?: number;
  };
}

export interface AuctionSearchResponse {
  items: AuctionRawItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

export interface AuctionRawItem {
  itemName: string;
  price: string;
  pricePerItem: string;
  quantity: number;
  starforce: number;
  attackPowerDiff?: number;
  itemIcon?: { fallBackUrl?: string };
  toolTip?: { upgradeInfo?: { potential?: { description?: string }; additionalPotential?: { description?: string } } };
}

export interface AuctionSearchResult {
  data: AuctionSearchResponse;
  cached: boolean;
  remaining: number;
}

export function searchAuction(profile: AuctionProfile, filters: AuctionSearchFilters): Promise<AuctionSearchResult> {
  if (typeof window === 'undefined') return Promise.reject(new Error('브라우저에서만 경매장을 조회할 수 있습니다.'));

  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('경매장 연결 확장 프로그램 응답 시간이 초과되었습니다. 설치 및 옥션 로그인 상태를 확인해주세요.'));
    }, 30000);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.data?.source !== 'maple-item-recommend-extension' || event.data?.type !== 'AUCTION_SEARCH_RESULT' || event.data?.requestId !== requestId) return;
      cleanup();
      if (!event.data.ok) reject(new Error(event.data.error || '경매장 검색에 실패했습니다.'));
      else resolve({ data: event.data.data, cached: Boolean(event.data.cached), remaining: Number(event.data.remaining) });
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
    };

    window.addEventListener('message', onMessage);
    window.postMessage({
      source: 'maple-item-recommend',
      type: 'AUCTION_SEARCH',
      requestId,
      payload: { ...profile, filters, page: 1, limit: 20 },
    }, window.location.origin);
  });
}
