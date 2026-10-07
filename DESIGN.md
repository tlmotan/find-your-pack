---
version: 1
name: find-your-pack-design
description: >
  A quiet, bright, Mentimeter-style system for a live-event group reveal. White
  canvas, navy ink, one electric-blue accent, generously rounded shapes, and type
  that is deliberately oversized because every screen is read either across a room
  (projected host view) or in a two-second glance (player phone). The interface is
  almost silent so that one moment — the reveal — can be loud.

colors:
  accent: "#1F6AFE"
  accent-pressed: "#164FC4"
  accent-soft: "#EAF1FF"
  ink: "#0E1726"
  body: "#3C4859"
  muted: "#6B7686"
  hairline: "#E3E8EF"
  canvas: "#FFFFFF"
  surface: "#F5F7FA"
  success: "#15803D"
  warning: "#B45309"
  danger: "#DC2626"
  on-accent: "#FFFFFF"

fonts:
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace"

radii: { sm: "8px", md: "14px", lg: "20px", pill: "9999px" }
---

# Find Your Pack — Design System

## 1. Visual Theme & Atmosphere

Bright, calm, and almost empty. Every screen in this app is glanced at, not read:
a player looks down for two seconds in a loud room, and a host's screen is being
projected to 150 people who are ten metres away. So the system is built around
**one idea per screen, set very large, on white**.

The mood is friendly rather than slick — rounded corners (14–20px), soft grey
surfaces instead of borders, a single electric-blue accent that only ever means
"this is the thing to press". There are no gradients, no illustrations, no icon
sets, and no web fonts. The whole app should feel like it loaded instantly,
because on crowded venue mobile data it has to.

The design is **light-first and committed** — there is no dark mode in v1. Host
screens especially stay white: projectors render dark backgrounds as muddy grey,
and the lobby screen has to be legible from the back row.

The reveal screen is the single deliberate exception to all of this. It goes
full-bleed saturated colour with an enormous emoji, because it is the one moment
the app is asking for a reaction.

**Key characteristics**
- White canvas (`#FFFFFF`), navy ink (`#0E1726`), one blue accent (`#1F6AFE`)
- Oversized type: nothing informational below 16px, hero numbers up to 128px
- Rounded, pill-shaped primary buttons at a minimum 56px tall
- Surfaces (`#F5F7FA`) to group content, hairlines only where a surface won't do
- System fonts only — zero font bytes over the wire
- One primary action per screen, full-width on phones
- Full-bleed colour reserved exclusively for the reveal

## 2. Colour Palette & Roles

### Brand
- **Accent Blue** (`#1F6AFE`): primary buttons, focus rings, the live-count number. Never decorative.
- **Accent Pressed** (`#164FC4`): active/pressed state of any accent surface.
- **Accent Soft** (`#EAF1FF`): the tint behind a selected option or an info note.

### Text
- **Ink** (`#0E1726`): headings and any number a person acts on.
- **Body** (`#3C4859`): sentences and supporting copy.
- **Muted** (`#6B7686`): hints, timers, "Keep this page open". Never below 14px.

### Surface
- **Canvas** (`#FFFFFF`): the page.
- **Surface** (`#F5F7FA`): cards, the QR panel, grouped settings.
- **Hairline** (`#E3E8EF`): input borders and dividers only.

### Semantic
- **Success** (`#15803D`): lobby open, link copied.
- **Warning** (`#B45309`): "fewer than 2 players", expiring session.
- **Danger** (`#DC2626`): destructive host actions and errors.

### Reveal Palette
Each group gets one full-bleed background, always paired with white text. All
twelve clear 4.5:1 for white text (verified, 4.6:1–6.3:1).

The colour is derived from the **group name**, not its position, by
`packColorIndex()` in `lib/pack-color.ts` — `get_my_state` returns no group index,
so there is nothing to count from, and hashing the name gives the property that
actually matters: every phone in a pack agrees, and a refresh mid-reveal keeps the
same colour. Two names can collide on one colour (the animal preset uses 9 of the
12), which costs nothing because colour never carries group identity.

