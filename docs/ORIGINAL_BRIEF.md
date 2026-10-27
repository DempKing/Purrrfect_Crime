# Purrrfect Crime — Original Brief

The pitch and decisions as given, word for word. The design doc ([GAME_DESIGN.md](GAME_DESIGN.md)) turns
these into systems; if the two ever disagree, check back here.

## The pitch

> It'll be a 2d turn based game with a rotating camera built on a tile movement system like that of xcom
> games. The theme of our game is animated cat burglars pulling off museum heists and other types of heists.
> The player must navigate levels avoiding traps, security guards, and other security measures, even the
> occasional rival thief (Mischief Mittens, Luna Luck, Sammy Swipes, Professor Paws). The player plays as
> Leo Tuxedo. A young, sharply dressed hotshot newcomer.
>
> Successful heists give the player the loot they stole which they need to sell on the black market for
> currency called Catnip which is used for attribute upgrades and skill unlocks. They also earn experience
> for successful heists which levels them up. Higher levels get better black market deals and unlocks
> requirements for some Skills. Ie: some skills are locked behind a level requirement.
> This game is called: Purrrfect Crime.
> Level design should be grandiose with art and valuable displays. Each level should have multiple pieces
> that can be stolen. Map designs should account for air ducts. Higher difficulty levels should add more
> well placed cameras, traps, guards, etc. to each level. Each level should be at night time. The player
> can also use catnip to buy a lair and upgrade it. Getting your first lair unlocks the black market. The
> game starts in the tutorial on the first level walking the player through how to play/move and the game
> mechanics in a clear and concise way. Upgrading your lair gives you more information about heists the
> character is planning such as camera locations, etc.
>
> The storyline is that Leo arrives in the city looking to make a name for himself by pulling heists. After
> the opening tutorial mission the narrator buys the tutorial loot to give the character starting cash
> (catnip) and then informs the player that they need a lair in the city to be headquarters. The player
> clicks on the abandoned building to purchase as their lair. It's rundown and needs work to look nice, or
> catnip that is. After the lair is secured, the player is free to upgrade their stats, skills, go on
> heists, etc.
> After successfully completing 10 heists, the player receives a mysterious letter at the lair. The letter
> says how they are being watched and how the writer is becoming a fan of their work, signed -NC, this is
> foreshadowing the Legendary NightClaw character who is the best thief the city has ever seen, well, no
> one has seen him. That's why he's a legend, and mysterious.
> After the player has sold 10,000 Catnip worth of items on the black market, they receive the second
> letter (if this happens before the first letter at 10 heists then switch to this being the first letter
> and 10 heists will get the second). This second letter challenges the player to steal a certain item
> from a highly secure museum. This item ends up having a letter hidden with it from NightClaw revealing
> that he is the legendary NightClaw and that he has been searching for his equal for quite some time and
> invites the player the complete a series of challenges to test their ability to see if they earn the
> right to meet NightClaw in person at his own lair. These challenges are to finish every level (25 to
> start) and to steal the most valuable (and most protected) item from every level. On harder difficulties
> this is to steal all of these items but flawlessly. Once this challenge is complete, the player receives
> another letter at their lair inviting them to the secret lair of the legendary NightClaw for a final test
> to see who is the best by challenging the player to steal his prized possession (the Legendary
> NightClaw's Collar from when he was a pet but this isn't told to the player at the time what it is).
> This unlocks a new spot on the map that wasn't there before. NightClaw's lair is another level of
> difficulty traps and security systems, etc.
> If the player completes this and is able to steal the collar and sneak up on NightClaw then they beat the
> game and NightClaw dubs them Legendary status and claims they can now retire in peace now that Leo has
> taken his place as the best in the city.
> After each successful heist, a newspaper should spiral onto the screen from the center depicting a news
> article about the heist with images from the heist of missing items and the estimated value of what was
> stolen. This is where the player can get an idea of what the haul was worth. Leo should automatically
> level his calling card at the scene after each heist so that he is credited with it in the paper. There
> is no combat or battling system. If the player is caught, the need to restart the level. The avoid
> detection with Leo's stats and skills as well as utilizing the level environment like shadows, vents,
> etc.
> Guards are bulldogs.

## Decisions

Answers to the open questions from the first draft of the design doc:

| # | Question | Answer |
| --- | --- | --- |
| 1 | Art pipeline | "I will have sprites generated." |
| 2 | Difficulty | "Difficulty is chosen once for the whole game." |
| 3 | Checkpoints | "One checkpoint per easier level." (Read as: one checkpoint per level on the two easier difficulties.) |
| 4 | Rivals | "Rivals shouldn't always be on each level, only if they plan to steal the same centerpiece item as the player." |
| 5 | Replays for loot | "Yes." |
| 6 | Platforms | "Both" (web and Steam). |
| 7 | Length, 15–20 hours | "Yes." |

The game is being built from scratch from this plan; no code from earlier prototypes carries over.
