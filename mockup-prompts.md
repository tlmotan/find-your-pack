# Mockup prompts — Find Your Pack (Signal Flags)

One prompt per route. Each is self-contained: image models have no memory of the
design system, so the palette and type rules are restated every time. Paste a
prompt as-is. `/preview` is excluded — it is a temporary dev tool.

**Frame:** player screens are portrait at phone viewport (9:19.5). Host screens
are landscape (16:10) — they are read on a laptop and projected.

---

## Shared system (already embedded in each prompt below)

- Ground `#0A1626` deep navy. Raised panels `#132235`. Hairline rules `#2C4259`.
- Text: `#F4F6F8` chalk, `#9FB0C4` dimmed chalk.
- Signal colours, fully saturated, used only in flags: red `#C8102E`,
  yellow `#FFD100`, blue `#0047BB`, white `#FFFFFF`, black `#0A0A0A`.
- Action colour is signal yellow `#FFD100` with near-black `#0A0A0A` labels, in
  full-width pill buttons.
- Type is a system sans (SF Pro / Helvetica Neue character), never a serif,
  never a display face. Headlines extra-bold with tight negative tracking
  (-0.03em). Small labels are 13px uppercase, letter-spacing 0.14em, dimmed.
- Join codes are monospace, letter-spacing 0.18em.
- Flags are flat geometric fields at 3:2, from the International Code of
  Signals. No gradients, no shadows, no glass, no rounded corners on flags.
- A dashed hairline vertical "halyard" is the recurring motif.
- Designed for a dim hall: the navy ground is near-black and the flags are the
  only bright thing on screen.

---

## 1. Landing — `/`

> A mobile web app landing screen, portrait phone viewport, deep navy `#0A1626`
> background filling the frame. At the top, a horizontal row of six small flat
> geometric maritime signal flags, each 3:2, touching edge to edge: solid red,
> solid yellow, yellow-and-black quarters, red-and-yellow diagonal, yellow-blue-
> yellow horizontal bands, yellow-and-blue vertical halves. Colours are fully
> saturated red `#C8102E`, yellow `#FFD100`, blue `#0047BB`, black `#0A0A0A`.
> Below them, left-aligned, the headline "Find Your Pack" in extra-bold system
> sans, near-white `#F4F6F8`, tight negative letter-spacing. Under it a two-line
> paragraph in muted blue-grey `#9FB0C4`: "Everyone gets a secret group at the
> same moment. Then it disappears, and you find your pack by making the sound."
> Below, a small uppercase label "JOIN CODE" in 13px dimmed blue-grey with wide
> letter-spacing, then a tall empty input field with a 2px border `#2C4259`,
> slightly lighter navy fill `#132235`, 8px corner radius, centred monospace
> placeholder. Beneath it small muted helper text. Then a full-width pill button
> in signal yellow `#FFD100` with near-black bold label "Join the game". At the
> bottom, separated by a hairline rule, small muted text "Running the game?"
> with "Host a game" in yellow. Flat vector UI, no gradients, no shadows, no
> glass. Dark interface, high contrast, generous vertical spacing.

---

## 2. Join status — `/join/[code]`

> A mobile web app status screen, portrait phone viewport, deep navy `#0A1626`
> filling the frame, content centred vertically. At the centre-top, a short
> vertical dashed hairline in muted slate `#2C4259`, about 60px tall, like an
> empty flag halyard. Below it, centred, the headline "This game hasn't opened
> yet" in extra-bold system sans, near-white `#F4F6F8`, tight negative
> letter-spacing, balanced across two lines. Under it one line of muted
> blue-grey `#9FB0C4` text: "Hang on for the host, then scan again." Nothing
> else on screen. Enormous empty space above and below. Flat dark UI, no
> gradients, no shadows, no illustration. Quiet, patient, deliberately sparse.

---

## 3. Waiting — `/play/[sessionId]`

> A mobile web app waiting screen, portrait phone viewport, deep navy `#0A1626`.
> Centred vertically: a vertical dashed hairline in muted slate `#2C4259`, about
> 110px tall, representing an empty flag halyard with nothing flying. Below it
> the headline "You're in" in extra-bold system sans, near-white `#F4F6F8`,
> tight tracking. Beneath, one line in muted blue-grey `#9FB0C4`: "Waiting for
> the host to start…". At the very bottom of the screen, above a full-width
> hairline rule `#2C4259`, two small 13px uppercase labels with wide
> letter-spacing in muted blue-grey, one at each end: "NO FLAG YET" on the left,
> "KEEP THIS PAGE OPEN" on the right. Flat dark UI, no gradients, no shadows.
> Mostly empty, tense, waiting.

