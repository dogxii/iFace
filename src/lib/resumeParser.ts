export interface ParsedResumeFile {
  fileName: string
  text: string
  warning?: string
}

type PdfTextItem = {
  str?: string
}

const MAX_RESUME_CHARS = 30_000

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function truncateResumeText(text: string): { text: string; warning?: string } {
  if (text.length <= MAX_RESUME_CHARS) return { text }
  return {
    text: text.slice(0, MAX_RESUME_CHARS).trim(),
    warning: `简历文本较长，已截取前 ${MAX_RESUME_CHARS.toLocaleString()} 字用于模拟面试`,
  }
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString()

  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((item: unknown) => {
        const candidate = item as PdfTextItem
        return typeof candidate.str === 'string' ? candidate.str : ''
      })
      .filter(Boolean)
      .join(' ')
    if (text.trim()) pages.push(text)
  }

  return pages.join('\n\n')
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth/mammoth.browser')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}

export async function parseResumeFile(file: File): Promise<ParsedResumeFile> {
  const name = file.name
  const ext = name.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'doc') {
    throw new Error('暂不支持旧版 .doc 文件，请先转为 .docx、.pdf、.txt 或 .md')
  }

  let rawText = ''
  if (ext === 'pdf') {
    rawText = await parsePdf(file)
  } else if (ext === 'docx') {
    rawText = await parseDocx(file)
  } else if (ext === 'txt' || ext === 'md' || file.type.startsWith('text/')) {
    rawText = await file.text()
  } else {
    throw new Error('仅支持 PDF、DOCX、TXT 和 Markdown 简历')
  }

  const normalized = normalizeExtractedText(rawText)
  if (!normalized) {
    throw new Error('没有从文件中解析到可用文本，可以改用粘贴简历文本')
  }

  const truncated = truncateResumeText(normalized)
  return {
    fileName: name,
    text: truncated.text,
    warning: truncated.warning,
  }
}
