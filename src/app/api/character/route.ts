import { NextRequest, NextResponse } from 'next/server';
import { getCharacterFullInfo } from '@/lib/maple-api';
import { generateRecommendations } from '@/lib/recommendation-engine';
import type { CharacterItem } from '@/types';

function convertEquipmentToCharacterItem(equipment: any): CharacterItem {
  const sfVal = equipment.item_starforce ?? equipment.starforce ?? 0;
  const sfNum = typeof sfVal === 'string' ? parseInt(sfVal, 10) : Number(sfVal);

  const parsePotential = (grade: string, opt1: any, opt2: any, opt3: any, arrOpt: any[]) => {
    if (Array.isArray(arrOpt) && arrOpt.length > 0) {
      return arrOpt.map((opt: any) => ({
        potential_option_grade: grade || '',
        potential_option_value: opt.potential_option_value || opt,
      }));
    }
    return [opt1, opt2, opt3]
      .filter(Boolean)
      .map((val) => ({
        potential_option_grade: grade || '',
        potential_option_value: typeof val === 'string' ? val : val?.potential_option_value || '',
      }));
  };

  const potentialArr = parsePotential(
    equipment.item_potential_option_grade,
    equipment.item_potential_option_1 || equipment.potential_option_1,
    equipment.item_potential_option_2 || equipment.potential_option_2,
    equipment.item_potential_option_3 || equipment.potential_option_3,
    equipment.item_potential_option
  );

  const addPotentialArr = parsePotential(
    equipment.item_add_potential_option_grade,
    equipment.additional_potential_option_1 || equipment.item_add_potential_option_1,
    equipment.additional_potential_option_2 || equipment.item_add_potential_option_2,
    equipment.additional_potential_option_3 || equipment.item_add_potential_option_3,
    equipment.item_add_potential_option
  );

  return {
    item_equipment_part: equipment.item_equipment_part || '',
    item_slot: equipment.item_equipment_slot || equipment.item_slot || equipment.item_equipment_part || '',
    item_name: equipment.item_name || '',
    item_icon: equipment.item_icon || '',
    item_description: equipment.item_description || '',
    item_shape_name: equipment.item_shape_name || '',
    item_shape_icon: equipment.item_shape_icon || '',
    item_gender: equipment.item_gender || '',
    item_total_option: Array.isArray(equipment.item_total_option) ? equipment.item_total_option : [],
    item_base_option: Array.isArray(equipment.item_base_option) ? equipment.item_base_option : [],
    item_exceptional_option: equipment.item_exceptional_option ? [{ option_type: 'exceptional', option_value: equipment.item_exceptional_option }] : [],
    item_potential_option_grade: equipment.item_potential_option_grade || '',
    item_potential_option: potentialArr,
    item_add_potential_option_grade: equipment.item_add_potential_option_grade || '',
    item_add_potential_option: addPotentialArr,
    item_starforce: isNaN(sfNum) ? 0 : sfNum,
    item_max_starforce: 25,
    item_equip_level: equipment.item_equip_level || 150,
    item_equip_type: equipment.item_type || '',
    item_set_name: equipment.item_set_name || equipment.set_name || null,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const characterName = searchParams.get('name');
  const requestedTarget = Number(searchParams.get('target') || 2);
  const targetCombatPower = Number.isFinite(requestedTarget) && requestedTarget > 0
    ? Math.round(requestedTarget * 100000000)
    : 200000000;

  try {
    // 닉네임 없이 시작한 경우에도 옥션 기반 템셋 검색을 사용할 수 있도록
    // 빈 캐릭터 기준의 템플릿 추천 결과를 반환한다.
    if (!characterName?.trim()) {
      const recommendations = generateRecommendations({
        character_name: '캐릭터 미입력',
        world_name: '월드 미지정',
        character_class: '전사',
        character_level: 0,
        character_item: [],
      }, targetCombatPower);

      return NextResponse.json({
        ...recommendations,
        character_image: null,
        character_stats: [],
        character_level: 0,
        character_class: '닉네임 미입력',
        combat_power: 0,
      });
    }

    const character = await getCharacterFullInfo(characterName);
    
    if (!character) {
      return NextResponse.json(
        { error: '캐릭터를 찾을 수 없습니다. 닉네임을 확인해주세요.' },
        { status: 404 }
      );
    }

    const characterForRecommendation = {
      character_name: character.basic.character_name,
      world_name: character.basic.world_name,
      character_class: character.basic.character_class,
      character_level: character.basic.character_level,
      character_item: character.equipment.map(convertEquipmentToCharacterItem),
    };

    const recommendations = generateRecommendations(characterForRecommendation, targetCombatPower);

    return NextResponse.json({
      ...recommendations,
      character_image: character.basic.character_image,
      character_stats: character.character_stats || [],
      character_level: character.basic.character_level,
      character_class: character.basic.character_class,
      combat_power: character.basic.combat_power,
    });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
