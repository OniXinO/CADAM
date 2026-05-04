import { Database } from './database.ts';
export type Model = string;
export type CreativeModel = 'quality' | 'fast' | 'ultra';

export type Prompt = {
  text?: string;
  images?: string[];
  mesh?: string;
  model?: Model;
};

export type Message = Omit<
  Database['public']['Tables']['messages']['Row'],
  'content' | 'role'
> & {
  role: 'user' | 'assistant';
  content: Content;
};

export type CoreMessage = Pick<Message, 'id' | 'role' | 'content'>;

export type MeshFileType = Database['public']['Enums']['mesh_file_type'];

export type Mesh = {
  id: string;
  fileType: MeshFileType;
};

export type MeshData = Omit<
  Database['public']['Tables']['meshes']['Row'],
  'prompt'
> & {
  prompt: Prompt;
};

// Named camera viewpoints for agentic verification screenshots.
// These map to fixed azimuth/elevation/distance in the renderer; `custom`
// lets the agent pass arbitrary `azimuth`/`elevation` (degrees) as well.
export type ViewName =
  | 'iso'
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'custom';

export type ViewRequest = {
  view: ViewName;
  // For `view: 'custom'` only — degrees, world-space.
  azimuth?: number;
  elevation?: number;
  // Optional human-readable label for the chat UI.
  label?: string;
};

export type ToolCall = {
  name: string;
  status: 'pending' | 'error' | 'pending_verification' | 'verified';
  id?: string;
  result?: { id: string; fileType?: MeshFileType };
  // For `view_model`: which angles the agent asked the client to render.
  views?: ViewRequest[];
  // For `view_model`: short rationale shown next to the verification chip.
  reasoning?: string;
  // For `view_model`: image IDs of the rendered screenshots once the
  // client has fulfilled the request.
  screenshots?: string[];
};

export type Content = {
  text?: string;
  model?: Model;
  // When the user sends an error, its related to the fix with AI function
  // When the assistant sends an error, its related to any error that occurred during generation
  error?: string;
  artifact?: ParametricArtifact;
  index?: number;
  images?: string[];
  mesh?: Mesh;
  // Parametric mode: bounding box dimensions from STL parsing
  meshBoundingBox?: { x: number; y: number; z: number };
  // Parametric mode: original filename for import() in OpenSCAD
  meshFilename?: string;
  suggestions?: string[];
  // For streaming support - shows in-progress tool calls
  toolCalls?: ToolCall[];
  // Mesh topology preference (quads vs polys) for quality model
  meshTopology?: 'quads' | 'polys';
  // Polygon count preference for quality model
  polygonCount?: number;
  // File format preference for quad topology models
  preferredFormat?: 'glb' | 'fbx';
};

export type ParametricFile = {
  // Filename inside the OpenSCAD WASM filesystem. Bare names only — no
  // directories — to keep `use <name.scad>` / `include <name.scad>`
  // resolution simple in the viewer.
  name: string;
  content: string;
};

export type ParametricArtifact = {
  title: string;
  version: string;
  // The entry file's content. Always present so existing code paths
  // (parameter parsing, single-file rendering, share view, etc.) keep
  // working unchanged for single-file artifacts.
  code: string;
  parameters: Parameter[];
  suggestions?: string[];
  // When the agent decomposes a model into multiple .scad files, the
  // FULL set lives here (entry file included). Empty/unset for the
  // single-file path — `code` is authoritative there.
  files?: ParametricFile[];
  // Filename of the entry file inside `files`. Defaults to the first
  // file when set; only meaningful when `files` is non-empty.
  entryFile?: string;
};

export type ParameterOption = { value: string | number; label: string };

export type ParameterRange = { min?: number; max?: number; step?: number };

export type ParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'number[]'
  | 'boolean[]';

export type Parameter = {
  name: string;
  displayName: string;
  value: string | boolean | number | string[] | number[] | boolean[];
  defaultValue: string | boolean | number | string[] | number[] | boolean[];
  // Type should always exist, but old messages don't have it.
  type?: ParameterType;
  description?: string;
  group?: string;
  range?: ParameterRange;
  options?: ParameterOption[];
  maxLength?: number;
};

export type Conversation = Omit<
  Database['public']['Tables']['conversations']['Row'],
  'settings'
> & {
  settings: ConversationSettings;
};

export type GenerationStatus = Database['public']['Enums']['generation-status'];

export type ConversationSettings = {
  model?: Model;
} | null;

export type Profile = Database['public']['Tables']['profiles']['Row'];
