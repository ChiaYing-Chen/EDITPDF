export interface ProjectMetadata {
  id: string;
  name: string;
  timestamp: number;
  pageCount: number;
}

export interface StoredProject {
  id: string;
  name: string;
  pages: {
    id: string;
    dataUrl: string;
    rotation: 0 | 90 | 180 | 270;
  }[];
}

export interface EditorPageProps {
  project: StoredProject;
  onSave: (project: StoredProject, newName?: string) => void;
  onClose: () => void;
}

export interface EditorPageState {
  id: string;
  name: string;
  pages: {
    id: string;
    dataUrl: string;
    rotation: 0 | 90 | 180 | 270;
  }[];
}

export enum CompressionQuality {
  LOW = 0.5,
  NORMAL = 0.75,
  HIGH = 0.92,
}
