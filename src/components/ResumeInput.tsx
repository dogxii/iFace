import { FileText, FileUp, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { parseResumeFile } from '@/lib/resumeParser'
import { Button, cn, Spinner, Textarea } from '@/ui'

const RESUME_ACCEPT =
  '.pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export interface ResumeValue {
  text: string
  fileName: string | null
}

/**
 * Resume field: drop or pick a PDF / DOCX / TXT / MD file to parse it locally,
 * or paste plain text. Used by the JD diagnosis and mock interview pages.
 */
export function ResumeInput({
  id,
  value,
  onChange,
  onError,
  rows = 4,
}: {
  id: string
  value: ResumeValue
  onChange: (next: ResumeValue) => void
  onError: (message: string) => void
  rows?: number
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [warning, setWarning] = useState<{ fileName: string; text: string } | null>(null)

  const handleFile = async (file: File) => {
    setParsing(true)
    try {
      const parsed = await parseResumeFile(file)
      onChange({ text: parsed.text, fileName: parsed.fileName })
      setWarning(parsed.warning ? { fileName: parsed.fileName, text: parsed.warning } : null)
    } catch (err) {
      onError(err instanceof Error ? err.message : '简历解析失败')
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const note =
    warning && warning.fileName === value.fileName ? warning.text : '已解析，可在下方修改文本'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          简历
        </label>
        {value.text ? (
          <span className="text-xs text-fg-subtle tabular-nums">{value.text.trim().length} 字</span>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={RESUME_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {value.fileName ? (
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-subtle px-3 py-2">
          <FileText className="size-4 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-fg">{value.fileName}</p>
            <p className="truncate text-xs text-fg-subtle">{note}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="移除简历"
            onClick={() => onChange({ text: '', fileName: null })}
          >
            <X />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={parsing}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) handleFile(file)
          }}
          className={cn(
            'flex flex-col items-center gap-1 rounded-lg border border-dashed px-3 py-4 text-center transition-colors',
            dragging
              ? 'border-accent bg-accent-subtle'
              : 'border-line-strong hover:border-accent hover:bg-subtle',
          )}
        >
          {parsing ? (
            <Spinner size="sm" className="text-accent" />
          ) : (
            <FileUp className="size-4 text-fg-subtle" />
          )}
          <span className="text-sm text-fg">
            {parsing ? '正在解析简历…' : '上传或拖入简历文件'}
          </span>
          <span className="text-xs text-fg-subtle">支持 PDF、DOCX、TXT、MD，仅在本地解析</span>
        </button>
      )}

      <Textarea
        id={id}
        value={value.text}
        onChange={(e) => onChange({ text: e.target.value, fileName: value.fileName })}
        placeholder="也可以直接粘贴简历文本…"
        rows={value.text ? Math.max(rows, 8) : rows}
        className="text-sm"
      />
    </div>
  )
}
