export type OffFace = {
  vertices: [number, number, number];
  color: [number, number, number, number] | null;
};

export type ParsedOff = {
  vertices: [number, number, number][];
  faces: OffFace[];
};

export function parseColoredOff(text: string): ParsedOff {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) throw new Error('Empty OFF file');

  let headerLine: string;
  let cursor = 0;
  if (lines[0].startsWith('OFF')) {
    const rest = lines[0].slice(3).trim();
    headerLine = rest || lines[1];
    cursor = rest ? 1 : 2;
  } else {
    throw new Error('Missing OFF header');
  }

  const [numVertices, numFaces] = headerLine.split(/\s+/).map(Number);
  if (!Number.isFinite(numVertices) || !Number.isFinite(numFaces)) {
    throw new Error('Invalid OFF header');
  }

  if (lines.length < cursor + numVertices + numFaces) {
    throw new Error('Truncated OFF file');
  }

  const vertices: [number, number, number][] = [];
  for (let i = 0; i < numVertices; i++) {
    const [x, y, z] = lines[cursor + i].split(/\s+/).map(Number);
    vertices.push([x, y, z]);
  }
  cursor += numVertices;

  const faces: OffFace[] = [];
  for (let i = 0; i < numFaces; i++) {
    const parts = lines[cursor + i].split(/\s+/).map(Number);
    const count = parts[0];
    const indexes = parts.slice(1, count + 1);
    if (indexes.length !== count) continue;

    const color = readColor(parts.slice(count + 1));
    for (let j = 1; j < indexes.length - 1; j++) {
      faces.push({
        vertices: [indexes[0], indexes[j], indexes[j + 1]],
        color,
      });
    }
  }

  return { vertices, faces };
}

function readColor(values: number[]): [number, number, number, number] | null {
  if (values.length < 3) return null;
  return [
    values[0] / 255,
    values[1] / 255,
    values[2] / 255,
    values.length > 3 ? values[3] / 255 : 1,
  ];
}
