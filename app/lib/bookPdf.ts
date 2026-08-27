export interface BookPdfChapter {
  title: string
  paragraphs: string[]
}

export interface BookPdfPayload {
  filename: string
  title: string
  language: 'ar' | 'en'
  chapters: BookPdfChapter[]
}

const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123
const PAGE_MARGIN = 76

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

async function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Unable to render PDF page')), 'image/jpeg', 0.92)
  })
  return new Uint8Array(await blob.arrayBuffer())
}

function imagePdf(images: Uint8Array[]): Uint8Array {
  const objects = new Map<number, Uint8Array>()
  const pageIds: number[] = []
  let nextId = 3

  images.forEach((image, index) => {
    const imageId = nextId++
    const contentId = nextId++
    const pageId = nextId++
    pageIds.push(pageId)
    objects.set(imageId, concatBytes([
      encode(`<< /Type /XObject /Subtype /Image /Width ${PAGE_WIDTH} /Height ${PAGE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),
      image,
      encode('\nendstream'),
    ]))
    const commands = encode(`q\n595.28 0 0 841.89 0 0 cm\n/Im${index + 1} Do\nQ`)
    objects.set(contentId, concatBytes([encode(`<< /Length ${commands.length} >>\nstream\n`), commands, encode('\nendstream')]))
    objects.set(pageId, encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`))
  })

  objects.set(1, encode('<< /Type /Catalog /Pages 2 0 R >>'))
  objects.set(2, encode(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`))

  const header = encode('%PDF-1.4\n%âãÏÓ\n')
  const parts: Uint8Array[] = [header]
  const offsets: number[] = [0]
  let offset = header.length
  for (let id = 1; id < nextId; id += 1) {
    const body = objects.get(id)
    if (!body) throw new Error(`Missing PDF object ${id}`)
    offsets[id] = offset
    const object = concatBytes([encode(`${id} 0 obj\n`), body, encode('\nendobj\n')])
    parts.push(object)
    offset += object.length
  }
  const xrefOffset = offset
  const xref = [`xref\n0 ${nextId}\n`, '0000000000 65535 f \n']
  for (let id = 1; id < nextId; id += 1) xref.push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`)
  parts.push(encode(`${xref.join('')}trailer\n<< /Size ${nextId} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`))
  return concatBytes(parts)
}

export async function downloadBookPdf(payload: BookPdfPayload): Promise<void> {
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_WIDTH
  canvas.height = PAGE_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('PDF rendering is not supported in this browser')

  const arabicFont = getComputedStyle(document.documentElement).getPropertyValue('--font-book-naskh').trim() || 'serif'
  const pages: Uint8Array[] = []
  let y = PAGE_MARGIN

  const resetPage = () => {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    context.fillStyle = '#2c1a0e'
    context.textBaseline = 'top'
    context.direction = payload.language === 'ar' ? 'rtl' : 'ltr'
    context.textAlign = payload.language === 'ar' ? 'right' : 'left'
    y = PAGE_MARGIN
  }
  const drawBranding = () => {
    context.save()
    context.direction = 'ltr'
    context.textAlign = 'center'
    context.textBaseline = 'alphabetic'
    context.fillStyle = 'rgba(44, 26, 14, 0.52)'
    context.font = '600 12px Arial, sans-serif'
    context.fillText('ArabicWithM · Learn Arabic through stories', PAGE_WIDTH / 2, PAGE_HEIGHT - 28)
    context.restore()
  }
  const commitPage = async () => {
    drawBranding()
    pages.push(await canvasToJpeg(canvas))
    resetPage()
  }
  const drawLines = async (text: string, size: number, lineHeight: number, bold = false) => {
    context.font = `${bold ? 700 : 400} ${size}px ${payload.language === 'ar' ? arabicFont : 'Arial, sans-serif'}`
    const lines = wrapText(context, text, PAGE_WIDTH - PAGE_MARGIN * 2)
    for (const line of lines) {
      if (y + lineHeight > PAGE_HEIGHT - PAGE_MARGIN) await commitPage()
      context.fillText(line, payload.language === 'ar' ? PAGE_WIDTH - PAGE_MARGIN : PAGE_MARGIN, y)
      y += lineHeight
    }
  }

  resetPage()
  await drawLines(payload.title, payload.language === 'ar' ? 38 : 32, 52, true)
  y += 22

  for (let chapterIndex = 0; chapterIndex < payload.chapters.length; chapterIndex += 1) {
    const chapter = payload.chapters[chapterIndex]
    if (chapterIndex > 0 && y > PAGE_MARGIN) await commitPage()
    context.fillStyle = '#8b6508'
    await drawLines(chapter.title, payload.language === 'ar' ? 27 : 23, 38, true)
    context.fillStyle = '#2c1a0e'
    y += 16
    for (const paragraph of chapter.paragraphs) {
      await drawLines(paragraph, payload.language === 'ar' ? 24 : 17, payload.language === 'ar' ? 42 : 29)
      y += 17
    }
  }
  if (y > PAGE_MARGIN || pages.length === 0) {
    drawBranding()
    pages.push(await canvasToJpeg(canvas))
  }

  const bytes = imagePdf(pages)
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = payload.filename.endsWith('.pdf') ? payload.filename : `${payload.filename}.pdf`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
