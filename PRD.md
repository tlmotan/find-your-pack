# PRD: Find Your Pack (working name)

**Owner:** Tim
**Status:** Draft v0.6
**Last updated:** 6 Oct 2026

---

## 1. What we're building
A free, open-source mobile web app that secretly assigns people to groups at a live event and reveals everyone's group at the same moment.

The first use case is **Find Your Pack**: each person gets an animal and makes its sound to find others with the same animal.

The app is built as a **general group-reveal tool**, so the groups can be animals, colours, characters, or anything the host types in.

It's built purely for fun, so it **collects no personal data**: no names, no accounts, no logins.

## 2. Problem
Icebreakers that split people into secret groups usually rely on paper slips.

| Problem | Why it hurts |
|---|---|
| Early reveal | People see their slip at the entrance or while a box is passed around, then compare before the game starts. |
| Showing instead of sounding | Players can flash their slip to find their pack instead of making the sound. |
| Unknown headcount | Attendance (60–120) isn't known until the day, so group count and size can't be planned. |
| Manual work | Cutting, placing, and cleaning up slips takes organizer time. |
| Unknown pack size | Players can't tell when their pack is complete, so they don't know when to stop looking. |

## 3. Who it's for
| User | Description | Needs |
|---|---|---|
| **Host** | The person running the icebreaker, e.g. the atmosphere team. | Set up fast with no login, control when the game starts, see who has joined live. |
| **Participant** | Youth attendees, ages vary. Mostly on their own phones. | Scan and play instantly: no install, no account, no details asked. A fun reveal. |
| **Other organizers** (future) | Other churches, clubs, and schools running icebreakers. | Self-serve and free, with custom groups. |

## 4. Goals and non-goals
**Goals (v1)**
1. Nobody can know their group before the host presses Start.
2. Players can't rely on showing their screen; the group is hidden after a short reveal.
3. Groups are balanced automatically from actual attendance.
4. Joining is instant: scan the QR code and land on the waiting screen.
5. Every player knows their pack size, so packs know when they're complete.
6. No personal data is collected or stored.
7. The app runs reliably with up to 150 participants at once.

**Non-goals (v1)**
- Host or player accounts and login.
- Collecting names, emails, or any personal details.
- Saved themes or session history across events.
- Native mobile apps.
- Other game types (quizzes, polls).
- In-app tracking of who found their pack or who was last.

## 5. Core user flow
1. **Host** creates a session: picks the animal theme or types custom group names, and sets the reveal timer (default 5 seconds). They also pick **how long the session lasts** (1–7 days, default 7), so the QR code can be prepared up to a week before the event. They get a QR code to display and a **private host link**, both valid until then.
2. On the day, the **host presses Open lobby**. Scanning before that shows "This game hasn't opened yet", so early scans aren't counted.
3. **Participants** scan the QR code and land **straight on the waiting screen**. Nothing to fill in.
4. **Host** sees the live player count and presses **Start**.
5. The app assigns balanced groups. Every phone shows a **3-2-1 countdown**, then reveals the player's group.
6. After the host-set reveal time, the group is **hidden**. The screen says "Make your sound!" and still shows the **pack size**.
7. Participants find their pack **in real life**. A pack is complete when it has that many members, and packs say so out loud. The host judges who was last.
8. **Host** ends the session, which deletes all its data. Otherwise, everything is deleted automatically when the session expires.

## 6. Functional requirements