---

## 4. Countdown — `/play/[sessionId]`

> A mobile web app countdown screen, portrait phone viewport, deep navy
> `#0A1626` filling the frame. Dead centre, one enormous numeral "2" in signal
> yellow `#FFD100`, extra-bold system sans, extremely tight negative tracking,
> filling roughly half the screen height. Directly above it a short vertical
> dashed hairline in muted slate `#2C4259`. Absolutely nothing else on screen —
> no text, no labels, no chrome. Flat dark UI, no gradients, no glow, no
> shadows. A single struck number in the dark.

---

## 5. Reveal — `/play/[sessionId]` *(the hero)*

> A mobile web app reveal screen, portrait phone viewport, deep navy `#0A1626`.
> In the upper-middle, a flat geometric maritime signal flag spanning the full
> screen width edge to edge with no margins, at 3:2 proportion: a yellow field
> `#FFD100` with three evenly spaced vertical blue `#0047BB` stripes. Hard
> edges, perfectly flat colour, no shadow, no border, no texture, no fabric
> rendering — pure vector geometry. Below the flag, centred, a dog emoji
> followed by the word "Dog" in extra-bold system sans, near-white `#F4F6F8`,
> very large, tight negative tracking. Beneath it "Woof!" in signal yellow
> `#FFD100`, bold, half the size. At the very bottom, above a full-width
> hairline rule `#2C4259`, two small 13px uppercase wide-tracked labels in muted
> blue-grey `#9FB0C4`: "3 IN YOUR PACK" left, "HIDING IN 24S" right. Flat dark
> UI, no gradients, no glass. The flag is the brightest thing in the frame.

---

## 6. Hidden — `/play/[sessionId]`

> A mobile web app screen, portrait phone viewport, deep navy `#0A1626`. Centred
> vertically: a vertical dashed hairline in muted slate `#2C4259`, about 90px
> tall — an empty halyard where a flag used to be. Below it the headline "Make
> your sound!" in extra-bold system sans, signal yellow `#FFD100`, very large,
> tight negative tracking, balanced across two lines. Under it one line in
> near-white `#F4F6F8`: "Find everyone making it too." At the very bottom, above
> a full-width hairline rule, two small 13px uppercase wide-tracked labels in
> muted blue-grey: "3 IN YOUR PACK" left, "FLAG STRUCK" right. No flag anywhere
> in the frame — the absence is the point. Flat dark UI, no gradients, no
> shadows. Empty and deliberate.

---

## 7. Create a game — `/host/new`

> A web app form screen on a laptop, landscape, deep navy `#0A1626` background,
> content in a single centred column about 640px wide. Top-left: headline "New
> game" in extra-bold system sans, near-white `#F4F6F8`, tight tracking. Below
> it a muted blue-grey `#9FB0C4` line: "Set it up now; open the lobby when
> everyone's in the room." Then a small 13px uppercase wide-tracked label
> "GROUPS" and a muted sub-line. Below that, two side-by-side selectable cards
> with 8px radius and 2px borders: the left one selected with a signal yellow
> `#FFD100` border and slightly lighter navy fill `#132235`, containing a row of
> six animal emoji, the bold near-white title "Animals", and muted text
> "12 ready-made, each with a sound"; the right one unselected with a muted
> slate `#2C4259` border, showing "Aa", the title "My own", and "Type your own
> group names". A hairline rule across the column. Below it two fields side by
> side, each with a 13px uppercase wide-tracked label: "SHOW THE GROUP FOR" with
> a small number input reading "5" and the word "seconds"; "KEEP THIS GAME FOR"
> with a select reading "7 days". Muted helper text under each. At the bottom, a
> full-width pill button in signal yellow `#FFD100` with the near-black bold
> label "Create game". Flat dark UI, no gradients, no shadows, no glass.

---

## 8. Host dashboard, lobby open — `/host/[sessionId]`

