export interface AuctionProfile {
  accountId: number;
  characterId: number;
  worldId: number;
}

export interface AuctionSearchFilters {
  keyword: string;
  page?: number;
  limit?: number;
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
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('브라우저에서만 경매장을 조회할 수 있습니다.'));
  }

  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    let messageHandled = false;

    const timeout = window.setTimeout(() => {
      if (messageHandled) return;
      messageHandled = true;
      cleanup();
      reject(new Error('경매장 확장 프로그램 응답 시간 초과 (30초). Extension 설치 및 옥션 로그인 상태를 확인해주세요.'));
    }, 30000);

    const onRuntimeMessage = (response: any) => {
      if (messageHandled) return;
      messageHandled = true;
      cleanup();

      if (!response?.ok) {
        reject(new Error(response?.error || '경매장 검색에 실패했습니다.'));
        return;
      }
      
      resolve({ 
        data: response.data, 
        cached: Boolean(response.cached), 
        remaining: Number(response.remaining) 
      });
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
    };

    // Chrome Extension으로 메시지 전송
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage(
          {
            source: 'maple-item-recommend',
            type: 'AUCTION_SEARCH',
            requestId,
            payload: { 
              ...profile, 
              filters, 
              page: filters.page || 1, 
              limit: filters.limit || 20 
            },
          },
          (response) => {
            if (messageHandled) return;
            
            if (chrome.runtime.lastError) {
              messageHandled = true;
              cleanup();
              reject(new Error(`Extension 통신 실패: ${chrome.runtime.lastError.message}`));
              return;
            }
            
            onRuntimeMessage(response);
          }
        );
      } else {
        messageHandled = true;
        cleanup();
        reject(new Error('Chrome Extension이 설치되지 않았습니다. Extension을 설치하고 옥션에 로그인해주세요.'));
      }
    } catch (err) {
      messageHandled = true;
      cleanup();
      reject(new Error('Extension 연결 중 에러가 발생했습니다: ' + (err instanceof Error ? err.message : String(err))));
    }
  });
}
