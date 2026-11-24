import { useCallback, useState } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

export interface MarkdownRendererProps {
  content: string
  className?: string
  resolveImageSrc?: (src: string) => string | undefined
}

const LOCAL_NOTE_IMAGE_SRC_PREFIX = 'iface-note-image:'

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea')
      el.value = code
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }, [code])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`code-copy-btn${copied ? ' copied' : ''}`}
      aria-label={copied ? '已复制' : '复制代码'}
    >
      {copied ? (
        <>
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          已复制
        </>
      ) : (
        <>
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          复制
        </>
      )}
    </button>
  )
}

// ─── Extract plain text from React children ───────────────────────────────────

function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (children && typeof children === 'object' && 'props' in (children as object)) {
    const el = children as React.ReactElement<{ children?: React.ReactNode }>
    return extractText(el.props.children)
  }
  return ''
}

// ─── Components ───────────────────────────────────────────────────────────────

// Element styles live in src/styles/markdown.css (`.markdown`); components here only add
// behaviour: copy buttons, links opening in a new tab, scrollable tables, local images.
const components: Components = {
  pre({ children, ...props }) {
    return (
      <div className="code-block-wrap">
        <pre {...props}>{children}</pre>
        <CopyButton code={extractText(children)} />
      </div>
    )
  },

  a({ children, href, ...props }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
  },

  table({ children, ...props }) {
    return (
      <div className="markdown-table">
        <table {...props}>{children}</table>
      </div>
    )
  },
}

function transformMarkdownUrl(value: string, key: string) {
  if (key === 'src' && value.startsWith(LOCAL_NOTE_IMAGE_SRC_PREFIX)) return value
  return defaultUrlTransform(value)
}

export function MarkdownRenderer({
  content,
  className = '',
  resolveImageSrc,
}: MarkdownRendererProps) {
  const markdownComponents: Components = {
    ...components,
    img({ src, alt, ...props }) {
      const rawSrc = typeof src === 'string' ? src : ''
      const resolvedByResolver = rawSrc ? resolveImageSrc?.(rawSrc) : undefined
      const missingLocalImage =
        rawSrc.startsWith(LOCAL_NOTE_IMAGE_SRC_PREFIX) && !resolvedByResolver
      const resolvedSrc = resolvedByResolver ?? rawSrc

      if (missingLocalImage) {
        return <span className="markdown-image-missing">本地图片不可用</span>
      }

      return <img src={resolvedSrc} alt={alt ?? ''} loading="lazy" {...props} />
    },
  }

  return (
    <div className={`markdown min-w-0 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
        urlTransform={transformMarkdownUrl}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
