/**
 * تەپەككۇر بۇلىقى — كۆپ فورماتلىق يەرلىك ھۆججەت ئەكىرىش ۋە چىقىرىش ماتورى
 * 100% Local Client-Side Import/Export: PDF, Word (.docx), TXT, MD
 * Zero external network calls or CDN workers.
 */

import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import mammoth from 'mammoth';
import { NoteItem } from '../types/vault';
import { downloadTextFile } from './storage';

/**
 * Converts a local Word (.docx) file into clean Markdown text on the user's device.
 */
export async function importDocxFileToMarkdown(file: File): Promise<{ title: string; content: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  const rawHtml = htmlResult.value || '';

  // Parse converted HTML safely using browser DOMParser to produce clean Markdown
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const lines: string[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent ?? '').trim();

    if (!text && tag !== 'table') return;

    if (tag === 'h1') {
      lines.push(`# ${text}`, '');
    } else if (tag === 'h2') {
      lines.push(`## ${text}`, '');
    } else if (tag === 'h3') {
      lines.push(`### ${text}`, '');
    } else if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
      lines.push(`#### ${text}`, '');
    } else if (tag === 'p') {
      lines.push(text, '');
    } else if (tag === 'ul') {
      el.querySelectorAll(':scope > li').forEach((li) => {
        const t = (li.textContent ?? '').trim();
        if (t) lines.push(`- ${t}`);
      });
      lines.push('');
    } else if (tag === 'ol') {
      el.querySelectorAll(':scope > li').forEach((li, idx) => {
        const t = (li.textContent ?? '').trim();
        if (t) lines.push(`${idx + 1}. ${t}`);
      });
      lines.push('');
    } else if (tag === 'blockquote') {
      lines.push(`> ${text}`, '');
    } else if (tag === 'table') {
      const rows = Array.from(el.querySelectorAll('tr')).map((tr) =>
        Array.from(tr.querySelectorAll('th, td')).map((c) => (c.textContent ?? '').trim().replace(/\|/g, ' '))
      );
      if (rows.length > 0) {
        const colCount = Math.max(...rows.map((r) => r.length));
        const header = rows[0];
        while (header.length < colCount) header.push('');
        lines.push(`| ${header.join(' | ')} |`);
        lines.push(`| ${header.map(() => '---').join(' | ')} |`);
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          while (row.length < colCount) row.push('');
          lines.push(`| ${row.join(' | ')} |`);
        }
        lines.push('');
      }
    } else {
      Array.from(el.childNodes).forEach(walk);
    }
  };

  Array.from(doc.body.childNodes).forEach(walk);

  const baseTitle = file.name.replace(/\.docx$/i, '').trim() || 'Word ھۆججىتى';
  const markdown = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const content = markdown.startsWith('# ') ? markdown : `# ${baseTitle}\n\n${markdown}`;

  return { title: baseTitle, content };
}

/**
 * Extracts selectable text from a local PDF Blob using bundled pdfjs-dist (zero external CDN).
 */
export async function extractPdfTextToMarkdown(
  blob: Blob,
  fileName: string
): Promise<{ pageCount: number; markdown: string; hasText: boolean }> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const baseTitle = fileName.replace(/\.pdf$/i, '').trim() || 'PDF ھۆججىتى';
  const sections: string[] = [`# ${baseTitle}`, '', '#PDF #كىتاب', ''];
  let extractedChars = 0;

  const maxPages = Math.min(pdf.numPages, 80);
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    const joined = pageStrings.join(' ').replace(/\s+/g, ' ').trim();
    if (joined) {
      extractedChars += joined.length;
      sections.push(`## ${pageNum}-بەت`, '', joined, '');
    }
  }

  if (pdf.numPages > maxPages) {
    sections.push(`> ئەسكەرتىش: جەمئىي ${pdf.numPages} بەتتىن دەسلەپكى ${maxPages} بەتنىڭ تېكىستى چىقىرىلدى.`);
  }

  return {
    pageCount: pdf.numPages,
    markdown: sections.join('\n').trim(),
    hasText: extractedChars > 10,
  };
}

/**
 * Exports a Uyghur RTL Markdown note to a formatted Microsoft Word (.docx) file locally.
 */
export async function exportNoteAsDocx(note: NoteItem): Promise<void> {
  const lines = note.content.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: '', bidirectional: true }));
      continue;
    }

    const hMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (hMatch) {
      const levelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
      };
      const cleanText = hMatch[2].replace(/[*_`~]/g, '');
      paragraphs.push(
        new Paragraph({
          heading: levelMap[hMatch[1].length] ?? HeadingLevel.HEADING_2,
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: cleanText, rightToLeft: true, bold: true })],
        })
      );
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*+]\s+(\[[xX ]\]\s+)?/, '');
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: itemText, rightToLeft: true })],
        })
      );
      continue;
    }

    const cleanPara = trimmed.replace(/^>\s?/, '');
    paragraphs.push(
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.BOTH,
        indent: { firstLine: 360 },
        spacing: { after: 140, line: 340 },
        children: [new TextRun({ text: cleanPara, rightToLeft: true })],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: note.title, bidirectional: true })],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = note.title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'note';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports a note as clean UTF-8 Plain Text (.txt) file.
 */
export function exportNoteAsTxt(note: NoteItem): void {
  const safeName = note.title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'note';
  const plain = note.content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1');
  downloadTextFile(`${safeName}.txt`, plain, 'text/plain;charset=utf-8');
}
