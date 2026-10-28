# Purrrfect Crime — Game Design

A turn-based stealth heist game. You play **Leo Tuxedo**, a young, sharply dressed newcomer cat burglar
who has just arrived in the city to make a name for himself. You sneak through grand museums, galleries and
mansions at night and steal what's on display. Then you fence the loot on the black market for **Catnip**
and spend it on Leo's skills and lair. Somewhere in the city, the legendary **NightClaw** is watching.

There is no combat. If you're caught, you restart the level.

**Status:** planning complete; building starts with milestone M0 (§14). Decisions are logged in §15, and
the original pitch is kept word for word in [ORIGINAL_BRIEF.md](ORIGINAL_BRIEF.md).

**Platforms:** web (playable in a browser, for playtests) and Steam (Windows, macOS, Linux).
**Length:** 15–20 hours for the story, NightClaw Challenge included.

---

## 1. Pillars

1. **Think, then move.** Every turn is a small puzzle: guard routes, camera sweeps, shadows, vents. You win
   by reading the level, not by reflexes.
2. **Grand nighttime spaces.** Every level is a showpiece: marble halls, moonlit skylights, glass display
   cases, gilded frames. You should want to steal everything you see.
3. **A greedy risk curve.** The safe route grabs a little. The best loot sits behind the best security.
   How much you take is up to you.
4. **A cartoon caper with style.** Animated cats, bulldog-faced guards, rival thieves with personality, and a
   newspaper headline after every job.

## 2. Core loop

```
 Lair (plan) ──► Heist (sneak, steal, escape) ──► Newspaper (what the haul was worth)
   ▲                                                    │
   │                                                    ▼
 Spend Catnip: skills, stats, lair ◄── Black Market (sell loot) ◄── XP / level-ups
```

1. **Plan** at the lair. Choose a heist from the city map and read the intel your lair upgrades have
   revealed, including whether a rival is after the same centrepiece (§5.2).
2. **Heist.** Get in, steal as much as you dare, and reach an exit.
3. **Newspaper.** Leo leaves his calling card, and the next morning's paper spins in from the centre of the
   screen.
4. **Sell** the loot on the black market. Better prices come with your level.
5. **Spend** Catnip on attributes, skills and the lair, then pick the next job.

## 3. Camera, grid and turns

### 3.1 Presentation

- **2D isometric** tiles. Hand-painted art, with walls drawn as separate pieces so they can be cut away.
- **Rotating camera** in 90° steps (Q/E or on-screen buttons) with a quick animated turn. All four views
  are drawn from the same tile data. Walls between the camera and Leo turn see-through or cut down to
  stubs, as in XCOM.
- **Floors:** levels can have several storeys plus a separate **vent layer**. You switch the visible floor
  with Page Up/Down or on-screen buttons. The vent layer draws as a blueprint-style overlay on top of the
  dimmed floor.
- **Night lighting:** dark-blue ambient light, warm pools from lamps, cool moonbeams through skylights,
  sweeping torch and camera cones. Light isn't only decoration: it feeds straight into detection (§4).

### 3.2 Turns and actions (XCOM-style)

- Leo gets **2 Action Points (AP)** per turn.
  - **Move:** spend 1 AP to walk up to *Move* tiles (blue zone), or 2 AP to dash up to double that (yellow
    zone). Dashing is noisy.
  - **Interact** (1 AP): pick a lock, open a case, disable a device, climb into or out of a vent, hide in a
    container, pick up loot.
  - Some skills are **free actions** or cost a set amount of AP (§7).
- When you hover a tile, the game shows the path, the AP it costs, how lit and how noisy the destination
  is, and which guards or cameras could see it. **No hidden information about what you can already see.**
- **Enemy turn:** guards, cameras and timed traps act in a fixed, readable order, animated quickly with an
  option to skip.
- **Overwatch-style stealth:** guard sight is checked *during* their move as well as at the end, so a
  guard who walks past an open doorway sees through it.
- **No undo.** A move is final, so the path preview above is the safety net.

## 4. Stealth and detection

### 4.1 What gives Leo away

| Factor | Effect |
| --- | --- |
| **Sight** | Guards have a vision cone: 90°, 6 tiles; shorter in darkness, longer under bright light. Cameras have a fixed or sweeping cone. |
| **Light** | Each tile is **Dark / Dim / Lit**. In a Dark tile Leo is invisible beyond 2 tiles; Dim halves sight range; Lit means full range. |
| **Noise** | Each action makes noise in a radius: walk 1, dash 3, failed lock pick 2, broken glass 5. Guards inside the radius turn and investigate. Floor type adds to it (marble louder, carpet quieter). |
| **Disturbances** | Guards notice an empty plinth, an open case or a disabled camera on their route and raise suspicion. |

### 4.2 Guard alert states

`Patrol → Suspicious (?) → Searching (!) → Caught`

- **Patrol:** walks a set route. Routes are visible if the lair's Intel is high enough, or once you've
  watched them for a turn.
- **Suspicious:** walks to the last noise or sighting and looks around for 2 turns, then goes back to the
  route.
- **Searching:** moves faster and checks nearby hiding spots. Other guards nearby join in. Cameras raise
  their sensitivity.
- **Caught:** a guard ends a move next to Leo while he's seen, or a full alarm runs out its countdown.
  Then the level restarts (§4.4).
- **Being seen** isn't instant failure. A sighting fills a **detection meter** over the guard's head:
  partial in Dim light, faster in Lit. If the meter fills, Leo is caught; if Leo breaks line of sight
  first, the guard drops to Searching.

### 4.3 Guards

The security staff are **Guards**. That's what the game calls them everywhere: the HUD, help, messages
and the newspaper. They're drawn as bulldogs, and they come in several types, each with a clear
silhouette and behaviour:

