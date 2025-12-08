
export interface ProjectMetadata {
  id: string;
  name: string;
  timestamp: number;
  pageCount: number;
  fileSize?: number;
}

export type DrawingTool = 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'image-placeholder' | 'stamp';

export interface StampConfig {
  id: string;
  name: string; // For display in menu
  text: string;
  textColor: string;
  backgroundColor: string;
  fontSize: number;
  shortcutKey: string; // Single char or key code
}

export interface EditorObject {
  id: string;
  type: DrawingTool;
  sp: { x: number; y: number };
  ep: { x: number; y: number };
  text?: string;
  color?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  strokeWidth?: number;
  fontFamily?: string;
  fontSize?: number;
  imageData?: Blob; // For image-placeholder
  // Specific for stamps
  isStamp?: boolean;
}

export type PageSource =
  | { type: 'pdf'; pdfId: string; pageIndex: number } // pageIndex is 1-based
  | { type: 'image'; data: Blob };

export interface PageData {
  id: string;
  source: PageSource;
  rotation: 0 | 90 | 180 | 270;
  objects: EditorObject[];
}

export interface StoredProject {
  id: string;
  name: string;
  pages: PageData[];
  pdfAssets?: Record<string, Blob>; // Map of pdfId -> Blob
  timestamp: number;
  fileSize?: number;
}

export interface EditorPageProps {
  project: StoredProject;
  onSave: (project: StoredProject, newName?: string) => Promise<void>;
  onClose: () => void;
}

export interface EditorPageState {
  id: string;
  name: string;
  pages: PageData[];
  pdfAssets: Record<string, Blob>;
}

export enum CompressionQuality {
  LOW = 0.5,
  NORMAL = 0.75,
  HIGH = 0.92,
}