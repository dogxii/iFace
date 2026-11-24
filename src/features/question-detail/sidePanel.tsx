import { NotebookPen, Sparkles, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { clampSidePanelWidth, resolveDetailPanels, SIDE_PANEL, SIDEBAR } from '@/app/layout'
import { useMediaQuery, useViewportWidth } from '@/hooks/useMediaQuery'
import { isEditableTarget } from '@/lib/dom'
import { type SidePanelTab, useUIState } from '@/store/useUIStore'
import type { Question } from '@/types'
import { Button, cn, Kbd, ResizeHandle, SegmentedControl, Sheet, SheetContent, Tooltip } from '@/ui'
import { AIChatPanel } from './aiChat'
import { QuestionNotes } from './notes'

const DESKTOP_QUERY = '(min-width: 1024px)'

/**
 * Layout of the detail page's docked panels: the side panel (notes / AI) on the right and the
 * module question list on the left. On desktop both dock beside the page (the page reserves their
 * width, so nothing is covered); on small screens they become sheets.
 */
export function useDetailLayout() {
  const tab = useUIState((s) => s.sidePanel)
  const storedWidth = useUIState((s) => s.sidePanelWidth)
  const sidebarCollapsed = useUIState((s) => s.sidebarCollapsed)
  const sidebarWidth = useUIState((s) => s.sidebarWidth)
  const modulePinned = useUIState((s) => s.modulePanelPinned)
  const storedModuleWidth = useUIState((s) => s.modulePanelWidth)
  const viewportWidth = useViewportWidth()
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const shownSidebar = sidebarCollapsed ? SIDEBAR.rail : sidebarWidth
  const panels = resolveDetailPanels({
    viewportWidth,
    sidebarWidth: shownSidebar,
    modulePinned,
    moduleWidth: storedModuleWidth,
    sidePanelOpen: tab !== null,
    sidePanelWidth: storedWidth,
  })
  const moduleDocked = desktop && panels.moduleDocked
  return {
    tab,
    desktop,
    docked: desktop && tab !== null,
    width: panels.sidePanelWidth,
    viewportWidth,
    /** Width occupied left of the page: app sidebar plus the docked module list. */
    leftWidth: shownSidebar + (moduleDocked ? panels.moduleWidth : 0),
    moduleDocked,
    /** Whether pinning the module list would dock it right now. */
    moduleCanDock: desktop && panels.moduleFits,
    moduleWidth: panels.moduleWidth,
    moduleMaxWidth: panels.moduleMaxWidth,
  }
}

export type DetailLayout = ReturnType<typeof useDetailLayout>

const TABS: { value: SidePanelTab; label: string; icon: ReactNode; key: string }[] = [
  { value: 'notes', label: '笔记', icon: <NotebookPen />, key: 'N' },
  { value: 'ai', label: 'AI 助手', icon: <Sparkles />, key: 'A' },
]

function PanelTabs({ tab }: { tab: SidePanelTab }) {
  const setSidePanel = useUIState((s) => s.setSidePanel)
  return (
    <div role="tablist" aria-label="侧栏内容" className="flex items-center gap-0.5">
      {TABS.map((item) => {
        const selected = item.value === tab
        return (
          <Tooltip key={item.value} content={item.label} shortcut={item.key} side="bottom">
            <button
              type="button"
              role="tab"
              id={`side-panel-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`side-panel-${item.value}`}
              onClick={() => setSidePanel(item.value)}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4',
                selected
                  ? 'bg-muted font-medium text-fg [&_svg]:text-accent'
                  : 'text-fg-muted hover:bg-muted/60 hover:text-fg [&_svg]:text-fg-subtle',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}

export interface DetailSidePanelProps {
  layout: DetailLayout
  /** The question, with `answer` set to the answer currently displayed (custom or default). */
  question: Question
  answerVisible: boolean
  noteRefreshKey: number
  onNoteContentChange: (hasContent: boolean) => void
  onOpenAISettings: () => void
}

/**
 * Notes and AI chat for the current question. On desktop it docks to the right of the page
 * (the page reserves its width, so nothing is covered) and can be resized; on small screens it
 * is a bottom sheet. Both tabs stay mounted once visited, so drafts and scroll survive switching.
 */
export function DetailSidePanel({
  layout,
  question,
  answerVisible,
  noteRefreshKey,
  onNoteContentChange,
  onOpenAISettings,
}: DetailSidePanelProps) {
  const setSidePanel = useUIState((s) => s.setSidePanel)
  const setSidePanelWidth = useUIState((s) => s.setSidePanelWidth)
  const [visited, setVisited] = useState<Set<SidePanelTab>>(() => new Set())
  const panelRef = useRef<HTMLElement>(null)
  const tab = layout.tab

  if (tab && !visited.has(tab)) setVisited(new Set(visited).add(tab))

  // Esc closes the docked panel when focus is inside it or nowhere in particular.
  useEffect(() => {
    if (!layout.docked) return
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      const inPanel = panelRef.current?.contains(event.target as Node)
      if (!inPanel && (isEditableTarget(event.target) || document.getSelection()?.toString())) {
        return
      }
      setSidePanel(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [layout.docked, setSidePanel])

  if (!tab) return null

  const content = (
    <>
      {visited.has('notes') ? (
        <div
          role="tabpanel"
          id="side-panel-notes"
          aria-labelledby="side-panel-tab-notes"
          hidden={tab !== 'notes'}
          className="flex min-h-0 flex-1 flex-col"
        >
          <QuestionNotes
            questionId={question.id}
            refreshKey={noteRefreshKey}
            autoFocus={tab === 'notes'}
            onContentStateChange={onNoteContentChange}
          />
        </div>
      ) : null}
      {visited.has('ai') ? (
        <div
          role="tabpanel"
          id="side-panel-ai"
          aria-labelledby="side-panel-tab-ai"
          hidden={tab !== 'ai'}
          className="flex min-h-0 flex-1 flex-col"
        >
          <AIChatPanel
            question={question}
            answerVisible={answerVisible}
            onOpenSettings={onOpenAISettings}
          />
        </div>
      ) : null}
    </>
  )

  if (!layout.desktop) {
    return (
      <Sheet open onOpenChange={(open) => !open && setSidePanel(null)}>
        <SheetContent
          side="bottom"
          title={tab === 'notes' ? '题目笔记' : 'AI 助手'}
          headerAction={
            <SegmentedControl
              size="sm"
              label="侧栏内容"
              value={tab}
              onValueChange={(value) => setSidePanel(value)}
              options={TABS.map((item) => ({ value: item.value, label: item.label }))}
            />
          }
          className="h-[88dvh]"
          bodyClassName="flex flex-col overflow-hidden"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      ref={panelRef}
      aria-label="笔记与 AI 助手"
      style={{ width: layout.width }}
      className="fixed inset-y-0 right-0 z-30 flex flex-col border-l border-line bg-canvas"
    >
      <ResizeHandle
        edge="left"
        label="调整侧栏宽度"
        value={layout.width}
        min={SIDE_PANEL.min}
        max={SIDE_PANEL.max}
        onResize={(raw) =>
          setSidePanelWidth(clampSidePanelWidth(raw, layout.viewportWidth, layout.leftWidth))
        }
        onReset={() => setSidePanelWidth(SIDE_PANEL.default)}
      />
      <header className="flex h-13 shrink-0 items-center gap-2 border-b border-line pr-2 pl-2.5">
        <PanelTabs tab={tab} />
        <div className="ml-auto flex items-center gap-1">
          <Kbd className="max-xl:hidden">Esc</Kbd>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="关闭侧栏"
            onClick={() => setSidePanel(null)}
          >
            <X />
          </Button>
        </div>
      </header>
      {content}
    </aside>
  )
}
