import { NextRequest, NextResponse } from 'next/server';
import { getCharacterFullInfo, CharacterEquipment, CharacterFullInfo as MapleCharacterFullInfo } from '@/lib/maple-api';
import { generateRecommendations } from '@/lib/recommendation-engine';
import type { CharacterItem } from '@/types';

// CharacterEquipment를 CharacterItem 타입으로 변환
function convertEquipmentToCharacterItem(equipment: CharacterEquipment): CharacterItem {
  return {
    item_equipment_part: equipment.item_equipment_part,
    item_slot: equipment.item_slot,
    item_name: equipment.item_name,
    item_icon: equipment.item_icon,
    item_description: equipment.item_description,
    item_shape_name: equipment.item_shape_name,
    item_shape_icon: equipment.item_shape_icon,
    item_gender: equipment.item_gender,
    item_total_option: [],
    item_base_option: [],
    item_exceptional_option: equipment.item_exceptional_option ? [{ option_type: 'exceptional', option_value: equipment.item_exceptional_option }] : [],
    item_potential_option_grade: equipment.item_potential_option_grade,
    item_potential_option: equipment.potential_options.flatMap(opt => 
      [opt.potential_option_1, opt.potential_option_2, opt.potential_option_3]
        .filter(Boolean)
        .map(val => ({ potential_option_grade: opt.potential_option_grade, potential_option_value: val! }))
    ),
    item_add_potential_option_grade: equipment.item_add_potential_option_grade,
    item_add_potential_option: equipment.additional_potential_options.flatMap(opt => 
      [opt.potential_option_1, opt.potential_option_2, opt.potential_option_3]
        .filter(Boolean)
        .map(val => ({ potential_option_grade: opt.potential_option_grade, potential_option_value: val! }))
    ),
    item_starforce: equipment.item_starforce,
    item_max_starforce: 25, // 기본값, 실제로는 장비 타입별로 다름
    item_equip_level: equipment.item_equip_level,
    item_equip_type: equipment.item_type,
    item_set_name: null,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const characterName = searchParams.get('name');

  if (!characterName) {
    return NextResponse.json(
      { error: '캐릭터 닉네임이 필요합니다.' },
      { status: 400 }
    );
  }

  try {
    // 캐릭터 전체 정보 조회
    const character = await getCharacterFullInfo(characterName);
    
    if (!character) {
      return NextResponse.json(
        { error: '캐릭터를 찾을 수 없습니다. 닉네임을 확인해주세요.' },
        { status: 404 }
      );
    }

    // CharacterFullInfo를 generateRecommendations가 기대하는 형태로 변환
    const characterForRecommendation = {
      character_name: character.basic.character_name,
      world_name: character.basic.world_name,
      character_class: character.basic.character_class,
      character_level: character.basic.character_level,
      character_item: character.equipment.map(convertEquipmentToCharacterItem),
    };

    // 추천 생성
    const recommendations = generateRecommendations(characterForRecommendation);

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
