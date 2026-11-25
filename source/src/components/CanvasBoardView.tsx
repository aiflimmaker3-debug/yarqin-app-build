import React, { useRef, useState } from 'react';
import {
  ExternalLink,
  FilePlus2,
  GitBranch,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { CanvasCard, CanvasEdge, NoteItem } from '../types/vault';

interface CanvasBoardViewProps {
  cards: CanvasCard[];
  edges: CanvasEdge[];
  notes: NoteItem[];
  onChangeCanvas: (cards: CanvasCard[], edges: CanvasEdge[]) => void;
  onOpenNote: (noteId: string) => void;
}

const TONE_BORDERS: Record<CanvasCard['tone'], string> = {
  default: 'var(--border-strong)',
  accent: 'var(--accent)',
  emerald: '#10b981',
  amber: '#d97706',
};

export const CanvasBoardView: React.FC<CanvasBoardViewProps> = ({
  cards,
  edges,
  notes,
  onChangeCanvas,
  onOpenNote,
}) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [selectedNoteToAdd, setSelectedNoteToAdd] = useState<string>(notes[0]?.id ?? '');

  const pointerStartRef = useRef({ x: 0, y: 0, origX: 0, origY: 0 });

  const addIdeaCard = () => {
    const id = `card-${Date.now().toString(36)}`;
    const nextCard: CanvasCard = {
      id,
      x: 160 + (cards.length % 4) * 45 - pan.x / zoom,
      y: 120 + (cards.length % 3) * 45 - pan.y / zoom,
      width: 240,
      height: 128,
      title: 'يېڭى ئىدىيە كارتىسى',
      text: 'پىكىر ياكى پىلانىڭىزنى بۇ يەرگە يېزىڭ...',
      noteId: null,
      tone: 'default',
    };
    onChangeCanvas([...cards, nextCard], edges);
  };

  const addNoteCard = () => {
    const note = notes.find((n) => n.id === selectedNoteToAdd);
    if (!note) return;
    const id = `card-${Date.now().toString(36)}`;
    const excerpt = note.content
      .replace(/^#.*$/gm, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 110);
    const nextCard: CanvasCard = {
      id,
      x: 200 + (cards.length % 4) * 50 - pan.x / zoom,
      y: 140 + (cards.length % 3) * 50 - pan.y / zoom,
      width: 240,
      height: 125,
      title: note.title,
      text: excerpt || 'باغلانغان خاتىرە',
      noteId: note.id,
      tone: 'accent',
    };
    onChangeCanvas([...cards, nextCard], edges);
  };

  const updateCard = (id: string, patch: Partial<CanvasCard>) => {
    onChangeCanvas(
      cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      edges
    );
  };

  const deleteCard = (id: string) => {
    onChangeCanvas(
      cards.filter((c) => c.id !== id),
      edges.filter((e) => e.fromCardId !== id && e.toCardId !== id)
    );
    if (connectingFromId === id) setConnectingFromId(null);
  };

  const handleCardConnectClick = (cardId: string) => {
    if (!connectingFromId) {
      setConnectingFromId(cardId);
      return;
    }
    if (connectingFromId === cardId) {
      setConnectingFromId(null);
      return;
    }
    const exists = edges.some(
      (e) =>
        (e.fromCardId === connectingFromId && e.toCardId === cardId) ||
        (e.fromCardId === cardId && e.toCardId === connectingFromId)
    );
    if (!exists) {
      const nextEdge: CanvasEdge = {
        id: `edge-${Date.now().toString(36)}`,
        fromCardId: connectingFromId,
        toCardId: cardId,
      };
      onChangeCanvas(cards, [...edges, nextEdge]);
    }
    setConnectingFromId(null);
  };

  const deleteEdge = (edgeId: string) => {
    onChangeCanvas(
      cards,
      edges.filter((e) => e.id !== edgeId)
    );
  };

  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== boardRef.current) return;
    setIsPanning(true);
    pointerStartRef.current = { x: e.clientX, y: e.clientY, origX: pan.x, origY: pan.y };
  };

  const handleCardHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>, card: CanvasCard) => {
    e.stopPropagation();
    setDraggingCardId(card.id);
    pointerStartRef.current = { x: e.clientX, y: e.clientY, origX: card.x, origY: card.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingCardId) {
      const dx = (e.clientX - pointerStartRef.current.x) / zoom;
      const dy = (e.clientY - pointerStartRef.current.y) / zoom;
      updateCard(draggingCardId, {
        x: Math.round(pointerStartRef.current.origX + dx),
        y: Math.round(pointerStartRef.current.origY + dy),
      });
    } else if (isPanning) {
      const dx = e.clientX - pointerStartRef.current.x;
      const dy = e.clientY - pointerStartRef.current.y;
      setPan({ x: pointerStartRef.current.origX + dx, y: pointerStartRef.current.origY + dy });
    }
  };

  const handlePointerUp = () => {
    setDraggingCardId(null);
    setIsPanning(false);
  };

  const cycleTone = (card: CanvasCard) => {
    const order: CanvasCard['tone'][] = ['default', 'accent', 'emerald', 'amber'];
    const next = order[(order.indexOf(card.tone) + 1) % order.length];
    updateCard(card.id, { tone: next });
  };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ backgroundColor: 'var(--graph-bg)' }}>
      {/* Canvas Toolbar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5 border-b flex-wrap shrink-0"
        style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={addIdeaCard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ئىدىيە كارتىسى قوشۇش</span>
          </button>

          {notes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedNoteToAdd}
                onChange={(e) => setSelectedNoteToAdd(e.target.value)}
                className="px-2.5 py-1.5 rounded-md border text-xs outline-none max-w-[190px]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addNoteCard}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer hover:bg-[var(--bg-hover)] whitespace-nowrap"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>خاتىرىنى تاختىغا قويۇش</span>
              </button>
            </div>
          )}

          {connectingFromId && (
            <span className="text-xs font-medium" style={{ color: 'var(--accent-text)' }}>
              باغلاش ھالىتى: ئىككىنچى كارتىنىڭ باغلاش كۇنۇپكىسىنى چېكىڭ
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
          <span>{cards.length} كارتا</span>
          <span aria-hidden="true">·</span>
          <span>{edges.length} سىزىق</span>
          <span className="mx-1 h-4 w-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
          <button
            type="button"
            title="چوڭايتىش"
            onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="كىچىكلىتىش"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="ئورنىنى ئەسلىگە قايتۇرۇش"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Infinite Draggable Board */}
      <div
        ref={boardRef}
        dir="ltr"
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, var(--border-subtle) 1px, transparent 1px)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          {/* SVG Connectors */}
          <svg
            width="3000"
            height="2000"
            style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
          >
            {edges.map((edge) => {
              const from = cards.find((c) => c.id === edge.fromCardId);
              const to = cards.find((c) => c.id === edge.toCardId);
              if (!from || !to) return null;
              const x1 = from.x + from.width / 2;
              const y1 = from.y + from.height / 2;
              const x2 = to.x + to.width / 2;
              const y2 = to.y + to.height / 2;
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              return (
                <g key={edge.id} style={{ pointerEvents: 'auto' }}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeOpacity="0.65"
                  />
                  <circle
                    cx={mx}
                    cy={my}
                    r="7"
                    fill="var(--bg-elevated)"
                    stroke="var(--border-strong)"
                    className="cursor-pointer"
                    onClick={() => deleteEdge(edge.id)}
                  >
                    <title>سىزىقنى ئۆچۈرۈش</title>
                  </circle>
                  {edge.label && (
                    <text
                      x={mx}
                      y={my - 11}
                      textAnchor="middle"
                      fill="var(--text-muted)"
                      fontSize="11"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Draggable Cards */}
          {cards.map((card) => {
            const isConnectSource = connectingFromId === card.id;
            return (
              <div
                key={card.id}
                dir="rtl"
                style={{
                  position: 'absolute',
                  left: card.x,
                  top: card.y,
                  width: card.width,
                  minHeight: card.height,
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: isConnectSource ? 'var(--accent)' : TONE_BORDERS[card.tone],
                  pointerEvents: 'auto',
                }}
                className="rounded-lg border shadow-md flex flex-col overflow-hidden"
              >
                {/* Drag Handle Header */}
                <div
                  onPointerDown={(e) => handleCardHeaderPointerDown(e, card)}
                  className="px-3 py-1.5 border-b flex items-center justify-between gap-2 cursor-move"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                >
                  <input
                    type="text"
                    value={card.title}
                    onPointerDown={(e) => e.stopPropagation()}
                    onChange={(e) => updateCard(card.id, { title: e.target.value })}
                    className="flex-1 min-w-0 bg-transparent text-xs font-semibold outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />

                  <div className="flex items-center gap-0.5 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      title="رامكا رەڭگىنى ئالماشتۇرۇش"
                      onClick={() => cycleTone(card)}
                      className="w-3.5 h-3.5 rounded-full border mx-1 cursor-pointer"
                      style={{ backgroundColor: TONE_BORDERS[card.tone], borderColor: 'var(--border-strong)' }}
                    />
                    <button
                      type="button"
                      title="باشقا كارتىغا سىزىق بىلەن باغلاش"
                      onClick={() => handleCardConnectClick(card.id)}
                      className="p-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
                      style={{ color: isConnectSource ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                    </button>
                    {card.noteId && (
                      <button
                        type="button"
                        title="باغلانغان خاتىرىنى ئېچىش"
                        onClick={() => onOpenNote(card.noteId!)}
                        className="p-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
                        style={{ color: 'var(--link-color)' }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="كارتىنى ئۆچۈرۈش"
                      onClick={() => deleteCard(card.id)}
                      className="p-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Editable Card Body */}
                <textarea
                  value={card.text}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => updateCard(card.id, { text: e.target.value })}
                  rows={3}
                  className="flex-1 w-full bg-transparent p-3 text-xs leading-relaxed outline-none resize-none"
                  style={{ color: 'var(--text-secondary)' }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
