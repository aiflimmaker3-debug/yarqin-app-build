import React, { useEffect, useState } from 'react';
import { Check, Copy, ImageIcon } from 'lucide-react';
import { NoteItem } from '../types/vault';
import { loadAttachmentBlob } from '../utils/indexedDb';
import { normalizeTitle } from '../utils/markdown';

interface MarkdownPreviewProps {
  content: string;
  noteByNormalizedTitle: Map<string, NoteItem>;
  fontClass: string;
  fontSize: number;
  onOpenWikilink: (targetTitle: string) => void;
  onClickTag: (tag: string) => void;
  onToggleCheckbox?: (lineIndex: number) => void;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      dir="ltr"
      className="my-4 rounded-lg border overflow-hidden"
      style={{ backgroundColor: 'var(--code-bg)', borderColor: 'var(--border-subtle)' }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b text-xs"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
      >
        <span className="font-code">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:opacity-90 transition-opacity cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'كۆچۈرۈلدى' : 'كۆچۈرۈش'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[13px] leading-6 font-code" style={{ color: 'var(--text-primary)' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function LocalImageBlock({ alt, src }: { alt: string; src: string }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    src.startsWith('local-img://') ? null : src
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src.startsWith('local-img://')) {
      setResolvedUrl(src);
      return;
    }
    const id = src.slice('local-img://'.length).trim();
    let cancelled = false;
    let objUrl: string | null = null;

    loadAttachmentBlob(id).then((blob) => {
      if (cancelled) return;
      if (blob) {
        objUrl = URL.createObjectURL(blob);
        setResolvedUrl(objUrl);
      } else {
        setFailed(true);
      }
    });

    return () => {
      cancelled = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [src]);

  if (failed || !resolvedUrl) {
    return (
      <div
        className="my-4 p-5 rounded-lg border flex items-center justify-center gap-2 text-xs"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <ImageIcon className="w-4 h-4" />
        <span>{alt || 'يەرلىك رەسىم'}</span>
      </div>
    );
  }

