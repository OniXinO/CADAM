import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getAnonSupabaseClient } from './supabaseClient';
import { corsHeaders, isRecord } from './api';
import { env } from './env';

export type Build123dExportFormat = 'stl' | 'step' | 'brep';
type Build123dRequestFormat = Build123dExportFormat | 'preview';

const MAX_CODE_LENGTH = Number(env('BUILD123D_MAX_CODE_LENGTH')) || 200_000;
const EXPORT_TIMEOUT_MS = Number(env('BUILD123D_EXPORT_TIMEOUT_MS')) || 45_000;
const MAX_OUTPUT_BYTES =
  Number(env('BUILD123D_MAX_OUTPUT_BYTES')) || 25 * 1024 * 1024;
const MAX_PREVIEW_PARTS = Number(env('BUILD123D_MAX_PREVIEW_PARTS')) || 64;
const PYTHON_BIN = env('BUILD123D_PYTHON_BIN') || 'python3';
const EXPORT_SERVICE_URL = env('BUILD123D_EXPORT_URL').replace(/\/$/, '');
const EXPORT_SERVICE_TOKEN = env('BUILD123D_EXPORT_TOKEN');
const RUNTIME_ENVIRONMENT = env('ENVIRONMENT') || env('NODE_ENV');
const LOCAL_PYTHON_ALLOWED =
  env('BUILD123D_ALLOW_LOCAL_PYTHON') === '1' ||
  ['local', 'development', 'test'].includes(RUNTIME_ENVIRONMENT);

function normalizeExportFormat(value: unknown): Build123dRequestFormat | null {
  if (value === 'stl' || value === 'step' || value === 'brep') return value;
  if (value === 'preview') return value;
  return null;
}

function exportMimeType(format: Build123dExportFormat): string {
  if (format === 'stl') return 'model/stl';
  if (format === 'step') return 'model/step';
  return 'application/octet-stream';
}

function extensionForFormat(format: Build123dRequestFormat): string {
  return format === 'step' ? 'step' : format;
}

function buildExportScript({
  sourcePath,
  outputPath,
  format,
  maxPreviewParts,
}: {
  sourcePath: string;
  outputPath: string;
  format: Build123dRequestFormat;
  maxPreviewParts: number;
}) {
  return `
import base64
import importlib.util
import json
import pathlib
import socket
import sys
import traceback

try:
    import build123d

    def _blocked_network(*args, **kwargs):
        raise RuntimeError("Network access is disabled during build123d export")

    socket.create_connection = _blocked_network
    socket.socket = _blocked_network

    source_path = pathlib.Path(${JSON.stringify(sourcePath)})
    output_path = pathlib.Path(${JSON.stringify(outputPath)})
    spec = importlib.util.spec_from_file_location("adam_build123d_model", source_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load build123d source")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    gen_step = getattr(module, "gen_step", None)
    if not callable(gen_step):
        raise RuntimeError("build123d source must define gen_step()")
    shape = gen_step()
    if shape is None:
        raise RuntimeError("gen_step() returned None")

    export_format = ${JSON.stringify(format)}
    if export_format == "preview":
        def color_tuple(value):
            if value is None:
                return None
            if hasattr(value, "to_tuple"):
                return [float(v) for v in value.to_tuple()]
            try:
                return [float(v) for v in value]
            except TypeError:
                return None

        def collect_leaves(node, inherited_color=None, inherited_label="part"):
            color = getattr(node, "color", None) or inherited_color
            label = getattr(node, "label", None) or inherited_label
            children = tuple(getattr(node, "children", ()) or ())
            if children:
                leaves = []
                for index, child in enumerate(children):
                    child_label = getattr(child, "label", None) or f"{label}_{index + 1}"
                    leaves.extend(collect_leaves(child, color, child_label))
                return leaves
            return [(node, color, label)]

        root_stl_path = output_path.with_suffix(".root.stl")
        build123d.export_stl(shape, root_stl_path)
        parts = []
        for index, (part, part_color, part_label) in enumerate(collect_leaves(shape)[:${JSON.stringify(maxPreviewParts)}]):
            part_path = output_path.with_suffix(f".part-{index}.stl")
            build123d.export_stl(part, part_path)
            parts.append({
                "label": str(part_label or f"part_{index + 1}"),
                "color": color_tuple(part_color),
                "stl": base64.b64encode(part_path.read_bytes()).decode("ascii"),
            })
        output_path.write_text(json.dumps({
            "rootStl": base64.b64encode(root_stl_path.read_bytes()).decode("ascii"),
            "parts": parts,
        }), encoding="utf8")
    elif export_format == "step":
        build123d.export_step(shape, output_path)
    elif export_format == "brep":
        build123d.export_brep(shape, output_path)
    else:
        build123d.export_stl(shape, output_path)
except Exception:
    traceback.print_exc()
    sys.exit(1)
`;
}

