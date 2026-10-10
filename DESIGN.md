---
version: 2
name: find-your-pack-design
description: >
  Signal Flags. A deep-navy system for a live-event group reveal in a dim hall:
  five maritime signal colours at full saturation, packs identified by real
  International Code of Signals flags so colour AND shape carry the message,
  system sans at extreme weight, and small tracked code-book labels. The app
  holds still so that one moment — a flag run up the halyard — can be loud.

colors:
  ground: "#0A1626"
  ground-deep: "#06101C"
  ground-raised: "#132235"
  rule: "#2C4259"
  chalk: "#F4F6F8"
  chalk-dim: "#9FB0C4"
  signal-red: "#C8102E"
  signal-yellow: "#FFD100"
  signal-blue: "#0047BB"
  signal-white: "#FFFFFF"
  signal-black: "#0A0A0A"
  accent: "#FFD100"
  accent-pressed: "#E0B800"
  on-accent: "#0A0A0A"
  danger: "#FF6B6B"
  success: "#4ADE80"

fonts:
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace"

radii: { sm: "4px", md: "8px", pill: "9999px" }
---

# Find Your Pack — Design System

> Written from the built world. `app/globals.css` under `@theme static` is the
> source of truth for every value here; the direction contract lives as a
> comment in `app/layout.tsx`. If this file and the CSS disagree, the CSS wins
> and this file is the thing to fix.

## 1. Visual Theme & Atmosphere

**Every pack is a signal flag.** Colour and shape are the message, sent across
a room without speech. That single idea decides everything else, and it is what
this system was built to refuse: the bright quiz-app card grid.

The app sits on deep navy (`#0A1626`) because it is used in a dim hall. A white
full-screen field is a flashbulb in someone's face at the exact moment they are
trying to memorise something, so the ground stays dark and the flags are the
only bright thing in it. The host view is dark for the same reason — the room's
lights are down, and the projector is the brightest surface in it already.

The mood is a code book, not a toy: cut corners rather than soft ones (4–8px,
and flags themselves are never rounded), hairline rules, small uppercase tracked
labels in the margins, and one action colour. No gradients, no illustrations, no
icon set, no web fonts. On crowded venue mobile data the whole app has to feel
like it loaded instantly, so it carries almost nothing.

The story the screens tell, in order: **you wait in the dark, a flag is run up
for you alone, you lose it, and you go find everyone flying the same one.**

**Key characteristics**
- Navy ground (`#0A1626`), chalk text (`#F4F6F8`), signal yellow (`#FFD100`) as the only action colour
- Packs identified by twelve real signal flags — two channels (colour + shape), never colour alone
- Oversized type: nothing informational below 13px, hero numerals up to 13rem
- Pill primary buttons at 56px (`h-14`); everything else cut square at 4–8px
- `ground-raised` (`#132235`) with a `rule` (`#2C4259`) hairline to make a card
- System fonts only — zero font bytes over the wire
- One primary action per screen, full-width on phones
- The reveal is the only loud screen, and it earns it with one authored motion

## 2. Colour Palette & Roles

### Ground
- **Ground** (`#0A1626`): the page, everywhere, including host screens.
- **Ground deep** (`#06101C`): reserved for anything that must sit *under* the page.
- **Ground raised** (`#132235`): cards, inputs, the QR panel, pack chips.
- **Rule** (`#2C4259`): hairlines, input borders, column dividers, the halyard.

### Ink
- **Chalk** (`#F4F6F8`): headings, names, anything read at a glance.
- **Chalk dim** (`#9FB0C4`): supporting copy, code-book labels, counts.

### Signal colours
The five the real flag system uses, at the saturation it uses them:

`--color-signal-red` `#C8102E` · `--color-signal-yellow` `#FFD100` ·
`--color-signal-blue` `#0047BB` · `--color-signal-white` `#FFFFFF` ·
`--color-signal-black` `#0A0A0A`

These are **flag fields, not UI colours.** Against the ground, signal blue is
2.3:1 and signal red 3.1:1 — neither is ever used for text or for a control.
They appear only inside a `SignalFlag` or as a block-wipe column.

