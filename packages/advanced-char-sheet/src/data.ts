// Character data structure definition, stored in ShapeDataBlock
import defaultData from "./configs/default_data.json";

export type ProficiencyLevel = 0 | 0.5 | 1 | 2; // None, Jack of all trades, Proficient, Expert

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
    id: string;
    name: string;
    description: string;
    hasTracker?: boolean;
    trackerName?: string; // 绑定的 tracker 显示名称，默认等于 name
    uses?: {
        current: number;
        max: number;
    };
}

export interface ClassItem {
    id: string;
    name: string;
    level: number;
    hitDice: string;
    hitDiceCurrent: number;
}

// Item/Weapon definition
export interface Item {
    id: string;
    name: string;
    weight: number;
    quantity: number;
    remark: string;
    tags: string[];
    hitBonus?: number;   // Hit bonus
    damageDice?: string; // Damage dice
    damageBonus?: number; // Damage bonus
    scalingStat?: 'str' | 'dex'; // Primary scaling stat: STR or DEX
}

export interface TrackerMappings {
    hp: string | null;
    ac: string | null;
    records: Record<string, string>; // RecordItem ID -> Tracker UUID
    classes: Record<string, string>; // ClassItem ID -> Tracker UUID
}

export interface CharSheetData {
    stats: CharacterStats;
    saveProficiencies: Record<string, boolean>;
    proficiencyBonus: number;
    level: number;
    classes: ClassItem[];
    exp: number;
    speed: number;
    hp: {
        current: number;
        max: number;
        temp: number;
    };
    ac: number;
    conditions: string[];
    skills: Skill[];
    records: {
        features: RecordItem[];
        feats: RecordItem[];
        otherProficiencies: RecordItem[];
    };
    equipment: {
        items: Item[];
        mainHandId: string | null;
        offHandId: string | null;
    };
    trackerMappings: TrackerMappings;
}

export const DEFAULT_STATS: CharacterStats = defaultData.defaultStats as CharacterStats;

export const DEFAULT_SKILLS: Skill[] = defaultData.defaultSkills as Skill[];

export function defaultCharSheetData(): CharSheetData {
    return {
        stats: { ...DEFAULT_STATS },
        saveProficiencies: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
        proficiencyBonus: 2,
        level: 1,
        classes: [],
        exp: 0,
        speed: 30,
        hp: { current: 10, max: 10, temp: 0 },
        ac: 10,
        conditions: [],
        skills: DEFAULT_SKILLS.map((s) => ({ ...s })),
        records: {
            features: [],
            feats: [],
            otherProficiencies: [],
        },
        equipment: {
            items: [],
            mainHandId: null,
            offHandId: null,
        },
        trackerMappings: {
            hp: null,
            ac: null,
            records: {},
            classes: {}
        }
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