| Type | Behaviour |
| --- | --- |
| **Night Watch Guard** | Standard patrol, torch cone. |
| **Sleepy Guard** | Stationary and dozing; wakes to noise. Snores, so you can hear him in the dark. |
| **Sniffer Guard** | Short sight, but smells Leo through walls within 2 tiles (scent trail). Vents block scent. |
| **Captain Guard** | Longer sight, and calls the other guards when Searching. |
| **Robo-Guard** (late game) | Doesn't sleep or get distracted; scans for heat. Can be powered down at a fuse box. As built (Downtown): sees Leo 4 tiles off in a cone in any light (Stealth still helps, Blend doesn't); deaf to noise; ignores decoys, paw prints and empty cases; doesn't answer a captain's whistle. Seen within 2 tiles is a catch, further off the alarm. Off while the lasers are off (fuse box, Fuse Kit, EMP Collar). |

Distractions work on guards: a thrown bottle cap, a squeaky toy, a fake treat. Each guard type reacts
differently.

### 4.4 Getting caught

- Caught means **restart the level**. There's a short comic "busted" sting first (the guard grins, Leo
  sighs).
- **No checkpoints.** Being caught always restarts from the entrance, and anything stolen on the failed
  attempt is lost. What carries over is your *knowledge* of the level.

## 5. Security measures

| Measure | Counter |
| --- | --- |
| **Security camera** (fixed / sweeping / motion-triggered) | Stay outside the cone, shut it off at the control room, put a loop on its feed (skill), or time your moves to its sweep. |
| **Laser grid** (static / pulsing / moving) | Time your moves, jump through a gap (skill), or cut it at a fuse box. |
| **Pressure plates** | Raised metal squares: stepping on one sets off the alarm. Walk around them or Pounce over them. |
| **Motion sensors** | A zone (red grid) where moving two or more tiles in one move sets off the alarm, so cross it a tile at a time. The fuse box turns them off. |
| **Locked doors / display cases / safes** | Lockpicking with a tiered difficulty, keycards found on the map, glass cutter (skill), safe-cracking minigame. As built: card-reader doors can't be picked; the level's keycard lies on the floor somewhere (walk over it), or Keycard Clone opens them without it. |
| **Glass walls** | Block Leo, and sound, but not sight: guards see straight through, and nobody outside hears a noise made inside. |
| **Rooftop gaps and water** | Nobody walks them, everyone sees across them. Wires over them are for Leo with Tightrope; Pounce leaps a one-tile gap. |
| **Alarm panels** | Once an alarm trips, a countdown runs until the level locks down. Disarm the panel or escape before it ends. |
| **Spotlights and searchlights** | Moving light sources that sweep areas on a timer. |
| **Guard dogs' kennels / bells / squeaky floorboards** | Noise traps. As built: a dog barks (noise 5) at Leo within 2 tiles of its kennel, once a move, and guards come to look. |
| **Hiding crates** (Harbour) | Climb into an open crate: nobody sees or smells Leo there, and guards walk round it. A noise from inside still brings them to look. |
| **Lighthouse beam** (Harbour) | A narrow wedge of bright light, 11 tiles long, turning an eighth of the way round each turn. |
| **The tide** (Harbour) | Tidal sand is dry for a few turns, then under water for as many. Caught on it when the tide comes in, Leo is washed onto the nearest dry tile with a splash (noise 4). |
| **The fish market** (Harbour) | So smelly that sniffers can't smell a cat on it. |
| **Light switches** (Harbour) | Put a room's lamps out (silent, 1 action point). The nearest guard on his rounds heads for the switch, and any guard who passes it puts the lights back on. |
| **Slot machines** (Downtown) | So loud that no guard hears what Leo does among them. A thrown bottle cap still carries. |
| **Conveyor belts** (Downtown) | Carry Leo one tile along at the end of every turn he ends on one, if the way is clear. |
| **Wet paint** (Downtown) | Leo leaves paw prints for his next four steps; a guard who sees one goes to follow it. They dry in four turns. |
| **Time lock** (Downtown) | A vault's dials won't turn before a set turn, combination or not. |
| **Vault doors** (late game) | Several steps: a code found somewhere in the level plus timed dials. As built: search the desk with the combination (1 action point), then two silent turns of the dials. |

### 5.1 Air ducts

- Each level has a **vent network** on its own layer, with grates in rooms and corridors.
- In a vent Leo **can't be seen by guards or cameras**, but movement costs more (crawling) and vents can
  be noisy (metal). Some vents have fans to stop at a switch, lasers, or dead ends.
- Vents are the main **alternate routes**. Every objective should have at least one route through the
  vents and one on the floor.

### 5.2 Rival thieves (only when they want the same prize)

Rivals are **not** on every level. A rival turns up only when they are **planning to steal the same
centrepiece as Leo** that night. They don't fight Leo; it's a race for the prize.

**When a rival appears**

- When a heist becomes available, the game rolls once to decide whether a rival is after its
  centrepiece. The chance starts at 0% for the first three heists after the tutorial, then about 20%,
  rising to about 35% in the later districts. One rival at most per heist, never the same one twice in a
  row.
- The result is fixed until that heist is played, so reloading doesn't reroll it.
- **Warnings at the lair:** the Rumour Board (part of the Planning Table) shows a rival's calling card
  pinned to the heist, *"Word is Luna Luck has her eye on the Star of Siam."* Planning Table tier 2 also
  shows which entrance the rival will use and when they arrive (for example, turn 6).
- Rivals never appear in the tutorial, the challenge museum or NightClaw's Lair.

**How the race works**

- The rival enters on a set turn and follows their own route toward the centrepiece, taking turns after
  the guards. The rival's path and their progress toward the prize are shown on screen.
