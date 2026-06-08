import type {
  AppUIMessage,
  MeshContextData,
  MeshPreferencesData,
} from './chatAi.ts';
import type { ParametricArtifact } from './types.ts';

/**
 * Narrow an unknown DB jsonb value into the AI SDK's UI part array.
 *
 * Every callsite (`messages.parts` from supabase, draft message rows held
 * in cache, etc.) crosses an untrusted boundary, so a bare
 * `parts as AppUIMessage['parts']` would let a malformed row or an
 * upstream SDK shape change crash the renderer before any part-specific
 * narrowing runs.
 *
 * Element-level validation is intentionally minimal: we require each
 * element to be a non-null object with a string `type` discriminator,
 * which is what every downstream `switch (part.type)` already keys on.
 * Beyond that we trust the SDK union — adding a full zod schema for the
 * dozen+ part shapes would have to be kept in lock-step with the AI SDK
 * release on every bump, and silently rejected parts (e.g. a new
 * `source-document`) would degrade messages instead of just rendering
 * what we know how to render.
 */
export function asParametricParts(parts: unknown): AppUIMessage['parts'] {
  if (!Array.isArray(parts)) return [];
  return parts.filter(
    (part): part is AppUIMessage['parts'][number] =>
      typeof part === 'object' &&
      part !== null &&
      'type' in part &&
      typeof (part as { type: unknown }).type === 'string',
  );
}

export function getMeshContextPart(
  parts: unknown,
): MeshContextData | undefined {
  const list = asParametricParts(parts);
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const part = list[index];
    if (part.type === 'data-mesh-context') return part.data;
  }
  return undefined;
}

export function getMeshPreferencesPart(
  parts: unknown,
): MeshPreferencesData | undefined {
  const list = asParametricParts(parts);
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const part = list[index];
    if (part.type === 'data-mesh-preferences') return part.data;
  }
  return undefined;
}

export function getParametricText(parts: unknown): string {
  return asParametricParts(parts)
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function getBuildParametricModelPart(parts: unknown) {
  const parametricParts = asParametricParts(parts);
  for (let index = parametricParts.length - 1; index >= 0; index -= 1) {
    const part = parametricParts[index];
    if (part.type === 'tool-build_parametric_model') return part;
  }
  return undefined;
}

export function getBuildParametricModelOutput(
  parts: unknown,
): ParametricArtifact | undefined {
  const part = getBuildParametricModelPart(parts);
  if (!part || part.state === 'input-streaming') return undefined;

  if ('input' in part && isParametricArtifact(part.input)) {
    return part.input;
  }
  if (part.state === 'output-available' && isParametricArtifact(part.output)) {
    return part.output;
  }
  return undefined;
}

export const getBuildParametricModelArtifact = getBuildParametricModelOutput;

export function hasPendingBuildParametricModel(parts: unknown): boolean {
  const part = getBuildParametricModelPart(parts);
  return part?.state === 'input-streaming' || part?.state === 'input-available';
}

export function replaceBuildParametricModelOutput(
  parts: unknown,
  artifact: ParametricArtifact,
): AppUIMessage['parts'] {
  const parametricParts = asParametricParts(parts);
  let targetIndex = -1;
  for (let index = parametricParts.length - 1; index >= 0; index -= 1) {
    const part = parametricParts[index];
    if (
      part.type === 'tool-build_parametric_model' &&
      part.state !== 'input-streaming'
    ) {
      targetIndex = index;
      break;
    }
  }

  return parametricParts.map((part, index) => {
    if (
      index === targetIndex &&
      part.type === 'tool-build_parametric_model' &&
      part.state !== 'input-streaming'
    ) {
      return { ...part, input: artifact };
    }
    return part;
  });
}

// OpenSCAD shape/transform/boolean/definition keywords plus `include`/`use`
// statements. A model the WASM worker can actually render contains at least
// one of these. Pure prose (an apology, a natural-language explanation, a
// truncated reply) contains none — that's the empty-output case from #181.
const OPENSCAD_TOKEN_PATTERN =
  /\b(?:module|function|cube|cylinder|sphere|polyhedron|circle|square|polygon|text|union|difference|intersection|hull|minkowski|translate|rotate|scale|resize|mirror|multmatrix|color|offset|linear_extrude|rotate_extrude|projection|surface|import)\b|(?:^|\n)\s*(?:include|use)\s*</;

/**
 * True when `code` looks like something the OpenSCAD worker can render.
 *
 * Intentionally a cheap heuristic, not a parser: the model conveys geometry
 * only through `build_parametric_model`'s `code` field, so "no SCAD" means
 * either an empty string or a body with no OpenSCAD tokens at all. We don't
 * try to validate syntax — a genuine compile error is surfaced separately by
 * the viewer (`OpenSCADPreview`). This guards the prior silent path where
 * empty/prose code compiled to nothing and the viewer showed a blank canvas.
 */
export function hasRenderableScadCode(code: unknown): boolean {
  if (typeof code !== 'string') return false;
  const trimmed = code.trim();
  if (trimmed.length === 0) return false;
  return OPENSCAD_TOKEN_PATTERN.test(trimmed);
}

export function isParametricArtifact(
  value: unknown,
): value is ParametricArtifact {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const artifact = value as Partial<ParametricArtifact>;
  // Title + code are the only load-bearing fields. `version` is metadata
  // and `parts` is optional. Parameters are derived client-side from
  // `code` via `parseParameters` so we don't check for them here either.
  return (
    typeof artifact.title === 'string' && typeof artifact.code === 'string'
  );
}
