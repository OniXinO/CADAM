class OpenSCADError extends Error {
  code: string;
  stdErr: string[];

  constructor(message: string, code: string, stdErr: string[]) {
    super(message);
    this.name = 'OpenSCADError';
    this.code = code;
    this.stdErr = stdErr;
  }
}

export default OpenSCADError;