### 6.1 Host
| ID | Requirement | Priority |
|---|---|---|
| H1 | Create a session with no login. Get a join QR code and a private host link, both valid until the session expires. A "Save your host link" screen with a copy button appears before the dashboard. | Must |
| H1a | Choose how long the session lasts before it expires: 1–7 days, default 7. Adjustable before Start. | Must |
| H1b | Press **Open lobby** on the day. Until then, scanning the QR code shows "This game hasn't opened yet" and nobody is added. | Must |
| H2 | Choose groups: the animal preset, or type a custom list of group names. | Must |
| H3 | Set the reveal timer before Start (default 5 s, range 2–30 s). | Must |
| H4 | See a live count of joined players in the lobby. | Must |
| H5 | Press Start to trigger assignment and reveal. Requires at least 2 players. | Must |
| H6 | Reopen the host dashboard from any device using the host link, until it expires. | Must |
| H7 | End the session, which closes joining and deletes its data immediately. Still the only way a game finishes, however many rounds it ran. | Must |
| H8 | See each group's size after Start, to help judge completion in real life. | Should |
| H9 | Override the number of groups before Start. | Should |
| H10 | Start another round once the current reveal has finished, as many times as wanted. Every player is put in a different group, and the host decides when to stop. Requires at least 2 active players, same as Start. | Must |

### 6.2 Participant
| ID | Requirement | Priority |
|---|---|---|
| P1 | Once the lobby is open, scan the QR code (or enter the join code) and land straight on the waiting screen. No install, account, or name. | Must |
| P2 | See a waiting screen until the host presses Start. | Must |
| P3 | See a 3-2-1 countdown, then their group with a fun animation, for the host-set reveal time. All phones reveal at the same moment. | Must |
| P4 | After the reveal time, the group is hidden. The screen shows "Make your sound!" and their pack size (e.g. "10 in your pack"). | Must |
| P5 | Pack size updates if a late joiner is added to their pack. | Must |
| P6 | After a refresh or dropped connection, rejoin the same session and group. Once the reveal time has passed, refreshing does **not** show the group again. | Must |
| P7 | A player whose phone was locked at Start still gets their full countdown and reveal when they unlock it. | Must |

### 6.3 Assignment logic
| ID | Requirement | Priority |
|---|---|---|
| A1 | Default to ~10 groups with flexible pack size (e.g. 60 people → ~6 per pack; 120 → ~12). Never more groups than names in the list. | Must |
| A2 | Assign randomly and keep group sizes within ±1 of each other. | Must |
| A3 | Assign anyone who joins after Start to the **smallest** group, and give them their own countdown and reveal. | Must |
| A4 | Group assignments are never sent to a phone before Start, or after its reveal window ends, so they can't be found by inspecting the page. | Must |
| A5 | Use distinct, easy sounds for the animal preset: cow, dog, cat, duck, sheep, chicken, pig, monkey, frog, snake; spares owl and lion. | Must |
| A6 | On a new round, never give a player the group they had in the round before. Absolute for the round's deal; best-effort for a phone that wakes up mid-round, where keeping sizes within ±1 (A2) wins. Not attempted with a single group, where it is impossible. | Must |

### 6.4 Post-game feedback
Added after v1 scope was set. It is an explicit, narrow exception to "no
tracking or analytics": it collects opinions a player chooses to give at the
end, never behaviour, and never anything that identifies them.

| ID | Requirement | Priority |
|---|---|---|
| F1 | After the host ends the game, a player who actually played is offered a one-screen rating: five faces, a few fixed reason chips, and an optional comment. Everyone else — expired session, mistyped code — is only told the game ended. | Should |
| F2 | Sending is optional and dismissible, and a failed send is never shown to the player. The game is over; there is nothing useful they could do about it. | Must |
| F3 | Responses hold no name, email, device token or session reference — only a rating, chips, the comment, the join code, and a timestamp. | Must |
| F4 | Responses outlive the session they came from, and are deleted after 30 days. | Must |
| F5 | Only the host reads them, in the Supabase dashboard. No part of the app can read a response back. | Must |

