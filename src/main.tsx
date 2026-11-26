import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { dataReady } from './lib/banks/boot'
import { scheduleUpdateCheck } from './lib/banks/install'
import { recoverNoteDraft } from './lib/noteDraft'
import { initAuthStore } from './store/useAuthStore'
import { initLibraryStore } from './store/useLibraryStore'
import { initStudyStore } from './store/useStudyStore'

void initLibraryStore().then(() => scheduleUpdateCheck())
void initStudyStore()
// Restore a note edit that was still waiting for autosave when the page last closed (after the
// 2.0 migration has moved it to its new question id).
void dataReady().then(recoverNoteDraft)
initAuthStore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
