import { Download, ChevronUp, Loader2 } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Message, Parameter } from '@shared/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ParameterInput } from '@/components/parameter/ParameterInput';
import { validateParameterValue } from '@/utils/parameterUtils';
import { useCurrentMessage } from '@/contexts/CurrentMessageContext';
import {
  downloadBuild123dExport,
  downloadSTLFile,
  downloadOpenSCADFile,
  downloadPythonFile,
  downloadDXFFile,
  DxfExporter,
} from '@/utils/downloadUtils';
import { useToast } from '@/hooks/use-toast';

interface ParameterSheetContentProps {
  parameters: Parameter[];
  onSubmit: (message: Message | null, parameters: Parameter[]) => void;
  currentOutput?: Blob;
  dxfExporter?: DxfExporter | null;
}

type DownloadFormat = 'stl' | 'scad' | 'dxf' | 'py' | 'step' | 'brep';

export function ParameterSheetContent({
  parameters,
  onSubmit,
  currentOutput,
  dxfExporter,
}: ParameterSheetContentProps) {
  const { currentMessage } = useCurrentMessage();
  const { toast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>('stl');
  const [isExporting, setIsExporting] = useState(false);
  const artifact = currentMessage?.content.artifact;
  const isBuild123d = artifact?.cadBackend === 'build123d';

  // Debounce timer for compilation
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingParametersRef = useRef<Parameter[] | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isBuild123d && selectedFormat === 'stl' && !currentOutput) {
      setSelectedFormat('step');
    } else if (
      isBuild123d &&
      !['step', 'brep', 'py', 'stl'].includes(selectedFormat)
    ) {
      setSelectedFormat('step');
    } else if (
      !isBuild123d &&
      !['stl', 'scad', 'dxf'].includes(selectedFormat)
    ) {
      setSelectedFormat('stl');
    }
  }, [currentOutput, isBuild123d, selectedFormat]);

  // Debounced submit function
  const debouncedSubmit = useCallback(
    (params: Parameter[]) => {
      // Store the parameters to submit
      pendingParametersRef.current = params;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounced timer (300ms delay)
      debounceTimerRef.current = setTimeout(() => {
        if (pendingParametersRef.current) {
          onSubmit(currentMessage, pendingParametersRef.current);
          pendingParametersRef.current = null;
        }
      }, 200);
    },
    [onSubmit, currentMessage],
  );

  const handleCommit = (param: Parameter, value: Parameter['value']) => {
    // Validate the value before committing
    const validatedValue = validateParameterValue(param, value);

    // Update local state immediately for UI responsiveness
    const updatedParam = { ...param, value: validatedValue };
    const updatedParameters = parameters.map((p) =>
      p.name === param.name ? updatedParam : p,
    );

    // Debounce the actual OpenSCAD compilation
    debouncedSubmit(updatedParameters);
  };

  const handleDownloadSTL = () => {
    if (!currentOutput) return;
    downloadSTLFile(currentOutput, currentMessage);
  };

  const handleDownloadOpenSCAD = () => {
    if (!artifact?.code) return;
    downloadOpenSCADFile(artifact.code, currentMessage);
  };

  const handleDownloadPython = () => {
    if (!artifact?.code) return;
    downloadPythonFile(artifact.code, currentMessage);
  };

  const handleDownloadBuild123d = async (format: 'step' | 'brep') => {
    if (!artifact?.code) return;
    try {
      setIsExporting(true);
      await downloadBuild123dExport(artifact.code, format, currentMessage);
    } catch (error) {
      console.error(`[build123d] Failed to export ${format}:`, error);
      toast({
        title: `${format.toUpperCase()} export failed`,
        description:
          error instanceof Error
            ? error.message
            : `Adam could not export this model as ${format.toUpperCase()}.`,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadDXF = async () => {
    if (!dxfExporter) return;

    // DXF is async, generated on click via a fresh OpenSCAD compile, it can reject.
    try {
      setIsExporting(true);
      const dxfOutput = await dxfExporter();
      downloadDXFFile(dxfOutput, currentMessage);
    } catch (error) {
      console.error('[OpenSCAD] Failed to export DXF:', error);
      // Optional user-facing feedback to surface the failure
      toast({
        title: 'DXF export failed',
        description:
          error instanceof Error
            ? error.message
            : 'Adam could not export this model as DXF.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Per-format dispatch tables — each supported format is a single line in each map.
  const downloadHandlers: Record<DownloadFormat, () => void | Promise<void>> = {
    stl: handleDownloadSTL,
    scad: handleDownloadOpenSCAD,
    dxf: handleDownloadDXF,
    py: handleDownloadPython,
    step: () => handleDownloadBuild123d('step'),
    brep: () => handleDownloadBuild123d('brep'),
  };
  const formatAvailable: Record<DownloadFormat, boolean> = {
    stl: !!currentOutput,
    scad: !isBuild123d && !!artifact?.code,
    dxf: !isBuild123d && !!dxfExporter && !isExporting,
    py: isBuild123d && !!artifact?.code,
    step: isBuild123d && !!artifact?.code && !isExporting,
    brep: isBuild123d && !!artifact?.code && !isExporting,
  };

  const handleDownload = async () => {
    await downloadHandlers[selectedFormat]();
  };
  const isDownloadDisabled = !formatAvailable[selectedFormat];
  // Keep the format menu available when any download format has content.
  const isAnyFormatAvailable = Object.values(formatAvailable).some(Boolean);

  return (
    <>
      <ScrollArea className="h-full w-full px-4">
        <div className="flex flex-col gap-6 pb-4 pt-2">
          {parameters.map((param) => (
            <ParameterInput
              key={param.name}
              param={param}
              handleCommit={handleCommit}
            />
          ))}
        </div>
      </ScrollArea>
      <div className="flex w-full flex-col gap-4 p-4">
        <div className="flex border-t border-adam-neutral-700 pt-2">
          <Button
            onClick={handleDownload}
            disabled={isDownloadDisabled}
            aria-label={`download ${selectedFormat.toUpperCase()} file`}
            className="flex-1 rounded-r-none bg-adam-neutral-50 text-adam-neutral-800 hover:bg-adam-neutral-100 hover:text-adam-neutral-900"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {selectedFormat.toUpperCase()}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={!isAnyFormatAvailable}
                aria-label="select download format"
                className="rounded-l-none border-l border-adam-neutral-300 bg-adam-neutral-50 px-2 text-adam-neutral-800 hover:bg-adam-neutral-100 hover:text-adam-neutral-900"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setSelectedFormat('stl')}
                disabled={!formatAvailable.stl}
                className="grid cursor-pointer grid-cols-3 text-adam-text-primary"
              >
                <span className="text-sm">.STL</span>
                <span className="col-span-2 text-xs text-adam-text-primary/60">
                  3D Printing
                </span>
              </DropdownMenuItem>
              {isBuild123d ? (
                <>
                  <DropdownMenuItem
                    onClick={() => setSelectedFormat('step')}
                    disabled={!formatAvailable.step}
                    className="grid cursor-pointer grid-cols-3 text-adam-text-primary"
                  >
                    <span className="text-sm">.STEP</span>
                    <span className="col-span-2 text-xs text-adam-text-primary/60">
                      CAD Exchange
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedFormat('brep')}
                    disabled={!formatAvailable.brep}
                    className="grid cursor-pointer grid-cols-3 text-adam-text-primary"
                  >
                    <span className="text-sm">.BREP</span>
                    <span className="col-span-2 text-xs text-adam-text-primary/60">
                      Boundary Representation
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedFormat('py')}
                    disabled={!formatAvailable.py}
                    className="grid cursor-pointer grid-cols-3 text-adam-text-primary"
                  >
                    <span className="text-sm">.PY</span>
                    <span className="col-span-2 text-xs text-adam-text-primary/60">
                      build123d Source
                    </span>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => setSelectedFormat('scad')}
                    disabled={!formatAvailable.scad}
                    className="grid cursor-pointer grid-cols-3 text-adam-text-primary"
                  >
                    <span className="text-sm">.SCAD</span>
                    <span className="col-span-2 text-xs text-adam-text-primary/60">
                      OpenSCAD Code
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedFormat('dxf')}
                    disabled={!formatAvailable.dxf}
                    className="grid cursor-pointer grid-cols-3 text-adam-text-primary"
                  >
                    <span className="text-sm">.DXF</span>
                    <span className="col-span-2 text-xs text-adam-text-primary/60">
                      2D Projection to the (x,y) plane
                    </span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
