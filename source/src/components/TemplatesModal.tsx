import React, { useState } from 'react';
import { FilePlus2, Plus, Trash2, X } from 'lucide-react';
import { NoteTemplate } from '../types/vault';

interface TemplatesModalProps {
  isOpen: boolean;
  templates: NoteTemplate[];
  hasActiveNote: boolean;
  onClose: () => void;
  onInsertTemplate: (template: NoteTemplate) => void;
  onCreateNoteFromTemplate: (template: NoteTemplate) => void;
  onAddCustomTemplate: (name: string, description: string, content: string) => void;
  onDeleteCustomTemplate: (templateId: string) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  templates,
  hasActiveNote,
  onClose,
  onInsertTemplate,
  onCreateNoteFromTemplate,
  onAddCustomTemplate,
  onDeleteCustomTemplate,
}) => {
  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id ?? '');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newContent, setNewContent] = useState('# {{title}}\n\nچېسلا: {{date}}\n\n## ئاساسلىق مەزمۇن\n- ');

  if (!isOpen) return null;

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newContent.trim()) return;
    onAddCustomTemplate(newName.trim(), newDesc.trim() || 'ئىشلەتكۈچى قۇرغان قېلىپ', newContent);
    setNewName('');
    setNewDesc('');
    setNewContent('# {{title}}\n\nچېسلا: {{date}}\n\n## ئاساسلىق مەزمۇن\n- ');
    setCreating(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-3xl h-[540px] max-h-[85vh] rounded-xl border overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              خاتىرە قېلىپلىرى
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              قېلىپتىكى <span className="font-code" dir="ltr">{'{{date}}'}</span> ۋە{' '}
              <span className="font-code" dir="ltr">{'{{title}}'}</span> بەلگىلىرى ئاپتوماتىك تولدۇرۇلىدۇ.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer hover:bg-[var(--bg-hover)]"
              style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{creating ? 'تىزىملىككە قايتىش' : 'يېڭى قېلىپ قوشۇش'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {creating ? (
          <form onSubmit={handleSaveCustom} className="flex-1 min-h-0 flex flex-col p-5 gap-3 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>قېلىپ نامى</span>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مەسىلەن: دەرس خاتىرىسى"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </label>
              <label className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>قىسقىچە چۈشەندۈرۈش</span>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="قاچان ئىشلىتىلىدۇ..."
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </label>
            </div>
            <label className="flex-1 flex flex-col space-y-1 text-xs min-h-0" style={{ color: 'var(--text-secondary)' }}>
              <span>Markdown مەزمۇنى</span>
              <textarea
                required
                dir="rtl"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="flex-1 min-h-[180px] p-3 rounded-lg border text-sm font-uyghur-prose outline-none resize-none"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-lg border text-xs cursor-pointer"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                بىكار قىلىش
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
              >
                قېلىپنى ساقلاش
              </button>
            </div>
          </form>
        ) : (
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* Template List */}
            <div
              className="w-64 shrink-0 border-l overflow-y-auto p-2.5 space-y-1"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-sidebar)' }}
            >
              {templates.map((tpl) => {
                const active = selected?.id === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    className="group flex items-start justify-between rounded-lg transition-colors"
                    style={{ backgroundColor: active ? 'var(--bg-active)' : 'transparent' }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(tpl.id)}
                      className="flex-1 text-right p-2.5 cursor-pointer"
                    >
                      <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {tpl.name}
                      </div>
                      <div className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                        {tpl.description}
                      </div>
                    </button>
                    {!tpl.isBuiltIn && (
                      <button
                        type="button"
                        title="قېلىپنى ئۆچۈرۈش"
                        onClick={() => onDeleteCustomTemplate(tpl.id)}
                        className="p-2 opacity-60 hover:opacity-100 cursor-pointer"
                        style={{ color: 'var(--danger)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Template Preview & Actions */}
            {selected && (
              <div className="flex-1 min-h-0 flex flex-col p-5">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {selected.name}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {selected.description}
                  </p>
                </div>

                <pre
                  dir="rtl"
                  className="flex-1 min-h-0 overflow-y-auto p-4 rounded-lg border text-xs whitespace-pre-wrap font-uyghur-prose leading-7"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {selected.content}
                </pre>

                <div className="mt-4 flex items-center justify-end gap-2.5 shrink-0">
                  {hasActiveNote && (
                    <button
                      type="button"
                      onClick={() => {
                        onInsertTemplate(selected);
                        onClose();
                      }}
                      className="px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-[var(--bg-hover)]"
                      style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
                    >
                      نۆۋەتتىكى خاتىرىگە قىستۇرۇش
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onCreateNoteFromTemplate(selected);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer"
                    style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>بۇ قېلىپ بىلەن يېڭى خاتىرە قۇرۇش</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
