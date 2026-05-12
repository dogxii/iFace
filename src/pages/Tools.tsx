import { Link } from 'react-router-dom'

interface ToolCard {
  title: string
  description: string
  href: string
  icon: 'interview' | 'prompt' | 'import'
}

const toolCards: ToolCard[] = [
  {
    title: '模拟面试',
    description: '基于岗位 JD 和简历进行中文一问一答，结束后查看评分与改进建议。',
    href: '/mock-interview',
    icon: 'interview',
  },
  {
    title: 'AI 出题',
    description: '复制结构化 Prompt，让 AI 批量生成符合 iFace 格式的面试题。',
    href: '/prompt',
    icon: 'prompt',
  },
  {
    title: '题库导入',
    description: '加载内置题库，或导入自定义 JSON 题库作为自己的训练素材。',
    href: '/import',
    icon: 'import',
  },
]

function ToolIcon({ type }: { type: ToolCard['icon'] }) {
  if (type === 'interview') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 7.5h10" />
        <path d="M7 11.5h6" />
        <path d="M6.5 18.5 4 21v-3.5A3.5 3.5 0 0 1 2 14.3V6.5A3.5 3.5 0 0 1 5.5 3h13A3.5 3.5 0 0 1 22 6.5v7A3.5 3.5 0 0 1 18.5 17H10" />
      </svg>
    )
  }

  if (type === 'prompt') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 8 4 4-4 4" />
        <path d="M12 16h6" />
        <rect x="3" y="4" width="18" height="16" rx="3" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v11" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 13v5a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-5" />
    </svg>
  )
}

export default function Tools() {
  return (
    <div className="page-container tools-page">
      <div className="animate-fade-in" style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.015em',
            marginBottom: 4,
          }}
        >
          工具
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          不一定每天用，但关键时刻很有用的面试辅助功能
        </p>
      </div>

      <section className="tools-section">
        <div className="tools-section-header">
          <h2>可用工具</h2>
          <span>3 个</span>
        </div>
        <div className="tools-list">
          {toolCards.map((tool) => (
            <Link key={tool.href} to={tool.href} className="tool-card">
              <span className="tool-icon">
                <ToolIcon type={tool.icon} />
              </span>
              <span className="tool-content">
                <strong>{tool.title}</strong>
                <span>{tool.description}</span>
              </span>
              <span className="tool-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <style>{`
        .tools-page {
          max-width: 1100px;
        }

        .tools-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .tools-section-header h2 {
          font-size: 15px;
          line-height: 1.3;
          font-weight: 700;
          color: var(--text);
        }

        .tools-section-header span {
          font-size: 12px;
          color: var(--text-3);
        }

        .tools-list {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .tool-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          min-width: 0;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text);
          padding: 15px 16px;
          text-decoration: none;
          transition:
            border-color 0.15s var(--ease-out),
            background 0.15s var(--ease-out);
        }

        .tool-card:hover {
          border-color: var(--border);
          background: var(--surface-2);
        }

        .tool-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          color: var(--text-3);
          flex-shrink: 0;
        }

        .tool-card:hover .tool-icon,
        .tool-card:hover .tool-arrow {
          color: var(--primary);
        }

        .tool-icon svg {
          width: 17px;
          height: 17px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.7;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .tool-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .tool-content strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 15px;
          color: var(--text);
        }

        .tool-content > span:last-child {
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-2);
        }

        .tool-arrow {
          color: var(--text-3);
          font-size: 16px;
          line-height: 1;
          transition: color 0.15s var(--ease-out);
        }

        @media (max-width: 900px) {
          .tools-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
