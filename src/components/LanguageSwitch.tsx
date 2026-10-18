import { LOCALES, type LocaleCode } from '../locale'

interface LanguageSwitchProps {
  locale: LocaleCode
  onChange: (locale: LocaleCode) => void
}

export function LanguageSwitch({ locale, onChange }: LanguageSwitchProps) {
  return (
    <nav className="language-switch" aria-label="Language">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          lang={code}
          title={label}
          aria-pressed={code === locale}
          onClick={() => onChange(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </nav>
  )
}