- Rivals are subject to the guards too: a guard who spots a rival raises the alert, which can work for
  or against Leo.
- **If Leo takes the centrepiece first**, the rival flees with a parting line, and the newspaper reports
  that Leo beat them to it.
- **If the rival takes it first**, it's gone for that attempt. Leo can still steal the rest and leave. The
  newspaper credits the rival with the centrepiece. The level is marked *"centrepiece lost to a rival"*,
  the rival won't come back for it, and Leo can replay the level to steal it himself.
- Losing to a rival **never blocks the NightClaw Challenge**: the challenge only asks that Leo has stolen
  each centrepiece at some point.

| Rival | How they race |
| --- | --- |
| **Mischief Mittens** | Chaotic. Sets off an alarm somewhere on purpose to pull guards away from her own route, which can help *or* ruin Leo. |
| **Luna Luck** | Fast and lucky. Takes the most direct route and dodges guards a little too easily. The hardest to beat to the prize. |
| **Sammy Swipes** | Pickpocket. Slower, but steals any keycard or tool Leo leaves lying on the way, sometimes the one Leo needed. |
| **Professor Paws** | Planner. Disables security along his route (handy if Leo follows him), but locks doors behind himself. |

Each rival has a short comic exchange the first time Leo meets them, a rivalry record (races won and
lost), and achievements for beating each one.

**As built (M4):** the chance is 0% for the first three heists after the tutorial, then 20% + 5% per
district (capped at 35%), worked out from the save so it can't be rerolled. A rival arrives between turns
3 and 7 through one of the level's rival entrances, moves after the guards, and their next steps show as
purple footprints. Mittens sets off an alarm away from her route once she's in (an alarm Leo didn't cause
doesn't spoil a flawless heist); Luna is never spotted by guards; Sammy swipes loot (and a keycard lying about) from any case he
passes; Paws blinds the cameras he passes and relocks doors behind him. Beating a rival is worth +75 XP
and a headline; the Leo tab keeps the rivalry record.

## 6. Loot, the black market and Catnip

- **Loot** ranges from small items on shelves (coins, figurines) to cased artefacts, paintings and the
  level's **centrepiece**, its most valuable and best-protected item. Each level has **6–12 stealable
  pieces**.
