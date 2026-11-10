import type { AuctionProfile } from './auction-extension';

/** 옥션 연결 정보를 브라우저에 저장하는 키. 계획기와 옥션 검색이 함께 쓴다. */
export const AUCTION_PROFILE_KEY = 'maple-combo-auction-profile';

/**
 * 옥션 API는 worldId로 서버를 구분한다. 번호를 확인한 월드만 이름으로 고를 수 있게 두고,
 * 확인되지 않은 월드는 숫자를 직접 입력한다. 새 월드를 확인하면 여기에 한 줄만 추가하면 된다.
 */
export const WORLD_OPTIONS: Array<{ id: number; name: string }> = [
  { id: 5, name: '스카니아' },
  { id: 8, name: '크로아' },
];

export const WORLD_ID_BY_NAME: Record<string, number> = Object.fromEntries(
  WORLD_OPTIONS.map((world) => [world.name, world.id]),
);

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
  return WORLD_OPTIONS.find((world) => world.id === id)?.name ?? null;
}

export function isKnownWorldId(id: number): boolean {
  return WORLD_OPTIONS.some((world) => world.id === id);
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
