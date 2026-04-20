import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(color.replace('#', ''));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>(
    undefined,
  );

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    // Allow only hex characters
    if (/^[A-F0-9]*$/.test(value) && value.length <= 6) {
      setInputValue(value);
      // Only update the actual color when we have a valid 6-character hex
      if (value.length === 6) {
        onChange(`#${value}`);
      }
    }
  };

  const handleHexBlur = () => {
    // On blur, if the value is invalid, reset to the current color
    if (inputValue.length !== 6) {
      setInputValue(color.replace('#', ''));
    }
  };

  // Update input value when color changes from picker
  useEffect(() => {
    setInputValue(color.replace('#', ''));
  }, [color]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      setPopoverWidth(triggerRef.current.offsetWidth);
    }
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Toggle color picker"
          ref={triggerRef}
          className="relative flex h-[48px] w-full items-center justify-between overflow-hidden rounded-md bg-adam-neutral-800 pl-3 pr-0 text-sm text-adam-neutral-10 shadow-[inset_0px_0px_4px_0px_rgba(0,0,0,0.16)] transition-colors duration-200 ease-out focus:outline-none [@media(hover:hover)]:hover:bg-adam-neutral-700"
        >
          {/* Removed ambient color glow */}
          <div className="relative z-20 flex items-center gap-3">
            <div
              className="h-6 w-6 rounded-full shadow-sm"
              style={{ backgroundColor: color }}
            />
            <div className="flex items-center gap-2 font-mono text-sm uppercase text-adam-text-primary">
              <span className="text-adam-neutral-400">#</span>
              <input
                type="text"
                value={inputValue}
                onChange={handleHexChange}
                onBlur={handleHexBlur}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={(e) => {
                  e.stopPropagation();
                  e.currentTarget.select();
                }}
                className="cursor-text rounded-md bg-transparent px-2 py-0.5 leading-none text-adam-text-primary outline-none transition-colors duration-200 ease-out selection:bg-[#70B8FF7A] selection:text-white focus:bg-adam-neutral-900 [@media(hover:hover)]:hover:bg-adam-neutral-950/50"
                style={{
                  width: `calc(${Math.max(1, inputValue.length)}ch + 1rem)`,
                }}
                spellCheck="false"
              />
            </div>
          </div>
          <div className="relative z-20 flex h-12 w-12 items-center justify-center">
            <ChevronUp
              className={`h-5 w-5 text-adam-text-primary transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto rounded-md border-none bg-adam-neutral-800 p-4 shadow-md"
        style={{ width: popoverWidth }}
      >
        <div className="flex flex-col gap-3">
          <HexColorPicker
            color={color}
            onChange={(newColor) => onChange(newColor.toUpperCase())}
            style={{ height: '120px', width: '100%' }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