- Loot takes up **inventory space**: small pieces take 1 space, bigger ones 2 or 3. Leo starts with
  **6 inventory spaces**, which limits how much he can take at once. Some levels have **stash
  points** (a window ledge, an accomplice's drop chute) for a second run.
- **Selling:** after a heist the loot goes to the stash in Leo's lair. At the black market:
  - Each item has a **base value**, the newspaper's estimate in dollars. The fence pays one Catnip per $10
    of it, minus his cut: `base ÷ 10 × (0.55 + 0.02 × level, capped at 0.95) × market demand`.
  - **Demand** rotates per category (paintings, jewels, artefacts, curiosities): "This week's buyers want
    jewels, +25%".
  - Higher levels unlock **better fences** and special buyers (a collector who pays ×1.5 for one listed
    item).
  - You can **hold** items for a better market, or sell straight away.
- **Catnip** is the only currency. It's spent on attributes, skills and the lair.
- **Replays:** any finished level can be replayed. Its loot is back on display, but sells for **50% of
  its value** after the first clear (the fences say it's "hot"). The centrepiece does count toward the
  NightClaw Challenge on a replay. This lets players earn Catnip by replaying without making the economy
  trivial.

## 7. Progression

### 7.1 Experience and levels

- XP for a successful heist: base by heist + bonuses for stealth (never seen, no alarms), loot value, the
  centrepiece, speed (turn count) and beating a rival to the prize.
- **Level cap 30.** Each level gives +1 attribute point and improves black-market prices. Some skills and
  levels need a minimum player level.

### 7.2 Attributes (bought with attribute points and Catnip)

Each rank costs one attribute point (Leo gets one per level) and `150 × (rank + 1)` Catnip, less the
Scratching Tower's discount.

| Attribute | Ranks | Effect |
| --- | --- | --- |
| **Agility** | 5 | +1 tile per AP at ranks 1, 3 and 5; cheaper vent crawling at ranks 2 and 4. |
| **Stealth** | 5 | Guards and cameras make Leo out from 7% less far per rank. |
| **Quiet Paws** | 5 | Every noise Leo makes is 12% smaller per rank. |
| **Dexterity** | 3 | Cases open in one go; doors in one go; picking makes no sound. |
| **Pockets** | 4 | +1 inventory space per rank. |
| **Perception** | 2 | Guard footprints show one more turn ahead per rank. |

### 7.3 Skills (Catnip + level requirement)

Three trees of five skills, each needing the one before it in its tree (in Acrobat, everything needs
Pounce). Once-a-heist skills get a second charge from the Workshop's third tier.

- **Shadow:** *Blend* (Dim counts as Dark), *Ghost Step* (one move per level makes no noise),
  *Decoy Card* (drop a calling card that distracts), *Smoke Pellet* (lvl 12: blocks sight for 2 turns),
  *Vanish* (lvl 20: break detection once per heist).
- **Tech:** *Camera Loop* (loop a camera for 3 turns), *Laser Mirror*, *Keycard Clone*, *Fuse Kit*,
  *EMP Collar* (lvl 18: disables every device in a radius for 1 turn).
- **Acrobat:** *Pounce* (jump 2 tiles), *Ceiling Climb* (crawl along rafters as a second route),
  *Tightrope* (cross gaps), *Cat Nap* (lvl 15: wait out a guard's whole route while hidden), *Second Wind*
  (lvl 22: one extra action point once per heist).

As built in M3:

| Skill | Level | Catnip | In the game |
| --- | --- | --- | --- |
| Blend | 2 | 300 | Dim light counts as dark when guards look for Leo. |
| Ghost Step | 4 | 500 | The first noisy move of a heist is silent. |
| Decoy Card | 7 | 900 | Once a heist: a card up to 5 tiles away; the first guard to see it goes to look. |
| Smoke Pellet | 12 | 1,600 | Once a heist: a 3×3 cloud that blocks sight for two turns. |
| Vanish | 20 | 3,000 | The first time a guard glimpses Leo, it doesn't count. |
| Camera Loop | 3 | 400 | Once a heist: a camera within 7 tiles sees nothing for three turns. |
| Laser Mirror | 5 | 600 | The first laser Leo breaks is ignored. |
| Keycard Clone | 8 | 1,000 | Doors open in one go, and card-reader doors open without the keycard. |
| Fuse Kit | 11 | 1,400 | Once a heist: all lasers off for three turns, from anywhere. |
| EMP Collar | 18 | 2,800 | Once a heist: cameras within 5 tiles and all lasers off for two turns. |
| Pounce | 3 | 400 | 1 AP, unlimited: leap two tiles over a laser, case or lamp. Landing on a live laser trips it. |
| Ceiling Climb | 6 | 800 | Locked until the levels with rafters (M4). |
| Tightrope | 9 | 1,100 | Walk the wires over rooftop gaps and water, where no guard can follow. |
| Cat Nap | 15 | 2,200 | Once a heist: guards can't notice Leo for two of their turns (unless they walk into him). |
| Second Wind | 22 | 4,000 | Once a heist, with 1 action point or fewer left: free, +1 action point this turn. (It replaced Nine Lives when the game went to one mode, where a catch is always a catch.) |

## 8. The lair

- After the tutorial, Leo buys an **abandoned building** for his lair. It starts run-down, and each upgrade
  visibly improves it (windows, lights, furniture, a neon sign).
- **Buying the first lair unlocks the black market**, which runs out of the lair's back room.
- Upgrade rooms (each with 3 tiers):

Costs per tier: Planning Table 400 / 1,200 / 2,500; Workshop 300 / 900 / 2,000 (1, 2, 3 bottle caps per
heist; tier 3 also gives a spare charge of each once-a-heist skill); Fence's Office 500 / 1,500 / 3,000
(+5% / +10% / +15%, and from tier 2 a collector pays ×1.5 for one stash item a day); Scratching Tower
400 / 1,200 / 2,400 (attributes 15% / 30% / 45% cheaper); Trophy Room 600 / 1,500 / 3,000 (+5% / +10% /
+15% XP as fame); Mailbox 200 (one tier). The lair's picture fixes itself up as rooms are built.

| Room | Effect |
| --- | --- |
| **Planning Table** (Intel) | Before a heist, see more: tier 1 shows the floor plan, exits and the Rumour Board (which rival, if any, is after the centrepiece); tier 2 camera positions and cones, plus the rival's entrance and arrival turn; tier 3 guard routes and trap locations. |
| **Workshop** | Gadget charges per heist (bottle caps, smoke pellets). |
| **Fence's Office** | Better black-market prices; a second buyer. |
| **Gym / Scratching Tower** | Cheaper attribute upgrades. |
| **Trophy Room** | Displays every centrepiece you've stolen (a collection to fill in); small bonus to fame. |
| **Mailbox** | Where NightClaw's letters arrive (purely story). |

## 9. Story

### 9.1 Opening

1. **Tutorial heist** (Level 0: *The Corner Gallery*). A narrator voice walks through movement, AP,
   light and shadow, noise, a single camera, one vent, one locked case and stealing an item, in short,
   skippable steps (§10).
2. After the heist, the **narrator buys the tutorial loot** himself to give Leo his first Catnip. He says
   Leo needs a headquarters, and the **city map** opens with an abandoned building flashing.
3. The player **clicks the building to buy it** for exactly the starting Catnip. It's run-down; upgrades
   cost more.
4. Buying the lair unlocks the black market, skills, attributes and the heist list. From here the game is
   free-form.

### 9.2 NightClaw's letters

Two triggers, handled **in whichever order they happen**:

- **Trigger A:** 10 successful heists completed.
- **Trigger B:** 10,000 Catnip of items sold on the black market (lifetime total).

| Order | Letter |
| --- | --- |
| **First trigger reached** | **Letter 1, "A fan":** "I've been watching your work, and I'm becoming a fan of it." Signed **— NC**. |
| **Second trigger reached** | **Letter 2, "A challenge":** NC challenges Leo to steal a named item from a highly secure museum, and that heist unlocks. |

So if Leo hits 10,000 Catnip sold before his 10th heist, the 10,000-Catnip moment brings Letter 1 and the
10th heist brings Letter 2. Letter 2 always waits for the second trigger, whichever it is.

Then the story runs in order:

1. **Letter 3, hidden inside the challenge item:** NC reveals that he *is* the legendary NightClaw and
   has been searching a long time for his equal. He sets **the NightClaw Challenge**:
   - Finish **every level** (25 at launch).
   - Steal each level's **centrepiece**.
   - Every centrepiece has to be stolen in a **flawless** heist: never detected and no alarms. A centrepiece stolen in a messy heist still counts for
     the level, but that level has to be replayed flawlessly to tick it off the challenge.
2. When the challenge is done, **Letter 4** arrives at the lair: an invitation to NightClaw's secret lair for a final
   test, to steal his *prized possession*. The letter doesn't say what it is.
3. **NightClaw's Lair** appears on the city map as a new location. It's the hardest level in the game,
   with a mix of every security system seen so far, plus a NightClaw who stalks the level himself.
4. **Ending:** steal the prized possession (**the collar NightClaw wore as a pet**, revealed only when
   picked up) *and* sneak up on NightClaw undetected. NightClaw names Leo **Legendary** and retires in
   peace, now that the city has a new best thief.
5. **After the credits:** free play continues. A newspaper headline: "NIGHTCLAW'S SUCCESSOR?"

**As built (M4):** Letters 1 and 2 arrive at the lair the next time Leo walks in after a trigger (in the
mailbox, or pinned to the door if there isn't one), and wait there until they're read; both can be
reread from the Lair tab. Letter 2 opens **NightClaw's Challenge** on the heist list with *The Midnight
Museum*; its centrepiece is the *Midnight Music Box*, and Letter 3 is folded inside it. After Letter 3,
the heist list shows the challenge's progress: centrepieces taken in a flawless heist, out of every
level after the tutorial.

**As built (M5):** the challenge counts all 25 levels, the tutorial included. When every one has its
centrepiece taken in a flawless heist, **Letter 4** arrives and **NightClaw's Lair** (the old bell tower on
Moon Street) opens on the heist list. There NightClaw stalks the belfry hall himself: he moves five tiles a
turn, sees the dark as dim and dim as lit, and one sighting is a catch. His prized possession is shown as
just that until Leo picks it up. The heist ends when Leo, holding it, taps NightClaw on the shoulder while
he's unaware (on his rounds, not suspicious); getting out by the door instead books the loot but leaves
him waiting. The first tap plays the ending: NightClaw's farewell, the Legendary title, the credits and
the "NIGHTCLAW'S SUCCESSOR?" front page. Then free play: every heist stays open, the save and the lair
are marked Legendary, and the collar sits in the Trophy Room (it can't be sold).

### 9.3 Calling card and newspaper

- At the end of every successful heist, Leo **automatically leaves his calling card** at the scene, a
  short animated beat at the exit, so the paper credits him.
- Then a **newspaper spirals in** from the centre of the screen (the classic spinning-paper shot):
  - A headline written for the heist and how it went ("TUXEDO CAT STRIKES AGAIN, MUSEUM LEFT WITHOUT ITS
    EMERALD").
  - **Photos of the empty displays** for each stolen item, with captions.
  - An **estimated value** for each item and for the whole haul. This is where the player sees what the
    haul was worth before selling.
  - Side stories: rival thieves' antics, police quotes, NightClaw rumours, ads.
- An archive of past front pages is kept at the lair.

## 10. Tutorial (Level 0)

Short, clear prompts that each wait for the player to do the thing:

1. **Move:** click a blue tile. "Each turn you have 2 action points."
2. **Dash:** yellow tiles; it's noisy.
3. **Camera:** rotate the view with Q/E. Walls cut away.
4. **Light:** hide in a shadow while a guard walks by. Explains the Dark / Dim / Lit icon.
5. **Noise:** a squeaky floorboard turns a guard to Suspicious. Wait until he gives up.
6. **Cameras:** time a move between sweeps.
7. **Vents:** climb in, crawl past a laser hallway, climb out.
8. **Lockpicking:** open a display case (spends 1 AP).
9. **Loot and inventory space:** pick two small items and the tutorial centrepiece.
10. **Escape:** reach the exit, the calling card is left, and the first newspaper appears.

Each step can be repeated, and a "Tutorial hints" setting stays on for the first few heists.

## 11. Levels

- **25 levels at launch** in five districts of 5, plus the NightClaw challenge museum and NightClaw's Lair.
- Every level is **at night** and **grand**: high ceilings, chandeliers, display halls, gardens, roofs.
- Each level has **6–12 pieces of loot**, a **centrepiece**, **2+ entry points**, **2+ exits**, a **vent
  network** and at least one **optional room** with a secret (a safe, a hidden gallery).
- **There is one mode, and it's the hardest one** (what was planned as *Legendary*): every level is
  designed with its full security, there are no checkpoints and no undo, and the NightClaw Challenge asks
  for every centrepiece to be stolen flawlessly. Loot and XP aren't multiplied. Every level is designed
  and tested for this mode only.

| District | Levels (working names) |
| --- | --- |
| **Old Town** | Corner Gallery (tutorial), Cobblestone Coin Museum, The Clocktower Archive, Pawnbroker Penthouse, Opera House Costume Vault |
| **Museum Mile** | Natural History (dinosaur hall), Egyptian Wing, Modern Art Atrium, Gem & Mineral Hall, The Planetarium |
| **The Heights** | Millionaire's Mansion, Sky Garden Hotel, Glass Tower Auction, The Yacht Club, The Observatory Estate |
| **Harbour** | Customs Warehouse, The Lighthouse Collection, Shipwreck Museum, Fish Market Bank (cat joke), The Aquarium Gala |
| **Downtown** | The Grand Bank, Casino Royale-Paws, The Mint, The Museum of Modern Mischief, City Hall Treasury |
| **Special** | NightClaw's challenge museum (*The Midnight Museum*), NightClaw's Lair |

**Built (M4, complete): all five districts and the challenge museum:**

| # | Level | What it introduces |
| --- | --- | --- |
| 0 | The Corner Gallery | The tutorial (§10). |
| 1 | The Cobblestone Coin Museum | A sleepy guard at the ticket desk, creaky floorboards, a safe. |
| 2 | The Clocktower Archive | A captain who whistles for help; rafters and ladders for Ceiling Climb. |
| 3 | The Pawnbroker Penthouse | A sniffer who smells through walls; pulsing lasers. |
| 4 | The Opera House Costume Vault | Spotlights that move every turn; theatre seats guards see over. |
| 5 | The Natural History Museum | Museum Mile's dim halls (only the marked shadows are dark); pressure plates. |
| 6 | The Egyptian Wing | Motion sensors in the tomb corridor, turned off at the fuse box. |
| 7 | The Modern Art Atrium | A marble atrium where every step is heard, under a circling spotlight. |
| 8 | The Gem & Mineral Hall | A vault with lasers and motion sensors, both on one fuse box beside a sleeping guard. |
| 9 | The Planetarium | A dim dome with two spotlights sweeping opposite ways and five guards. |
| 10 | The Millionaire's Mansion | A card-reader door; the keycard lies in the library beside a dozing butler. |
| 11 | The Sky Garden Hotel | Rooftops: gaps everyone sees across, wires for Tightrope, a searchlight. |
| 12 | The Glass Tower Auction | Glass walls: seen through, not heard through. A glass vitrine in the middle of the floor. |
| 13 | The Yacht Club | Guard dogs in kennels; water between the piers and yachts. |
| 14 | The Observatory Estate | A vault door, with the combination in the study desk next door. |
| 15 | The Customs Warehouse | Open crates to hide in, among aisles of stacked crates. |
| 16 | The Lighthouse Collection | The lighthouse beam sweeping a moonlit headland. |
| 17 | The Shipwreck Museum | The tide, round a wreck on a sandbank in a sea cave. |
| 18 | The Fish Market Bank | Sniffers everywhere, except on the fish market floor; a vault. |
| 19 | The Aquarium Gala | Light switches, a great glass tank, and a camera that's blind in the dark. |
| 20 | The Grand Bank | Robo-Guards, and the fuse box that powers them down. |
| 21 | Casino Royale-Paws | A bright, loud slot-machine floor where nobody hears Leo. |
| 22 | The Mint | Wide conveyor belts across the production floor. |
| 23 | The Museum of Modern Mischief | Wet paint and paw prints; the Whoopee Cushion Floor. |
| 24 | City Hall Treasury | A time-locked vault, with everything Downtown has besides. |
| NC | The Midnight Museum | NightClaw's challenge (opened by Letter 2): every mechanic so far, in one building. |
| NC | NightClaw's Lair | The finale (opened by Letter 4): NightClaw himself, and a tap on the shoulder to end it. |

Guards standing still at a post still notice empty displays, decoy cards and paw prints. Guards who hear a noise from something they can't stand on (a kennel, a case, a crate) go to the open
tile beside it nearest them. Each level opens when the one before it is cleared. Guard types as built: **sleepy** guards see
nothing while dozing, wake to noise, look around and go back to their chair; **captains** see 25%
further and call guards within 7 tiles when suspicious; **sniffers** see 60% as far but smell Leo
within 2 tiles through walls (not in vents or rafters), and a second sniff is a catch. Creaky
floorboards make a noise of 4; safes take three silent goes (two with Dexterity); dropping from the
rafters makes a noise of 3, climbing down a ladder none.

**Every level must be beatable flawlessly (never seen, no alarm)**, because the NightClaw Challenge asks
for exactly that. A solver (`npm run solve`) searches
for such a route while a level is designed; the routes are saved and replayed by the tests.

A level-design checklist for each map: readable sight lines, at least three valid routes to the
centrepiece (floor, vents, high road), a "tempting greedy detour", a lit hall that has to be crossed or
avoided, and an escape that changes once an alarm trips.

## 12. Art and audio direction

- **Art:** expressive 2D cartoon (a mix of Disney-era noir and *Sly Cooper*). Leo has a crisp tux, bow tie
  and swagger; a 4-direction rig to match the four camera angles. The guards are chunky bulldogs, sleepy and
  menacing in turn.
  - Nighttime palette: indigo shadows, moonlight cyan, warm gold lamplight, ruby and emerald gem glints.
  - Displays get small shine animations; stolen items leave an obvious empty plinth.
- **UI:** an Art Deco heist-poster look, with a "case file" for planning.

### 12.1 Generated sprites: what to produce

Sprites will be generated. To make them fit together in game, every sprite should follow these rules:

- **Projection:** 2:1 isometric (the standard pixel-art "isometric" angle). Floor tiles are diamonds
  **128 × 64 px**; a full-height wall piece is 128 × 192 px. Characters stand about 96 px tall, on a
  canvas of **128 × 128 px** with the feet at the bottom centre.
- **Format:** PNG with a transparent background, no drop shadows baked in (the game draws its own), lit
  from the top left with a neutral night tone. The game adds the moonlight and lamplight on top.
- **Four views:** because the camera rotates, characters need **4 facing directions** (north-east,
  south-east, south-west, north-west). Walls and large props need **2 versions** (left-facing and
  right-facing); symmetrical props need 1.
- **Consistent style:** use one shared style prompt for everything (for example *"2D cartoon, clean
  ink outlines, flat cel shading, film-noir night palette, Sly Cooper meets 1960s Disney"*) plus a
  reference sheet of Leo, so the cats stay on model.

| Group | Sprites | Animations (frames, at 12 fps) |
| --- | --- | --- |
| **Leo Tuxedo** | 4 directions | idle 6, walk 8, sneak 8, dash 6, crawl (vent) 8, pick lock 6, grab loot 6, hide 4, leave calling card 10, caught 8, victory pose 10 |
| **Guards** (5 types, drawn as bulldogs) | 4 directions each | idle 6, walk 8, look around 8, suspicious "?" 4, alert "!" 4, run 6, sleep (Sleepy) 6, sniff (Sniffer) 6, catch 8 |
| **Rivals** (4) | 4 directions each | idle 6, walk 8, sneak 8, grab 6, flee 6, taunt 8 |
| **NightClaw** | 4 directions | idle 6, stalk 8, turn 4, reveal pose 10, retire 10 |
| **Narrator** | portrait | 3 expressions for the tutorial and the opening |
| **Tiles** | per district | 6–8 floor types (marble, parquet, carpet, tile, stone, metal grate), wall sets with doors, windows, archways and vent grates |
| **Props** | ~150 | display cases (open, closed, empty), plinths, paintings in frames, chandeliers, statues, desks, crates, plants |
| **Loot** | ~120 | an icon (64 × 64) plus an in-world sprite for every item, and a newspaper photo of each empty display |
| **Security devices** | 4 directions where they turn | cameras, laser emitters, pressure plates, alarm panels, fuse boxes, vault doors |
| **Screens** | painted | the city map (day and night), the lair at each of its upgrade stages, the newspaper template, NightClaw's letters, ending art |

All files are named `group_name_direction_animation_frame.png` (for example `leo_se_walk_03.png`) and
stored in [`art/`](../art/) (see its README for how to upload them). A build script packs them into
sprite sheets.
- **Audio:** sneaky jazz (upright bass, brushed drums) that adds layers as suspicion rises, and switches to
  a big-band chase stinger when an alarm trips. Footstep sounds change with the floor type; guard snores
  and grumbles; the newspaper's spinning-press whoosh.

### 12.1a 3D models as sprites

Props can come as 3D models (`art/models/*.glb`) instead of drawn sprites. `tools/bake.mjs` renders each
in headless Chromium from the game's 2:1 camera, turned 0°, 45° … 315°, lit for night (a cool fill and a
warm key from the top left), with a dark ink outline so they sit with the drawn characters. The game picks
the frame from the prop's facing and the camera's turn, and tints it by the light on its tile. In use so
far: security cameras, crates and crate stacks, desks, and whatever hangs on the walls in each district
(pictures and mirrors in the museums and mansions; lifebuoys at the harbour; fuse boxes downtown). Wall pieces are decoration only and go on about one wall face in five.

### 12.1b Characters and their animation

Each character has three drawings: standing, and the two halves of a stride (Leo, the bulldog guards, the
guard dog for sniffers, the Robo-Guards, NightClaw, and the four rivals; Professor Paws uses the "prof"
drawings). The game animates them from those: breathing while they stand; striding, two frames a tile, with
a bob (the stride follows the distance covered, so feet don't slide); running, leaning in with dust behind
(Leo's dashes, searching guards, rivals); sneaking, crouched low, when Leo heads into the dark; crawling flat
in the vents; stretched along the arc of a Pounce; swaying as he climbs to and from the rafters; ducking down
into a crate to hide; and fidgeting head-down while he picks a lock, cracks a safe or lifts loot. Sleeping
guards slump; switched-off robots sag. Characters are darker in shadow. Loot with a picture shows it in its
case or on its plinth, hops into Leo's bag when taken, and appears in the fence's ledger and the report.
Turning round (walking toward or away from the camera) would want back and three-quarter drawings; until
then the side views are mirrored.

### 12.1c Floors and walls

Floors are textured from the art (`tex_*`, `ext_*`), laid on the grid so they turn with the camera; walls are
papered (`w_*`, `wall_*`), one copy of the texture to a tile, its foot on the floor, so a wall cut down to a
stub shows its skirting. Each district has a look (floor, marble, wall) and some heists their own: the
Opera House's red curtain walls, the Customs Warehouse's corrugated metal and concrete, the Aquarium's tiles,
NightClaw's gothic stone. Creaky boards and pressure plates have their own drawings (`dec_creak`,
`dec_plate`), so they stand out from the floor round them. The table is in `src/render/surfaces.ts`.

### 12.1d Lights and the camera

Lamps on the map are ceiling lights: a pendant on a cord over a statue, a bust or a plant (a pedestal where it
needs one), with its beam and pool of light. The tile still can't be walked through, and switching the light
off dims what's under it. Display cases and plinths have small spots over them, and paintings and mirrors have
brass picture lights washing the wall. No lamps stand on the floor or hang on the walls. Flat wall pieces (an oil portrait and a tapestry, the opera's curtain swags, portholes and a ship's wheel, NightClaw's stained glass, a tool shelf, a
monitor, arched night windows) are laid on the wall faces with the 3D ones, themed by district and by heist;
the Aquarium's lights hang over its fish tanks and jellyfish columns.

A heist starts with the camera behind Leo (turned so he's nearest it, the level stretching away) and zoomed in,
following him. The mouse wheel, + and − (keys or buttons) zoom between that and the whole map.

### 12.2 Audio, settings and accessibility as built (M6)

- **Audio** is synthesised in the browser (Web Audio), so there are no files to load: a swing loop of
  walking bass, ride cymbal and brushes; vibraphone chords join when any guard is suspicious; an alarm
  switches to a faster big-band chase with brass stabs. Effects: footsteps by floor, lock picks, safes and
  dials, glass, card readers, switches, vents, bottle caps, barks, splashes, robots, the alarm, the sad
  trombone when caught, the newspaper's whoosh, letters and achievements. Audio starts on the first click
  or key press, as browsers require.
- **Settings** (kept per browser, not per save): volume, music and effects levels; animation speed
  (normal, fast, instant); tutorial tips; larger text; reduced motion (it follows the system setting at
  first); and a colour-blind friendly palette (Okabe–Ito colours, with guard sight hatched so it doesn't
  rely on colour at all). Open from the title screen, the lair, or ⚙ in a heist.
- **Keyboard play:** the arrow keys move a cursor across the screen (whichever way the camera faces),
  Enter moves Leo there or does what's there, Space ends the turn, 1–9 pick an action. The message line
  and alarm are announced to screen readers.
- **Achievements:** 24, from the first night to Legendary (story ones stay hidden until earned), with a
  notice when one is earned and a list on the Leo tab. Each has a Steam API name for the Steam build.
- **Balance:** `npm run balance` writes [BALANCE.md](BALANCE.md) from the solver's routes. Par is twice
  the flawless route, and at least ten turns more. Second Wind moved from level 25 to 22, so that it's
  reachable a few heists after the story rather than twenty.

### 12.3 Menus and the lair as built

The menus look like props from a 1960s caper film, printed and handled, not like an app: paper grain,
hard offset shadows, rubber stamps, things pinned slightly crooked. No glass panels, gradients-as-decor,
rounded cards or emoji.

- **Title:** a heist poster: a sunburst, the moon, a skyline and Leo on a ledge, with the Limelight logo.
  Save slots are luggage tags.
- **City map:** a printed street map, with the next job marked in red pencil.
- **Lair:** a desk. A polaroid of the hideout, a brass nameplate and a stats card, then folder tabs:
  heists are ruled index cards pinned to cork, stamped *Flawless* or *Cleared*; Leo is a police dossier
  with a mugshot; the black market is the fence's ledger, with prices typed in blue; the lair rooms are
  a blueprint; the letters are sealed envelopes; the front pages are clippings taped to cork.
- **Briefing:** a case file with a sticky note and the floor plan as a blueprint. **Report:** a typed form
  with a result stamp. **Caught:** a *Busted* stamp. **Letters:** handwriting. **Achievements:** telegrams.
- **Illustrations** from the art: the heist report has a snapshot of Leo on the rooftop with the prize (a
  clock, moon, pearl, prism or golden seed, by what the prize is), or the rival who beat him to it; Leo's
  dossier has his mugshot in black and white; a rival on the rumour board has theirs; NightClaw speaks with his
  portrait; the Legendary certificate has Leo enthroned; some gadgets have icons on their buttons.
- **Fonts** (all SIL Open Font License, bundled into the page through Fontsource): Limelight (display),
  Special Elite (typewriter), Oswald (poster labels and buttons), Libre Franklin (body text),
  UnifrakturMaguntia (newspaper masthead) and Homemade Apple (handwriting).

## 13. Tech plan

- **Stack:** TypeScript + PixiJS 8 (GPU rendering, which the night lighting, vision cones and camera
  rotation need), packaged with Electron like the studio's other games. **Two builds from one codebase:**
  - **Web:** a static build served on this repository's GitHub Pages site
    (`https://dempking.github.io/Purrrfect_Crime/`), saving to the
    browser. This is the playtesting build. Generated sprites are packed into compressed atlases so it
    loads quickly.
  - **Steam:** the same build wrapped in Electron, with Steam achievements and cloud saves.
  - Mouse and keyboard first, with touch for tablets in the web build and controller support later.
- **Isometric renderer** with four rotation states. Tiles, walls and props are sorted per rotation, walls
  are cut away by occluding Leo, and floors and the vent layer draw as layers.
- **Pure game-logic core** (no rendering): grid, AP, pathfinding (A* on tiles with move costs), sight
  (shadowcasting with cones), light map, noise propagation, guard AI state machines, enemy turn scheduler,
  Everything is deterministic and seeded, so it can be unit-tested.
- **Data-driven levels:** a JSON level format with tiles, walls, vents, lights, guards and their routes,
  devices and loot. A **simple in-game level editor** (developer build) to author
  the 25 maps quickly.
- **Save system:** profile (level, XP, Catnip, skills, lair, story flags, letter order, challenge
  progress), plus a separate per-level best record.
- **Testing:**
  - Unit tests for sight, noise, pathfinding and AI.
  - A **solver bot** that proves every level can be finished flawlessly, by searching through guard
    timings.
  - Story-trigger tests for both letter orders.

## 14. Milestones

| # | Milestone | Contents |
| --- | --- | --- |
| **M0** | Grey-box prototype | One flat test map, iso grid, 4-way rotation, AP movement, one guard with sight and patrol, caught = restart. Proves the core turn loop is fun. |
| **M1** | Stealth sandbox | Light map, noise, alert states, cameras, lasers, vents, lockpicking, loot and inventory space, escape. |
| **M2** | Vertical slice | Tutorial level with final art direction, narrator, calling card + newspaper, black market, Catnip, XP, the lair purchase. |
| **M3** | Progression | Attributes, all three skill trees, lair upgrades and the Intel reveal, saves. |
| **M4** | Content | Levels 1–25, rivals, guard types, letters 1–2 and the challenge museum. |
| **M5** | Endgame | NightClaw Challenge tracking, Letter 4, NightClaw's Lair, ending, credits, post-game. |
| **M6** | Ship | Steam (achievements, cloud saves), settings, accessibility, balance pass with the solver bot, polish. |

The web build goes live from M0 onward, so every milestone can be playtested from a link.

**Length budget (15–20 hours):**

| Part | Hours |
| --- | --- |
| Tutorial, opening, lair | 0.5 |
| First pass through the 25 levels (about 25–30 minutes each, including restarts) | 11–12 |
| Replays for loot, centrepieces lost to rivals, skill grinding | 2–4 |
| NightClaw Challenge clean-up (flawless replays) | 1–2 |
| Challenge museum and NightClaw's Lair | 1–1.5 |

## 15. Decisions log

| # | Question | Decision |
| --- | --- | --- |
| 1 | Art pipeline | **Generated sprites**, following the spec in §12.1. |
| 2 | Difficulty | **One mode only, the hardest** (originally *Legendary*). Replaces "chosen once for the whole game" (§11). |
| 3 | Checkpoints | **None**, and no undo, now that there's one mode (§4.4). |
| 4 | Rivals | **Only appear when they're after the same centrepiece** as Leo, warned about at the lair. Losing a race never blocks the NightClaw Challenge (§5.2). |
| 5 | Replays | **Yes**, loot is back on display at 50% value after the first clear (§6). |
| 6 | Platforms | **Both** a web build and a Steam build (§13). |
| 7 | Length | **15–20 hours** (§14). |
