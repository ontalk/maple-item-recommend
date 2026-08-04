// 넥슨 오픈 API 공통 통신 함수
const NEXON_API_BASE_URL = 'https://open.api.nexon.com/maplestory/v1';

function getApiKey(): string {
  // Vercel 환경 변수 세팅 방식에 따라 두 형태 모두 지원하도록 처리
  const apiKey = process.env.NEXT_PUBLIC_MAPLE_API_KEY || process.env.MAPLE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ API 키가 존재하지 않습니다. Vercel Environment Variables를 확인해주세요.');
  }
  
  return apiKey || '';
}

/**
 * 닉네임으로 캐릭터 고유 식별자(OCID)를 조회합니다.
 */
export async function getOcid(characterName: string): Promise<string | null> {
  try {
    const apiKey = getApiKey();
    
    // 💡 핵심 수정: 한글 닉네임은 반드시 encodeURIComponent로 인코딩해야 400 에러가 나지 않습니다.
    const encodedName = encodeURIComponent(characterName);
    const url = `${NEXON_API_BASE_URL}/id?character_name=${encodedName}`;

    const response = await fetch(url, {
      headers: {
        'x-nxopen-api-key': apiKey,
      },
      // 필요에 따라 캐싱 적용 (1시간)
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`OCID 조회 실패 [${response.status}]:`, errorData);
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
 * OCID로 캐릭터 착용 장비 정보를 조회합니다.
 */
export async function getCharacterEquipment(ocid: string) {
  try {
    const apiKey = getApiKey();
    
    // 넥슨 API는 당일 데이터 갱신이 느릴 수 있으므로 어제 날짜를 기본 검색일로 지정합니다.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split('T')[0];

    const url = `${NEXON_API_BASE_URL}/character/item-equipment?ocid=${ocid}&date=${dateString}`;

    const response = await fetch(url, {
      headers: {
        'x-nxopen-api-key': apiKey,
      },
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
 * 캐릭터의 기본 정보와 장비 정보를 한 번에 가져오는 통합 함수
 */
export async function getCharacterFullInfo(characterName: string) {
  try {
    const ocid = await getOcid(characterName);
    if (!ocid) return null;

    const equipment = await getCharacterEquipment(ocid);

    return {
      basic: {
        character_name: characterName,
        world_name: '스카니아', // 필요 시 basic API 추가 연동 가능
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