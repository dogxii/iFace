import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'
import { type CategoryMap, DEFAULT_CATEGORY_MAP, getCategoryMap } from '@/lib/db'
import { BUILTIN_CATEGORIES } from '@/lib/questionLoader'
import { useStudyStore } from '@/store/useStudyStore'

const ONBOARDING_DONE_KEY = 'iface_onboarding_done_v1'

type StepId = 'welcome' | 'banks' | 'workflow'

const steps: { id: StepId; label: string }[] = [
  { id: 'welcome', label: '欢迎' },
  { id: 'banks', label: '题库' },
  { id: 'workflow', label: '开始' },
]

function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_DONE_KEY) === '1'
  } catch {
    return true
  }
}

function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_DONE_KEY, '1')
  } catch {
    // ignore
  }
}

function IconCheck() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function FeatureRow({
  title,
  description,
  index,
}: {
  title: string
  description: string
  index: number
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px minmax(0, 1fr)',
        gap: 10,
        alignItems: 'flex-start',
        padding: '12px 0',
        borderTop: index === 0 ? 'none' : '1px solid var(--border-subtle)',
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          fontSize: 12,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {index + 1}
      </span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
          {title}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55 }}>{description}</p>
      </div>
    </div>
  )
}

export function OnboardingGuide() {
  const location = useLocation()
  const { hiddenCategories, setHiddenCategories } = useStudyStore()
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })

  const step = steps[stepIndex]

  useEffect(() => {
    getCategoryMap().then(setCategoryMap)
  }, [])

  useEffect(() => {
    if (location.pathname === '/api/auth' || hasCompletedOnboarding()) return
    const frame = window.requestAnimationFrame(() => setOpen(true))
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        markOnboardingDone()
        setOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const categories = useMemo(
    () =>
      Object.entries(categoryMap).sort(([, a], [, b]) => {
        if (a.builtin !== b.builtin) return a.builtin ? -1 : 1
        return (a.order ?? 99) - (b.order ?? 99)
      }),
    [categoryMap],
  )

  const visibleCount = categories.filter(([key]) => !hiddenCategories.has(key)).length

  const close = useCallback(() => {
    markOnboardingDone()
    setOpen(false)
  }, [])

  const toggleCategory = useCallback(
    (categoryName: string) => {
      const nextHidden = new Set(hiddenCategories)
      if (nextHidden.has(categoryName)) {
        nextHidden.delete(categoryName)
      } else {
        nextHidden.add(categoryName)
      }
      setHiddenCategories([...nextHidden])
    },
    [hiddenCategories, setHiddenCategories],
  )

  const setAllCategoriesVisible = useCallback(() => {
    setHiddenCategories([])
  }, [setHiddenCategories])

  const setOnlyCategoryVisible = useCallback(
    (categoryName: string) => {
      setHiddenCategories(categories.filter(([key]) => key !== categoryName).map(([key]) => key))
    },
    [categories, setHiddenCategories],
  )

  if (!open) {
    return null
  }

  return (
    <>
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          background: 'rgba(17,17,24,0.36)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        style={{
          position: 'fixed',
          inset: 'max(20px, env(safe-area-inset-top)) 20px 20px',
          zIndex: 91,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          className="glass"
          style={{
            width: 'min(760px, 100%)',
            maxHeight: 'calc(100dvh - 40px)',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-xl)',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '18px 20px 14px',
              borderBottom: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {stepIndex + 1} / {steps.length}
                </span>
              </div>
              <h2
                id="onboarding-title"
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--text)',
                  letterSpacing: '-0.015em',
                  lineHeight: 1.25,
                }}
              >
                {step.id === 'welcome'
                  ? '欢迎来到 iFace！'
                  : step.id === 'banks'
                    ? '题库设置'
                    : '准备好了'}
              </h2>
            </div>
            <button
              type="button"
              aria-label="跳过新手引导"
              onClick={close}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <IconClose />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '168px minmax(0, 1fr)',
              minHeight: 430,
            }}
            className="onboarding-body"
          >
            <aside
              style={{
                padding: 16,
                borderRight: '1px solid var(--border-subtle)',
                background: 'var(--surface)',
              }}
            >
              {steps.map((item, index) => {
                const active = index === stepIndex
                const done = index < stepIndex
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setStepIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: active ? 'var(--primary-light)' : 'transparent',
                      color: active ? 'var(--primary)' : 'var(--text-2)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: active || done ? 'var(--primary)' : 'var(--surface-3)',
                        color: active || done ? 'white' : 'var(--text-3)',
                        flexShrink: 0,
                      }}
                    >
                      {done ? <IconCheck /> : index + 1}
                    </span>
                    {item.label}
                  </button>
                )
              })}
            </aside>

            <div
              style={{
                padding: 20,
                overflowY: 'auto',
                background: 'var(--surface)',
              }}
            >
              {step.id === 'welcome' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                    人你好，我是项目作者 <a href="https://dogxi.me">Dogxi</a> 👋<br />
                    很高兴你来到这里 🎉，这里是一个永远开源免费的八股面试题网站！
                    <br />
                    接下来需要先花半分钟完成设置，能让刷题体验轻松很多哦。
                    <br />
                    iFace 拥有超多题目，以及下面三大功能，至于更多...我想你主动去发现会更有意思 👀
                    <br />
                    项目地址：https://github.com/dogxii/iface，交流Q群：279167739
                    <br />
                    作者主页：https://dogxi.me，最后感谢大家的喜欢 ❤️！
                  </p>
                  <div
                    style={{
                      padding: '2px 14px',
                      borderRadius: 12,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--surface-2)',
                    }}
                  >
                    <FeatureRow
                      index={0}
                      title="海量题库"
                      description="从题库列表进入任意题目，先说出你的答案，再展开参考答案。"
                    />
                    <FeatureRow
                      index={1}
                      title="专项练习"
                      description="练习页可以按模块、难度和学习状态组合，适合冲刺和查漏补缺。"
                    />
                    <FeatureRow
                      index={2}
                      title="AI 助手"
                      description="在设置里的 AI 助手填入 API Key 后，题目详情页会出现分析和追问辅助。"
                    />
                  </div>
                </div>
              )}

              {step.id === 'banks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                    ⚙️ 这里是题库设置页面，你可以关闭你不需要的题目分类，
                    <br />
                    不用有任何顾虑！题目关闭之后仍然可以在设置页面重新打开 ✅
                    <br />
                    （未来 iFace 仍会添加更多但高质量的题目！）
                  </p>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button size="sm" variant="secondary" onClick={setAllCategoriesVisible}>
                      全部显示
                    </Button>
                    {categories.slice(0, 4).map(([key, category]) => (
                      <Button
                        key={key}
                        size="sm"
                        variant="ghost"
                        onClick={() => setOnlyCategoryVisible(key)}
                      >
                        只看{category.name}
                      </Button>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 8,
                    }}
                    className="onboarding-bank-grid"
                  >
                    {categories.map(([key, category]) => {
                      const enabled = !hiddenCategories.has(key)
                      const builtinCat = BUILTIN_CATEGORIES.find((item) => item.category === key)
                      const fileCount = builtinCat?.files.length ?? 0
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleCategory(key)}
                          style={{
                            minHeight: 86,
                            padding: 12,
                            borderRadius: 10,
                            border: `1px solid ${
                              enabled ? 'rgba(var(--primary-rgb),0.3)' : 'var(--border-subtle)'
                            }`,
                            background: enabled ? 'var(--primary-light)' : 'var(--surface-2)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                minWidth: 0,
                                fontSize: 14,
                                fontWeight: 700,
                                color: enabled ? 'var(--primary)' : 'var(--text-3)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {category.name}
                            </span>
                            <span
                              style={{
                                width: 32,
                                height: 18,
                                borderRadius: 99,
                                background: enabled ? 'var(--primary)' : 'var(--border)',
                                position: 'relative',
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  position: 'absolute',
                                  top: 3,
                                  left: enabled ? 17 : 3,
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  background: 'white',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                  transition: 'left 0.2s',
                                }}
                              />
                            </span>
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                            {category.modules.length} 个模块
                            {fileCount > 0 ? ` · ${fileCount} 个文件` : ''}
                          </span>
                          <span
                            style={{
                              alignSelf: 'flex-start',
                              fontSize: 11,
                              fontWeight: 600,
                              color: enabled ? 'var(--primary)' : 'var(--text-3)',
                            }}
                          >
                            {enabled ? '显示中' : '已隐藏'}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                    当前显示 {visibleCount} 个题库。隐藏只是收起入口和统计，不会删除题目、
                    笔记或学习记录。
                  </p>
                </div>
              )}

              {step.id === 'workflow' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                    如果你不知道从哪里开始，推荐先打开设置，看看有什么可以调整
                    <br />
                    然后，享受刷题！
                    <br />
                    人再见，祝你生活愉快，面试顺利 🎉
                    <br />
                    ps: 本引导窗口只在首次进入页面时显示。
                    <br />
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 10,
                    }}
                    className="onboarding-action-grid"
                  >
                    {[
                      {
                        title: '设置',
                        body: '右上角设置里可以调整题库展示、答题模式、每日目标和 AI 助手。',
                        label: '随时调整',
                      },
                      {
                        title: '题库',
                        body: '从顶部导航进入题库，打开任意题目后，先作答再看参考答案。',
                        label: '逐题学习',
                      },
                      {
                        title: '练习',
                        body: '想集中刷一组题时，去练习页按模块、难度和学习状态组合题目。',
                        label: '专项刷题',
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        style={{
                          minHeight: 156,
                          padding: 14,
                          borderRadius: 12,
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--surface-2)',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 16,
                        }}
                      >
                        <span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: 14,
                              fontWeight: 700,
                              color: 'var(--text)',
                              marginBottom: 6,
                            }}
                          >
                            {item.title}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55 }}>
                            {item.body}
                          </span>
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: 'var(--primary)',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: '1px solid rgba(var(--primary-rgb),0.18)',
                      background: 'var(--primary-light)',
                      color: 'var(--text-2)',
                      fontSize: 12,
                      lineHeight: 1.65,
                    }}
                  >
                    本网站强烈推荐配合面试食用 🍜
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              flexShrink: 0,
              background: 'var(--surface)',
            }}
          >
            <Button variant="ghost" onClick={close}>
              跳过引导
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              {stepIndex > 0 && (
                <Button variant="secondary" onClick={() => setStepIndex((value) => value - 1)}>
                  上一步
                </Button>
              )}
              {stepIndex < steps.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={() => setStepIndex((value) => value + 1)}
                  iconRight={<IconArrowRight />}
                >
                  下一步
                </Button>
              ) : (
                <Button variant="primary" onClick={close}>
                  完成引导
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 760px) {
          .onboarding-body {
            grid-template-columns: 1fr !important;
          }
          .onboarding-body > aside {
            display: flex;
            gap: 6px;
            border-right: none !important;
            border-bottom: 1px solid var(--border-subtle);
            overflow-x: auto;
          }
          .onboarding-body > aside > button {
            width: auto !important;
            min-width: 96px;
          }
          .onboarding-bank-grid,
          .onboarding-action-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}
