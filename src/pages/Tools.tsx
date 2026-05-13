import { Link } from 'react-router-dom'

interface ToolCard {
  title: string
  description: string
  href: string
  icon: 'interview' | 'match' | 'prompt'
}

const toolSections: { title: string; tools: ToolCard[] }[] = [
  {
    title: '面试辅助',
    tools: [
      {
        title: '模拟面试',
        description: '基于岗位 JD 和简历进行中文一问一答，结束后查看评分与改进建议。',
        href: '/mock-interview',
        icon: 'interview',
      },
      {
        title: '简历 JD 诊断',
        description: '对照目标岗位，找出简历里的匹配点、风险点和可能追问。',
        href: '/tools/jd-match',
        icon: 'match',
      },
    ],
  },
  {
    title: 'AI 出题',
    tools: [
      {
        title: 'AI 出题',
        description: '复制结构化 Prompt，让 AI 批量生成符合 iFace 格式的面试题。',
        href: '/prompt',
        icon: 'prompt',
      },
    ],
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
      <path d="M8 6h8" />
      <path d="M8 10h5" />
      <path d="M8 14h4" />
      <path d="m15 15 2 2 4-4" />
      <path d="M6 21h8" />
      <path d="M18 10V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2" />
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

      {toolSections.map((section) => (
        <section key={section.title} className="tools-section">
          <div className="tools-section-header">
            <h2>{section.title}</h2>
            <span>{section.tools.length} 个</span>
          </div>
          <div className="tools-list">
            {section.tools.map((tool) => (
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
      ))}

      <style>{`
        .tools-page {
          max-width: 1100px;
        }

        .tools-section + .tools-section {
          margin-top: 24px;
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
