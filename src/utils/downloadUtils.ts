import { generate3DModelFilename } from '@/utils/file-utils';
import { Message } from '@shared/types';
import { supabase } from '@/lib/supabase';
import { apiUrl } from '@/services/api';

// On-demand DXF generator. The OpenSCAD worker produces DXF output by recompiling
// the source through a top-down projection, so consumers receive a callback rather
// than a ready blob.
export type DxfExporter = () => Promise<Blob>;
export type Build123dExportFormat = 'stl' | 'step' | 'brep';

export interface Build123dPreviewPart {
  label: string;
  color: [number, number, number, number] | null;
  stl: string;
}

export interface Build123dPreviewPayload {
  rootStl: string;
  parts: Build123dPreviewPart[];
}

interface DownloadOptions {
  content: Blob | string;
  filename: string;
  mimeType?: string;
}

interface GenerateDownloadFilenameOptions {
  currentMessage?: Message | null;
  fallback?: string;
  extension: string;
}

/**
 * Downloads a file by creating a temporary download link
 */
export function downloadFile({
  content,
  filename,
  mimeType = 'application/octet-stream',
}: DownloadOptions): void {
  let blob: Blob;

  if (typeof content === 'string') {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = content;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates a filename for downloads using the 3D model filename utility
 */
export function generateDownloadFilename({
  currentMessage,
  fallback = 'parametric-model',
  extension,
}: GenerateDownloadFilenameOptions): string {
  const baseName = generate3DModelFilename({
    conversationTitle: undefined,
    assistantMessage: currentMessage || undefined,
    modelName: undefined,
    fallback,
  });

  return `${baseName}.${extension}`;
}

/**
 * Downloads STL file from blob
 */
export function downloadSTLFile(
  output: Blob,
  currentMessage?: Message | null,
): void {
  const filename = generateDownloadFilename({
    currentMessage,
    extension: 'stl',
  });

  downloadFile({
    content: output,
    filename,
    mimeType: 'application/octet-stream',
  });
}

/**
 * Downloads OpenSCAD code as .scad file
 */
export function downloadOpenSCADFile(
  code: string,
  currentMessage?: Message | null,
): void {
  const filename = generateDownloadFilename({
    currentMessage,
    extension: 'scad',
  });

  downloadFile({
    content: code,
    filename,
    mimeType: 'text/plain',
  });
}

export function downloadPythonFile(
  code: string,
  currentMessage?: Message | null,
): void {
  const filename = generateDownloadFilename({
    currentMessage,
    extension: 'py',
  });

  downloadFile({
    content: code,
    filename,
    mimeType: 'text/x-python',
  });
}

export async function exportBuild123dFile(
  code: string,
  format: Build123dExportFormat,
): Promise<Blob> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const response = await fetch(apiUrl('build123d-export'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ code, format }),
  });

  if (!response.ok) {
    const contentType = response.headers.get('Content-Type') ?? '';
    if (contentType.includes('application/json')) {
      const data: unknown = await response.json();
      const error =
        typeof data === 'object' && data !== null
          ? Reflect.get(data, 'error')
          : undefined;
      throw new Error(typeof error === 'string' ? error : response.statusText);
    }
    throw new Error(response.statusText);
  }

  return response.blob();
}

export async function exportBuild123dPreview(
  code: string,
): Promise<Build123dPreviewPayload> {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const response = await fetch(apiUrl('build123d-export'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ code, format: 'preview' }),
  });

  if (!response.ok) {
    const contentType = response.headers.get('Content-Type') ?? '';
    if (contentType.includes('application/json')) {
      const data: unknown = await response.json();
      const error =
        typeof data === 'object' && data !== null
          ? Reflect.get(data, 'error')
          : undefined;
      throw new Error(typeof error === 'string' ? error : response.statusText);
    }
    throw new Error(response.statusText);
  }

  return response.json() as Promise<Build123dPreviewPayload>;
}

export async function downloadBuild123dExport(
  code: string,
  format: Exclude<Build123dExportFormat, 'stl'>,
  currentMessage?: Message | null,
): Promise<void> {
  const output = await exportBuild123dFile(code, format);
  const extension = format === 'step' ? 'step' : 'brep';
  const filename = generateDownloadFilename({
    currentMessage,
    extension,
  });

  downloadFile({
    content: output,
    filename,
    mimeType: format === 'step' ? 'model/step' : 'application/octet-stream',
  });
}

/**
 * Downloads DXF file from blob
 */
export function downloadDXFFile(
  output: Blob,
  currentMessage?: Message | null,
): void {
  const filename = generateDownloadFilename({
    currentMessage,
    extension: 'dxf',
  });

  downloadFile({
    content: output,
    filename,
    mimeType: 'application/dxf',
  });
}
