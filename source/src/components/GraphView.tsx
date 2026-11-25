import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, RefreshCw, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { GraphEdgeData, GraphNodeData, ThemeId } from '../types/vault';

interface GraphViewProps {
  mode: 'global' | 'local';
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  allTags: Array<{ tag: string; count: number }>;
  activeNoteId: string | null;
  theme: ThemeId;
  onSelectNote: (noteId: string) => void;
  onCreateUnresolvedNote: (title: string) => void;
  onExpandToGlobal?: () => void;
}

interface SimNode extends GraphNodeData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const GraphView: React.FC<GraphViewProps> = ({
  mode,
  nodes,
  edges,
  allTags,
  activeNoteId,
  theme,
  onSelectNote,
  onCreateUnresolvedNote,
  onExpandToGlobal,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showUnresolved, setShowUnresolved] = useState(true);
  const [layoutSeed, setLayoutSeed] = useState(0);
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);

  // Camera & interaction refs for 60fps Canvas loop
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const simNodesRef = useRef<SimNode[]>([]);
  const hoveredNodeIdRef = useRef<string | null>(null);
  const draggedNodeRef = useRef<SimNode | null>(null);
  const isPanningRef = useRef(false);
  const dragMovedRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  // Filter nodes & edges based on mode (local vs global) and filters
  const filteredGraph = useMemo(() => {
    let visibleNodeIds: Set<string>;

    if (mode === 'local' && activeNoteId) {
      visibleNodeIds = new Set<string>([activeNoteId]);
      for (const edge of edges) {
        if (edge.source === activeNoteId) visibleNodeIds.add(edge.target);
        if (edge.target === activeNoteId) visibleNodeIds.add(edge.source);
      }
    } else {
      visibleNodeIds = new Set<string>();
      const q = searchQuery.trim().toLowerCase();
      for (const n of nodes) {
        if (!showUnresolved && n.isUnresolved) continue;
        if (selectedTag && !n.tags.includes(selectedTag)) continue;
        if (q && !n.title.toLowerCase().includes(q)) continue;
        visibleNodeIds.add(n.id);
      }
    }

    const fNodes = nodes.filter((n) => visibleNodeIds.has(n.id));
    const fEdges = edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
    return { nodes: fNodes, edges: fEdges };
  }, [mode, activeNoteId, nodes, edges, searchQuery, selectedTag, showUnresolved]);

  // Initialize simulation positions when graph structure or seed changes
  useEffect(() => {
    const prevMap = new Map<string, SimNode>();
    for (const sn of simNodesRef.current) {
      prevMap.set(sn.id, sn);
    }

    const count = filteredGraph.nodes.length;
    const spread = mode === 'local' ? 75 : Math.max(130, count * 18);

    simNodesRef.current = filteredGraph.nodes.map((n, idx) => {
      const existing = prevMap.get(n.id);
      const angle = (idx / Math.max(1, count)) * Math.PI * 2;
      const radius = Math.min(13, Math.max(5.5, 5.5 + n.degree * 1.25));

      if (existing && layoutSeed === 0) {
        return { ...n, x: existing.x, y: existing.y, vx: existing.vx, vy: existing.vy, radius };
      }

      if (mode === 'local' && n.id === activeNoteId) {
        return { ...n, x: 0, y: 0, vx: 0, vy: 0, radius: radius + 2 };
      }

      return {
        ...n,
        x: Math.cos(angle) * spread * (0.65 + (idx % 3) * 0.18),
        y: Math.sin(angle) * spread * (0.65 + ((idx + 1) % 3) * 0.18),
        vx: 0,
        vy: 0,
        radius,
      };
    });

    cameraRef.current = { x: 0, y: 0, zoom: mode === 'local' ? 1.05 : 1 };
  }, [filteredGraph, mode, activeNoteId, layoutSeed]);

  // Main Canvas physics + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = container.clientWidth;
    let height = container.clientHeight;

    const syncSize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncSize();
    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(container);

    // Read theme tokens from CSS root
    const readPalette = () => {
      const styles = getComputedStyle(document.documentElement);
      return {
        bg: styles.getPropertyValue('--graph-bg').trim() || '#16161b',
        node: styles.getPropertyValue('--graph-node').trim() || '#9f7aea',
        nodeActive: styles.getPropertyValue('--graph-node-active').trim() || '#c4b5fd',
        nodeUnresolved: styles.getPropertyValue('--graph-node-unresolved').trim() || '#525264',
        edge: styles.getPropertyValue('--graph-edge').trim() || 'rgba(167,139,250,0.24)',
        edgeActive: styles.getPropertyValue('--graph-edge-active').trim() || 'rgba(196,181,253,0.85)',
        label: styles.getPropertyValue('--graph-label').trim() || '#e4e4e7',
        accent: styles.getPropertyValue('--accent').trim() || '#8b5cf6',
      };
    };

    const palette = readPalette();

    const stepAndDraw = () => {
      const simNodes = simNodesRef.current;
      const nodeMap = new Map<string, SimNode>();
      for (const n of simNodes) nodeMap.set(n.id, n);

      // Force-directed simulation step
      const repulsion = mode === 'local' ? 2200 : 4200;
      const springLen = mode === 'local' ? 88 : 125;
      const springK = 0.018;
      const gravity = 0.008;
      const damping = 0.84;

      for (let i = 0; i < simNodes.length; i++) {
        const a = simNodes[i];
        // Center pull
        a.vx += -a.x * gravity;
        a.vy += -a.y * gravity;

        for (let j = i + 1; j < simNodes.length; j++) {
          const b = simNodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let distSq = dx * dx + dy * dy;
          if (distSq < 1) {
            dx = (Math.random() - 0.5) * 2;
            dy = (Math.random() - 0.5) * 2;
            distSq = 4;
          }
          const force = repulsion / distSq;
          const dist = Math.sqrt(distSq);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      for (const edge of filteredGraph.edges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const delta = dist - springLen;
        const fx = (dx / dist) * delta * springK;
        const fy = (dy / dist) * delta * springK;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      for (const n of simNodes) {
        if (draggedNodeRef.current?.id === n.id) {
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.vx *= damping;
        n.vy *= damping;
        n.x += Math.max(-18, Math.min(18, n.vx));
        n.y += Math.max(-18, Math.min(18, n.vy));
      }

      // Neighbor set for hovered node highlight
      const hoveredId = hoveredNodeIdRef.current;
      const neighborSet = new Set<string>();
      if (hoveredId) {
        neighborSet.add(hoveredId);
        for (const e of filteredGraph.edges) {
          if (e.source === hoveredId) neighborSet.add(e.target);
          if (e.target === hoveredId) neighborSet.add(e.source);
        }
      }

      // Draw background
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, width, height);

      const cam = cameraRef.current;
      ctx.save();
      ctx.translate(width / 2 + cam.x, height / 2 + cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      // Draw edges
      for (const edge of filteredGraph.edges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;
        const isHighlighted = hoveredId && (edge.source === hoveredId || edge.target === hoveredId);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = isHighlighted ? palette.edgeActive : palette.edge;
        ctx.lineWidth = isHighlighted ? 1.8 / cam.zoom : 1 / cam.zoom;
        ctx.globalAlpha = hoveredId && !isHighlighted ? 0.25 : 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Draw nodes & Uyghur labels
      ctx.font = `${Math.max(10, 12 / Math.sqrt(cam.zoom))}px "UKIJ Tuz", "ALKATIP Basma", "Uyghur Pashto", Tahoma, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (const n of simNodes) {
        const isCurrent = n.id === activeNoteId;
        const isHovered = n.id === hoveredId;
        const isDimmed = hoveredId !== null && !neighborSet.has(n.id);

        ctx.globalAlpha = isDimmed ? 0.22 : 1;

        // Halo for active or hovered node
        if (isCurrent || isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 4.5, 0, Math.PI * 2);
          ctx.fillStyle = palette.accent;
          ctx.globalAlpha = isDimmed ? 0.1 : 0.24;
          ctx.fill();
          ctx.globalAlpha = isDimmed ? 0.22 : 1;
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.isUnresolved
          ? palette.nodeUnresolved
          : isCurrent || isHovered
            ? palette.nodeActive
            : palette.node;
        ctx.fill();

        // Label
        const showLabel = cam.zoom >= 0.55 || isHovered || isCurrent || mode === 'local';
        if (showLabel) {
          const shortTitle = n.title.length > 26 ? `${n.title.slice(0, 25)}…` : n.title;
          ctx.fillStyle = palette.label;
          ctx.globalAlpha = isDimmed ? 0.2 : isHovered || isCurrent ? 1 : 0.84;
          ctx.fillText(shortTitle, n.x, n.y + n.radius + 5);
        }
      }

      ctx.restore();
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(stepAndDraw);
    };

    animId = requestAnimationFrame(stepAndDraw);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [filteredGraph, activeNoteId, theme, mode]);

  // Coordinate helpers
  const screenToWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const cam = cameraRef.current;
    return {
      x: (sx - rect.width / 2 - cam.x) / cam.zoom,
      y: (sy - rect.height / 2 - cam.y) / cam.zoom,
    };
  };

  const findNodeAt = (worldX: number, worldY: number): SimNode | null => {
    const simNodes = simNodesRef.current;
    for (let i = simNodes.length - 1; i >= 0; i--) {
      const n = simNodes[i];
      const dx = worldX - n.x;
      const dy = worldY - n.y;
      const hitRadius = Math.max(12, n.radius + 5);
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return n;
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = findNodeAt(world.x, world.y);
    dragMovedRef.current = false;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    if (hit) {
      draggedNodeRef.current = hit;
    } else {
      isPanningRef.current = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragMovedRef.current = true;
    }

    if (draggedNodeRef.current) {
      const world = screenToWorld(e.clientX, e.clientY);
      draggedNodeRef.current.x = world.x;
      draggedNodeRef.current.y = world.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isPanningRef.current) {
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);
    const hit = findNodeAt(world.x, world.y);
    hoveredNodeIdRef.current = hit ? hit.id : null;
    setHoveredTitle(hit ? (hit.isUnresolved ? `${hit.title} (قۇرۇلمىغان)` : hit.title) : null);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const clickedNode = draggedNodeRef.current;
    draggedNodeRef.current = null;
    isPanningRef.current = false;

    if (clickedNode && !dragMovedRef.current) {
      if (clickedNode.noteId) {
        onSelectNote(clickedNode.noteId);
      } else if (clickedNode.isUnresolved) {
        onCreateUnresolvedNote(clickedNode.title);
      }
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    cameraRef.current.zoom = Math.max(0.3, Math.min(2.8, cameraRef.current.zoom * factor));
  };

  const adjustZoom = (factor: number) => {
    cameraRef.current.zoom = Math.max(0.3, Math.min(2.8, cameraRef.current.zoom * factor));
  };

  const resetCamera = () => {
    cameraRef.current = { x: 0, y: 0, zoom: mode === 'local' ? 1.05 : 1 };
    setLayoutSeed((s) => s + 1);
  };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ backgroundColor: 'var(--graph-bg)' }}>
      {/* Global Graph Filter Toolbar */}
      {mode === 'global' && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2.5 border-b flex-wrap shrink-0"
          style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            >
              <Search className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="تۈگۈن سۈزۈش..."
                className="bg-transparent text-xs outline-none w-36"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>

            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border text-xs outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">بارلىق خەتكۈچلەر</option>
              {allTags.map((t) => (
                <option key={t.tag} value={t.tag}>
                  #{t.tag} ({t.count})
                </option>
              ))}
            </select>

            <label
              className="inline-flex items-center gap-1.5 text-xs cursor-pointer select-none"
              style={{ color: 'var(--text-secondary)' }}
            >
              <input
                type="checkbox"
                checked={showUnresolved}
                onChange={(e) => setShowUnresolved(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span>قۇرۇلمىغان ئۇلانمىلارنى كۆرسىتىش</span>
            </label>
          </div>

          <div className="flex items-center gap-2 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
            <span>{filteredGraph.nodes.length} تۈگۈن</span>
            <span aria-hidden="true">·</span>
            <span>{filteredGraph.edges.length} باغلىنىش</span>
            <span className="mx-1 h-4 w-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
            <button
              type="button"
              title="چوڭايتىش"
              onClick={() => adjustZoom(1.2)}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="كىچىكلىتىش"
              onClick={() => adjustZoom(0.82)}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="قايتا جايلاشتۇرۇش"
              onClick={resetCamera}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Canvas Container */}
      <div ref={containerRef} className="relative flex-1 min-h-[220px] overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            hoveredNodeIdRef.current = null;
            setHoveredTitle(null);
          }}
          onWheel={handleWheel}
          className="block w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Local Graph Quick Action */}
        {mode === 'local' && onExpandToGlobal && (
          <button
            type="button"
            onClick={onExpandToGlobal}
            title="تولۇق بىلىم گرافىكىنى ئېچىش"
            className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <Maximize2 className="w-3 h-3" />
            <span>تولۇق كۆرۈش</span>
          </button>
        )}

        {/* Quiet Hover Tooltip */}
        {hoveredTitle && (
          <div
            className="pointer-events-none absolute bottom-3 right-3 px-3 py-1.5 rounded-md border text-xs"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            {hoveredTitle} — ئېچىش ئۈچۈن چېكىڭ
          </div>
        )}

        {filteredGraph.nodes.length === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center text-xs px-6 text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            ماس كېلىدىغان تۈگۈن تېپىلمىدى.
          </div>
        )}
      </div>
    </div>
  );
};