> A web app dashboard projected on a screen, landscape, deep navy `#0A1626`
> background. Top-left: "Find Your Pack" in extra-bold system sans, near-white
> `#F4F6F8`, beside a small pill badge filled signal yellow `#FFD100` with
> near-black uppercase wide-tracked text "LOBBY OPEN". Below, a two-column
> layout. Left column: a panel with slightly lighter navy fill `#132235`, 8px
> radius and a hairline border, containing a large pure-white square QR code on
> a white block with generous quiet zone; beneath it the code "FKEC5R" in large
> monospace near-white with very wide letter-spacing; under that a 13px
> uppercase wide-tracked muted label "SCAN, OR ENTER THIS CODE". Right column,
> top-aligned: an enormous numeral "24" in signal yellow `#FFD100`, extra-bold,
> extremely tight tracking, several times the size of any other element on
> screen; directly beneath it a 13px uppercase wide-tracked muted label "PHONES
> JOINED". Below that, a full-width pill button in signal yellow with near-black
> bold label "Start the game", and under it one muted line "Everyone reveals at
> the same moment." At the bottom of the right column, a small 13px uppercase
> wide-tracked muted link "END GAME". Flat dark UI, no gradients, no shadows.
> Built to be read from ten metres away.

---

## 9. Host dashboard, game running — `/host/[sessionId]` *(optional)*

> Same dashboard as above, landscape, deep navy `#0A1626`, but the QR panel is
> replaced. Top-left: "Find Your Pack" beside a pill badge with a muted slate
> hairline border and green `#4ADE80` uppercase wide-tracked text "PLAYING".
> Left column: a 13px uppercase wide-tracked muted label "PACKS", and below it a
> grid of small horizontal cards with slightly lighter navy fill `#132235`, 8px
> radius and hairline borders. Each card holds, side by side: a small flat
> geometric maritime signal flag at 3:2 (one yellow with blue vertical stripes,
> one split yellow-and-blue vertically, one blue with a white rectangle at its
> centre), then an animal emoji with its name in bold near-white, and under the
> name a 13px uppercase wide-tracked muted line reading "3 PLAYERS". Right
> column: the enormous signal yellow numeral "24" with "PHONES JOINED" beneath,
> and at the bottom the small uppercase "END GAME" link. Flat dark UI, no
> gradients, no shadows.

---

## 10. Feedback sheet, after the game ends — `/play/[sessionId]` *(proposed, not in v1)*

Player-facing, in the Grab "rate your ride" position: it rises over the ended
screen the moment the host ends the game. No stars — an icon set is out, so
emoji faces and tappable reason chips carry the rating. An optional comment box
sits last, under the taps; it is capped and asks for no names, because hard rule
1 forbids this app to hold one.

> A mobile web app feedback sheet, portrait phone viewport, deep navy `#0A1626`.
> Behind the sheet, dimmed and partly visible at the top of the frame, the
> ended-game screen: a short vertical dashed hairline in muted slate `#2C4259`
> and the faded headline "That's a wrap". Covering the lower two-thirds, a panel
> in slightly lighter navy `#132235` with a 1px hairline top border `#2C4259`
> and 8px rounded top corners, flush to the left, right and bottom edges of the
> frame — flat, no shadow, no blur, no glass. Inside the panel, generous
> padding. At the top, a small 13px uppercase wide-tracked label in muted
> blue-grey `#9FB0C4`: "BEFORE YOU GO". Below it the headline "How was that?" in
> extra-bold system sans, near-white `#F4F6F8`, large, tight negative tracking.
> Beneath, a row of five equally sized tappable square chips with 8px radius,
> spanning the panel width with small gaps, each holding one large emoji face:
> confounded, slightly frowning, neutral, slightly smiling, star-struck. Four
> chips have a 2px muted slate `#2C4259` border and transparent fill; the
> fourth, the slightly smiling one, is selected — 2px signal yellow `#FFD100`
> border and a faint yellow-tinted fill. Under the row, a small 13px uppercase
> wide-tracked label in muted blue-grey: "WHAT WORKED?". Below it, two rows of
> pill-shaped chips with 2px muted slate borders and near-white labels, wrapping
> naturally: "Easy to join", "Found my pack", "Loved the flag", "Too fast",
> "Confusing". The "Easy to join" pill is selected, filled signal yellow
> `#FFD100` with a near-black `#0A0A0A` bold label. At the bottom of the panel, a
> full-width pill button in signal yellow `#FFD100`, 56px tall, with the
> near-black extra-bold label "Send feedback", and above that button a small
> 13px uppercase wide-tracked label "ADDITIONAL COMMENTS" with a three-row text
> area beneath it — a darker navy `#0A1626` fill, 2px muted slate `#2C4259`
> border, 8px radius, and the muted placeholder "Tell us more about your
> experience…" — followed by one line of muted helper text. Directly beneath the
> send button, centred, a
> small 13px uppercase wide-tracked muted blue-grey text link "NO THANKS". Flat
> dark UI, no gradients, no shadows, no glass, high contrast, generous spacing.
