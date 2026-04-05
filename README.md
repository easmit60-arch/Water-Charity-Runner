# RSN-Donate_Game Refections
Reflect on your experience and prepare for job interviews and professional networking by answering all the questions below.
    -Challenge / twist mechanics:
    -Flood loss condition if score goes above 135 (“The Club floods with dollars”).
    -Investment phase (formerly dam-building) that changes gameplay (dollar-sign rain intensity decreases, money flow shifts toward The Club).

After investing, stored dollars drain over time, creating time pressure while you try to survive the “flourish” phase.
In this build, I was not limited by time, so I was able to keep the original scope of the concept by focusing on building one complete gameplay loop (start, move, collect dollar signs, track score/storage, and reach an ending by losing). Once the basics worked, I expanded the UI more than planned by introducing a twist: the investment phase, a flood-loss threshold, stored-money vs. draining mechanics, and a flourish timer. I enjoyed watching the game come to life and adding polish like changes to The Club and a win celebration (confetti + overlay). Next time, I would build in clearer phases and playtest earlier to catch confusion and balance issues sooner.

This project shows how I break a problem into smaller steps, test as I go, and keep iterating until the game feels clear and playable.
Next time, I would playtest earlier so I can tune the difficulty faster, but I’m proud that I was able to ship a working prototype with polished feedback.

  ## BlueSkys Post
  Built a mini browser game prototype (Dollar Runner) with JavaScript + a little AI support, and I learned a lot about turning an idea into something actually playable. AI helped me move faster from “concept” to working code by brainstorming mechanics and debugging logic, but JavaScript is what made it feel like a real game—tracking score + stored dollars, spawning random dollar signs, and handling win/lose conditions.

Big takeaway: the fun isn’t just visuals—it’s balancing systems and giving the player clear feedback (HUD updates, status messages, and a win celebration). I also introduced a twist with an investment phase, where gameplay shifts and stored dollars begin to drain, adding time pressure. Next up, I want to keep iterating on difficulty, balance, and polish.

If you’re curious, I’ll share a short clip/screenshot in the comments (or check out the project on GitHub).

## Project File Alignment

-Primary playable game (Prompt 8 mechanics): index.html
-Prompt guide text (all prompts): README.md
-Legacy starter files from the earlier grid game were removed to keep the project focused on the active build.

## Prompt 1: Theme + Mechanics Planning

### Goal
Create a Snake-like game using HTML, CSS, and JavaScript that can be used interchangably in where:
-The snake is a flowing money stream
-The player collects falling dollar signs
-Money is stored in The Club

### Key Considerations
-Define the core loop: move, collect, store, survive
-Use a clear capacity (for example, 135) tied to the flood-loss condition
-Add HUD info: score, stored dollars, capacity
-Choose boundary behavior: wrap-around or wall collision
-Add start/playing/investment/flourish/lose game states
-Prevent dollar signs from spawning inside the player’s path
-Age limit of 13

### Prompt 1 (Copy/Paste)
```text
I want to create a simple Snake-like game using HTML, CSS, and JavaScript. I want the snake to represent a flowing money stream, and the player collects falling dollar signs and stores them in The Club.

Please suggest key considerations and gameplay mechanics for:
- Core loop
- Difficulty progression
- HUD design
- Win/lose states
```