### Action and semantic
- **Accent** (`#FFD100`, = signal yellow): primary buttons, focus rings, the live count, the countdown numeral, the hide warning. 12.4:1 on the ground and the most visible thing in a dark room. Never decorative.
- **Accent pressed** (`#E0B800`): hover/active of any accent surface.
- **On accent** (`#0A0A0A`): labels on yellow, at 13.6:1.
- **Danger** (`#FF6B6B`): destructive host actions and errors. Lightened from signal red because it *is* text.
- **Success** (`#4ADE80`): the "Playing" state.

### Pack identity
A pack's flag comes from `packFlag()` in `lib/pack-flag.ts`, hashed (djb2) from
the **group name**, not its position — `get_my_state` returns no group index, so
there is nothing to count from. Deterministic is the property that matters:
every phone in a pack flies the same flag, and a refresh mid-reveal keeps it.

All twelve are real ICS flags, chosen under two rules: **no flag puts red
against blue** (1.36:1 against each other), and **no flag has a white ground**
(a white field filling a phone is the flashbulb the dark ground exists to
avoid). White appears only as a mark on a saturated ground, or as half of one
flag.

Two names can collide on one flag, which costs little: **the group's name is
always shown beside it, and the name is what carries identity.** A colour-blind
player is never disadvantaged, because shape says it too.

## 3. Typography Rules

One family: the system sans. Weights 400, 600, and 800 (`font-extrabold` does
most of the work). Mono only for the join code and the host link.

Named sizes are Tailwind theme tokens — use the utility, not a raw value:

| Token | Size | Used on |
|---|---|---|
| `text-countdown` | `clamp(7rem, 46vw, 13rem)` / 0.85 | The 3-2-1 numeral |
| `text-flag-name` | `clamp(3.25rem, 17vw, 5.5rem)` / 0.95 | Group name on reveal, "Make your sound!" |
| `text-emoji` | `clamp(4.5rem, 22vw, 7rem)` | The group emoji above the name |
| `text-hide-warning` | `clamp(3rem, 14vw, 4.5rem)` | Last-5-seconds numeral on the reveal |
| `text-display` | `clamp(3rem, 15vw, 4.25rem)` / 0.95 | Landing wordmark |
| `text-projected` | `clamp(5rem, 16vw, 11rem)` / 0.85 | Host live count |
| `text-title` | `clamp(1.875rem, 7vw, 2.25rem)` / 1.1 | Page titles, host H1 |
| `text-code` | `clamp(1.75rem, 9vw, 2.25rem)` | Join code, mono, `0.18em` tracking |

Unnamed but consistent: body copy `text-lg`, secondary copy `text-[15px]`,
button labels `text-lg/800`, pack names `text-lg`→`sm:text-2xl`/800.

Tracking tightens as size grows: `-0.01em` on buttons, `-0.02em` on titles,
`-0.03em` on the display and flag name, `-0.04em`/`-0.05em` on the big numerals.
Every numeral that changes in place is `tabular-nums`, so nothing shifts as it
counts down.

**The code-book label.** This system's signature, and the deliberate inversion
of the usual "no uppercase" rule:

```
text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase
```

It is for margin notes only — "PACKS", "PHONES JOINED", "3 PLAYERS", "NO FLAG
YET", field labels. Never a sentence, never something read under time pressure.
Sentence case everywhere else.

Never set an input below 16px: iOS Safari zooms the page on focus. `globals.css`
enforces this with `font-size: max(1rem, 1em)` on every input, select, and
textarea.

## 4. Component Stylings

