import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAuthStore } from './store/useAuthStore'
import { initStudyStore } from './store/useStudyStore'

void initStudyStore()
initAuthStore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
