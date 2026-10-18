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
            <div key={index}>
              <h1>
                <a href="#">{page.title}</a>
              </h1>
              {page.description && (
                <p className="home-description">{page.description}</p>
              )}
            </div>
          ))}
        </div>
        <div className="home-actions">
          <LanguageSwitch locale={locale} onChange={onLocaleChange} />
          <a
            className="logout"
            href={apiUrl(
              `/admin/logout/?next=${encodeURIComponent(window.location.href)}`,
            )}
            onClick={resetCsrfToken}
            aria-label="Log out"
            title="Log out"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </a>
        </div>
      </header>
      <RecipeList locale={locale} />
    </div>
  )
}
