import { createContext, useContext } from 'react';

export interface MeshFilesContextType {
  // Store a mesh file by filename
  setMeshFile: (filename: string, content: Blob) => void;
  // Get a mesh file by filename
  getMeshFile: (filename: string) => Blob | undefined;
  // Check if a mesh file exists
  hasMeshFile: (filename: string) => boolean;
  // Clear all mesh files
  clearMeshFiles: () => void;
}

export const MeshFilesContext = createContext<MeshFilesContextType | undefined>(
  undefined,
);

export function useMeshFiles() {
  const context = useContext(MeshFilesContext);
  if (context === undefined) {
    throw new Error('useMeshFiles must be used within a MeshFilesProvider');
  }
  return context;
}
