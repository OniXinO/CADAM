import { ImageGallery } from '@/components/viewer/ImageGallery';
import { useCurrentMessage } from '@/contexts/CurrentMessageContext';
import Loader from '@/components/viewer/Loader';
import { OpenSCADPreview } from './OpenSCADViewer';
import { DxfExporter } from '@/utils/downloadUtils';
import type { AgenticCompileResult } from '@/hooks/useAgenticVerification';

interface ParametricPreviewSectionProps {
  isLoading: boolean;
  color: string;
  onCompileResult?: (result: AgenticCompileResult) => void;
  onDxfExportChange?: (exporter: DxfExporter | null) => void;
  isMobile?: boolean;
}

export function ParametricPreviewSection({
  isLoading,
  color,
  onCompileResult,
  onDxfExportChange,
  isMobile,
}: ParametricPreviewSectionProps) {
  const { currentMessage: message } = useCurrentMessage();
  const artifact = message?.content.artifact;
  const hasPreviewContent =
    !!artifact?.code ||
    (message?.content.images && Array.isArray(message.content.images));

  return (
    <div className="flex h-full w-full items-center justify-center bg-adam-neutral-700">
      {isLoading && !hasPreviewContent ? (
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
          {artifact?.code && (
            <OpenSCADPreview
              scadCode={artifact.code}
              files={artifact.files}
              entryFile={artifact.entryFile}
              color={color}
              onCompileResult={onCompileResult}
              onDxfExportChange={onDxfExportChange}
              suppressCompileErrors={isLoading}
            />
          )}
        </div>
      )}
    </div>
  );
}
