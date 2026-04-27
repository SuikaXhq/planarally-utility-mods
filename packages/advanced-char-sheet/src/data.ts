// 角色数据结构定义，存储在 ShapeDataBlock 中
import defaultData from "./configs/default_data.json";

export type ProficiencyLevel = 0 | 0.5 | 1 | 2; // 无、涉猎、熟练、精通

export interface CharacterStats {
    [key: string]: number;
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
}

export interface Skill {
    name: string;
    baseStat: keyof CharacterStats;
    proficiency: ProficiencyLevel;
}

export interface RecordItem {
    name: string;
    description: string;
}

// 物品/武器定义
export interface Item {
    id: string;
    name: string;
    weight: number;
    quantity: number;
    remark: string;
    tags: string[];
    hitBonus?: number;   // 命中加值
    damageDice?: string; // 伤害骰
    damageBonus?: number; // 伤害加值
    scalingStat?: 'str' | 'dex'; // 主要属性：力量或敏捷
}

export interface CharSheetData {
    stats: CharacterStats;
    saveProficiencies: Record<string, boolean>;
    proficiencyBonus: number;
    level: number;
    hp: {
        current: number;
        max: number;
        temp: number;
    };
    hitDice: {
        current: number;
        max: number;
    };
    ac: number;
    conditions: string[];
    skills: Skill[];
    features: RecordItem[]; // 特性
    feats: RecordItem[];    // 专长
    otherProficiencies: RecordItem[]; // 其他熟练项（语言、工具等）
    equipment: {
        items: Item[];
        mainHandId: string | null;
        offHandId: string | null;
    };
}

export const DEFAULT_STATS: CharacterStats = defaultData.defaultStats as CharacterStats;

export const DEFAULT_SKILLS: Skill[] = defaultData.defaultSkills as Skill[];

export function defaultCharSheetData(): CharSheetData {
    return {
        stats: { ...DEFAULT_STATS },
        saveProficiencies: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
        proficiencyBonus: 2,
        level: 1,
        hp: { current: 10, max: 10, temp: 0 },
        hitDice: { current: 1, max: 1 },
        ac: 10,
        conditions: [],
        skills: DEFAULT_SKILLS.map((s) => ({ ...s })),
        features: [],
        feats: [],
        otherProficiencies: [],
        equipment: {
            items: [],
            mainHandId: null,
            offHandId: null,
        },
    };
}

export function getModifier(value: number): number {
    return Math.floor((value - 10) / 2);
}

export function formatModifier(value: number): string {
    const mod = getModifier(value);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function formatSign(value: number): string {
    return value >= 0 ? `+${value}` : `${value}`;
}

export function calculateSkillModifier(statValue: number, proficiencyBonus: number, proficiency: ProficiencyLevel): number {
    const statMod = getModifier(statValue);
    return statMod + Math.floor(proficiencyBonus * proficiency);
}
