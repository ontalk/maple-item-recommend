export interface SetEffectRule {
  setName: string;
  thresholds: Record<number, number>;
}

export type SetId = keyof typeof SET_EFFECT_DATABASE | string;
export type SetStatBonus = Record<string, number>;

// 세트 수치의 상세 게임 데이터가 없는 경우에도, 후보 툴팁의 세트명과
// 세트 수 변화가 최적화에 반영되도록 보수적인 전투력 환산값을 사용한다.
export const SET_EFFECT_DATABASE: Record<string, SetEffectRule> = {
  여명: { setName: '여명', thresholds: { 2: 250000, 3: 600000, 4: 1200000 } },
  칠흑: { setName: '칠흑', thresholds: { 2: 400000, 3: 1000000, 4: 1800000, 5: 3000000 } },
  보스장신구: { setName: '보스장신구', thresholds: { 3: 100000, 5: 250000, 7: 600000, 9: 1200000 } },
  앱솔랩스: { setName: '앱솔랩스', thresholds: { 2: 150000, 4: 400000, 5: 900000, 6: 1500000 } },
  아케인셰이드: { setName: '아케인셰이드', thresholds: { 2: 250000, 4: 700000, 5: 1600000, 6: 2800000 } },
  에테르넬: { setName: '에테르넬', thresholds: { 2: 500000, 4: 1400000, 6: 3500000 } },
};
