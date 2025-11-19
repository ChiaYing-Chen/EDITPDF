import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import Dexie, { type Table } from 'dexie';
import { StoredProject, PageData, EditorObject } from './types';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

// --- Database Setup ---
const db = new Dexie('PDFEditorDB') as Dexie & {
  projects: Table<StoredProject, string>;
};

db.version(1).stores({
  projects: 'id, name, timestamp' // Indexed fields
});

// --- Icons ---
const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const MergeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const DocumentIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// --- Utility Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const fileToBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
};

// --- Components ---

// 1. Header Component
const Header = ({ onMerge, onNew }: { onMerge: () => void, onNew: () => void }) => (
  <div className="pb-8 border-b border-gray-800">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          PDF 編輯與合併工具
        </h1>
        <p className="text-gray-400">
          在瀏覽器中直接管理、編輯與合併您的 PDF 文件，安全無虞。
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onMerge}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors font-medium border border-gray-700"
        >
          <MergeIcon className="w-5 h-5" />
          合併 PDF
        </button>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-900/20"
        >
          <PlusIcon className="w-5 h-5" />
          新增專案
        </button>
      </div>
    </div>
  </div>
);

// 2. Project List Component
const ProjectList = ({ projects, onOpen, onDelete }: { projects: StoredProject[], onOpen: (p: StoredProject) => void, onDelete: (id: string) => void }) => {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <DocumentIcon className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg">尚無專案，請點擊「新增專案」開始使用。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onOpen(project)}
          className="group relative flex flex-col bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-gray-900/20 hover:-translate-y-1"
        >
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
              title="刪除專案"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="w-12 h-12 rounded-lg bg-gray-700/50 flex items-center justify-center mb-4 text-gray-300 group-hover:text-blue-400 transition-colors">
            <DocumentIcon className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-semibold text-gray-100 mb-2 line-clamp-2 min-h-[3.5rem]">
            {project.name}
          </h3>

          <div className="mt-auto pt-4 flex items-center justify-between text-sm text-gray-500">
            <span>{project.pages.length} 頁</span>
            <span>{formatDate(project.timestamp)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// 3. Simple Editor Component (Placeholder for full logic)
const Editor = ({ project, onBack }: { project: StoredProject, onBack: () => void }) => {
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-gray-800 bg-gray-900">
        <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-white">{project.name}</h2>
          <p className="text-sm text-gray-500">{project.pages.length} 頁 • 最後編輯: {formatDate(project.timestamp)}</p>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8 bg-gray-950">
        {project.pages.map((page, index) => (
           <div key={page.id} className="relative group">
              <div className="absolute -left-12 top-0 text-gray-500 font-mono text-sm">#{index + 1}</div>
               {/* Display placeholder for page content */}
               <div className="w-[600px] h-[800px] bg-white rounded shadow-lg flex items-center justify-center text-gray-400 relative overflow-hidden">
                  {/* In a real app, we would render the blob here. 
                      Since we generate standard blobs, we can try to create an object URL if it's an image.
                      If it's a PDF page blob, we need to render it. 
                      For simplicity in this specific styling task, we assume image blobs or show a placeholder. 
                  */}
                  <span className="text-sm">預覽頁面 {index + 1}</span>
                  {/* Attempt to render if it's an image blob */}
                  {page.data && (
                      <img 
                        src={URL.createObjectURL(page.data)} 
                        alt={`Page ${index + 1}`}
                        className="absolute inset-0 w-full h-full object-contain bg-white"
                        onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} 
                      />
                  )}
               </div>
           </div>
        ))}
      </div>
    </div>
  );
};


export default function App() {
  const [view, setView] = useState<'home' | 'editor'>('home');
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [currentProject, setCurrentProject] = useState<StoredProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      const allProjects = await db.projects.orderBy('timestamp').reverse().toArray();
      setProjects(allProjects);
    };
    loadProjects();
  }, [view]); // Reload when returning to home

  // --- Handlers ---

  const handleCreateProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const buffer = await fileToBuffer(file);
      
      // Load PDF to get page count and render previews
      const pdfDoc = await pdfjsLib.getDocument(buffer).promise;
      const pages: PageData[] = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.8));
          
          pages.push({
            id: generateId(),
            data: blob,
            rotation: 0,
            objects: []
          });
        }
      }

      const newProject: StoredProject = {
        id: generateId(),
        name: file.name.replace('.pdf', ''),
        timestamp: Date.now(),
        pages: pages
      };

      await db.projects.add(newProject);
      setProjects(prev => [newProject, ...prev]);
      
    } catch (err) {
      console.error("Error creating project:", err);
      alert("無法讀取 PDF 檔案");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMergePDFs = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length < 2) {
          alert("請至少選擇兩個 PDF 檔案進行合併");
          return;
      }

      setIsLoading(true);
      try {
          const mergedPdf = await PDFDocument.create();
          const previewPages: PageData[] = [];

          for (let i = 0; i < files.length; i++) {
              const buffer = await fileToBuffer(files[i]);
              const pdf = await PDFDocument.load(buffer);
              const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
              copiedPages.forEach((page) => mergedPdf.addPage(page));

              // For preview generation (simplified: just grab first page of each doc to represent it, 
              // or we'd need to render all pages using pdf.js again. 
              // To save time/performance in this demo, we'll just use pdf.js to render all pages)
              const pdfJsDoc = await pdfjsLib.getDocument(buffer).promise;
              for(let j=1; j<=pdfJsDoc.numPages; j++){
                  const p = await pdfJsDoc.getPage(j);
                  const viewport = p.getViewport({ scale: 1.0 });
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  if(ctx) {
                      await p.render({ canvasContext: ctx, viewport }).promise;
                      const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.7));
                      previewPages.push({
                          id: generateId(),
                          data: blob,
                          rotation: 0,
                          objects: []
                      });
                  }
              }
          }

          const mergedBytes = await mergedPdf.save();
          const fileName = `Merged_${new Date().toISOString().slice(0,10)}.pdf`;
          
          // In a real merge tool, we might just download it directly OR save as project.
          // Let's save as project.
          const newProject: StoredProject = {
              id: generateId(),
              name: "合併的專案 " + formatDate(Date.now()),
              timestamp: Date.now(),
              pages: previewPages
          };
          await db.projects.add(newProject);
          setProjects(prev => [newProject, ...prev]);

      } catch (err) {
          console.error(err);
          alert("合併失敗");
      } finally {
          setIsLoading(false);
          if (mergeInputRef.current) mergeInputRef.current.value = '';
      }
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('確定要刪除此專案嗎？')) {
      await db.projects.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  const openProject = (project: StoredProject) => {
    setCurrentProject(project);
    setView('editor');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-blue-500/30">
      {/* Hidden Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCreateProject}
        accept=".pdf"
        className="hidden"
      />
      <input
          type="file"
          ref={mergeInputRef}
          onChange={handleMergePDFs}
          accept=".pdf"
          multiple
          className="hidden"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-400 font-medium">處理中...</p>
          </div>
        </div>
      )}

      {/* Main View Switcher */}
      {view === 'home' ? (
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Header 
            onNew={() => fileInputRef.current?.click()} 
            onMerge={() => mergeInputRef.current?.click()} 
          />
          <div className="mt-8">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-200">最近的專案</h2>
             </div>
            <ProjectList 
              projects={projects} 
              onOpen={openProject} 
              onDelete={handleDeleteProject} 
            />
          </div>
        </div>
      ) : (
        currentProject && <Editor project={currentProject} onBack={() => setView('home')} />
      )}
    </div>
  );
}