`#1F6AFE` `#4F46E5` `#7C3AED` `#9333EA` `#DB2777` `#BE123C`
`#DC2626` `#C2410C` `#B45309` `#15803D` `#0F766E` `#0369A1`

Colour is **never** the carrier of group identity — the name and emoji are. Two
players must be able to compare packs without seeing each other's screens, and a
colour-blind player must never be disadvantaged.

## 3. Typography Rules

One family: the system sans. Weights 400, 600, and 800 only.

| Role | Size | Weight | Tracking | Used on |
|---|---|---|---|---|
| Reveal name | 56–72px | 800 | -0.02em | The group name on reveal |
| Reveal emoji | 128px | — | — | Above the group name |
| Countdown digit | 160px | 800 | -0.03em | 3-2-1 countdown |
| Projected count | 96–128px | 800 | -0.02em | Host lobby player count |
| Page title | 28–32px | 800 | -0.02em | "You're in!", "Make your sound!" |
| Section heading | 20px | 600 | 0 | Host settings groups |
| Body | 17px | 400 | 0 | Sentences; 16px floor on inputs |
| Button label | 18px | 600 | 0 | All buttons |
| Hint | 14–15px | 400 | 0 | Muted help text and timers |
| Join code | 32px | 800 | 0.12em | Manual-entry code, mono |

Line height 1.15 on anything above 40px, 1.5 on body. Sentence case
everywhere — no uppercase labels; they slow down a two-second glance. Never set
an input below 16px: iOS Safari zooms the page when it's focused.

## 4. Component Stylings

**Primary button** — accent fill, white label, `pill` radius, 56px min height,
full width on phones, 24px horizontal padding. Hover darkens to accent-pressed;
active also scales to 0.98. Disabled is `#E3E8EF` with `#6B7686` label and no
scale. A pending action replaces the label with "Starting…" rather than a spinner,
and the button stays disabled until the server answers.

**Secondary button** — transparent fill, 1.5px hairline border, ink label, same
size and radius. For "Copy link" and anything reversible.

**Danger button** — text-only in danger colour until pressed once, then it asks
for confirmation inline. Never a destructive action one tap away.

**Card / surface panel** — `surface` fill, `lg` radius, 20–24px padding, no
border, no shadow. Cards group; they don't float.

**Input** — white fill, 1.5px hairline border, `md` radius, 52px tall, 17px text.
Focus swaps the border to accent and adds a 3px `accent-soft` outer ring. Labels
sit above the field at 15px/600 in ink — never a placeholder as the only label.

**QR panel** — the QR code on pure white inside a `surface` card, at least
280px square, with the join code in mono directly beneath it so people at the
back can type what they can't scan.

**Status pill** — `pill` radius, 6px/14px padding, 15px/600, tinted background
with a darker text of the same hue. Used for "Lobby open" and "Waiting".

**Live count** — the number alone in accent at projected-count size, the word
"joined" beneath it in muted at 20px. Changes animate as a 150ms fade only;
never a slot-machine roll, which reads as broken from a distance.

## 5. Layout Principles

Spacing scale, 4px-based: `4 8 12 16 24 32 48 64 96`. Nothing in between.

Every player screen is a single centred column, vertically and horizontally
centred in `100dvh` (`dvh`, not `vh` — mobile browser chrome moves), with 24px
side gutters and a 440px max width. The content is one block: an optional emoji,
a title, at most one supporting line, and at most one button.

Host screens use the same column at 640px for forms, but the lobby view goes
full-viewport centred with no max width, because it is being projected.

Whitespace is the main tool for hierarchy. Before adding a border, a shadow, or
a divider, try 32px of space instead.

## 6. Depth & Elevation

There is effectively no elevation. Surfaces are distinguished by fill, not
shadow. Two exceptions:

- A sticky host action bar on small screens: `0 -1px 0 #E3E8EF` as a hairline, not a shadow.
- The reveal card over its full-bleed colour: no shadow either — white text directly on the colour.

No blur, no glass, no layered translucency. They cost GPU on the old phones this
app is built for.

