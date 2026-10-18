import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ApiError, isNoAccessError } from './api/client'
import { homeQueryKey, fetchHome } from './api/home'
import { HomeContent } from './components/HomeContent'
import { LoginPrompt } from './components/LoginPrompt'
import { NoAccessPrompt } from './components/NoAccessPrompt'
import { getInitialLocale, storeLocale, type LocaleCode } from './locale'
import './App.css'

function App() {
  const [locale, setLocale] = useState<LocaleCode>(getInitialLocale)
  const changeLocale = (next: LocaleCode) => {
    storeLocale(next)
    // A recipe open in the previous language does not exist in the new one.
    if (window.location.hash) window.location.hash = ''
    setLocale(next)
  }
  const { data, isPending, error } = useQuery({
    queryKey: homeQueryKey(locale),
    queryFn: () => fetchHome(locale),
    // Keep the UI mounted while another locale loads.
    placeholderData: keepPreviousData,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        return false
      }
      return failureCount < 2
    },
  })

  if (isPending) {
    return <main><p>Loading...</p></main>
  }

  if (isNoAccessError(error)) {
    return <main><NoAccessPrompt /></main>
  }

  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return <main><LoginPrompt /></main>
  }

  if (error) {
    return <main><p>Error loading content: {error.message}</p></main>
  }

  return <main><HomeContent pages={data} locale={locale} onLocaleChange={changeLocale} /></main>
}

export default App
