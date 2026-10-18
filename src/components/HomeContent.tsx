import { apiUrl, resetCsrfToken } from '../api/client'
import type { HomePage } from '../api/home'
import type { LocaleCode } from '../locale'
import { LanguageSwitch } from './LanguageSwitch'
import { RecipeList } from './RecipeList'

interface HomeContentProps {
  pages: HomePage[]
  locale: LocaleCode
  onLocaleChange: (locale: LocaleCode) => void
}

export function HomeContent({ pages, locale, onLocaleChange }: HomeContentProps) {
  return (
    <div className="home-content">
      <header className="home-header">
        <div>
          {pages.map((page, index) => (
            <h1 key={index} title={page.description || undefined}>
              <a href="#">{page.title}</a>
            </h1>
          ))}
        </div>
        <LanguageSwitch locale={locale} onChange={onLocaleChange} />
      </header>
      <RecipeList locale={locale} />
      <footer>
        <a
          href={apiUrl(`/admin/logout/?next=${encodeURIComponent(window.location.href)}`)}
          onClick={resetCsrfToken}
        >
          Log out
        </a>
      </footer>
    </div>
  )
}