**Primary button** — `rounded-pill h-14 w-full bg-accent text-lg font-extrabold
tracking-[-0.01em] text-on-accent`. Hover to `accent-pressed`, active
`scale-[0.98]`, 150ms on background and transform only. A pending action
replaces the label ("Starting…", "Joining…") rather than showing a spinner.
Two different disabled treatments, on purpose:
- *Can't yet* (too few players) → `disabled:bg-ground-raised
  disabled:text-chalk-dim`, so it visibly isn't available.
- *In flight* (already pressed) → stays yellow with `disabled:cursor-wait`. A
  button that greys out mid-action reads as broken.

**Secondary button** — `rounded-pill h-14 border-2 border-rule text-chalk`,
transparent fill, hover to `border-chalk-dim`. For anything reversible.

**Danger action** — an outlined pill: `rounded-pill h-14 border-2 border-danger
px-8 text-lg text-danger`, filling with `danger` on hover. Outlined rather than
filled, so it is unmistakably a button without reading as the thing to press
next on a game that is running well. Centred, and never full-width — it is not
the primary action on any screen it appears on.

One press replaces it in place with an inline confirmation: the question at
`text-lg/600` in chalk, the consequence beneath it in `chalk-dim`, then a filled
`danger` pill ("Yes, end it") beside a secondary ("Keep playing"). The filled
treatment is earned only here, two taps in, with the question already on screen.
Focus moves to the confirmation group when it opens. **Never a destructive
action one tap away, and never one without a stated consequence.**

**Card** — `rounded-md border border-rule bg-ground-raised`, 12–24px padding, no
shadow. Fill plus hairline; cards group, they never float.

**Input** — `rounded-md border-2 border-rule bg-ground-raised text-chalk`, 56px
tall (`h-14`) or 72px for the join code. Focus swaps the border to accent and
adds `shadow-[0_0_0_3px_rgba(255,209,0,0.25)]`. Labels sit above the field as
code-book labels — never a placeholder as the only label.

**QR panel** — a `ground-raised` card holding the QR on a pure-white `rounded-sm`
pad at 272px with `marginSize={2}`. Scanners need the quiet zone and maximum
contrast, and a navy ground costs both. The join code sits beneath it in mono,
`translate="no"` so no browser helpfully translates a code nobody can then type.

**Status pill** — `rounded-pill px-3.5 py-1.5` with a code-book label inside.
Filled accent for "Lobby open"; outlined in its own semantic colour for "Playing"
(`border-success text-success`) and "Not open yet" (`border-rule text-chalk-dim`).

**Live count** — the numeral alone at `text-projected` in accent, the code-book
label beneath it. Wrapped as one `role="status" aria-atomic="true"` region so a
screen reader hears "24 phones joined", not a bare number ticking. No roll, no
slot-machine animation: it reads as broken from a distance.

**Halyard** — `.halyard`, a dashed hairline the flag runs up, drawn as a
`linear-gradient` on a 1px column rather than decorated with a border. Present
on waiting, countdown, hidden and status screens; it is what makes the empty
screens read as *waiting* rather than *broken*.

**Code-book footer** — `border-t border-rule pt-4` with two code-book labels
pushed apart (`flex items-end justify-between`). Carries pack size on the left,
state on the right ("Keep this page open" / "Reconnecting…" / "Flag struck" /
"Hiding in 8s"). Every player screen ends with one.

**Rating buttons** — five equal square cells, `flex-1 aspect-square rounded-md
border-2` with the emoji at `text-3xl`. Unselected `border-rule` on the sheet's
own fill; selected `border-accent bg-accent/[0.08]` — the yellow tint is the
faintest use of accent in the app, because five filled yellow squares would
shout louder than the reveal. Emoji, never stars and never an icon library: the
app loads no icons, and a face needs no legend. Each button carries its word as
an `aria-label` ("Bad"… "Great") and its state as `aria-pressed`, so the row is
never colour alone.

**Reason chips** — `rounded-pill min-h-11 border-2 px-4`, multi-select, wrapping
onto as many rows as they need. Unselected `border-rule text-chalk` on a
transparent fill; selected flips to `bg-accent font-bold text-on-accent` with the
border going accent too, so the geometry doesn't shift under the thumb. The
chips are the complete answer: a player who taps nothing else has still said
something useful.

**Comment field** — the one open text box in the app, and a fenced one. A
`textarea` at `rows={3}`, `resize-none`, on `bg-ground` so it reads as a well
cut into the raised sheet rather than another panel on it; `border-2
border-rule` going accent with a 3px yellow ring on focus, like every other
input. It comes **last**, after the taps, so nobody has to type in a loud hall
to be heard, and it is labelled "Additional comments" with the placeholder
"Tell us more about your experience…".

Hard rule 1 is the reason it is fenced rather than simply absent: an open box is
where someone types a name. The fence is a 300-character cap, a counter that
appears only in the last 50, and a visible "Please don't include anyone's name."
None of that is enforcement — **whatever consumes these answers must strip or
review them**, and that is a server-side decision, not a styling one.

**Feedback sheet** — `components/play/FeedbackSheet.tsx`, flush to the left,
right and bottom edges at `min-h-[66dvh]`, capped at `max-h-[92dvh]` with
`overflow-y-auto` so the comment box can't push content off the top of a short
phone, `rounded-t-md border-t border-rule
bg-ground-raised`, `px-5 pt-7` and a bottom pad of
`max(1.5rem,env(safe-area-inset-bottom))`. No shadow and no scrim — see §6 — and
its arrival is §7.

**Signal flag** — `components/play/SignalFlag.tsx`, geometry in SVG at a 60×40
viewBox, zero bytes over the wire and crisp from a 40px chip to a full-bleed
band. Always `aria-hidden`, always beside the name that carries the meaning.

## 5. Layout Principles

Spacing is Tailwind's 4px scale; stay on it.

**Player screens** are `min-h-dvh` (`dvh`, not `vh` — mobile browser chrome
moves), `px-5`, with the content block centred in the free space and a code-book
footer pinned under it. Bottom padding is
`pb-[max(1.5rem,env(safe-area-inset-bottom))]` so the footer clears the home
indicator. Text blocks cap at `26rem`.

**Host setup** is a single `640px` column. **The host dashboard** caps at
`640px`, widening to `1100px` at `lg` where it becomes two columns: QR (or the
pack list, once playing) on the left, live count on the right behind a
`lg:border-l lg:border-rule` divider. The grid is `items-stretch` so that
hairline runs the full height of the taller column, and once the game is
playing the End game action drops to the bottom of its column with `lg:mt-auto`.

**The pack list** stays two columns at every width. Three would shrink the flags
below the size they can be told apart at from the back of a hall; at `sm` and up
the cards scale up instead (84×56 flag, 24px name, the emoji promoted out of the
name into its own element).

Whitespace carries hierarchy. The reveal screen's emptiness is the composition,
not a gap to fill. Before adding a border, try 32px of space.

## 6. Depth & Elevation

There is no elevation. Surfaces are distinguished by fill (`ground-raised`) and
a hairline (`rule`) — never a shadow. No blur, no glass, no layered
translucency: they cost GPU on the old phones this app is built for. The only
`z-index` in the app belongs to the hide warning (`z-10`), the feedback sheet
(`z-40`) and the block wipe (`z-50`) — all overlays rather than raised surfaces.
The feedback sheet is the test of this rule: a bottom sheet is where every other
design system reaches for a shadow and a blurred scrim. This one gets neither.
It is `ground-raised` with a 1px `rule` along its top edge, flush to the left,
right and bottom edges so it reads as a panel that has arrived rather than a
card floating over the screen. The screen behind it is dimmed by its own
`opacity`, never by a scrim laid on top: it fades toward the same ground it
already sits on, so nothing gains a grey film.

## 7. Motion

One authored motion: **a flag being run up and snapping taut.** Everything else
holds still so that reads as the moment it is. All of it is CSS keyframes in
`globals.css`; nothing animates in JavaScript.

| Class | Timing | What it is |
|---|---|---|
| `.hoist` | 620ms `cubic-bezier(.16,.9,.3,1)` | The flag runs up the full height of its clipping box |
| `.snap-taut` | 240ms `cubic-bezier(.16,1,.3,1)`, 560ms delay | It arrives and pulls tight. Ease-out, never overshoot — an elastic wobble reads as an effect |
| `.count-strike` | 200ms | Each countdown numeral, keyed so it replays |
| `.drop-in` | 260ms | Each second of the hide warning, arriving from above |
| `.wipe-col` | 200ms per column, 60ms stagger | Five signal-colour columns, red never touching blue |
| `.sheet-rise` / `.sheet-dim` | 600ms `cubic-bezier(.22,1,.36,1)`, 200ms delay | The feedback sheet travelling up from below the bottom edge while the ended screen dims to 0.45 |

The 300ms cap holds for everything except the hoist, the block wipe and the
feedback sheet. The
wipe's timings are `WIPE_*` in `lib/player-screen.ts`: 5 columns × 200ms with a
60ms stagger, so 440ms to cover and 440ms to clear. It runs on three
transitions, all of them leaving or arriving at the hidden screen:

- **reveal → hidden**, fired 640ms before the hide (`WIPE_LEAD_MS`) by
  `useBlockWipe`. Long on purpose, and doing security work as much as visual
  work: it starts *before* the server hides the group, so the flag is never on
  screen past its window.
- **hidden → ended**, fired by the host ending the game (`useSwapWipe`). Purely
  cosmetic. It holds the hidden screen under the columns for 440ms so the swap
  happens unseen.
- **hidden → countdown**, fired by the host starting another round, also
  `useSwapWipe`. Without it the screen cuts straight from "Make your sound!" to
  a bare "3", which reads as a glitch rather than as the next round beginning.
  The wipe costs about 0.9s of the 3s countdown, which is running underneath it
  the whole time. Measured on a Pixel 5: the columns clear with the numeral
  still on "3", but only for about 0.2s, so what the player watches is a flash
  of 3 and then a full second each of 2 and 1 — a phone that hears about the
  round late loses the flash as well. The columns are always gone before the
  reveal lands, so the wipe spends countdown, never reveal.

The last two hold the old screen under the columns, which is why
`isHeldWipe()` keeps them to those exact pairs: a hold is only safe where
neither side shows a group, or it would keep a flag on screen past its window.
**hidden → revealed** is therefore an instant cut too, for a phone that woke up
with a reveal already running and has little of its window left to spend. No
other screen change animates.

The feedback sheet is the third exception, and the only transition rather than
keyframes. Its timings are `SHEET_*` in `lib/feedback-sheet.ts`: the ended screen
is left alone for 200ms, then the sheet travels `translateY(100%) → 0` over
600ms while the screen behind it dims to 0.45 on the same curve, so the two read
as one movement. 600ms because a sheet has weight — a 300ms rise reads as a
modal popping in, which is the wrong event. It is an exit from the game, not a
dialog interrupting it, so there is no scrim, no blur, no focus trap, and no
button opens it: `useSheetEntrance` starts the sequence the moment the ended
screen is actually on show, which means *after* the hidden → ended wipe's
columns have cleared, never behind them. The sheet is `inert` until it settles,
because a chip sliding out from under a thumb mid-press is how someone sends an
answer they did not mean.

`prefers-reduced-motion: reduce` kills every animation and transition globally.
The wipe's resting state is above the screen, so with motion off it simply never
appears. The sheet's resting state is below it, so instead `useSheetEntrance`
starts at `settled`: it is already in place on the first frame, dim and all,
rather than sitting off screen for a delay and then jumping.

## 8. Accessibility

- **Never colour alone.** Every flag is `aria-hidden` decoration; the group name
  beside it is the identity. Every state colour is paired with a word
  ("Reconnecting…", "Flag coming down").
- **Never red or blue text on the ground.** Signal blue is 2.3:1 and signal red
  3.1:1 against it — both far under the 4.5:1 body-text floor. Yellow (12.4:1),
  chalk (16.8:1), chalk-dim (8.2:1), danger (6.6:1) and success (10.4:1) all
  clear it.
- Flags are decorative, so no flag ever needs alt text — but equally, **no
  information may live only in a flag.**
- Live counts are one atomic `role="status"`; the countdown is deliberately
  *not* a live region, because announcing "3… 2… 1…" talks over the reveal.
- Tap targets 48px minimum, primary buttons 56px. A small code-book label used
  as a button gets vertical padding to reach that.
- `:focus-visible` is a 2px accent outline at 3px offset, globally. Never
  removed.
- Pinch-zoom stays enabled (no `maximumScale`), and `overscroll-behavior: none`
  is scoped to `pointer: fine` so phones keep pull-to-refresh and swipe-back.

## 9. Do's and Don'ts

**Do**
- Set one idea per screen and let it be far too large.
- Use `dvh` for full-height screens, and pad the bottom for the safe area.
- Keep copy under eight words: "Make your sound!", "No flag yet".
- Let the reveal be the loudest thing in the app, and nothing else compete.
- Pair every colour with a word or shape carrying the same meaning.
- Derive a pack's flag with `packFlag()`; never hand-assign one.
- Reach for a theme utility (`bg-accent`, `text-chalk-dim`, `text-projected`)
  rather than a hex.

**Don't**
- Don't load a web font, an icon library, or an illustration set.
- Don't animate past 300ms except the hoist, the three wipes and the feedback
  sheet, and honour `prefers-reduced-motion`.
- Don't set text or a control in signal red or signal blue.
- Don't give a flag a white ground, or let red touch blue inside one.
- Don't put two primary buttons on one screen. One primary plus the outlined
  danger End game is not two — that pairing is the host dashboard at every
  status, including "Start round N".
- Don't use a code-book label for a sentence, or for anything read under time
  pressure.
- Don't show a spinner where a disabled button with changed text will do.
- Don't render a player's group anywhere outside the reveal window — not in
  markup, a data attribute, or a cached response.
- Don't add a light mode, a theme picker, or a settings screen in v1.

## 10. Responsive Behaviour

Mobile-first; the phone layout is the real design and desktop is the host's
projector.

| Breakpoint | Behaviour |
|---|---|
| `< 640px` | The baseline. Single column, 20px gutters, full-width buttons, compact pack chips with the emoji inline in the name. |
| `≥ 640px` (`sm`) | Host settings pair two fields per row; pack cards scale up to projector size and the emoji becomes its own element. |
| `≥ 1024px` (`lg`) | Host dashboard only: widens to 1100px and splits into two columns with the hairline divider between them. |

Reveal, countdown and display type scale with the viewport via `clamp()`, so the
countdown fills a small phone and a projector alike. Test every screen at
360×640 — that is the oldest phone in the room, and it is the one that matters.

## 11. Agent Prompt Guide

Tokens live as Tailwind v4 theme variables in `app/globals.css` under
`@theme static`. `static` is required: Tailwind otherwise drops theme variables
that no class name references, and the flag SVG reads its colours as CSS
variables at runtime.

Quick reference: ground `#0A1626` · raised `#132235` · rule `#2C4259` · chalk
`#F4F6F8` · chalk-dim `#9FB0C4` · accent/yellow `#FFD100` on near-black labels ·
radius 4px flags-and-pads / 8px cards-and-inputs / pill buttons · system fonts
only.

