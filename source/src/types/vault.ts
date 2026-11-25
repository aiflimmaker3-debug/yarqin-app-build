export type ThemeId = 'obsidian-dark' | 'modern-dark' | 'modern-light' | 'paper-light';

export type EditorViewMode = 'edit' | 'split' | 'preview';

export type MainSurface = 'editor' | 'graph' | 'pdf' | 'canvas' | 'flashcards' | 'about';

export type SidebarTab = 'files' | 'search' | 'tags' | 'library';

export type InspectorTab = 'links' | 'outline' | 'local-graph' | 'ai';

export type FontStyleId = 'naskh' | 'sans';

export type AiActionType = 'summarize' | 'proofread' | 'suggest_links' | 'expand' | 'ask';

export interface NoteItem {
  id: string;
  title: string;
  folderId: string | null;
  content: string;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  isOpen: boolean;
}

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  defaultFolderName?: string;
  isBuiltIn?: boolean;
}

export interface AttachmentMeta {
  id: string;
  name: string;
  mimeType: string;
  kind: 'pdf' | 'image' | 'doc';
  size: number;
  createdAt: number;
  linkedNoteId?: string | null;
}

export interface CanvasCard {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  text: string;
  noteId?: string | null;
  tone: 'default' | 'accent' | 'emerald' | 'amber';
}

export interface CanvasEdge {
  id: string;
  fromCardId: string;
  toCardId: string;
  label?: string;
}

export interface FlashcardProgress {
  cardId: string;
  ease: number; // 1.3 - 3.0
  intervalDays: number;
  reviews: number;
  nextReviewAt: number;
}

export interface CustomFlashcard {
  id: string;
  question: string;
  answer: string;
  sourceTitle?: string;
  createdAt: number;
}

export interface VaultLockConfig {
  enabled: boolean;
  saltHex: string;
  verifierHex: string;
}

export interface WorkspacePreferences {
  theme: ThemeId;
  fontStyle: FontStyleId;
  fontSize: number;
  editorMode: EditorViewMode;
  rightSidebarOpen: boolean;
  leftInspectorOpen: boolean;
  openTabIds: string[];
  activeNoteId: string | null;
  activePdfId?: string | null;
}

export interface VaultState {
  version: number;
  notes: NoteItem[];
  folders: FolderItem[];
  templates: NoteTemplate[];
  attachments: AttachmentMeta[];
  canvasCards: CanvasCard[];
  canvasEdges: CanvasEdge[];
  customFlashcards: CustomFlashcard[];
  flashcardProgress: Record<string, FlashcardProgress>;
}

export interface HeadingOutlineItem {
  level: number;
  text: string;
  id: string;
  line: number;
}

export interface OutgoingLinkItem {
  targetTitle: string;
  alias?: string;
  resolvedNoteId: string | null;
}

export interface BacklinkItem {
  sourceNoteId: string;
  sourceTitle: string;
  snippet: string;
}

export interface GraphNodeData {
  id: string;
  title: string;
  noteId: string | null;
  isUnresolved: boolean;
  tags: string[];
  degree: number;
}

export interface GraphEdgeData {
  source: string;
  target: string;
}

export interface VaultGraphIndex {
  noteById: Map<string, NoteItem>;
  noteByNormalizedTitle: Map<string, NoteItem>;
  outgoingByNoteId: Map<string, OutgoingLinkItem[]>;
  backlinksByNoteId: Map<string, BacklinkItem[]>;
  tagsByNoteId: Map<string, string[]>;
  notesByTag: Map<string, string[]>;
  allTags: Array<{ tag: string; count: number }>;
  graphNodes: GraphNodeData[];
  graphEdges: GraphEdgeData[];
}
