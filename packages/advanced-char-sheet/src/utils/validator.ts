import type { CharSheetData } from "../data";

/**
 * 通用数据校验器，就地修正非法数据（如负数、超过上限等）。
 * 返回一个布尔值，指示是否有数据被修正。
 */
export function validateCharSheetData(data: CharSheetData): boolean {
    let changed = false;

    // 辅助函数：夹逼数值并记录变更
    const clamp = (obj: any, key: string, min: number, max: number = Infinity) => {
        let val = obj[key];
        if (typeof val !== "number" || isNaN(val)) val = min;
        const clamped = Math.max(min, Math.min(max, val));
        if (clamped !== obj[key]) {
            obj[key] = clamped;
            changed = true;
        }
    };

    clamp(data, "ac", 0);
    clamp(data, "exp", 0);
    clamp(data, "speed", 0);

    clamp(data.hp, "max", 1);
    clamp(data.hp, "current", 0, data.hp.max);
    clamp(data.hp, "temp", 0);

    for (const key of ["str", "dex", "con", "int", "wis", "cha"] as const) {
        clamp(data.stats, key, 0); // 属性值不应为负
    }

    for (const cls of data.classes) {
        clamp(cls, "level", 1);
        clamp(cls, "hitDiceCurrent", 0, cls.level);
    }

    for (const category of ["features", "feats", "otherProficiencies"] as const) {
        for (const item of data.records[category]) {
            if (item.uses) {
                clamp(item.uses, "max", 0);
                clamp(item.uses, "current", 0, item.uses.max);
            }
        }
    }

    return changed;
}
