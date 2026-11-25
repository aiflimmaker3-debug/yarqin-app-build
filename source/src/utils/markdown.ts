import {
  BacklinkItem,
  GraphEdgeData,
  GraphNodeData,
  HeadingOutlineItem,
  NoteItem,
  OutgoingLinkItem,
  VaultGraphIndex,
} from '../types/vault';

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function stripFencedCodeBlocks(content: string): string {
  return content.replace(/```[\s\S]*?```/g, (match) => match.replace(/[^\n]/g, ' '));
}

export function extractWikilinks(content: string): Array<{ targetTitle: string; alias?: string; index: number }> {
  const cleaned = stripFencedCodeBlocks(content);
  const results: Array<{ targetTitle: string; alias?: string; index: number }> = [];
  const regex = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    const targetTitle = match[1].trim();
    const alias = match[2]?.trim();
    if (targetTitle) {
      results.push({ targetTitle, alias, index: match.index });
    }
  }
  return results;
}

/**
 * Extracts Uyghur/Arabic, Latin, digits, underscores, hyphens, and nested slashes as #tags.
 * Ignores Markdown headings (# Title) and inline code / fenced code blocks.
 */
export function extractTags(content: string): string[] {
  const withoutFenced = stripFencedCodeBlocks(content);
  const withoutInlineCode = withoutFenced.replace(/`[^`\n]+`/g, ' ');
  const tagSet = new Set<string>();

  // Match #tag preceded by start-of-line or whitespace (excludes Arabic/Uyghur punctuation ، ؛ ؟ at U+060C-U+061F)
  const regex = /(?:^|[\s،؛؟.!?()\[\]])#([\u0620-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9_\-\/]+)/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(withoutInlineCode)) !== null) {
    const raw = match[1].replace(/[\/\-_]+$/, '');
    // Ignore pure numeric hex-like or numbers (#123)
    if (raw && !/^\d+$/.test(raw) && !/^[0-9a-fA-F]{3,8}$/.test(raw)) {
      tagSet.add(raw);
    }
  }

  return Array.from(tagSet);
}

export function extractHeadings(content: string): HeadingOutlineItem[] {
  const lines = content.split('\n');
  const headings: HeadingOutlineItem[] = [];
  let inCodeBlock = false;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) return;

    const match = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`~]/g, '').trim();
      headings.push({
        level,
        text,
        id: `heading-${idx}-${level}`,
        line: idx,
      });
    }
  });

  return headings;
}

export function computeNoteStats(content: string): { words: number; chars: number; readMinutes: number } {
  const trimmed = content.trim();
  if (!trimmed) {
    return { words: 0, chars: 0, readMinutes: 0 };
  }
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const chars = trimmed.length;
  const readMinutes = Math.max(1, Math.ceil(words / 180));
  return { words, chars, readMinutes };
}

export function replaceWikilinkTitleInContent(content: string, oldTitle: string, newTitle: string): string {
  const oldNorm = normalizeTitle(oldTitle);
  const trimmedNew = newTitle.trim();
  if (!oldNorm || !trimmedNew || oldNorm === normalizeTitle(trimmedNew)) {
    return content;
  }

  return content.replace(/\[\[([^\]|\n]+)(\|[^\]\n]+)?\]\]/g, (full, target, aliasPart) => {
    if (normalizeTitle(target) === oldNorm) {
      return `[[${trimmedNew}${aliasPart || ''}]]`;
    }
    return full;
  });
}

export function applyTemplateVariables(templateContent: string, title: string): string {
  const today = getTodayDateString();
  return templateContent
    .replace(/\{\{date\}\}/g, today)
    .replace(/\{\{title\}\}/g, title || 'يېڭى خاتىرە');
}