Screen-by-screen intent:

- **Landing** (`app/page.tsx`) — a hoist of seven flags flush to the top edge and
  touching, then the wordmark, then the join form. The player's path leads
  because it is the one under time pressure; "Host a game" is its own action
  below a rule, not a word buried in a sentence.
- **Waiting** (`WaitingScreen`) — an empty halyard, "You're in", one line of
  reassurance, and a code-book footer reading "NO FLAG YET". The screen is honest
  about having nothing yet, which is what makes the hoist land.
- **Countdown** (`Countdown`) — one struck numeral in yellow over a short
  halyard. Nothing else.
- **Reveal** (`RevealScreen`) — the flag hoists as a full-bleed 26:10 band near
  the top (a flag sits high on its mast; the space beneath is what makes it read
  as flying), then emoji, name, sound hint. The last 5 seconds put a giant
  numeral above it, absolutely positioned so arriving costs no layout shift.
- **Hidden** (`HiddenScreen`) — the bare halyard again. "Make your sound!" at
  flag-name size in yellow. The screen has deliberately stopped being useful.
- **Lost spot** (`StatusScreen`) — "We lost your spot", then "Scan the QR code
  again to get back in." Shown only after the phone has quietly failed to
  re-join itself, and deliberately not phrased as an ending: the game is
  probably still running without them, and the player has something to do.
- **Ended** (`StatusScreen`) — "This game has ended". The columns wipe across
  from the hidden screen into it, so the game closes the way it opened.
- **A new round** — no new screen. The columns wipe from the hidden screen back
  into the countdown, and the player goes round the countdown → reveal → hidden
  loop again with a different pack.
- **Host dashboard** (`HostDashboard`) — projector-facing. Title plus status
  pill, which reads "Round 2" once playing rather than "Playing": the round is
  the more useful thing to read off a projector. QR before Start, the pack list
  after; the live count enormous in yellow behind a hairline divider. One
  primary button per status — Open lobby, Start the game, then "Start round N"
  — with End game at the foot of that column below it.
- **Host setup** (`SettingsForm`) — 640px column, code-book field labels, the
  theme preset as a selected card against a custom-list alternative.

When asked to build or restyle a screen, follow the token names above rather
than inventing values, and keep to the one-idea-per-screen rule before reaching
for any new component.
