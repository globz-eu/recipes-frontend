import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { loadConfig } from './config'

const queryClient = new QueryClient()

const root = createRoot(document.getElementById('root')!)

loadConfig().then(
  () =>
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </StrictMode>,
    ),
  (error: unknown) => {
    console.error(error)
    root.render(<p>Could not load the application configuration.</p>)
  },
)
