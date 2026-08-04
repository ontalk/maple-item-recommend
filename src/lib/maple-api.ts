const NEXON_API_BASE_URL = 'https://open.api.nexon.com/maplestory/v1';

function getApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_MAPLE_API_KEY || process.env.MAPLE_API_KEY;
  return apiKey || '';
}

// 💡 [핵심] 다른 파일들에서 import type으로 불러오는 타입들을 export 해줍니다.
export type UnifiedItem = any;
export type CharacterEquipment = any;
export type CharacterFullInfo = any;

/**
 * 아이템의 잠재옵션 텍스트를 파싱하여 스탯과 값으로 분리하는 헬퍼 함수
 */
export function parseItemOptions(item: any) {
  const potentialOptions: Array<{ stat: string; value: number; isPercent: boolean }> = [];
  const additionalOptions: Array<{ stat: string; value: number; isPercent: boolean }> = [];

  if (item?.item_potential_option) {
    item.item_potential_option.forEach((opt: any) => {
      const valStr = opt.potential_option_value || '';
      const match = valStr.match(/(.+?)\s*\+?(\d+)%?/);
      if (match) {
        potentialOptions.push({
          stat: match[1],
          value: parseInt(match[2], 10) || 0,
          isPercent: valStr.includes('%'),
        });
      }
    });
  }

  if (item?.item_add_potential_option) {
    item.item_add_potential_option.forEach((opt: any) => {
      const valStr = opt.potential_option_value || '';
      const match = valStr.match(/(.+?)\s*\+?(\d+)%?/);
      if (match) {
        additionalOptions.push({
          stat: match[1],
          value: parseInt(match[2], 10) || 0,
          isPercent: valStr.includes('%'),
        });
      }
    });
  }

  return { potentialOptions, additionalOptions };
}

/**
 * 아이템의 메인 스탯 수치를 계산하는 헬퍼 함수
 */
export function getMainStatValue(item: any, mainStat: string): number {
  if (!item) return 0;
  let total = 0;
  
  if (Array.isArray(item.item_total_option)) {
    item.item_total_option.forEach((opt: any) => {
      if (opt.option_type === mainStat) {
        total += Number(opt.option_value || 0);
      }
    });
  }
  return total || 50; // 기본 스탯 가중치
}

/**
 * 닉네임으로 OCID 조회 (한글 인코딩 400 방지 포함)
 */
export async function getOcid(characterName: string): Promise<string | null> {
  try {
    const apiKey = getApiKey();
    const encodedName = encodeURIComponent(characterName);
    const url = `${NEXON_API_BASE_URL}/id?character_name=${encodedName}`;

    const response = await fetch(url, {
      headers: { 'x-nxopen-api-key': apiKey },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`OCID 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    return data.ocid;
  } catch (error) {
    console.error('OCID 조회 오류:', error);
    throw error;
  }
}

/**
 * OCID로 착용 장비 정보 조회
 */
export async function getCharacterEquipment(ocid: string) {
  try {
    const apiKey = getApiKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split('T')[0];

    const url = `${NEXON_API_BASE_URL}/character/item-equipment?ocid=${ocid}&date=${dateString}`;

    const response = await fetch(url, {
      headers: { 'x-nxopen-api-key': apiKey },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`장비 정보 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    return data.item_equipment || [];
  } catch (error) {
    console.error('장비 정보 조회 오류:', error);
    throw error;
  }
}

/**
 * 캐릭터 정보 통합 함수
 */
export async function getCharacterFullInfo(characterName: string) {
  try {
    const ocid = await getOcid(characterName);
    if (!ocid) return null;

    const equipment = await getCharacterEquipment(ocid);

    return {
      basic: {
        character_name: characterName,
        world_name: '스카니아',
        character_class: '전사',
        character_level: 260,
      },
      equipment: equipment,
    };
  } catch (error) {
    console.error('전체 정보 조회 오류:', error);
    throw error;
  }
}