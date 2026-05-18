import base64
import json
import os
import pathlib
import resource
import shutil
import subprocess
import sys
import tempfile
import textwrap
from typing import Literal

from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import BaseModel, Field


ExportFormat = Literal["stl", "step", "brep", "preview"]

MAX_CODE_LENGTH = int(os.getenv("BUILD123D_MAX_CODE_LENGTH", "200000"))
DEFAULT_TIMEOUT_MS = int(os.getenv("BUILD123D_EXPORT_TIMEOUT_MS", "45000"))
DEFAULT_MAX_OUTPUT_BYTES = int(
    os.getenv("BUILD123D_MAX_OUTPUT_BYTES", str(25 * 1024 * 1024))
)
DEFAULT_MAX_PREVIEW_PARTS = int(os.getenv("BUILD123D_MAX_PREVIEW_PARTS", "64"))
MEMORY_LIMIT_MB = int(os.getenv("BUILD123D_MEMORY_LIMIT_MB", "2048"))
TOKEN = os.getenv("BUILD123D_EXPORT_TOKEN", "")


class ExportRequest(BaseModel):
    code: str = Field(min_length=1, max_length=MAX_CODE_LENGTH)
    format: ExportFormat
    timeoutMs: int = Field(default=DEFAULT_TIMEOUT_MS, ge=1000, le=120000)
    maxOutputBytes: int = Field(
        default=DEFAULT_MAX_OUTPUT_BYTES,
        ge=1024,
        le=100 * 1024 * 1024,
    )
    maxPreviewParts: int = Field(default=DEFAULT_MAX_PREVIEW_PARTS, ge=1, le=256)


app = FastAPI(title="CADAM build123d exporter")


def _require_token(authorization: str | None) -> None:
    if not TOKEN:
        return
    expected = f"Bearer {TOKEN}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _extension(format: ExportFormat) -> str:
    return "step" if format == "step" else format


def _mime_type(format: ExportFormat) -> str:
    if format == "preview":
        return "application/json"
    if format == "stl":
        return "model/stl"
    if format == "step":
        return "model/step"
    return "application/octet-stream"


def _runner_source(
    source_path: pathlib.Path,
    output_path: pathlib.Path,
    format: ExportFormat,
    max_preview_parts: int,
) -> str:
    return textwrap.dedent(
        f"""
        import base64
        import importlib.util
        import json
        import pathlib
        import socket
        import sys
        import traceback

        try:
            import build123d

            def _blocked_network(*args, **kwargs):
                raise RuntimeError("Network access is disabled during build123d export")

            socket.create_connection = _blocked_network
            socket.socket = _blocked_network

            source_path = pathlib.Path({str(source_path)!r})
            output_path = pathlib.Path({str(output_path)!r})
            spec = importlib.util.spec_from_file_location("adam_build123d_model", source_path)
            if spec is None or spec.loader is None:
                raise RuntimeError("Could not load build123d source")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            gen_step = getattr(module, "gen_step", None)
            if not callable(gen_step):
                raise RuntimeError("build123d source must define gen_step()")
            shape = gen_step()
            if shape is None:
                raise RuntimeError("gen_step() returned None")

            export_format = {format!r}
            if export_format == "preview":
                def color_tuple(value):
                    if value is None:
                        return None
                    if hasattr(value, "to_tuple"):
                        return [float(v) for v in value.to_tuple()]
                    try:
                        return [float(v) for v in value]
                    except TypeError:
                        return None

                def collect_leaves(node, inherited_color=None, inherited_label="part"):
                    color = getattr(node, "color", None) or inherited_color
                    label = getattr(node, "label", None) or inherited_label
                    children = tuple(getattr(node, "children", ()) or ())
                    if children:
                        leaves = []
                        for index, child in enumerate(children):
                            child_label = getattr(child, "label", None) or f"{{label}}_{{index + 1}}"
                            leaves.extend(collect_leaves(child, color, child_label))
                        return leaves
                    return [(node, color, label)]

                root_stl_path = output_path.with_suffix(".root.stl")
                build123d.export_stl(shape, root_stl_path)
                parts = []
                for index, (part, part_color, part_label) in enumerate(collect_leaves(shape)[:{max_preview_parts}]):
                    part_path = output_path.with_suffix(f".part-{{index}}.stl")
                    build123d.export_stl(part, part_path)
                    parts.append({{
                        "label": str(part_label or f"part_{{index + 1}}"),
                        "color": color_tuple(part_color),
                        "stl": base64.b64encode(part_path.read_bytes()).decode("ascii"),
                    }})
                output_path.write_text(json.dumps({{
                    "rootStl": base64.b64encode(root_stl_path.read_bytes()).decode("ascii"),
                    "parts": parts,
                }}), encoding="utf8")
            elif export_format == "step":
                build123d.export_step(shape, output_path)
            elif export_format == "brep":
                build123d.export_brep(shape, output_path)
            else:
                build123d.export_stl(shape, output_path)
        except Exception:
            traceback.print_exc()
            sys.exit(1)
        """
    )


def _limit_child_resources(max_output_bytes: int, timeout_ms: int):
    def set_limit(kind: int, limits: tuple[int, int]) -> None:
        try:
            resource.setrlimit(kind, limits)
        except (OSError, ValueError):
            pass

    def apply_limits() -> None:
        memory_bytes = MEMORY_LIMIT_MB * 1024 * 1024
        cpu_seconds = max(1, int(timeout_ms / 1000) + 2)
        set_limit(resource.RLIMIT_AS, (memory_bytes, memory_bytes))
        set_limit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds))
        set_limit(
            resource.RLIMIT_FSIZE,
            (max_output_bytes * 2, max_output_bytes * 2),
        )

    return apply_limits


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/export")
def export_model(
    request: ExportRequest,
    authorization: str | None = Header(default=None),
) -> Response:
    _require_token(authorization)

    temp_dir = pathlib.Path(tempfile.mkdtemp(prefix="adam-build123d-"))
    source_path = temp_dir / "model.py"
    output_path = temp_dir / f"model.{_extension(request.format)}"
    runner_path = temp_dir / "export_model.py"

    try:
        source_path.write_text(request.code, encoding="utf8")
        runner_path.write_text(
            _runner_source(
                source_path,
                output_path,
                request.format,
                request.maxPreviewParts,
            ),
            encoding="utf8",
        )

        result = subprocess.run(
            [sys.executable, str(runner_path)],
            cwd=temp_dir,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
            timeout=request.timeoutMs / 1000,
            env={"PATH": os.getenv("PATH", "")},
            preexec_fn=_limit_child_resources(
                request.maxOutputBytes,
                request.timeoutMs,
            ),
        )
        if result.returncode != 0:
            message = result.stderr[-8000:].strip() or "build123d export failed"
            raise HTTPException(status_code=422, detail=message)

        output = output_path.read_bytes()
        if len(output) > request.maxOutputBytes:
            raise HTTPException(
                status_code=413,
                detail="build123d export exceeded maximum output size",
            )

        return Response(
            content=output,
            media_type=_mime_type(request.format),
            headers={"Cache-Control": "no-store"},
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=422, detail="build123d export timed out")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
