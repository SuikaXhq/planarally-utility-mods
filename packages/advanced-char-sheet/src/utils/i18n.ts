import { ref } from "vue";
import zh from "../locales/zh.json";
import en from "../locales/en.json";

const messages: Record<string, any> = {
    zh,
    en
};

const defaultLocale = localStorage.getItem("locale") || "zh";
const currentLocale = ref(defaultLocale);

export function useI18n() {
    function t(key: string, defaultValue?: string): string {
        const keys = key.split('.');
        let val = messages[currentLocale.value] || messages['en'];
        for (const k of keys) {
            if (val === undefined) break;
            val = val[k];
        }
        return val !== undefined ? val : (defaultValue !== undefined ? defaultValue : key);
    }

    return {
        locale: currentLocale,
        t
    };
}
