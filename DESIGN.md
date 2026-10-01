---
name: Warm Editorial Storybook
colors:
  surface: '#fdf8f6'
  surface-dim: '#ddd9d7'
  surface-bright: '#fdf8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3f0'
  surface-container: '#f1edeb'
  surface-container-high: '#ece7e5'
  surface-container-highest: '#e6e2df'
  on-surface: '#1c1b1a'
  on-surface-variant: '#57423b'
  inverse-surface: '#31302f'
  inverse-on-surface: '#f4f0ee'
  outline: '#8a7269'
  outline-variant: '#dec0b6'
  surface-tint: '#a13f14'
  primary: '#98390d'
  on-primary: '#ffffff'
  primary-container: '#b85024'
  on-primary-container: '#fff2ee'
  inverse-primary: '#ffb59a'
  secondary: '#45664e'
  on-secondary: '#ffffff'
  secondary-container: '#c4e9cb'
  on-secondary-container: '#496a52'
  tertiary: '#5a5751'
  on-tertiary: '#ffffff'
  tertiary-container: '#736f69'
  on-tertiary-container: '#faf3ec'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb59a'
  on-primary-fixed: '#380d00'
  on-primary-fixed-variant: '#802a00'
  secondary-fixed: '#c7ecce'
  secondary-fixed-dim: '#abcfb2'
  on-secondary-fixed: '#01210f'
  on-secondary-fixed-variant: '#2e4e37'
  tertiary-fixed: '#e8e2da'
  tertiary-fixed-dim: '#cbc6bf'
  on-tertiary-fixed: '#1d1b17'
  on-tertiary-fixed-variant: '#494641'
  background: '#fdf8f6'
  on-background: '#1c1b1a'
  surface-variant: '#e6e2df'
typography:
  display-hero:
    fontFamily: Newsreader
    fontSize: 56px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Newsreader
    fontSize: 38px
    fontWeight: '400'
    lineHeight: 46px
    letterSpacing: -0.015em
  headline-xl:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: -0.015em
  headline-xl-mobile:
    fontFamily: Newsreader
    fontSize: 30px
    fontWeight: '400'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 22px
    fontWeight: '400'
    lineHeight: 30px
  body-editorial:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 32px
  body-default:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-muted:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.12em
  label-ui:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 2rem
  gutter-mobile: 1rem
  margin: 4rem
  margin-mobile: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.75rem
  space-xl: 3rem
---

## Brand & Style

This design system translates the quiet dignity, pacing, and visual reverence of high-end travel print anthologies (such as *Cereal*, *Kinfolk*, and *Aperture* monographs) into an interactive digital space. The brand identity is grounded, meditative, and uncompromisingly restrained. It is built for culturally discerning travelers, collectors, and photographers who view journeys as essays rather than checklists.

The design philosophy combines **Warm Editorial Minimalism** with a **Photo-First Archive** sensibility:
- **Atmospheric Calm:** Generous, intentional white space replaces visual clutter, encouraging unhurried exploration.
- **Materiality & Tactility:** Interfaces borrow properties from heavy-weight uncoated matte paper, tactile book bindings, and gallery title walls rather than glossy screen tropes.
- **Photographic Primacy:** Interface chrome yields entirely to rich, naturalistic photography. The UI acts as the gallery mount and museum caption—never competing with the imagery.

## Colors

The palette is tuned to evoke tactile parchment, linen book covers, iron-gall inks, and earthen pigments. It completely eschews stark #FFFFFF whites and synthetic blacks.

- **Backgrounds & Canvases:**
  - `canvas-base`: `#f8f6f2` (Creamy tactile parchment foundation)
  - `surface-elevated`: `#fcfbfa` (Soft warm off-white for layered story cards and modals)
  - `surface-recessed`: `#f0ece1` (Muted bone for subtle wells and quote blocks)
- **Ink & Typography:**
  - `text-primary`: `#1f1e1d` (Deep warm espresso ink for primary reading and headlines)
  - `text-secondary`: `#54504b` (Aged charcoal for excerpts, deck copy, and metadata)
  - `text-tertiary`: `#76726c` (Muted warm stone for micro-labels, dates, and captions)
- **Rules & Boundaries:**
  - `border-subtle`: `#e8e5df` (Whisper-thin stone rule)
  - `border-medium`: `#d9d5cd` (Structural delimiters and dividers)
- **Accents (Strict Scarcity):**
  - `primary` (`#b85024`): Sun-baked terracotta. Reserved exclusively for singular primary actions (e.g., "Begin Reading", "Reserve Dispatch") and active location pins. Never used for decorative washes or gradients.
  - `secondary` (`#4a6b53`): Muted Mediterranean sage. Used strictly for status verification (e.g., "Confirmed Expedition", "Archived Story").