  return (
    <figure className="my-4">
      <img
        src={resolvedUrl}
        alt={alt || 'خاتىرە رەسىمى'}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="max-w-full max-h-[480px] rounded-lg border object-contain"
        style={{ borderColor: 'var(--border-subtle)' }}
      />
      {alt && (
        <figcaption className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          {alt}
        </figcaption>
      )}
    </figure>
  );
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  noteByNormalizedTitle,
  fontClass,
  fontSize,
  onOpenWikilink,
  onClickTag,
  onToggleCheckbox,
}) => {
  const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
    // Tokenize wikilinks, inline code, markdown links, bold, italic, strikethrough, and Uyghur/Latin #tags
    const tokenRegex =
      /(\[\[[^\]|\n]+(?:\|[^\]\n]+)?\]\]|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*\n]+\*\*|~~[^~\n]+~~|\*[^*\n]+\*|(?<=^|[\s،؛؟.!?()\[\]])#[\u0620-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9_\-\/]+)/g;

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }
      const token = match[0];
      const key = `${keyPrefix}-${idx++}`;

      if (token.startsWith('[[') && token.endsWith(']]')) {
        const inner = token.slice(2, -2);
        const [rawTarget, rawAlias] = inner.split('|');
        const targetTitle = rawTarget.trim();
        const label = (rawAlias || rawTarget).trim();
        const exists = noteByNormalizedTitle.has(normalizeTitle(targetTitle));

        nodes.push(
          <button
            key={key}
            type="button"
            onClick={() => onOpenWikilink(targetTitle)}
            title={exists ? `ئېچىش: ${targetTitle}` : `يېڭى خاتىرە قۇرۇش: ${targetTitle}`}
            className="inline cursor-pointer transition-opacity hover:opacity-80 underline underline-offset-4"
            style={{
              color: exists ? 'var(--link-color)' : 'var(--link-unresolved)',
              textDecorationStyle: exists ? 'solid' : 'dashed',
            }}
          >
            {label}
          </button>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        nodes.push(
          <code
            key={key}
            dir="ltr"
            className="font-code text-[0.86em] px-1.5 py-0.5 rounded mx-0.5 inline-block"
            style={{ backgroundColor: 'var(--code-bg)', color: 'var(--accent-text)' }}
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('[') && token.includes('](')) {
        const linkMatch = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(token);
        if (linkMatch) {
          nodes.push(
            <a
              key={key}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:opacity-80"
              style={{ color: 'var(--link-color)' }}
            >
              {linkMatch[1]}
            </a>
          );
        } else {
          nodes.push(token);
        }
      } else if (token.startsWith('**') && token.endsWith('**')) {
        nodes.push(
          <strong key={key} className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {renderInline(token.slice(2, -2), `${key}-b`)}
          </strong>
        );
      } else if (token.startsWith('~~') && token.endsWith('~~')) {
        nodes.push(
          <del key={key} className="opacity-65">
            {renderInline(token.slice(2, -2), `${key}-d`)}
          </del>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        nodes.push(
          <em key={key} className="italic">
            {renderInline(token.slice(1, -1), `${key}-i`)}
          </em>
        );
      } else if (token.startsWith('#')) {
        const tag = token.slice(1).replace(/[\/\-_]+$/, '');
        if (tag && !/^\d+$/.test(tag)) {
          nodes.push(
            <button
              key={key}
              type="button"
              onClick={() => onClickTag(tag)}
              className="inline cursor-pointer font-medium hover:underline underline-offset-4"
              style={{ color: 'var(--tag-color)' }}
            >
              #{tag}
            </button>
          );
        } else {
          nodes.push(token);
        }
      } else {
        nodes.push(token);
      }

      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  };

  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      const startIdx = i;
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing fence
      blocks.push(<CodeBlock key={`code-${startIdx}`} language={lang} code={codeLines.join('\n')} />);
      continue;
    }

    // Standalone local or relative Markdown image: ![alt](src)
    const imgMatch = /^!\[([^\]\n]*)\]\(([^)\s]+)\)$/.exec(trimmed);
    if (imgMatch) {
      blocks.push(<LocalImageBlock key={`img-${i}`} alt={imgMatch[1]} src={imgMatch[2]} />);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(
        <hr key={`hr-${i}`} className="my-6 border-t" style={{ borderColor: 'var(--border-subtle)' }} />
      );
      i++;
      continue;
    }

    // Headings
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const headingId = `heading-${i}-${level}`;
      const sizeClasses: Record<number, string> = {
        1: 'text-[1.75em] font-bold mt-2 mb-4 leading-snug',
        2: 'text-[1.35em] font-semibold mt-7 mb-3 pb-1.5 border-b leading-snug',
        3: 'text-[1.14em] font-semibold mt-5 mb-2 leading-snug',
        4: 'text-[1.02em] font-semibold mt-4 mb-1.5 leading-snug',
      };
      const style: React.CSSProperties = {
        color: 'var(--text-primary)',
        borderColor: level === 2 ? 'var(--border-subtle)' : undefined,
      };
      const rendered = renderInline(text, `h-${i}`);
      if (level === 1) {
        blocks.push(
          <h1 key={headingId} id={headingId} className={sizeClasses[1]} style={style}>
            {rendered}
          </h1>
        );
      } else if (level === 2) {
        blocks.push(
          <h2 key={headingId} id={headingId} className={sizeClasses[2]} style={style}>
            {rendered}
          </h2>
        );
      } else if (level === 3) {
        blocks.push(
          <h3 key={headingId} id={headingId} className={sizeClasses[3]} style={style}>
            {rendered}
          </h3>
        );
      } else {
        blocks.push(
          <h4 key={headingId} id={headingId} className={sizeClasses[4]} style={style}>
            {rendered}
          </h4>
        );
      }
      i++;
      continue;
    }

    // Blockquote (styled with subtle all-around hairline border + soft surface, no thick accent bar)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      const startIdx = i;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote
          key={`quote-${startIdx}`}
          className="my-4 px-4 py-3 rounded-lg border leading-relaxed"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} className={qIdx > 0 ? 'mt-1.5' : ''}>
              {renderInline(ql, `q-${startIdx}-${qIdx}`)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Table
    if (trimmed.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1])) {
      const startIdx = i;
      const parseRow = (row: string) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseRow(lines[i]);
      i += 2; // skip header & separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && !lines[i].trim().startsWith('#')) {
        rows.push(parseRow(lines[i]));
        i++;
      }

      blocks.push(
        <div
          key={`table-${startIdx}`}
          className="my-5 overflow-x-auto rounded-lg border"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <table className="w-full text-right border-collapse text-[0.92em]">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
                {headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    className="px-3.5 py-2.5 font-semibold border-b"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  >
                    {renderInline(h, `th-${startIdx}-${hIdx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b last:border-b-0"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {renderInline(row[cIdx] ?? '', `td-${startIdx}-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Task list / Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      const startIdx = i;
      const items: Array<{ lineIndex: number; text: string; isTask: boolean; checked: boolean }> = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        const rawItem = lines[i].trim().replace(/^[-*+]\s+/, '');
        const taskMatch = /^\[(x|X| )\]\s+(.*)$/.exec(rawItem);
        if (taskMatch) {
          items.push({
            lineIndex: i,
            text: taskMatch[2],
            isTask: true,
            checked: taskMatch[1].toLowerCase() === 'x',
          });
        } else {
          items.push({
            lineIndex: i,
            text: rawItem,
            isTask: false,
            checked: false,
          });
        }
        i++;
      }

      blocks.push(
        <ul key={`ul-${startIdx}`} className="my-3 space-y-2 pr-1">
          {items.map((item) =>
            item.isTask ? (
              <li key={item.lineIndex} className="flex items-start gap-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={item.checked}
                  onClick={() => onToggleCheckbox?.(item.lineIndex)}
                  className="mt-1.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: item.checked ? 'var(--accent)' : 'transparent',
                    borderColor: item.checked ? 'var(--accent)' : 'var(--border-strong)',
                    color: '#ffffff',
                  }}
                >
                  {item.checked && <Check className="w-3 h-3" strokeWidth={2.75} />}
                </button>
                <span
                  className={item.checked ? 'line-through opacity-60' : ''}
                  style={{ color: 'var(--text-primary)' }}
                >
                  {renderInline(item.text, `task-${item.lineIndex}`)}
                </span>
              </li>
            ) : (
              <li key={item.lineIndex} className="flex items-start gap-2.5">
                <span className="mt-2.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--text-muted)' }} />
                <span>{renderInline(item.text, `li-${item.lineIndex}`)}</span>
              </li>
            )
          )}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const startIdx = i;
      const items: Array<{ num: string; text: string; lineIndex: number }> = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const m = /^(\d+)\.\s+(.*)$/.exec(lines[i].trim());
        if (m) {
          items.push({ num: m[1], text: m[2], lineIndex: i });
        }
        i++;
      }

      blocks.push(
        <ol key={`ol-${startIdx}`} className="my-3 space-y-2 pr-1">
          {items.map((item) => (
            <li key={item.lineIndex} className="flex items-start gap-2.5">
              <span
                className="font-code tabular-nums text-[0.88em] mt-0.5 shrink-0 min-w-[1.5rem] text-left"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.num}.
              </span>
              <span>{renderInline(item.text, `oli-${item.lineIndex}`)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Standard paragraph (merge consecutive plain lines, including #tag lines without space after #)
    const paraLines: string[] = [];
    const startIdx = i;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4}\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('>') &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    // Safety guard: guarantee the outer while loop always makes forward progress
    if (paraLines.length === 0 && i < lines.length) {
      paraLines.push(lines[i]);
      i++;
    }

    const isTagOnlyLine =
      paraLines.length === 1 &&
      /^(\s*#[\u0620-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9_\-\/]+\s*)+$/.test(paraLines[0]);

    blocks.push(
      <p
        key={`p-${startIdx}`}
        className={`${isTagOnlyLine ? 'flex flex-wrap items-center gap-2.5 text-sm' : 'uyghur-paragraph'} my-3 leading-[1.85]`}
        style={{ color: 'var(--text-primary)' }}
      >
        {paraLines.map((pl, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <br />}
            {renderInline(pl, `p-${startIdx}-${idx}`)}
          </React.Fragment>
        ))}
      </p>
    );
  }

  if (!content.trim()) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        بۇ خاتىرە ھازىرچە قۇرۇق. يېزىشنى باشلاڭ ياكى يۇقىرىدىكى قېلىپلاردىن بىرنى قىستۇرۇڭ.
      </div>
    );
  }

  return (
    <article
      dir="rtl"
      className={`print-only-content ${fontClass} max-w-[72ch] mx-auto pb-20`}
      style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
    >
      {blocks}
    </article>
  );
};
