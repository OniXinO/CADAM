import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Camera, Check, Loader2, Play } from 'lucide-react';
import { OpenSCADPreview } from '@/components/viewer/OpenSCADViewer';
import {
  renderArtifactFromViews,
  viewLabel,
} from '@/utils/agenticRenderer';
import { ViewRequest } from '@shared/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Self-contained walkthrough of the agentic verify ↔ refine loop. No
// auth, no Supabase, no LLM call — every assistant response is canned.
// Wired up so reviewers/PR-previews can poke the new UI without flipping
// any dashboard switches.
//
// What's REAL in this demo:
//   - OpenSCAD WASM compile of the canned SCAD
//   - renderArtifactFromViews capturing actual screenshots from the live
//     STL at the chosen angles
//   - The same ViewModelToolCallCard chip the production assistant
//     message renders (inlined here so we don't drag in chat plumbing)
//
// What's CANNED:
//   - The "agent's" text replies and tool-call timings
//   - The final "looks good" judgement (no LLM is asked)

const DEMO_TITLE = 'Coffee Mug';

const DEMO_SCAD = `// Coffee mug — demo agentic-mode model
mug_height = 100;
mug_radius = 40;
wall_thickness = 3;
handle_radius = 28;
handle_thickness = 8;
mug_color = "#4682B4";

color(mug_color)
difference() {
  union() {
    cylinder(h = mug_height, r = mug_radius, $fn = 96);
    translate([mug_radius - 4, 0, mug_height / 2])
      rotate([90, 0, 0])
      difference() {
        torus(handle_radius, handle_thickness / 2);
        torus(handle_radius, handle_thickness / 2 - wall_thickness);
      }
  }
  translate([0, 0, wall_thickness])
    cylinder(h = mug_height, r = mug_radius - wall_thickness, $fn = 96);
}

module torus(r1, r2) {
  rotate_extrude($fn = 64)
    translate([r1, 0, 0])
    circle(r = r2, $fn = 32);
}
`;

const DEMO_VIEWS: ViewRequest[] = [
  { view: 'iso' },
  { view: 'front' },
  { view: 'top' },
];

type Phase =
  | 'idle'
  | 'preamble' // assistant text streaming in
  | 'building' // build_parametric_model "pending"
  | 'streaming-code' // SCAD streaming into the artifact
  | 'compiling' // waiting for OpenSCAD WASM to produce STL
  | 'capturing' // verify chip pending, screenshot capture in flight
  | 'reviewing' // chip verified, final assistant text streaming in
  | 'done';

const PREAMBLE = `Sure — I'll build a coffee mug, then check it from a few angles to make sure the handle is attached and it sits flat.`;
const VERDICT = ` Looks good — the mug has a handle, sits flat, and the wall is uniform. Done.`;

function useStreamedText(target: string, active: boolean, charsPerTick = 4) {
  // Drip the text in one chunk per animation frame — close enough to real
  // SSE streaming for demonstration without locking up the main thread.
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!active) return;
    setShown('');
    let i = 0;
    const id = window.setInterval(() => {
      i = Math.min(target.length, i + charsPerTick);
      setShown(target.slice(0, i));
      if (i >= target.length) window.clearInterval(id);
    }, 40);
    return () => window.clearInterval(id);
  }, [target, active, charsPerTick]);
  return shown;
}

function useStreamedCode(active: boolean, chunk = 90) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!active) return;
    setShown('');
    let i = 0;
    const id = window.setInterval(() => {
      i = Math.min(DEMO_SCAD.length, i + chunk);
      setShown(DEMO_SCAD.slice(0, i));
      if (i >= DEMO_SCAD.length) window.clearInterval(id);
    }, 60);
    return () => window.clearInterval(id);
  }, [active, chunk]);
  return shown;
}