## Typography

The typographical pairing mimics fine bookbinding and independent literary quarterlies. 

- **Display & Storytelling (`Newsreader`):** An optical serif designed for extended literary immersion. Used for title covers, chapter headings, pull-quotes, and long-form narrative body (`body-editorial`). Display sizes use medium-low contrast strokes with italic flourishes reserved strictly for foreign terms, locations, and literary excerpts.
- **Functional Interface (`Plus Jakarta Sans`):** An airy, warm neo-grotesque sans-serif that remains invisible yet exceedingly legible for wayfinding, geo-coordinates, dates, and input values.
- **Editorial Metadata Treatment:** Dates, photo credits, and issue coordinates utilize `label-caps` in uppercase with wide tracking (`0.12em`), reflecting classic archival cataloging traditions.

## Layout & Spacing

The layout philosophy mirrors an exhibition catalogue with deliberate white space, asymmetric image groupings, and disciplined horizontal margins.

- **Grid Architecture:** 
  - Desktop uses a 12-column layout with a generous `4rem` outer margin and `2rem` gutters, constraining long-form prose to 7 columns maximum (approx. 65 characters per line) to maintain comfortable ocular rhythm.
  - Photography breaks free from standard column bounds, spanning full 12-column bleeds or deliberate offset 8-column spreads with adjacent white space.
  - Mobile drops to a 4-column layout with `1.5rem` outer margins.
- **Section Pacing:** Vertical rhythm alternates between intimate density (compact captions and metadata) and vast landscape breathing room (`space-xl` and above), mimicking turning a heavy linen page.

## Elevation & Depth

This system outright rejects drop shadows, synthetic glow blurs, and floating Z-axis elevations. Depth is purely architectural, physical, and planar:

- **Surface Tonal Stacking:** Depth is expressed by placing lighter `#fcfbfa` surfaces against the warmer `#f8f6f2` canvas foundation.
- **Hairline Framing:** In place of shadows, containers and cards use hairline borders: `1px solid #e8e5df`. These borders evoke debossed paper frames and gallery mat boards.
- **Atmospheric Inset:** For overlays, drawers, and modal sheets, an uncoated backdrop dimming layer (`rgba(31, 30, 29, 0.45)`) is used with an imperceptible blur, keeping focus rooted in photographic reality.

## Shapes

The geometric silhouette remains disciplined and architectural. 
- Elements employ a subtle radius (`roundedness: 1` — default `0.25rem`, large containers at `0.5rem`, modal sheets at `0.75rem`).
- Rounded "pill" geometries and bubble-like containers are strictly prohibited; cards, tags, and interactive surfaces must retain the clipped, precise corners of trimmed archival paper stock.

## Components

### Buttons
- **Primary:** Solid terracotta (`#b85024`) with warm off-white text (`#fcfbfa`), `0.25rem` radius, `0.75rem 1.75rem` padding. Subtle brightness decrease on hover. Used solely for the primary story action.
- **Secondary / Ghost:** Transparent background with `1px solid #d9d5cd` border and `#1f1e1d` ink. On hover, background shifts to `#f0ece1`.
- **Editorial Text Link:** Understated `#1f1e1d` text accompanied by a fine terracotta or stone underline placed `4px` beneath the baseline.

### Cards & Story Tiles
- **Editorial Story Card:** Border of `1px solid #e8e5df`, crisp `0.5rem` radius, background in `#fcfbfa`. Photography holds a `4:5` or `16:10` aspect ratio with no corner rounding inside the container, flush to top edges. Metadata sits neatly underneath in wide-tracked `label-caps`.
- **Curator’s Note / Pull-Quote Plate:** Borderless card filled with `#f0ece1` containing `body-editorial` text set with an authentic opening quotation mark in terracotta.

### Chips & Status Indicators
- **Chapter / Category Tag:** Unfilled `#e8e5df` border, `11px` uppercase tracking, `#54504b` ink.
- **Status Badge (Confirmed / Open):** Delicate `#4a6b53` text over a soft sage wash (`#eef3f0`) with an inset `1px` border of `rgba(74, 107, 83, 0.2)`.

### Form Fields & Inputs
- **Text Inputs:** Transparent background, resting border of `1px solid #e8e5df` transitioning smoothly to `1px solid #1f1e1d` upon focus. No outer halos. Placeholder set in `#76726c`.
- **Checkboxes & Radios:** Handcrafted square forms (`16px`) with razor borders. Selected state fills with `#1f1e1d` and features a crisp `#fcfbfa` glyph.

### Photo Gallery & Vignette Containers
- Images are treated as printed plates. Every image plate includes an optional bottom gutter containing a flush-left camera coordinate or latitude/longitude mark, with the photographer's credit aligned flush-right in `caption` size.