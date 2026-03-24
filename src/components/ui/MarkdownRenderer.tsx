import { useCallback, useState } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
}

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

const components: Components = {
  // Code blocks
  pre({ children, ...props }) {
    // Extract raw text for the copy button
    const codeText = extractText(children)

    return (
      <div className="code-block-wrap">
        <pre
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '14px 16px',
            overflowX: 'auto',
            margin: '14px 0',
            lineHeight: 1.65,
          }}
          {...props}
        >
          {children}
        </pre>
        <CopyButton code={codeText} />
      </div>
    )
  },

  code({ className, children, ...props }) {
    const isInline = !className
    if (isInline) {
      return (
        <code
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82em',
            background: 'var(--surface-3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 4,
            padding: '1px 5px',
            color: 'var(--primary)',
            wordBreak: 'break-word',
          }}
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code className={className ?? ''} style={{ color: 'var(--text)' }} {...props}>
        {children}
      </code>
    )
  },

  // Headings
  h1({ children, ...props }) {
    return (
      <h1
        style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--text)',
          marginTop: '1.5em',
          marginBottom: '0.6em',
          lineHeight: 1.35,
        }}
        {...props}
      >
        {children}
      </h1>
    )
  },
  h2({ children, ...props }) {
    return (
      <h2
        style={{
          fontSize: '1.05rem',
          fontWeight: 600,
          color: 'var(--text)',
          marginTop: '1.4em',
          marginBottom: '0.5em',
          lineHeight: 1.35,
        }}
        {...props}
      >
        {children}
      </h2>
    )
  },
  h3({ children, ...props }) {
    return (
      <h3
        style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: 'var(--text)',
          marginTop: '1.2em',
          marginBottom: '0.4em',
          lineHeight: 1.4,
        }}
        {...props}
      >
        {children}
      </h3>
    )
  },
  h4({ children, ...props }) {
    return (
      <h4
        style={{
          fontSize: '0.9375rem',
          fontWeight: 500,
          color: 'var(--text)',
          marginTop: '1em',
          marginBottom: '0.3em',
        }}
        {...props}
      >
        {children}
      </h4>
    )
  },

  // Paragraph
  p({ children, ...props }) {
    return (
      <p
        style={{
          fontSize: '0.9375rem',
          color: 'var(--text)',
          lineHeight: 1.8,
          marginBottom: '0.85em',
        }}
        {...props}
      >
        {children}
      </p>
    )
  },

  // Lists
  ul({ children, ...props }) {
    return (
      <ul
        style={{
          listStyle: 'disc',
          paddingLeft: '1.4em',
          marginBottom: '0.85em',
          color: 'var(--text)',
        }}
        {...props}
      >
        {children}
      </ul>
    )
  },
  ol({ children, ...props }) {
    return (
      <ol
        style={{
          listStyle: 'decimal',
          paddingLeft: '1.4em',
          marginBottom: '0.85em',
          color: 'var(--text)',
        }}
        {...props}
      >
        {children}
      </ol>
    )
  },
  li({ children, ...props }) {
    return (
      <li
        style={{
          fontSize: '0.9375rem',
          lineHeight: 1.75,
          color: 'var(--text)',
          marginBottom: '0.25em',
        }}
        {...props}
      >
        {children}
      </li>
    )
  },

  // Blockquote
  blockquote({ children, ...props }) {
    return (
      <blockquote
        style={{
          borderLeft: '3px solid var(--primary)',
          paddingLeft: '1em',
          margin: '1.2em 0',
          color: 'var(--text-2)',
          fontStyle: 'italic',
        }}
        {...props}
      >
        {children}
      </blockquote>
    )
  },

  // Horizontal rule
  hr({ ...props }) {
    return (
      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--border)',
          margin: '1.4em 0',
        }}
        {...props}
      />
    )
  },

  // Strong / Em
  strong({ children, ...props }) {
    return (
      <strong style={{ fontWeight: 600, color: 'var(--text)' }} {...props}>
        {children}
      </strong>
    )
  },
  em({ children, ...props }) {
    return (
      <em style={{ fontStyle: 'italic', color: 'var(--text-2)' }} {...props}>
        {children}
      </em>
    )
  },

  // Link
  a({ children, href, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: 'var(--primary)',
          textDecoration: 'underline',
          textUnderlineOffset: 2,
          textDecorationColor: 'rgba(var(--primary-rgb), 0.4)',
          transition: 'text-decoration-color 0.15s',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.textDecorationColor = 'var(--primary)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.textDecorationColor =
            'rgba(var(--primary-rgb), 0.4)'
        }}
        {...props}
      >
        {children}
      </a>
    )
  },

  // Table
  table({ children, ...props }) {
    return (
      <div
        style={{
          overflowX: 'auto',
          margin: '1em 0',
          borderRadius: 10,
          border: '1px solid var(--border)',
        }}
      >
        <table
          style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}
          {...props}
        >
          {children}
        </table>
      </div>
    )
  },
  thead({ children, ...props }) {
    return (
      <thead style={{ background: 'var(--surface-2)' }} {...props}>
        {children}
      </thead>
    )
  },
  tbody({ children, ...props }) {
    return <tbody {...props}>{children}</tbody>
  },
  tr({ children, ...props }) {
    return (
      <tr style={{ borderTop: '1px solid var(--border-subtle)' }} {...props}>
        {children}
      </tr>
    )
  },
  th({ children, ...props }) {
    return (
      <th
        style={{
          padding: '8px 14px',
          textAlign: 'left',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
        {...props}
      >
        {children}
      </th>
    )
  },
  td({ children, ...props }) {
    return (
      <td
        style={{
          padding: '8px 14px',
          color: 'var(--text-2)',
          fontSize: '0.875rem',
        }}
        {...props}
      >
        {children}
      </td>
    )
  },
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
