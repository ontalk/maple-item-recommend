import type { AuctionProfile } from './auction-extension';

/** 옥션 연결 정보를 브라우저에 저장하는 키. 계획기와 옥션 검색이 함께 쓴다. */
export const AUCTION_PROFILE_KEY = 'maple-combo-auction-profile';

/**
 * 옥션 API는 worldId로 서버를 구분한다. 이름을 확인한 월드만 적어 두고,
 * 모르는 월드는 숫자만 그대로 보여 준다.
 */
export const WORLD_ID_BY_NAME: Record<string, number> = {
  스카니아: 5,
  크로아: 8,
};

/** 입력칸을 비워 두지 않도록 넣어 둔 기본값. 화면에서 언제든 바꿀 수 있다. */
export const DEFAULT_AUCTION_PROFILE: AuctionProfile = {
  accountId: 108912176,
  characterId: 29662388,
  worldId: worldIdForName('크로아') ?? 8,
};

export function worldIdForName(name?: string | null): number | null {
  if (!name) return null;
  return WORLD_ID_BY_NAME[name] ?? null;
}

export function worldNameForId(id: number): string | null {
  const entry = Object.entries(WORLD_ID_BY_NAME).find(([, value]) => value === id);
  return entry ? entry[0] : null;
}

function toId(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

/** 저장된 값이 있으면 그 값을, 없거나 깨졌으면 기본값을 쓴다. */
export function normalizeAuctionProfile(input?: Partial<AuctionProfile> | null): AuctionProfile {
  return {
    accountId: toId(input?.accountId) || DEFAULT_AUCTION_PROFILE.accountId,
    characterId: toId(input?.characterId) || DEFAULT_AUCTION_PROFILE.characterId,
    worldId: toId(input?.worldId) || DEFAULT_AUCTION_PROFILE.worldId,
  };
}

export function loadAuctionProfile(): AuctionProfile {
  try {
    const raw = window.localStorage.getItem(AUCTION_PROFILE_KEY);
    if (!raw) return { ...DEFAULT_AUCTION_PROFILE };
    return normalizeAuctionProfile(JSON.parse(raw) as Partial<AuctionProfile>);
  } catch {
    return { ...DEFAULT_AUCTION_PROFILE };
  }
}

export function saveAuctionProfile(profile: AuctionProfile): void {
  try {
    window.localStorage.setItem(AUCTION_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // 저장이 막힌 브라우저에서는 매번 입력해도 동작에 문제 없다.
  }
}
