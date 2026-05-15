import { useOpenSCAD } from '@/hooks/useOpenSCAD';
import {
  useCallback,
  useEffect,
  useState,
  useContext,
  useRef,
  useMemo,
} from 'react';
import { ThreeScene } from '@/components/viewer/ThreeScene';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import {
  BufferGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
} from 'three';
import { Loader2, CircleAlert } from 'lucide-react';
import { parseColoredOff } from '@/utils/offParser';
import { MeshFilesContext } from '@/contexts/MeshFilesContext';
import { createDXFProjectionCode } from '@/utils/dxfUtils';
import { DxfExporter } from '@/utils/downloadUtils';
import type { AgenticCompileResult } from '@/hooks/useAgenticVerification';

// Extract import() filenames from OpenSCAD code
function extractImportFilenames(code: string): string[] {
  const importRegex = /import\s*\(\s*"([^"]+)"\s*\)/g;
  const filenames: string[] = [];
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    filenames.push(match[1]);
  }
  return filenames;
}

type ColoredPreview = {
  geometry: BufferGeometry;
  materials: MeshStandardMaterial[];
};

function disposeColoredPreview(preview: ColoredPreview | null) {
  if (!preview) return;
  preview.geometry.dispose();
  preview.materials.forEach((material) => material.dispose());
}

function createMaterial(
  color: [number, number, number, number] | null,
  fallbackColor: string,
) {
  const faceColor = normalizeColor(color);
  return new MeshStandardMaterial({
    color: faceColor
      ? (Math.round(faceColor[0] * 255) << 16) |
        (Math.round(faceColor[1] * 255) << 8) |
        Math.round(faceColor[2] * 255)
      : fallbackColor,
    metalness: faceColor ? 0.05 : 0.6,
    roughness: faceColor ? 0.7 : 0.3,
    envMapIntensity: faceColor ? 0.15 : 0.3,
    transparent: faceColor ? faceColor[3] < 1 : false,
    opacity: faceColor ? faceColor[3] : 1,
  });
}

function normalizeColor(color: [number, number, number, number] | null) {
  if (!color) return null;

  const r = Math.round(color[0] * 255);
  const g = Math.round(color[1] * 255);
  const b = Math.round(color[2] * 255);
  if (r === 249 && g === 215 && b === 44) return null;
  if (r === 157 && g === 203 && b === 81) return null;
  return color;
}

interface OpenSCADPreviewProps {
  scadCode: string | null;
  color: string;
  onCompileResult?: (result: AgenticCompileResult) => void;
  onDxfExportChange?: (exporter: DxfExporter | null) => void;
  isMobile?: boolean;
  backgroundColor?: string;
  suppressCompileErrors?: boolean;
  // Optional set of supplementary .scad files for multi-file artifacts.
  // Each is written to the WASM filesystem before compile so the entry
  // (`scadCode`) can `use <name.scad>` / `include <name.scad>` them.
  // Bare filenames only — no directories.
  files?: { name: string; content: string }[];
  // Filename of the entry file inside `files`. The entry's content is
  // already passed to `compileScad` via `scadCode`, so we skip writing
  // it again. We key the skip on filename (not on content equality)
  // because two distinct files could share identical content, and
  // during `update_file` streams the `files` prop updates one render
  // ahead of `scadCode` — so identity by content briefly disagrees.
  entryFile?: string;
}

