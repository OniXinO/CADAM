import { CadBackend } from '@shared/types';

export const DEFAULT_CAD_BACKEND: CadBackend = 'openscad';
export const CAD_BACKEND_STORAGE_KEY = 'adam:parametric-cad-backend';

export function normalizeCadBackend(value: unknown): CadBackend {
  return value === 'build123d' ? 'build123d' : DEFAULT_CAD_BACKEND;
}

export function getCadBackendPreference(): CadBackend {
  if (typeof window === 'undefined') return DEFAULT_CAD_BACKEND;
  return normalizeCadBackend(
    window.localStorage.getItem(CAD_BACKEND_STORAGE_KEY),
  );
}

export function setCadBackendPreference(backend: CadBackend): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CAD_BACKEND_STORAGE_KEY, backend);
  window.dispatchEvent(
    new CustomEvent('adam:cad-backend-changed', { detail: backend }),
  );
}
