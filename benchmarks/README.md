# CADAM Benchmarks

A showcase of what [CADAM](https://adam.new/cadam) builds from a single plain-language
description. Each benchmark starts from the prompt shown and comes out as fully parametric
OpenSCAD — adjustable dimensions and colours, ready to export as `.STL`, `.SCAD`, or `.DXF`.
The `.scad` source for each model is included here, so they double as a record of how well
CADAM turns plain language into real, printable, fully parametric CAD.

| # | Model | What it shows | Controls |
| --- | --- | --- | --- |
| [1](01-twisted-hex-vase.md) | Twisted hexagonal vase | generative twist-loft, hollow shell with solid floor | 6 dims · 1 color |
| [2](02-knurled-control-knob.md) | Knurled control knob | diamond knurling, D-bore + set screw, pointer | 15 dims · 2 colors |
| [3](03-hex-bolt-and-nut.md) | Hex bolt & nut | **real ISO threads** (BOSL2 `screw`/`nut`) | 3 dims · 2 colors |
| [4](04-honeycomb-bracket.md) | Honeycomb bracket | generative hex lattice, filleted L-bracket | 13 dims · 1 color |
| [5](05-naca-airfoil-wing.md) | NACA 2412 wing | true airfoil from the NACA equations, tapered loft | 9 dims · 1 color |
| [6](06-threaded-jar-and-lid.md) | Threaded jar & lid | two **mating** threaded parts | 9 dims · 2 colors |
| [7](07-bevel-gear-drive.md) | Bevel gear drive | meshing bevel gear pair at 90° | 9 dims · 3 colors |
| [8](08-centrifugal-impeller.md) | Centrifugal impeller | 7 swept backward-curved blades | 10 dims · 1 color |
| [9](09-herringbone-planetary-gearbox.md) | Planetary gear stage | full epicyclic assembly, herringbone teeth | 10 dims · 4 colors |

## Regenerating the GIFs

`render.sh` turns any `.scad` into a clean orbiting GIF (and, with `--sheet`, a
4-view contact sheet). It mirrors CADAM's own preview: BOSL2 on the library path,
`color()` parts preserved, a clean orbit around the vertical axis.

Prerequisites (macOS shown; any OpenSCAD ≥ 2021.01 with BOSL2 support works):

```bash
# OpenSCAD CLI + ImageMagick
brew install --cask openscad@snapshot
brew install imagemagick

# BOSL2 (and BOSL) on the OpenSCAD library path — these are bundled in the repo
mkdir -p /tmp/oscad-libs/BOSL2 /tmp/oscad-libs/BOSL
unzip -o ../public/libraries/BOSL2.zip -d /tmp/oscad-libs/BOSL2
unzip -o ../public/libraries/BOSL.zip  -d /tmp/oscad-libs/BOSL
```

Then:

```bash
./render.sh 03-hex-bolt-and-nut.scad            # -> 03-hex-bolt-and-nut.gif
./render.sh --sheet 09-herringbone-planetary-gearbox.scad   # -> *.sheet.png (inspection)
```

Knobs (env vars): `FRAMES` (default 36), `SIZE` (520), `ELEV` (62°), `FPS` (24),
`COLORSCHEME` (Tomorrow), `OPENSCADPATH` (`/tmp/oscad-libs`), `OPENSCAD_BIN`.
