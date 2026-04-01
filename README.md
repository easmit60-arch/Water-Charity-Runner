# Water Runner Prototype Refections
- Reflect on your experience and prepare for job interviews and professional networking by answering all the questions below.
- Challenge / twist mechanics:
    - Flood loss condition if score goes above 135 (“village floods”).
    - Dam-building phase that changes gameplay (rain intensity decreases, river route shifts toward the village).
    - After building the dam, stored water drains over time, creating time pressure while you try to survive the “flourish” phase. 
- In this build I was not limited by time so I was able to keep the scope of the project that was in the concept, by focusing on building one complete gameplay loop (start, move, collect water, track score/storage, and reach an ending by losing). Once the basics worked, I added more than planned UI by introducing a twist: the dam-building phase, flood loss threshold, stored-water vs. draining, and a flourish timer. I enjoyed watching the game come to life and adding polish like village changes and a win celebration (confetti + overlay). Next time, I’d build in clear phases and playtest earlier to catch confusion and balance issues sooner.
- This project shows how I break a problem into smaller steps, test as I go, and keep iterating until the game feels clear and playable.
- Next time I’d playtest earlier so I can tune the difficulty faster, but I’m proud I was able to ship a working prototype with polished feedback.

  ## LinkedIn Post
  
Built a mini browser game prototype (*Water Runner*) with JavaScript + a little AI support, and I learned a lot about turning an idea into something actually playable. AI helped me move faster from “concept” to working code by brainstorming mechanics and helping debug logic, but JavaScript is what made it feel like a real game—tracking score + stored water, spawning random drops, and handling win/lose conditions.

Big takeaway: the fun isn’t just visuals—it’s balancing rules and giving the player clear feedback (HUD updates, status messages, and a win celebration). Next up I want to keep iterating on difficulty + polish.
If you’re curious, I’ll share a short clip/screenshot in the comments (or check out the project on GitHub).

## Project File Alignment

- Primary playable game (Prompt 8 mechanics): `index.html`
- Prompt guide text (all prompts): `README.md`
- Legacy starter files from the earlier grid game: `script.js` + `style.css` (kept for reference)

## Prompt 1: Theme + Mechanics Planning

### Goal
Create a Snake-like game using HTML, CSS, and JavaScript where:
- The snake is a river
- The player collects water droplets
- Water is stored in a water can

### Key Considerations
- Define the core loop: move, collect, store, survive
- Use a clear can capacity (for example, `12`) so there is a win target
- Add HUD info: score, stored water, capacity
- Choose boundary behavior: wrap-around or wall collision
- Add start/playing/win/lose game states
- Prevent water drops from spawning inside the river body

### Prompt 1 (Copy/Paste)
```text
I want to create a simple Snake-like game using HTML, CSS, and JavaScript. I want the snake to be a river, and people would collect water drops and store water in a water can.

Please suggest key considerations and gameplay mechanics for:
- Core loop
- Difficulty progression
- HUD design
- Win/lose states
- Fair spawning logic
```
