const NEXON_API_BASE_URL = 'https://open.api.nexon.com/maplestory/v1';

function getApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_MAPLE_API_KEY || process.env.MAPLE_API_KEY;
  return apiKey || '';
}

export type UnifiedItem = any;
export type CharacterEquipment = any;
export type CharacterFullInfo = any;

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
  return total || 50;
}

export async function getOcid(characterName: string): Promise<string | null> {
  try {
    const apiKey = getApiKey();
    const encodedName = encodeURIComponent(characterName);
    const url = `${NEXON_API_BASE_URL}/id?character_name=${encodedName}`;

    const response = await fetch(url, {
      headers: { 'x-nxopen-api-key': apiKey },
      next: { revalidate: 3600 },
    });

    if (!response.ok) throw new Error(`OCID 조회 실패: ${response.status}`);
    const data = await response.json();
    return data.ocid;
  } catch (error) {
    console.error('OCID 조회 오류:', error);
    throw error;
  }
}

// 💡 [신규] 캐릭터 기본 정보 (이미지, 레벨, 직업, 월드)
export async function getCharacterBasic(ocid: string) {
  try {
    const apiKey = getApiKey();
    const url = `${NEXON_API_BASE_URL}/character/basic?ocid=${ocid}`;
    const response = await fetch(url, {
      headers: { 'x-nxopen-api-key': apiKey },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

// 💡 [신규] 캐릭터 스탯 정보 (전투력 추출용)
export async function getCharacterStat(ocid: string) {
  try {
    const apiKey = getApiKey();
    const url = `${NEXON_API_BASE_URL}/character/stat?ocid=${ocid}`;
    const response = await fetch(url, {
      headers: { 'x-nxopen-api-key': apiKey },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

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

    if (!response.ok) throw new Error(`장비 정보 조회 실패: ${response.status}`);
    const data = await response.json();
    return data.item_equipment || [];
  } catch (error) {
    console.error('장비 정보 조회 오류:', error);
    throw error;
  }
}

export async function getCharacterFullInfo(characterName: string) {
  try {
    const ocid = await getOcid(characterName);
    if (!ocid) return null;

    // 기본 정보, 스탯 정보, 장비 정보를 동시 호출
    const [basic, statData, equipment] = await Promise.all([
      getCharacterBasic(ocid),
      getCharacterStat(ocid),
      getCharacterEquipment(ocid)
    ]);

    // 전투력 값 찾기
    const combatPowerStat = statData?.final_stat?.find((s: any) => s.stat_name === '전투력');
    const combatPower = combatPowerStat ? combatPowerStat.stat_value : '0';

    return {
      basic: {
        character_name: basic?.character_name || characterName,
        world_name: basic?.world_name || '스카니아',
        character_class: basic?.character_class || '직업',
        character_level: basic?.character_level || 0,
        character_image: basic?.character_image || '',
        combat_power: combatPower,
      },
      equipment: equipment,
    };
  } catch (error) {
    console.error('전체 정보 조회 오류:', error);
    throw error;
  }
}