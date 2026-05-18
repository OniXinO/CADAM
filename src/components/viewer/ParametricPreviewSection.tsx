import { ImageGallery } from '@/components/viewer/ImageGallery';
import { useCurrentMessage } from '@/contexts/CurrentMessageContext';
import Loader from '@/components/viewer/Loader';
import { Build123dPreview, OpenSCADPreview } from './OpenSCADViewer';
import OpenSCADError from '@/lib/OpenSCADError';
import { DxfExporter } from '@/utils/downloadUtils';
import { useEffect } from 'react';

interface ParametricPreviewSectionProps {
  isLoading: boolean;
  color: string;
  onOutputChange?: (output: Blob | undefined) => void;
  onDxfExportChange?: (exporter: DxfExporter | null) => void;
  fixError?: (error: OpenSCADError) => void;
  isMobile?: boolean;
}

export function ParametricPreviewSection({
  isLoading,
  color,
  onOutputChange,
  onDxfExportChange,
  fixError,
  isMobile,
}: ParametricPreviewSectionProps) {
  const { currentMessage: message } = useCurrentMessage();
  const isBuild123d = message?.content.artifact?.cadBackend === 'build123d';

  useEffect(() => {
    if (isBuild123d) onDxfExportChange?.(null);
  }, [isBuild123d, onDxfExportChange]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-adam-neutral-700">
      {isLoading ? (
        <div
          className={`flex h-full items-center justify-center ${isMobile ? 'pb-20 pt-0' : ''}`}
        >
          <Loader message="Generating model" />
        </div>
      ) : (
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-2">
          {message?.content.images && Array.isArray(message.content.images) && (
            <ImageGallery imageIds={message.content.images} />
          )}
          {message?.content.artifact?.code &&
            (isBuild123d ? (
              <Build123dPreview
                build123dCode={message.content.artifact.code}
                color={color}
                onOutputChange={onOutputChange}
                fixError={fixError}
              />
            ) : (
              <OpenSCADPreview
                scadCode={message.content.artifact.code}
                color={color}
                onOutputChange={onOutputChange}
                onDxfExportChange={onDxfExportChange}
                fixError={fixError}
              />
            ))}
        </div>
      )}
    </div>
  );
}