## 7. Do's and Don'ts

**Do**
- Set one idea per screen and let it be far too large.
- Keep every tap target at least 48×48px, and primary buttons 56px tall.
- Use `dvh` for full-height screens and test with the browser bar visible.
- Keep copy under eight words where you can: "Make your sound! 🔊".
- Let the reveal be the loudest thing in the app, and nothing else compete.
- Pair every colour with a word or emoji that carries the same meaning.
- Derive a pack colour with `packColorIndex()`; never hand-assign one per group.

**Don't**
- Don't load a web font, an icon library, or an illustration set.
- Don't animate anything longer than 300ms, and honour `prefers-reduced-motion`.
  The one exception is the reveal → hidden block wipe (~0.9s in total, five
  signal-colour columns); it starts before the hide so the flag is never shown
  past its window, and it does not play with reduced motion.
- Don't put two primary buttons on one screen.
- Don't use uppercase, letter-spaced labels — the join code is the only exception.
- Don't show a spinner where a disabled button with changed text will do.
- Don't render a player's group anywhere outside the reveal window, including
  in markup, a data attribute, or a cached response.
- Don't add a dark mode, a theme picker, or a settings screen in v1.

## 8. Responsive Behaviour

Mobile-first; the phone layout is the real design and desktop is the host's
projector.

| Breakpoint | Behaviour |
|---|---|
| `< 480px` | Single column, 24px gutters, full-width buttons. The baseline. |
| `≥ 480px` | Column caps at 440px and centres. Buttons stay full-column width. |
| `≥ 768px` | Host forms cap at 640px; settings can pair two fields per row. |
| `≥ 1024px` | Host lobby only: count and QR side by side, count at 128px. |

Reveal and countdown type scale with the viewport via `clamp()` so the countdown
fills a small phone and a projector alike. Test every screen at 360×640 — that
is the oldest phone in the room, and it is the one that matters.

## 9. Agent Prompt Guide

These tokens live as Tailwind v4 theme variables in `app/globals.css` under
`@theme static` — reach for the utility (`bg-accent`, `text-ink`, `rounded-lg`,
`text-countdown`) rather than a raw hex. The reveal colours are
`--color-pack-1` … `--color-pack-12`, read as a CSS variable because the group
index is only known at runtime. `static` is required: Tailwind otherwise drops
theme variables no class name references.

Quick reference: accent `#1F6AFE` · ink `#0E1726` · body `#3C4859` · muted
`#6B7686` · canvas `#FFFFFF` · surface `#F5F7FA` · hairline `#E3E8EF` ·
radius 14px cards / 20px panels / pill buttons · system fonts only.

Screen-by-screen intent:

- **Waiting** (`WaitingScreen`) — white, centred. "You're in!" at page-title
  size, "Waiting for the host to start…" in body, "Keep this page open." in
  muted at the bottom of the block. A calm, patient screen; no spinner.
- **Countdown** (`Countdown`) — white, one enormous digit in accent, centred,
  nothing else. Each digit fades and scales from 1.1 to 1 over 200ms.
- **Reveal** (`RevealScreen`) — full-bleed group colour, white text. 128px
  emoji, group name at reveal size, sound hint below it, pack size in a
  translucent-white pill, and the hide countdown small and muted-white at the
  bottom. Entrance: 250ms fade with the emoji scaling 0.8 to 1.
- **Hidden** (`HiddenScreen`) — back to white. "Make your sound! 🔊" at page-title
  size, pack size beneath it in body. The colour is gone; that is the point.
- **Host lobby** (`HostDashboard`) — projector-facing. Live count enormous in
  accent, "Lobby open" status pill, QR panel with the join code beneath, and one
  primary Start button that stays disabled below two players with a warning hint.
- **Host setup** (`SettingsForm`) — 640px column, labelled inputs, the animal
  preset as a selected `accent-soft` card against a custom-list alternative.

When asked to build or restyle a screen in this project, follow the token names
above rather than inventing values, and keep to the one-idea-per-screen rule
before reaching for any new component.
