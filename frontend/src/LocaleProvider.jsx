import { useEffect, useMemo, useState } from "react";
import { setActiveLanguage } from "@/i18n";
import { LocaleContext } from "@/locale-context";

const getSavedLanguage = () =>
    window.localStorage.getItem("ponno-kini-language") === "bn" ? "bn" : "en";

export function LocaleProvider({ children }) {
    const [language, setLanguageState] = useState(getSavedLanguage);

    useEffect(() => {
        setActiveLanguage(language);
        document.documentElement.lang = language;
        document.documentElement.dataset.language = language;
    }, [language]);

    const setLanguage = (nextLanguage) => {
        setActiveLanguage(nextLanguage);
        window.localStorage.setItem("ponno-kini-language", nextLanguage);
        setLanguageState(nextLanguage);
    };

    const value = useMemo(
        () => ({ language, setLanguage }),
        [language],
    );

    return (
        <LocaleContext.Provider value={value}>
            {children}
        </LocaleContext.Provider>
    );
}
