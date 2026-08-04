import { NextRequest, NextResponse } from 'next/server';
import { getCharacterFullInfo } from '@/lib/maple-api';
import { generateRecommendations } from '@/lib/recommendation-engine';
import type { CharacterItem } from '@/types';

function convertEquipmentToCharacterItem(equipment: any): CharacterItem {
  // 💡 문자열 스타포스를 숫자로 안전하게 파싱
  const sfVal = equipment.item_starforce ?? equipment.starforce ?? 0;
  const sfNum = typeof sfVal === 'string' ? parseInt(sfVal, 10) : Number(sfVal);

  return {
    item_equipment_part: equipment.item_equipment_part || '',
    // 💡 핵심: item_equipment_slot (반지1, 반지2 등)을 반드시 보존합니다.
    item_slot: equipment.item_equipment_slot || equipment.item_slot || equipment.item_equipment_part || '',
    item_name: equipment.item_name || '',
    item_icon: equipment.item_icon || '',
    item_description: equipment.item_description || '',
    item_shape_name: equipment.item_shape_name || '',
    item_shape_icon: equipment.item_shape_icon || '',
    item_gender: equipment.item_gender || '',
    item_total_option: [],
    item_base_option: [],
    item_exceptional_option: equipment.item_exceptional_option ? [{ option_type: 'exceptional', option_value: equipment.item_exceptional_option }] : [],
    item_potential_option_grade: equipment.item_potential_option_grade || '',
    item_potential_option: equipment.potential_options?.flatMap((opt: any) => 
      [opt.potential_option_1, opt.potential_option_2, opt.potential_option_3]
        .filter(Boolean)
        .map(val => ({ potential_option_grade: opt.potential_option_grade, potential_option_value: val! }))
    ) ?? [],
    item_add_potential_option_grade: equipment.item_add_potential_option_grade || '',
    item_add_potential_option: equipment.additional_potential_options?.flatMap((opt: any) => 
      [opt.potential_option_1, opt.potential_option_2, opt.potential_option_3]
        .filter(Boolean)
        .map(val => ({ potential_option_grade: opt.potential_option_grade, potential_option_value: val! }))
    ) ?? [],
    item_starforce: isNaN(sfNum) ? 0 : sfNum,
    item_max_starforce: 25,
    item_equip_level: equipment.item_equip_level || 150,
    item_equip_type: equipment.item_type || '',
    item_set_name: null,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const characterName = searchParams.get('name');

  if (!characterName) {
    return NextResponse.json({ error: '캐릭터 닉네임이 필요합니다.' }, { status: 400 });
  }

  try {
    const character = await getCharacterFullInfo(characterName);
    
    if (!character) {
      return NextResponse.json({ error: '캐릭터를 찾을 수 없습니다.' }, { status: 404 });
    }

    const characterForRecommendation = {
      character_name: character.basic.character_name,
      world_name: character.basic.world_name,
      character_class: character.basic.character_class,
      character_level: character.basic.character_level,
      character_item: character.equipment.map(convertEquipmentToCharacterItem),
    };

    const recommendations = generateRecommendations(characterForRecommendation);

    return NextResponse.json({
      ...recommendations,
      character_image: character.basic.character_image,
      character_level: character.basic.character_level,
      character_class: character.basic.character_class,
      combat_power: character.basic.combat_power,
    });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}