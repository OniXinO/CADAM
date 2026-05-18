import { CadBackend } from '@shared/types';
import { cn } from '@/lib/utils';

interface CadBackendToggleProps {
  value: CadBackend;
  onChange: (value: CadBackend) => void;
  className?: string;
}

const CAD_BACKEND_OPTIONS: Array<{ value: CadBackend; label: string }> = [
  { value: 'openscad', label: 'OpenSCAD' },
  { value: 'build123d', label: 'build123d' },
];

export function CadBackendToggle({
  value,
  onChange,
  className,
}: CadBackendToggleProps) {
  return (
    <div
      className={cn(
        'inline-grid grid-cols-2 rounded-lg border border-adam-neutral-800 bg-adam-background-1 p-1',
        className,
      )}
      role="radiogroup"
      aria-label="CAD backend"
    >
      {CAD_BACKEND_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
              'h-8 min-w-24 rounded-md px-3 text-xs font-medium text-adam-neutral-200 transition-colors',
              selected
                ? 'bg-adam-neutral-700 text-adam-neutral-50'
                : 'hover:bg-adam-neutral-800 hover:text-adam-neutral-50',
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