function isJsonResponse(response: Response): boolean {
  return (response.headers.get('Content-Type') ?? '').includes(
    'application/json',
  );
}

async function errorFromResponse(response: Response): Promise<Error> {
  if (isJsonResponse(response)) {
    const body: unknown = await response.json().catch(() => null);
    const error = isRecord(body) ? (body.error ?? body.detail) : undefined;
    if (typeof error === 'string' && error) return new Error(error);
  }
  return new Error(response.statusText || 'build123d export failed');
}

async function runBuild123dExportService(
  code: string,
  format: Build123dRequestFormat,
): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('build123d export service timed out')),
    EXPORT_TIMEOUT_MS + 5000,
  );

  try {
    const response = await fetch(`${EXPORT_SERVICE_URL}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(EXPORT_SERVICE_TOKEN
          ? { Authorization: `Bearer ${EXPORT_SERVICE_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        code,
        format,
        timeoutMs: EXPORT_TIMEOUT_MS,
        maxOutputBytes: MAX_OUTPUT_BYTES,
        maxPreviewParts: MAX_PREVIEW_PARTS,
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw await errorFromResponse(response);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_OUTPUT_BYTES) {
      throw new Error('build123d export exceeded maximum output size');
    }
    return buffer;
  } finally {
    clearTimeout(timeout);
  }
}

export async function runBuild123dExport(
  code: string,
  format: Build123dRequestFormat,
): Promise<Buffer> {
  if (EXPORT_SERVICE_URL) {
    return runBuild123dExportService(code, format);
  }

  if (!LOCAL_PYTHON_ALLOWED) {
    throw new Error(
      'build123d export service is not configured. Set BUILD123D_EXPORT_URL for production, or set BUILD123D_ALLOW_LOCAL_PYTHON=1 only for local development.',
    );
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), 'adam-build123d-'));
  const sourcePath = path.join(tempDir, 'model.py');
  const outputPath = path.join(tempDir, `model.${extensionForFormat(format)}`);
  const runnerPath = path.join(tempDir, 'export_model.py');

  try {
    await writeFile(sourcePath, code, 'utf8');
    await writeFile(
      runnerPath,
      buildExportScript({
        sourcePath,
        outputPath,
        format,
        maxPreviewParts: MAX_PREVIEW_PARTS,
      }),
      'utf8',
    );

    const result = await new Promise<{ code: number | null; stderr: string }>(
      (resolve, reject) => {
        const child = spawn(PYTHON_BIN, [runnerPath], {
          cwd: tempDir,
          stdio: ['ignore', 'ignore', 'pipe'],
          env: {
            PATH: process.env.PATH ?? '',
            PYTHONPATH: process.env.PYTHONPATH ?? '',
          },
        });
        let stderr = '';
        const timeout = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error('build123d export timed out'));
        }, EXPORT_TIMEOUT_MS);

        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => {
          stderr += String(chunk);
          if (stderr.length > 8000) stderr = stderr.slice(-8000);
        });
        child.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        child.on('close', (code) => {
          clearTimeout(timeout);
          resolve({ code, stderr });
        });
      },
    );

    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || 'build123d export failed');
    }

    const output = await readFile(outputPath);
    if (output.byteLength > MAX_OUTPUT_BYTES) {
      throw new Error('build123d export exceeded maximum output size');
    }
    return output;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function runBuild123dPreview(code: string): Promise<Buffer> {
  return runBuild123dExport(code, 'preview');
}

export async function handleBuild123dExportRequest(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  const supabaseClient = getAnonSupabaseClient({
    global: {
      headers: { Authorization: req.headers.get('Authorization') ?? '' },
    },
  });
  const { data: userData, error: userError } =
    await supabaseClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body: unknown = await req.json().catch(() => null);
  const format = isRecord(body) ? normalizeExportFormat(body.format) : null;
  const code = isRecord(body) && typeof body.code === 'string' ? body.code : '';

  if (!format || !code || code.length > MAX_CODE_LENGTH) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const output =
      format === 'preview'
        ? await runBuild123dPreview(code)
        : await runBuild123dExport(code, format);
    return new Response(output, {
      headers: {
        ...corsHeaders,
        'Content-Type':
          format === 'preview' ? 'application/json' : exportMimeType(format),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'build123d export failed';
    return new Response(JSON.stringify({ error: message.slice(0, 2000) }), {
      status: 422,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
