import React, { useEffect, useState } from 'react';
import { Parameter } from '@shared/types';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  validateParameterValue,
  isMeasurementParameter,
} from '@/utils/parameterUtils';
import { ParameterSlider } from '@/components/parameter/ParameterSlider';
import { Label } from '@/components/ui/label';

// CSS-color detection: leans on the browser — Option.style.color rejects
// anything that isn't a valid CSS color, named or otherwise. Returns ''
// for invalid input so we can tell apart "it's a color" from "it's text".
function cssToHex(value: string): string {
  if (!value) return '';
  const probe = new Option().style;
  probe.color = value;
  if (!probe.color) return '';
  // getComputedStyle isn't available on a detached element, so use a canvas
  // to resolve named colors and rgb(...) strings to a #rrggbb hex we can
  // feed into the native color input.
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#000';
  ctx.fillStyle = value;
  // ctx.fillStyle returns either '#rrggbb' or 'rgba(...)' — the 6-char hex
  // form is what the native picker wants.
  return /^#[0-9a-f]{6}$/i.test(ctx.fillStyle) ? ctx.fillStyle : '';
}

export function ParameterInput({
  param,
  handleCommit,
}: {
  param: Parameter;
  handleCommit: (param: Parameter, value: Parameter['value']) => void;
}) {
  const [paramState, setParamState] = useState<Parameter>(param);

  useEffect(() => {
    setParamState(param);
  }, [param]);

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleValueChange = (value: Parameter['value']) => {
    setParamState({ ...paramState, value });
  };

  const handleValueCommit = (value: Parameter['value']) => {
    setParamState({ ...paramState, value });
    handleCommit(paramState, value);
  };

  if (!paramState.type || paramState.type === 'number') {
    return (
      <div className="grid w-full grid-cols-[80px_1fr] items-center gap-3">
        <Label
          className="overflow-hidden text-ellipsis text-xs font-normal text-adam-neutral-300"
          htmlFor={paramState.name}
        >
          {paramState.displayName}
        </Label>
        <div className="flex w-full items-center gap-3">
          <ParameterSlider
            param={paramState}
            onValueChange={handleValueChange}
            onValueCommit={handleValueCommit}
          />
          <div className="flex flex-shrink-0 items-center gap-2">
            <Input
              id={paramState.name}
              name={paramState.name}
              autoComplete="off"
              className="h-6 w-14 rounded-lg bg-adam-neutral-800 px-2 text-left text-xs text-adam-text-primary transition-colors selection:bg-adam-blue/50 selection:text-white focus:outline-none [@media(hover:hover)]:hover:bg-adam-neutral-700"
              value={String(paramState.value)}
              onKeyDown={onEnter}
              onChange={(e) => handleValueChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={() => {
                handleValueCommit(
                  validateParameterValue(paramState, paramState.value),
                );
              }}
            />
            <span className="ml-1 w-6 text-left text-xs text-adam-neutral-300">
              {isMeasurementParameter(paramState) ? 'mm' : ''}
            </span>
          </div>
        </div>
      </div>
    );
  }
  if (param.type === 'boolean') {
    return (
      <div className="grid w-full grid-cols-[80px_1fr] items-center gap-3">
        <Label
          className="overflow-hidden text-ellipsis text-xs font-normal text-adam-neutral-300"
          htmlFor={paramState.name}
        >
          {paramState.displayName}
        </Label>
        <Switch
          id={paramState.name}
          name={paramState.name}
          checked={Boolean(paramState.value)}
          onCheckedChange={(checked) => handleValueCommit(checked)}
        />
      </div>
    );
  }
  if (param.type === 'string') {
    const currentValue = String(paramState.value);
    const hex = cssToHex(currentValue);
    const isColor = hex !== '';
    return (
      <div className="grid w-full grid-cols-[80px_1fr] items-center gap-3">
        <Label
          className="overflow-hidden text-ellipsis text-xs font-normal text-adam-neutral-300"
          htmlFor={paramState.name}
        >
          {paramState.displayName}
        </Label>
        <div className="flex w-full items-center gap-2">
          {isColor && (
            <input
              type="color"
              aria-label={`${paramState.displayName} color`}
              className="h-6 w-8 flex-shrink-0 cursor-pointer rounded border border-adam-neutral-700 bg-adam-neutral-800 p-0"
              value={hex}
              onChange={(e) => handleValueChange(e.target.value)}
              onBlur={() => handleValueCommit(paramState.value)}
            />
          )}
          <Input
            id={paramState.name}
            name={paramState.name}
            autoComplete="off"
            className="h-6 w-full min-w-0 rounded-md bg-adam-neutral-800 px-2 text-left text-xs text-adam-text-primary transition-colors selection:bg-adam-blue/50 selection:text-white focus:outline-none [@media(hover:hover)]:hover:bg-adam-neutral-700"
            value={currentValue}
            onChange={(e) => handleValueChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => handleValueCommit(paramState.value)}
            onKeyDown={onEnter}
          />
        </div>
      </div>
    );
  }
  if (paramState.type === 'string[]') {
    if (Array.isArray(paramState.value)) {
      return (
        <div className="grid w-full grid-cols-[80px_1fr] items-start gap-3">
          <Label
            className="overflow-hidden text-ellipsis pt-2 text-xs font-normal text-adam-neutral-300"
            htmlFor={paramState.name}
          >
            {paramState.displayName}
          </Label>
          <div className="flex w-full flex-col gap-2">
            {paramState.value.map((value, index) => (
              <Input
                key={index}
                id={`${paramState.name}-${index}`}
                name={paramState.name}
                autoComplete="off"
                className="h-6 w-full min-w-0 rounded-md bg-adam-neutral-800 px-2 text-left text-xs text-adam-text-primary transition-colors selection:bg-adam-blue/50 selection:text-white focus:outline-none [@media(hover:hover)]:hover:bg-adam-neutral-700"
                value={String(value)}
                onKeyDown={onEnter}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  handleValueChange(
                    (paramState.value as string[]).map(
                      (itemValue, itemIndex) =>
                        itemIndex === index ? e.target.value : itemValue,
                    ),
                  )
                }
                onBlur={(e) =>
                  handleValueCommit(
                    (paramState.value as string[]).map(
                      (itemValue, itemIndex) =>
                        itemIndex === index ? e.target.value : itemValue,
                    ),
                  )
                }
              />
            ))}
          </div>
        </div>
      );
    }
  }
  if (paramState.type === 'number[]') {
    if (Array.isArray(paramState.value)) {
      return (
        <div className="grid w-full grid-cols-[80px_1fr] items-start gap-3">
          <Label
            className="overflow-hidden text-ellipsis pt-2 text-xs font-normal text-adam-neutral-300"
            htmlFor={paramState.name}
          >
            {paramState.displayName}
          </Label>
          <div className="flex w-full flex-col gap-2">
            {paramState.value.map((value, index) => {
              const itemParam = {
                ...paramState,
                defaultValue: Array.isArray(paramState.defaultValue)
                  ? paramState.defaultValue[index]
                  : paramState.defaultValue,
                value: value,
              };

              return (
                <div key={index} className="flex w-full items-center gap-3">
                  <ParameterSlider
                    param={itemParam}
                    onValueChange={(newValue) =>
                      handleValueChange(
                        (paramState.value as number[]).map(
                          (itemValue, itemIndex) =>
                            itemIndex === index ? newValue : itemValue,
                        ),
                      )
                    }
                    onValueCommit={(newValue) =>
                      handleValueCommit(
                        (paramState.value as number[]).map(
                          (itemValue, itemIndex) =>
                            itemIndex === index ? newValue : itemValue,
                        ),
                      )
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      id={`${paramState.name}-${index}`}
                      name={paramState.name}
                      autoComplete="off"
                      className="h-6 w-14 rounded-md bg-adam-neutral-800 px-2 text-left text-xs text-adam-text-primary transition-colors selection:bg-adam-blue/50 selection:text-white focus:outline-none [@media(hover:hover)]:hover:bg-adam-neutral-700"
                      value={String(value)}
                      onKeyDown={onEnter}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        handleValueChange(
                          (paramState.value as number[]).map(
                            (itemValue, itemIndex) =>
                              itemIndex === index
                                ? (e.target.value as unknown as number)
                                : itemValue,
                          ),
                        )
                      }
                      onBlur={(e) => {
                        const updatedValue = (paramState.value as number[]).map(
                          (itemValue, itemIndex) => {
                            if (itemIndex === index) {
                              return validateParameterValue(
                                itemParam,
                                e.target.value,
                              );
                            }
                            return itemValue;
                          },
                        );
                        handleValueCommit(updatedValue as Parameter['value']);
                      }}
                    />
                    <span className="w-6 text-left text-xs text-adam-neutral-300">
                      {isMeasurementParameter(paramState) ? 'mm' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }
  if (paramState.type === 'boolean[]') {
    if (Array.isArray(paramState.value)) {
      return (
        <div className="grid w-full grid-cols-[80px_1fr] items-start gap-3">
          <Label
            className="overflow-hidden text-ellipsis pt-2 text-xs font-normal text-adam-neutral-300"
            htmlFor={paramState.name}
          >
            {paramState.displayName}
          </Label>
          <div className="flex w-full flex-col gap-2">
            {paramState.value.map((value, index) => (
              <Switch
                key={index}
                id={`${paramState.name}-${index}`}
                name={paramState.name}
                checked={Boolean(value)}
                onCheckedChange={(checked) =>
                  handleValueCommit(
                    (paramState.value as boolean[]).map(
                      (itemValue, itemIndex) =>
                        itemIndex === index ? checked : itemValue,
                    ),
                  )
                }
              />
            ))}
          </div>
        </div>
      );
    }
  }
}
