import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import messages from './locales'

// ── Supported languages (shown in the switcher) ──────────────────────────────
export const LANGUAGES = [
  { code: 'en', label: 'English'    },
  { code: 'bg', label: 'Български'  },
  { code: 'cs', label: 'Čeština'    },
  { code: 'da', label: 'Dansk'      },
  { code: 'de', label: 'Deutsch'    },
  { code: 'et', label: 'Eesti'      },
  { code: 'el', label: 'Ελληνικά'   },
  { code: 'es', label: 'Español'    },
  { code: 'fr', label: 'Français'   },
  { code: 'hr', label: 'Hrvatski'   },
  { code: 'it', label: 'Italiano'   },
  { code: 'lv', label: 'Latviešu'   },
  { code: 'lt', label: 'Lietuvių'   },
  { code: 'hu', label: 'Magyar'     },
  { code: 'nl', label: 'Nederlands' },
  { code: 'nb', label: 'Norsk'      },
  { code: 'pl', label: 'Polski'     },
  { code: 'pt', label: 'Português'  },
  { code: 'ro', label: 'Română'     },
  { code: 'ru', label: 'Русский'    },
  { code: 'sk', label: 'Slovenčina' },
  { code: 'sl', label: 'Slovenščina'},
  { code: 'fi', label: 'Suomi'      },
  { code: 'sv', label: 'Svenska'    },
  { code: 'uk', label: 'Українська' },
]

// Map an ISO 3166-1 alpha-2 country code → default language for that country.
// Every European country is covered; countries whose native language is not
// yet translated fall back to English. Non-European countries also fall back.
export const COUNTRY_LANG = {
  AT: 'de', DE: 'de', CH: 'de', LI: 'de',
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr',
  EE: 'et',
  FI: 'fi',
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru',
  ES: 'es', AD: 'es',
  IT: 'it', SM: 'it', VA: 'it',
  PT: 'pt',
  NL: 'nl',
  PL: 'pl',
  SE: 'sv',
  DK: 'da',
  NO: 'nb',
  CZ: 'cs',
  SK: 'sk',
  SI: 'sl',
  HR: 'hr',
  HU: 'hu',
  RO: 'ro', MD: 'ro',
  BG: 'bg',
  GR: 'el', CY: 'el',
  LV: 'lv',
  LT: 'lt',
  GB: 'en', IE: 'en', MT: 'en', IS: 'en',
  US: 'en', AU: 'en', NZ: 'en', CA: 'en',
  AL: 'en', BA: 'en', RS: 'en', ME: 'en', MK: 'en', XK: 'en',
}

const SUPPORTED = LANGUAGES.map(l => l.code)
const STORAGE_KEY = 'lang'

// ── Language detection ───────────────────────────────────────────────────────

// Language the user explicitly chose (persisted), if any.
function savedLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved && SUPPORTED.includes(saved) ? saved : null
}

// Provisional language before the country is known: browser language → English.
function browserLanguage() {
  const nav = navigator.languages || [navigator.language || 'en']
  for (const l of nav) {
    const code = l.slice(0, 2).toLowerCase()
    if (SUPPORTED.includes(code)) return code
  }
  return 'en'
}

// Detect the country from the client's IP and return its default language,
// or null if it can't be determined / isn't mapped. Tries providers in turn.
async function detectCountryLanguage() {
  const providers = [
    { url: 'https://ipwho.is/',                   code: d => d.country_code },
    { url: 'https://get.geojs.io/v1/ip/geo.json', code: d => d.country_code },
    { url: 'https://ipapi.co/json/',              code: d => d.country_code },
  ]
  for (const p of providers) {
    try {
      const res = await fetch(p.url)
      if (!res.ok) continue
      const data = await res.json()
      const cc = (p.code(data) || '').toUpperCase()
      if (cc && COUNTRY_LANG[cc]) return COUNTRY_LANG[cc]
    } catch { /* try next */ }
  }
  return null
}

// ── Provider + hook ──────────────────────────────────────────────────────────

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: k => k })

export function LanguageProvider({ children }) {
  // Start from a saved choice, else browser language (instant, no flicker).
  const [lang, setLangState] = useState(() => savedLanguage() || browserLanguage())

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  // On first load, if the user hasn't manually picked a language, choose it
  // from the country they're in (France → French, Finland → Finnish, …).
  useEffect(() => {
    if (savedLanguage()) return
    let cancelled = false
    detectCountryLanguage().then(code => {
      if (!cancelled && code && !savedLanguage()) setLangState(code)
    })
    return () => { cancelled = true }
  }, [])

  const setLang = useCallback((code) => {
    if (!SUPPORTED.includes(code)) return
    localStorage.setItem(STORAGE_KEY, code)
    setLangState(code)
  }, [])

  // Translate a key, falling back to English then the key itself.
  // Supports {placeholder} interpolation via the `vars` argument.
  const t = useCallback((key, vars) => {
    let str = messages[lang]?.[key] ?? messages.en[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
      }
    }
    return str
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Convenience hook: const { t, lang, setLang } = useT()
export function useT() {
  return useContext(LanguageContext)
}
