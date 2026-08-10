import assert from 'node:assert/strict';
import { calculateSetEffects, calculateSetCounts } from '../src/lib/set-effect-calculator';
import { equipmentStateFromItems, replaceEquipment, type EquipmentStateItem } from '../src/lib/equipment-state';
import type { SetId } from '../src/lib/set-effect-database';
import { optimizeEquipmentCombinations } from '../src/lib/recommendation-optimizer';

function item(slot: string, setId: EquipmentStateItem['setId'], name = slot): EquipmentStateItem {
  return { slot, part: slot, name, setId, source: 'current',
    stats: {
  str: 0,
  dex: 0,
  int: 0,
  luk: 0,

  allStat: 0,
  mainStat: 0,
  subStat: 0,

  strPercent: 0,
  dexPercent: 0,
  intPercent: 0,
  lukPercent: 0,
  allStatPercent: 0,
  mainStatPercent: 0,

  hp: 0,
  mp: 0,

  attack: 0,
  magicAttack: 0,

  bossDamage: 0,
  ignoreDefense: 0,
  criticalDamage: 0,

  damage: 0,
  finalDamage: 0,
  defense: 0,
},
    starforce: 0, price: 0, powerDelta: 0 };
}  

const rootAndAbsolab = calculateSetEffects(calculateSetCounts([
  'ROOT_ABYSS', 'ROOT_ABYSS', 'ROOT_ABYSS', 'ABSOLAB', 'ABSOLAB', 'ABSOLAB', 'ABSOLAB', 'ABSOLAB',
] as SetId[]));
assert.equal(rootAndAbsolab.setCounts.ROOT_ABYSS, 3);
assert.equal(rootAndAbsolab.setCounts.ABSOLAB, 5);
assert.ok(rootAndAbsolab.activeSets.some((set) => set.setId === 'ROOT_ABYSS' && set.appliedCounts.includes(3)));
assert.ok(rootAndAbsolab.activeSets.some((set) => set.setId === 'ABSOLAB' && set.appliedCounts.includes(5)));

const bossAndDawn = calculateSetEffects(calculateSetCounts([
  ...Array(7).fill('BOSS_ACCESSORY'), ...Array(2).fill('DAWN'),
] as SetId[]));
assert.deepEqual(bossAndDawn.setCounts, { BOSS_ACCESSORY: 7, DAWN: 2 });
assert.equal(bossAndDawn.activeSets.length, 2);

const before = equipmentStateFromItems([item('ring-1', 'DAWN'), item('face', 'DAWN'), item('ear', 'DAWN')]);
const after = replaceEquipment(before, [item('ring-1', 'BLACK', '거대한 공포')]);
assert.equal(after.setCounts.DAWN, 2);
assert.equal(after.setCounts.BLACK, 1);

const multi = replaceEquipment(before, [item('ring-1', 'BLACK', '거대한 공포'), item('face', 'BLACK', '루즈 컨트롤 머신 마크')]);
assert.equal(multi.setCounts.DAWN, 1);
assert.equal(multi.setCounts.BLACK, 2);

const optimized = optimizeEquipmentCombinations({
  ring: [
    { slot: 'ring', part: '반지', name: '저가 여명', setId: 'DAWN', cost: 100, directPower: 10 },
    { slot: 'ring', part: '반지', name: '고가 칠흑', setId: 'BLACK', cost: 200, directPower: 30 },
  ],
  pendant: [
    { slot: 'pendant', part: '펜던트', name: '여명 펜던트', setId: 'DAWN', cost: 100, directPower: 10 },
  ],
}, 300, 30, { setEffectPower: (effects) => (effects.bossDamage ?? 0) });
assert.ok(optimized.power >= 30);
assert.ok(optimized.cost <= 300);

console.log('equipment/set-effect verification passed');
