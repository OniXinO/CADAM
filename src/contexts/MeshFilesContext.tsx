import { useRef, useCallback } from 'react';
import { MeshFilesContext } from './meshFiles';

export function MeshFilesProvider({ children }: { children: React.ReactNode }) {
  // Use ref to avoid re-renders when files are added
  const meshFilesRef = useRef<Map<string, Blob>>(new Map());

  const setMeshFile = useCallback((filename: string, content: Blob) => {
    console.log(`[MeshFiles] Storing: "${filename}" (${content.size} bytes)`);
    meshFilesRef.current.set(filename, content);
  }, []);

  const getMeshFile = useCallback((filename: string): Blob | undefined => {
    return meshFilesRef.current.get(filename);
  }, []);

  const hasMeshFile = useCallback((filename: string): boolean => {
    return meshFilesRef.current.has(filename);
  }, []);

  const clearMeshFiles = useCallback(() => {
    meshFilesRef.current.clear();
  }, []);

  return (
    <MeshFilesContext.Provider
      value={{ setMeshFile, getMeshFile, hasMeshFile, clearMeshFiles }}
    >
      {children}
    </MeshFilesContext.Provider>
  );
}
