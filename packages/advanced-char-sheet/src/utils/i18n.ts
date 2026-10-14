import { ref } from "vue";
import zh_CN from "../locales/zh_CN.json";
import zh_TW from "../locales/zh_TW.json";
import en from "../locales/en.json";

const messages: Record<string, any> = {
  "zh-CN": zh_CN,
  zh_CN: zh_CN,
  "zh-TW": zh_TW,
  zh_TW: zh_TW,
  en,
};

const defaultLocale = localStorage.getItem("locale") || "zh_CN";
const currentLocale = ref(defaultLocale);

export function useI18n() {
  function t(key: string, defaultValue?: string): string {
    const keys = key.split(".");
    let val = messages[currentLocale.value] || messages["en"];
    for (const k of keys) {
      if (val === undefined) break;
      val = val[k];
    }
    return val !== undefined
      ? val
      : defaultValue !== undefined
        ? defaultValue
        : key;
  }

  return {
    locale: currentLocale,
    t,
  };
}
