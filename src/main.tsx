import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { recoverNoteDraft } from './lib/noteDraft'
import { initAuthStore } from './store/useAuthStore'
import { initStudyStore } from './store/useStudyStore'

void initStudyStore()
// Restore a note edit that was still waiting for autosave when the page last closed.
void recoverNoteDraft()
initAuthStore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