## 7. Non-functional requirements
| Area | Requirement |
|---|---|
| **Privacy** | No names, emails, or accounts. Each browser gets only a random anonymous ID. All session data is deleted when the host ends the session, or when the session expires (7 days at most). |
| **Scale** | Handle 150 participants joining and revealing at the same moment. Load test with tools like k6 before real use. |
| **Reveal timing** | All phones reveal at the same moment. The server sets the reveal time; phones count down to it on the server's clock. |
| **Real-time** | A real-time broadcast for the Start signal, with light polling as a fallback and for pack size and the host's lobby count. |
| **Venue network** | Must work when 100+ phones share one Wi-Fi IP address. No per-IP-limited sign-in step. |
| **Availability** | The app must be awake on event day even if unused for weeks (daily keep-alive). |
| **Devices** | Mobile-first; works on older and low-end Android and iOS browsers and on slow venue Wi-Fi. |
| **Cost** | Runs on free tiers. Check the concurrent connection limit of the chosen real-time service. |
| **Open source** | Public repo with a README and setup guide so other organizers can deploy their own copy. |

## 8. Edge cases
| Case | Expected behaviour |
|---|---|
| Phone refreshes or loses connection | Rejoins the same session and keeps the same group. The group is shown again only if still within its reveal window. |
| Player forgets their animal | No re-peek in v1; they listen for the sounds or ask the host. |
| Phone locked or asleep when Start is pressed | They get their countdown and reveal when they unlock. If asleep for a while before Start, they're assigned to the smallest pack on wake. |
| Someone joins, then leaves before Start | Not assigned a group, so they don't inflate a pack. Only phones active in the last minute are assigned at Start. |
| QR opened in an in-app browser (e.g. Instagram, WhatsApp), then again in Safari or Chrome | Counts as two players. If both stay open, one pack may show one extra member; the host uses judgment. Tip on the waiting screen: "Keep this page open." |
| Host wants to play too | They join from a different device (or browser) than the host dashboard. |
| Host presses Start with fewer than 2 players | Start is blocked with a message. |
| Someone joins after Start | Goes into the smallest group, gets their own countdown and reveal; their pack's size updates. |
| Very few players (e.g. under 10) | Fewer groups, so each pack has at least 3 people. |
| Custom list has few names (e.g. 4) | At most that many groups; packs get bigger. |
| Someone without a phone | The host hands them a paper backup slip; the app is not required for everyone. |
| Host's device dies | The host reopens the dashboard on another device with the host link. |
| Host loses the host link | It can't be recovered. They create a new session. |
| QR scanned before the lobby opens (e.g. QR shared ahead on slides) | Shows "This game hasn't opened yet." The person isn't added or counted. |
| QR or host link used after expiry | Shows "This game has ended." No data remains. |

## 9. Success metrics
- 95%+ of attendees with phones join successfully.
- Joining takes under 10 seconds per person.
- The countdown starts on all phones within ~1 second of Start.
- Zero cases of anyone knowing their group before Start.
- Zero personal data stored.
- The atmosphere team wants to reuse it for another icebreaker.

## 10. Decisions and open questions
**Decided**
- **"Found my pack" is confirmed in real life, not in the app.** Each phone shows the pack size; a pack is complete when it has that many members, and the pack announces it out loud.
- **"Last" is judged by the host in real life.** There is no in-app completion tracking in v1.
- **No logins and no names.** The host is identified by a private host link; players by an anonymous browser ID.
- **The host picks how long a session lasts** (1–7 days, default 7), so the QR code can be prepared up to a week ahead. The join QR code and host link stop working at expiry, and all data is deleted.
- **The lobby opens only when the host presses Open lobby**, so early scans before the event aren't counted as players.
- **The group is hidden after a host-adjustable reveal timer** (default 5 seconds), so players have to make the sound.
- **Tech stack:** Next.js on Vercel + Supabase. See `ARCHITECTURE.md`.

**Open**
1. **Branding:** keep "Find Your Pack" or use a general name for the group-reveal tool?

## 11. Future ideas (post-v1)
- Optional host login for saved themes and session history.
- "Hold to peek" for players who forget their animal.
- In-app "found my pack" confirmation, with a projector view showing packs completing live and the last pack flagged automatically.
- Custom group visuals and sounds.
- Multi-language support (e.g. BM, Mandarin).