export default function AgenticDemoView() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentOutput, setCurrentOutput] = useState<Blob | undefined>();
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const previousScreenshotsRef = useRef<string[]>([]);

  // Free the blob: URLs from the previous run when a new one starts so
  // the browser can reclaim the memory.
  useEffect(() => {
    return () => {
      previousScreenshotsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const preambleText = useStreamedText(PREAMBLE, phase !== 'idle');
  const streamedCode = useStreamedCode(phase === 'streaming-code');
  const verdictText = useStreamedText(
    VERDICT,
    phase === 'reviewing' || phase === 'done',
  );

  // Drive the timeline. Each transition is a small setTimeout — the user
  // sees each phase land instead of everything at once.
  useEffect(() => {
    if (phase === 'idle') return;
    let cancelled = false;
    const cancel = (id: number) => window.clearTimeout(id);
    const ids: number[] = [];

    if (phase === 'preamble') {
      ids.push(
        window.setTimeout(() => !cancelled && setPhase('building'), 1100),
      );
    } else if (phase === 'building') {
      ids.push(
        window.setTimeout(
          () => !cancelled && setPhase('streaming-code'),
          550,
        ),
      );
    } else if (phase === 'streaming-code') {
      // Wait for the streamed code to finish, then move to compiling.
      ids.push(
        window.setTimeout(() => !cancelled && setPhase('compiling'), 1700),
      );
    }
    return () => {
      cancelled = true;
      ids.forEach(cancel);
    };
  }, [phase]);

  // Once OpenSCAD finishes compiling and we have an STL, kick off the
  // verify-chip + screenshot capture against the *real* compiled output.
  useEffect(() => {
    if (phase !== 'compiling') return;
    if (!currentOutput) return;
    setPhase('capturing');
    let cancelled = false;
    renderArtifactFromViews(currentOutput, DEMO_VIEWS)
      .then((blobs) => {
        if (cancelled) return;
        // Free any prior URLs from a previous run.
        previousScreenshotsRef.current.forEach((u) => URL.revokeObjectURL(u));
        const urls = blobs.map((b) => URL.createObjectURL(b));
        previousScreenshotsRef.current = urls;
        setScreenshots(urls);
        setPhase('reviewing');
        window.setTimeout(() => {
          if (!cancelled) setPhase('done');
        }, 2400);
      })
      .catch((err) => {
        console.error('demo capture failed', err);
        if (!cancelled) setPhase('done');
      });
    return () => {
      cancelled = true;
    };
  }, [phase, currentOutput]);

  const startDemo = useCallback(() => {
    previousScreenshotsRef.current.forEach((u) => URL.revokeObjectURL(u));
    previousScreenshotsRef.current = [];
    setScreenshots([]);
    setCurrentOutput(undefined);
    setPhase('preamble');
  }, []);

  const restartDemo = useCallback(() => {
    setPhase('idle');
    window.setTimeout(startDemo, 120);
  }, [startDemo]);

  const codeForViewer = useMemo(() => {
    if (phase === 'streaming-code') return streamedCode;
    if (
      phase === 'compiling' ||
      phase === 'capturing' ||
      phase === 'reviewing' ||
      phase === 'done'
    ) {
      return DEMO_SCAD;
    }
    return null;
  }, [phase, streamedCode]);

  const showBuildPending = phase === 'building';
  const showArtifact =
    phase === 'compiling' ||
    phase === 'capturing' ||
    phase === 'reviewing' ||
    phase === 'done' ||
    phase === 'streaming-code';
  const showVerifyChip =
    phase === 'capturing' || phase === 'reviewing' || phase === 'done';
  const verifyVerified = phase === 'reviewing' || phase === 'done';
  const showVerdict = phase === 'reviewing' || phase === 'done';

  return (
    <div className="flex h-screen flex-col bg-[#292828] text-adam-text-primary">
      <header className="flex items-center justify-between border-b border-adam-neutral-700 bg-adam-bg-secondary-dark px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Agentic loop demo</span>
          <span className="rounded-full border border-adam-neutral-700 bg-adam-neutral-900 px-2 py-0.5 text-[10px] uppercase tracking-wider text-adam-neutral-300">
            Canned · no backend · no auth
          </span>
        </div>
        <div className="flex gap-2">
          {phase === 'idle' ? (
            <Button onClick={startDemo} className="h-8 gap-2 px-3 text-xs">
              <Play className="h-3 w-3" /> Run demo
            </Button>
          ) : (
            <Button
              onClick={restartDemo}
              variant="outline"
              className="h-8 gap-2 px-3 text-xs"
            >
              Replay
            </Button>
          )}
        </div>
      </header>

      <div className="grid h-[calc(100vh-49px)] grid-cols-[minmax(0,_420px)_minmax(0,_1fr)] gap-px bg-adam-neutral-700">
        <section className="flex h-full flex-col gap-4 overflow-y-auto bg-adam-bg-secondary-dark p-4">
          <UserBubble text="make a coffee mug" />
          {phase !== 'idle' && (
            <AssistantBubble>
              <p className="text-sm leading-relaxed">
                {preambleText}
                <CursorBlink active={phase === 'preamble'} />
              </p>

              {showBuildPending && (
                <ToolPendingChip icon={<Box className="h-4 w-4" />}>
                  Building CAD...
                </ToolPendingChip>
              )}

              {showArtifact && (
                <ArtifactPill
                  title={DEMO_TITLE}
                  isStreaming={phase === 'streaming-code'}
                />
              )}

              {showVerifyChip && (
                <VerifyChip
                  views={DEMO_VIEWS}
                  status={verifyVerified ? 'verified' : 'pending_verification'}
                  screenshots={verifyVerified ? screenshots : []}
                  reasoning="Verify the mug has a handle and sits flat"
                />
              )}

              {showVerdict && (
                <p className="text-sm leading-relaxed">
                  {verdictText}
                  <CursorBlink
                    active={
                      phase === 'reviewing' && verdictText.length < VERDICT.length
                    }
                  />
                </p>
              )}
            </AssistantBubble>
          )}
        </section>

        <section className="relative h-full w-full bg-adam-neutral-700">
          {codeForViewer ? (
            <OpenSCADPreview
              scadCode={codeForViewer}
              color="#00A6FF"
              onOutputChange={setCurrentOutput}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-adam-neutral-300">
              Hit “Run demo” to start.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CursorBlink({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-adam-text-primary align-baseline" />
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="self-start rounded-lg bg-adam-neutral-800 px-3 py-2 text-sm text-adam-text-primary">
      {text}
    </div>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-lg bg-adam-neutral-800 p-3 text-sm text-adam-text-primary">
      {children}
    </div>
  );
}

function ToolPendingChip({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex h-10 w-full items-center justify-between rounded-md bg-adam-neutral-950 px-3">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{children}</span>
      </div>
      <Loader2 className="h-4 w-4 animate-spin text-white" />
    </div>
  );
}

function ArtifactPill({
  title,
  isStreaming,
}: {
  title: string;
  isStreaming: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-md border border-adam-neutral-700 bg-black px-3 py-2 text-sm',
        isStreaming && 'border-adam-blue/40',
      )}
    >
      <div className="flex items-center gap-2">
        <Box className="h-4 w-4" />
        <span className="font-medium">{title}</span>
      </div>
      {isStreaming ? (
        <Loader2 className="h-4 w-4 animate-spin text-adam-blue" />
      ) : (
        <span className="rounded-md border border-adam-neutral-700 bg-adam-bg-secondary-dark px-1.5 text-xs text-adam-neutral-300">
          v1
        </span>
      )}
    </div>
  );
}

// Mirror of ViewModelToolCallCard from AssistantMessage.tsx, scoped to the
// demo so we don't depend on the chat plumbing. Keeping this aligned with
// the production chip's classes by eye, not by import — if the chip's
// look changes, this'll need a touch-up.
function VerifyChip({
  views,
  status,
  screenshots,
  reasoning,
}: {
  views: ViewRequest[];
  status: 'pending_verification' | 'verified';
  screenshots: string[];
  reasoning?: string;
}) {
  const labels = views.map(viewLabel).join(', ');
  const isVerified = status === 'verified';
  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-adam-neutral-950 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {isVerified ? (
            <Check className="h-4 w-4 text-adam-blue" />
          ) : (
            <Camera className="h-4 w-4 text-white" />
          )}
          <span className="truncate text-sm">
            {isVerified
              ? `Verified from ${labels}`
              : `Inspecting model from ${labels}`}
          </span>
        </div>
        {!isVerified && <Loader2 className="h-4 w-4 animate-spin text-white" />}
      </div>
      {reasoning && (
        <span className="px-1 text-xs text-adam-neutral-300">{reasoning}</span>
      )}
      {isVerified && screenshots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {screenshots.map((url) => (
            <img
              key={url}
              src={url}
              alt="verification render"
              className="h-16 w-16 rounded object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}
