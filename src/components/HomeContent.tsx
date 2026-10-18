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
      <LanguageSwitch locale={locale} onChange={onLocaleChange} />
      {pages.map((page, index) => (
        <article key={index}>
          <h1>{page.title}</h1>
          {page.description && <p>{page.description}</p>}
        </article>
      ))}
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
