# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Players: 18–25 year olds** at a church young-adults service, 60–150 of them in one
room, on their own phones over mobile data. University students and young working
adults — design-literate, fluent in Spotify / Instagram / Discord, and quick to
read anything childish as patronising. They will play along enthusiastically, but
they judge the thing they are being asked to play with.

**Host:** one leader running the service from a laptop, with the screen projected.
Not a technical user, standing in front of the room with no time to debug.

## Product Purpose

Secretly assign everyone in a room to a group, reveal every group at the same
moment, then hide it again so people have to find their group in real life by
making its sound. It exists to break the ice fast, with no install, no account,
and nothing to fill in.

Success is the ten seconds after the reveal: a room that goes loud, and strangers
finding each other.

## Positioning

The reveal is simultaneous and the group is then taken away. Both halves matter:
paper slips leak early and let people compare, and a quiz app would just show you
an answer and leave it on screen. Here the screen deliberately stops being useful,
which is what forces people to talk to each other.

## Operating Context

- A **dim hall with a bright stage or screen.** Lights down, the projected host
  screen is the focal point, and each phone is the brightest object in its
  owner's hands.
- Run live, once, in the middle of a service. No second take.
- Players arrive by scanning a QR code off the projected screen, or by typing a
  6-character code when they cannot scan from where they are sitting.
- Phones lock, tabs get backgrounded, and venue mobile data is unreliable.

## Capabilities and Constraints

- No personal data of any kind: no names, emails, accounts, or analytics. Players
  are a random device token; hosts are a random secret in a URL fragment. Only
  SHA-256 hashes are stored.
- Groups are created at Start and never before. A player's group is returned only
  inside their reveal window, enforced by the server.
- Everyone reveals at the same moment, timed on the server's clock.
- Built for small, older phones on slow mobile data: no web fonts, no large
  images, no heavy libraries.
- Free tier throughout; the whole thing must cost nothing to run.
- Themes are host-supplied group names. Animals are the default preset, but the
  groups can be anything the host types.

## Brand Commitments

- **The name is "Find Your Pack"** — confirmed, not a working title. "Pack" is
  usable as a real idea.
- Copy is short, friendly, and readable at a glance.
- Open source: other organisers can deploy their own copy.

## Evidence on Hand

- A working build: host create flow, lobby, QR, start, reveal, hide, and the
  full Postgres layer with 93 database assertions and 72 unit tests.
- The animal preset with sounds: cow, dog, cat, duck, sheep, chicken, pig,
  monkey, frog, snake, plus owl and lion as spares.
- No real event has been run yet. No photos, no testimonials, no usage numbers —
  none of these may be invented.

## Product Principles

1. **The moment is the product.** Everything before the reveal is waiting, and
   everything after it happens off-screen. The interface should get out of the
   way of both.
2. **The screen must stop being useful.** Hiding the group is a feature, not a
   limitation, and the design should make that removal feel deliberate.
3. **Never patronise the room.** An 18–25 audience will play along with something
   silly, but only if the thing itself is well made.
4. **It has to work on the worst phone in the room**, on venue data, first try.
5. **Nothing is kept.** Ending a game deletes it; the honest answer to "what do
   you store about me" is nothing.

## Accessibility & Inclusion

- Colour may never be the only carrier of group identity — the name and emoji
  carry it, so a colour-blind player is never disadvantaged.
- Must honour `prefers-reduced-motion`.
- Readable at arm's length in a dim room, and from the back row on the projected
  host screen.
