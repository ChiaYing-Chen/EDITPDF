
export interface ProjectMetadata {
  id: string;
  name: string;
  timestamp: number;
  pageCount: number;
  fileSize?: number;
}

export type DrawingTool = 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'image-placeholder';

export interface EditorObject {
  id: string;
  type: DrawingTool;
  sp: { x: number; y: number };
  ep: { x: number; y: number };
  text?: string;
  color?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  fontFamily?: string;
  fontSize?: number;
  imageData?: Blob; // For image-placeholder
}

export interface PageData {
    id: string;
    data: Blob;
    rotation: 0 | 90 | 180 | 270;
    objects: EditorObject[];
}

export interface StoredProject {
  id: string;
  name: string;
  pages: PageData[];
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
}

export enum CompressionQuality {
  LOW = 0.5,
  NORMAL = 0.75,
  HIGH = 0.92,
}