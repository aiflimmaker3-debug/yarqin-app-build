import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  FilePlus2,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { AttachmentMeta, NoteItem } from '../types/vault';
import { extractPdfTextToMarkdown } from '../utils/documents';
import { formatBytesUg, loadAttachmentBlob } from '../utils/indexedDb';

interface PdfReaderViewProps {
  pdfAttachments: AttachmentMeta[];
  activePdfId: string | null;
  notes: NoteItem[];
  onSelectPdf: (id: string) => void;
  onUploadPdfFiles: (files: FileList) => void;
  onDeletePdf: (id: string) => void;
  onOpenNote: (noteId: string) => void;
  onCreateLinkedNoteForPdf: (pdf: AttachmentMeta, initialContent?: string) => void;
  onUpdateNoteContent: (noteId: string, content: string) => void;
  onNotify: (msg: string) => void;
}

export const PdfReaderView: React.FC<PdfReaderViewProps> = ({
  pdfAttachments,
  activePdfId,
  notes,
  onSelectPdf,
  onUploadPdfFiles,
  onDeletePdf,
  onOpenNote,
  onCreateLinkedNoteForPdf,
  onUpdateNoteContent,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const activePdf = pdfAttachments.find((a) => a.id === activePdfId) ?? pdfAttachments[0] ?? null;
  const linkedNote = activePdf?.linkedNoteId
    ? notes.find((n) => n.id === activePdf.linkedNoteId) ?? null
    : null;

  useEffect(() => {
    let revoked = false;
    let currentUrl: string | null = null;

    if (!activePdf) {
      setPdfUrl(null);
      return;
    }

    setLoadingPdf(true);
    loadAttachmentBlob(activePdf.id)
      .then((blob) => {
        if (revoked) return;
        if (blob) {
          currentUrl = URL.createObjectURL(blob);
          setPdfUrl(currentUrl);
        } else {
          setPdfUrl(null);
        }
      })
      .finally(() => {
        if (!revoked) setLoadingPdf(false);
      });

    return () => {
      revoked = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [activePdf?.id]);

  const handleExtractText = async () => {
    if (!activePdf || extracting) return;
    setExtracting(true);
    try {
      const blob = await loadAttachmentBlob(activePdf.id);
      if (!blob) {
        onNotify('PDF ھۆججىتى يەرلىك ساقلىغۇچتىن تېپىلمىدى');
        return;
      }
      const res = await extractPdfTextToMarkdown(blob, activePdf.name);
      if (!res.hasText) {
        onNotify('بۇ PDF تېكىست قاتلىمىسىز (رەسىم/سىكانېرلانغان) ئىكەن؛ يان تەرەپتە قولدا خاتىرە يازالايسىز');
        if (!linkedNote) {
          onCreateLinkedNoteForPdf(activePdf);
        }
        return;
      }
      onCreateLinkedNoteForPdf(activePdf, res.markdown);
      onNotify(`${res.pageCount} بەتلىك PDF دىن تېكىست چىقىرىلىپ خاتىرە قۇرۇلدى`);
    } catch {
      onNotify('PDF تېكىستىنى ئوقۇشتا خاتالىق كۆرۈلدى');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      {/* Top PDF Bar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5 border-b flex-wrap shrink-0"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-sidebar)' }}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <BookOpen className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            PDF كىتاب ئوقۇش ۋە بىللە خاتىرە يېزىش
          </span>

          {pdfAttachments.length > 0 && (
            <select
              value={activePdf?.id ?? ''}
              onChange={(e) => onSelectPdf(e.target.value)}
              className="px-2.5 py-1 rounded-md border text-xs outline-none cursor-pointer max-w-[260px]"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {pdfAttachments.map((att) => (
                <option key={att.id} value={att.id}>
                  {att.name} ({formatBytesUg(att.size)})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onUploadPdfFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />

          {activePdf && (
            <>
              <button
                type="button"
                disabled={extracting}
                onClick={handleExtractText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer hover:bg-[var(--bg-hover)] disabled:opacity-50 whitespace-nowrap"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
              >
                {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>تېكىست چىقىرىپ خاتىرە قۇرۇش</span>
              </button>

              <button
                type="button"
                title="بۇ PDF نى ئۆچۈرۈش"
                onClick={() => onDeletePdf(activePdf.id)}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>PDF ئەكىرىش</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace or Empty State */}
      {!activePdf ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div
            className="w-14 h-14 rounded-xl border flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <BookOpen className="w-7 h-7" style={{ color: 'var(--accent)' }} />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              يەرلىك PDF كىتاب ۋە ماقالە ئوقۇغۇچ
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              كومپيۇتېرىڭىزدىكى خالىغان PDF ھۆججىتىنى ئەكىرسىڭىز، پۈتۈنلەي يەرلىك IndexedDB ئامبىرىدا ساقلىنىپ، بىر تەرەپتە كىتاب ئوقۇغاچ يەنە بىر تەرەپتە شۇ كىتابنىڭ خاتىرىسىنى يازالايسىز.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
          >
            <Upload className="w-4 h-4" />
            <span>كومپيۇتېردىن PDF تاللاش</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* PDF Document Pane */}
          <div
            className="lg:w-3/5 h-1/2 lg:h-full border-b lg:border-b-0 lg:border-l flex flex-col min-h-0"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
          >
            {loadingPdf ? (
              <div className="flex-1 flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>PDF يۈكلىنىۋاتىدۇ...</span>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                title={activePdf.name}
                className="w-full h-full border-0"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs p-6" style={{ color: 'var(--text-muted)' }}>
                PDF ھۆججىتىنى كۆرسىتىش مۇمكىن بولمىدى.
              </div>
            )}
          </div>

          {/* Linked Note Taking Pane */}
          <div className="lg:w-2/5 h-1/2 lg:h-full flex flex-col min-h-0" style={{ backgroundColor: 'var(--bg-canvas)' }}>
            <div
              className="px-4 py-2.5 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                <span className="truncate">{linkedNote ? linkedNote.title : 'كىتاب خاتىرىسى'}</span>
              </span>

              {linkedNote ? (
                <button
                  type="button"
                  onClick={() => onOpenNote(linkedNote.id)}
                  className="text-[11px] hover:underline cursor-pointer shrink-0"
                  style={{ color: 'var(--link-color)' }}
                >
                  تولۇق تەھرىرلىگۈچتە ئېچىش
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onCreateLinkedNoteForPdf(activePdf)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                >
                  <FilePlus2 className="w-3 h-3" />
                  <span>خاتىرە قۇرۇش</span>
                </button>
              )}
            </div>

            {linkedNote ? (
              <textarea
                dir="rtl"
                value={linkedNote.content}
                onChange={(e) => onUpdateNoteContent(linkedNote.id, e.target.value)}
                placeholder="PDF نى ئوقۇغاچ مۇھىم نۇقتىلارنى، بەت نومۇرلىرىنى ۋە [[ئۇلانما]] لارنى بۇ يەرگە يېزىڭ..."
                className="font-uyghur-prose flex-1 w-full resize-none bg-transparent outline-none p-4 text-sm leading-[1.85]"
                style={{ color: 'var(--text-primary)' }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  بۇ PDF ھۆججىتىگە باغلانغان خاتىرە تېخى قۇرۇلمىغان. بىر چېكىش بىلەن يېڭى خاتىرە قۇرۇپ بىللە يازالايسىز.
                </p>
                <button
                  type="button"
                  onClick={() => onCreateLinkedNoteForPdf(activePdf)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>«{activePdf.name.replace(/\.pdf$/i, '')}» خاتىرىسى قۇرۇش</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