export function OpenSCADPreview({
  scadCode,
  color,
  onCompileResult,
  onDxfExportChange,
  isMobile,
  backgroundColor,
  suppressCompileErrors = false,
  files,
  entryFile,
}: OpenSCADPreviewProps) {
  const {
    compileScad,
    exportScad,
    writeFile,
    isCompiling,
    output,
    offOutput,
    isError,
  } = useOpenSCAD();
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const [coloredPreview, setColoredPreview] = useState<ColoredPreview | null>(
    null,
  );
  // Use context directly to avoid throwing if provider is not mounted (e.g. VisualCard)
  const meshFilesCtx = useContext(MeshFilesContext);
  // Track which files we've written to avoid re-writing unchanged blobs
  const writtenFilesRef = useRef<Map<string, Blob>>(new Map());
  // Every compile produces a fresh geometry, so the previous geometry's VRAM
  // must be released on replacement.
  const mountedGeometryRef = useRef<BufferGeometry | null>(null);
  const mountedColoredPreviewRef = useRef<ColoredPreview | null>(null);
  const fallbackColorRef = useRef(color);
  useEffect(() => {
    fallbackColorRef.current = color;
  }, [color]);

  const showCompiling = isCompiling || (suppressCompileErrors && isError);
  const pendingPreviewCodeRef = useRef<string | null>(null);

  // Track which `.scad` aux files we've written (and their content) so we
  // skip the worker round-trip when nothing changed between recompiles —
  // critical for streaming multi-file artifacts where this fires dozens
  // of times as files arrive.
  const writtenScadFilesRef = useRef<Map<string, string>>(new Map());
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const scadFilesKey = useMemo(
    () =>
      (files ?? [])
        .map(
          (f) => `${f.name.length}:${f.name}:${f.content.length}:${f.content}`,
        )
        .join('\n'),
    [files],
  );

  // Shared by preview compilation and on-demand exports so import() files are
  // available in the OpenSCAD worker before either operation runs. Also
  // covers multi-file artifacts: each supplementary `.scad` from `files`
  // is written so the entry can `use <name.scad>` / `include <name.scad>`.
  const prepareMeshFiles = useCallback(
    async (code: string) => {
      // Write supplementary .scad files first — the entry's `use <...>`
      // resolution needs them on disk before compileScad runs.
      const scadFiles = filesRef.current;
      if (scadFilesKey && scadFiles && scadFiles.length > 0) {
        for (const f of scadFiles) {
          // Skip the entry file BY NAME — its content is passed to
          // compileScad directly via `scadCode`. Keying on content
          // equality (the previous approach) was fragile in two ways:
          // (1) two distinct files could share identical content; (2)
          // when `update_file` streams a patched entry, the `files`
          // prop updates one render before `scadCode`, so for one
          // frame the entry's content in `files` no longer equals
          // `code` and the entry would get duplicate-written to the
          // WASM fs alongside the compileScad call → OpenSCAD would
          // see redeclared top-level vars and error out.
          if (entryFile && f.name === entryFile) continue;
          const previous = writtenScadFilesRef.current.get(f.name);
          if (previous === f.content) continue;
          await writeFile(
            f.name,
            new Blob([f.content], { type: 'text/plain' }),
          );
          writtenScadFilesRef.current.set(f.name, f.content);
        }
      }

      // Extract any import() filenames from the code
      const importedFiles = extractImportFilenames(code);

      // Write any mesh files that haven't been written yet
      if (!meshFilesCtx) return;

      for (const filename of importedFiles) {
        const meshContent = meshFilesCtx.getMeshFile(filename);
        const writtenBlob = writtenFilesRef.current.get(filename);
        const needsWrite =
          meshContent && (!writtenBlob || writtenBlob !== meshContent);

        if (needsWrite && meshContent) {
          await writeFile(filename, meshContent);
          writtenFilesRef.current.set(filename, meshContent);
        }
      }
    },
    [writeFile, meshFilesCtx, scadFilesKey, entryFile],
  );

  // Recompile the preview whenever the current SCAD code changes.
  useEffect(() => {
    if (!scadCode) return;

    const compileWithMeshFiles = async () => {
      try {
        await prepareMeshFiles(scadCode);
        pendingPreviewCodeRef.current = scadCode;
        onCompileResult?.({ type: 'pending' });
        compileScad(scadCode);
      } catch (err) {
        if (err instanceof Error && err.message === 'Worker terminated') return;
        console.error('[OpenSCAD] Error preparing files for compilation:', err);
      }
    };

    compileWithMeshFiles();
  }, [scadCode, compileScad, onCompileResult, prepareMeshFiles]);

  // Register a parent-owned DXF exporter for the current SCAD code. The export
  // runs only when the user chooses DXF from the download menu.
  useEffect(() => {
    if (!scadCode || !onDxfExportChange) return;

    onDxfExportChange(async () => {
      await prepareMeshFiles(scadCode);
      return exportScad(createDXFProjectionCode(scadCode), 'dxf');
    });

    return () => onDxfExportChange(null);
  }, [scadCode, exportScad, onDxfExportChange, prepareMeshFiles]);

  useEffect(() => {
    const sourceCode = pendingPreviewCodeRef.current;
    if (output && sourceCode) {
      onCompileResult?.({ type: 'stl', output, sourceCode });
    } else {
      onCompileResult?.({ type: 'pending' });
    }

    // Mirror the colored-group pattern: every path that clears geometry
    // state must first release the previous vertex buffers, otherwise
    // recompiles + no-output transitions leak VRAM the same way the group
    // path used to.
    const clearGeometry = () => {
      if (mountedGeometryRef.current) {
        mountedGeometryRef.current.dispose();
        mountedGeometryRef.current = null;
      }
      setGeometry(null);
    };

    if (output && output instanceof Blob) {
      let cancelled = false;
      output
        .arrayBuffer()
        .then((buffer) => {
          if (cancelled) return;
          const loader = new STLLoader();
          const geom = loader.parse(buffer);
          geom.center();
          geom.computeVertexNormals();
          if (mountedGeometryRef.current) mountedGeometryRef.current.dispose();
          mountedGeometryRef.current = geom;
          setGeometry(geom);
        })
        .catch((err) => {
          console.error('[OpenSCAD] Failed to parse STL preview:', err);
          if (!cancelled) clearGeometry();
        });
      return () => {
        cancelled = true;
      };
    } else {
      clearGeometry();
    }
  }, [output, onCompileResult]);

  useEffect(() => {
    let cancelled = false;

    const clearColoredPreview = () => {
      disposeColoredPreview(mountedColoredPreviewRef.current);
      mountedColoredPreviewRef.current = null;
      setColoredPreview(null);
    };

    if (!(offOutput instanceof Blob)) {
      clearColoredPreview();
      return;
    }

    offOutput
      .text()
      .then((text) => {
        if (cancelled) return;

        const parsed = parseColoredOff(text);
        const buckets = new Map<
          string,
          {
            color: [number, number, number, number] | null;
            positions: number[];
          }
        >();

        for (const face of parsed.faces) {
          const key = face.color ? face.color.join(',') : '__default';
          let bucket = buckets.get(key);
          if (!bucket) {
            bucket = { color: face.color, positions: [] };
            buckets.set(key, bucket);
          }

          for (const index of face.vertices) {
            const vertex = parsed.vertices[index];
            bucket.positions.push(vertex[0], vertex[1], vertex[2]);
          }
        }

        if (buckets.size === 0) {
          clearColoredPreview();
          return;
        }

        const positions = new Float32Array(
          Array.from(buckets.values()).reduce(
            (sum, bucket) => sum + bucket.positions.length,
            0,
          ),
        );
        const geometry = new BufferGeometry();
        const materials: MeshStandardMaterial[] = [];

        let offset = 0;
        for (const bucket of buckets.values()) {
          positions.set(bucket.positions, offset);
          geometry.addGroup(
            offset / 3,
            bucket.positions.length / 3,
            materials.length,
          );
          materials.push(
            createMaterial(bucket.color, fallbackColorRef.current),
          );
          offset += bucket.positions.length;
        }

        geometry.setAttribute(
          'position',
          new Float32BufferAttribute(positions, 3),
        );
        geometry.center();
        geometry.computeVertexNormals();

        const nextPreview = { geometry, materials };
        disposeColoredPreview(mountedColoredPreviewRef.current);
        mountedColoredPreviewRef.current = nextPreview;
        setColoredPreview(nextPreview);
      })
      .catch((err) => {
        console.error('[OpenSCAD] Failed to parse colored OFF preview:', err);
        if (!cancelled) clearColoredPreview();
      });

    return () => {
      cancelled = true;
    };
  }, [offOutput]);

  // Release the last mounted geometry's GPU resources on unmount.
  useEffect(() => {
    return () => {
      disposeColoredPreview(mountedColoredPreviewRef.current);
      mountedColoredPreviewRef.current = null;
      if (mountedGeometryRef.current) {
        mountedGeometryRef.current.dispose();
        mountedGeometryRef.current = null;
      }
    };
  }, []);

  return (
    <div className="h-full w-full bg-adam-neutral-700/50 shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out">
      <div className="h-full w-full">
        {geometry ? (
          <div className="h-full w-full">
            <ThreeScene
              geometry={geometry}
              coloredGeometry={coloredPreview?.geometry}
              coloredMaterials={coloredPreview?.materials}
              color={color}
              isMobile={isMobile}
              backgroundColor={backgroundColor}
            />
          </div>
        ) : (
          <>
            {isError && !suppressCompileErrors && (
              <div className="flex h-full items-center justify-center">
                <CompileErrorState />
              </div>
            )}
          </>
        )}
        {showCompiling && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-adam-neutral-700/30 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-adam-blue" />
              <p className="text-xs font-medium text-adam-text-primary/70">
                Compiling...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Alias for backwards compatibility (ViewerSection imports OpenSCADViewer)
export { OpenSCADPreview as OpenSCADViewer };

function CompileErrorState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <CircleAlert className="h-8 w-8 text-adam-blue" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-adam-blue">
            Error Compiling Model
          </p>
          <p className="mt-1 text-xs text-adam-text-primary/60">
            Adam encountered an error while compiling
          </p>
        </div>
      </div>
    </div>
  );
}