export function buildVaultGraphIndex(notes: NoteItem[]): VaultGraphIndex {
  const noteById = new Map<string, NoteItem>();
  const noteByNormalizedTitle = new Map<string, NoteItem>();
  const outgoingByNoteId = new Map<string, OutgoingLinkItem[]>();
  const backlinksByNoteId = new Map<string, BacklinkItem[]>();
  const tagsByNoteId = new Map<string, string[]>();
  const notesByTag = new Map<string, string[]>();

  for (const note of notes) {
    noteById.set(note.id, note);
    noteByNormalizedTitle.set(normalizeTitle(note.title), note);
    outgoingByNoteId.set(note.id, []);
    backlinksByNoteId.set(note.id, []);
  }

  const unresolvedTitles = new Map<string, string>(); // normalized -> display title
  const edgeSet = new Set<string>();
  const graphEdges: GraphEdgeData[] = [];
  const degreeMap = new Map<string, number>();

  const bumpDegree = (nodeId: string) => {
    degreeMap.set(nodeId, (degreeMap.get(nodeId) ?? 0) + 1);
  };

  for (const note of notes) {
    // Tags
    const tags = extractTags(note.content);
    tagsByNoteId.set(note.id, tags);
    for (const tag of tags) {
      const list = notesByTag.get(tag) ?? [];
      list.push(note.id);
      notesByTag.set(tag, list);
    }

    // Wikilinks
    const rawLinks = extractWikilinks(note.content);
    const seenTargetsForNote = new Set<string>();
    const outgoing: OutgoingLinkItem[] = [];

    for (const link of rawLinks) {
      const norm = normalizeTitle(link.targetTitle);
      const resolved = noteByNormalizedTitle.get(norm) ?? null;

      if (!seenTargetsForNote.has(norm)) {
        seenTargetsForNote.add(norm);
        outgoing.push({
          targetTitle: resolved ? resolved.title : link.targetTitle,
          alias: link.alias,
          resolvedNoteId: resolved ? resolved.id : null,
        });
      }

      if (resolved && resolved.id !== note.id) {
        // Snippet around link
        const lines = note.content.split('\n');
        let snippet = '';
        for (const line of lines) {
          if (line.toLowerCase().includes(`[[${norm}`) || line.includes(link.targetTitle)) {
            snippet = line.trim().slice(0, 140);
            break;
          }
        }
        const blList = backlinksByNoteId.get(resolved.id) ?? [];
        if (!blList.some((b) => b.sourceNoteId === note.id)) {
          blList.push({
            sourceNoteId: note.id,
            sourceTitle: note.title,
            snippet: snippet || note.title,
          });
          backlinksByNoteId.set(resolved.id, blList);
        }

        const edgeKey = `${note.id}-->${resolved.id}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          graphEdges.push({ source: note.id, target: resolved.id });
          bumpDegree(note.id);
          bumpDegree(resolved.id);
        }
      } else if (!resolved) {
        const ghostId = `unresolved:${norm}`;
        if (!unresolvedTitles.has(norm)) {
          unresolvedTitles.set(norm, link.targetTitle);
        }
        const edgeKey = `${note.id}-->${ghostId}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          graphEdges.push({ source: note.id, target: ghostId });
          bumpDegree(note.id);
          bumpDegree(ghostId);
        }
      }
    }

    outgoingByNoteId.set(note.id, outgoing);
  }

  const graphNodes: GraphNodeData[] = [];
  for (const note of notes) {
    graphNodes.push({
      id: note.id,
      title: note.title,
      noteId: note.id,
      isUnresolved: false,
      tags: tagsByNoteId.get(note.id) ?? [],
      degree: degreeMap.get(note.id) ?? 0,
    });
  }

  for (const [norm, displayTitle] of unresolvedTitles.entries()) {
    const ghostId = `unresolved:${norm}`;
    graphNodes.push({
      id: ghostId,
      title: displayTitle,
      noteId: null,
      isUnresolved: true,
      tags: [],
      degree: degreeMap.get(ghostId) ?? 0,
    });
  }

  const allTags = Array.from(notesByTag.entries())
    .map(([tag, noteIds]) => ({ tag, count: noteIds.length }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return {
    noteById,
    noteByNormalizedTitle,
    outgoingByNoteId,
    backlinksByNoteId,
    tagsByNoteId,
    notesByTag,
    allTags,
    graphNodes,
    graphEdges,
  };
}

export function formatRelativeTimeUg(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'ھازىرلا';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} مىنۇت بۇرۇن`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} سائەت بۇرۇن`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} كۈن بۇرۇن`;

  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
