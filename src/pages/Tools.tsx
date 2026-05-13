import { Link } from 'react-router-dom'
import { preloadPath } from '@/lib/routePreload'

interface ToolCard {
  title: string
  description: string
  href: string
  icon: 'interview' | 'match' | 'prompt' | 'project' | 'questions' | 'review' | 'intro' | 'plan'
}

const toolSections: { title: string; tools: ToolCard[] }[] = [
  {
    title: '面试核心',
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
    title: '准备打磨',
    tools: [
      {
        title: '项目深挖',
        description: '拆解项目亮点、技术难点、追问清单和口语化回答。',
        href: '/tools/project-deep-dive',
        icon: 'project',
      },
      {
        title: '面试问题',
        description: '基于简历、JD 或项目关键词预测这场面试的高概率问题。',
        href: '/tools/interview-questions',
        icon: 'questions',
      },
      {
        title: '自我介绍',
        description: '生成 30 秒、1 分钟、2 分钟中文面试自我介绍。',
        href: '/tools/self-intro',
        icon: 'intro',
      },
    ],
  },
  {
    title: '复盘提升',
    tools: [
      {
        title: '复盘解析',
        description: '把面试记录转成失分点、补强项和下一轮练习清单。',
        href: '/tools/review-analysis',
        icon: 'review',
      },
      {
        title: '学习计划',
        description: '按薄弱点、面试日期和可投入时间生成补强路径。',
        href: '/tools/learning-plan',
        icon: 'plan',
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

  if (type === 'project') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7.5h6l2 2h8v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M4 7.5V6a2 2 0 0 1 2-2h3.5l2 2H18a2 2 0 0 1 2 2v1.5" />
        <path d="M9 14h6" />
        <path d="M9 17h4" />
      </svg>
    )
  }

  if (type === 'questions') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9.2a2.4 2.4 0 0 1 4.6 1c0 1.8-2.4 2.1-2.4 3.8" />
        <path d="M12 17h.01" />
      </svg>
    )
  }

  if (type === 'review') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 4h6l1 2h3v14H5V6h3z" />
        <path d="M9 11h6" />
        <path d="M9 15h3" />
        <path d="m15 16 1.5 1.5L20 14" />
      </svg>
    )
  }

  if (type === 'intro') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M4 19a5 5 0 0 1 10 0" />
        <path d="M16 7h4" />
        <path d="M16 11h5" />
        <path d="M16 15h3" />
      </svg>
    )
  }

  if (type === 'plan') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 10h16" />
        <path d="m8 15 2 2 4-4" />
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
              <Link
                key={tool.href}
                to={tool.href}
                className="tool-card"
                onPointerEnter={() => preloadPath(tool.href)}
                onFocus={() => preloadPath(tool.href)}
              >
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
