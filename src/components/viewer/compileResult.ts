export type CompileResult =
  | { type: 'pending' }
  | { type: 'stl'; output: Blob; sourceCode: string };
