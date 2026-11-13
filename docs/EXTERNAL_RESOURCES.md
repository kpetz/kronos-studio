# What you must create or subscribe to outside Claude

Claude Code writes the software, the scripts, the prompts, the edit and the publish text. It cannot produce pictures, voices or sound by itself. These come from other services. Product names below are examples of each category; prices, limits and features change often, so check each one's current plan and **commercial-use terms** before paying.

## 1. Pictures and video (the biggest cost and the biggest risk)

**Need:** an image model that accepts **reference images** (to keep characters identical), and an image-to-video model for the few moving hero shots.

**You do, by hand, once:**
- [ ] Split your lineup into one file per character, transparent or plain background.
- [ ] For each main character, generate and pick a **turnaround sheet** (front, 3/4, side, back) and an **expression sheet** (neutral, panic, angry, smug, crying, asleep).
- [ ] Design the missing characters: La Impresora, El Cliente, Legal, El Hacker. Redesign Hermes.
- [ ] Generate the reusable set plates: office day, office night, Jefe's desk, meeting room, interrogation corner, elevator, security-camera view.
- [ ] Test three or four tools with the same prompt and reference. Keep the one that best preserves the clay texture and the faces. This test decides the look of the whole channel.

**Then:** put the API key of the chosen tool in `.env`. If the tool has no API, the studio exports a prompt list and you generate in its web page and drop the files into `shots/`.

Categories and examples: image generation with character reference (Midjourney, Google's image models, Flux-based tools, Ideogram); image-to-video (Kling, Runway, Google Veo, Luma).

## 2. Voices

**Need:** a text-to-speech service with good Latin American Spanish, an API, word timestamps if possible, and a licence for commercial use. Example: ElevenLabs; also the speech services of the large cloud providers.

**You do:**
- [ ] Choose or design **eight voices**: Narrador (deep, monotone), Kronos (synthetic, kind), Junior (high, fast), Jefe (shrill, shouting), Casandra (tired, flat), Cliente (deep, shouting), Legal (slow, formal), plus one spare.
- [ ] Use stock or designed voices only. Do not clone a real person's voice without written permission.
- [ ] Write each voice ID in `config/voices.json` and the API key in `.env`.
- [ ] Listen to the same test line in all voices side by side. They must be clearly different with the screen off.

La Impresora and El Hacker do not speak; they are sound effects.

## 3. Sound effects and music

**Need:** the 13 recurring sounds in the bible, per-episode extras, and two or three music beds (suspense, comedy, sting).

**You do:**
- [ ] Collect the 13 recurring sounds once, as WAV, into `assets/sfx/`, named by their ID.
- [ ] Use only sounds you may monetize: CC0 or licensed libraries (for example Freesound filtered to CC0, Pixabay, a paid library subscription), or generated sound effects from a service whose terms allow commercial use.
- [ ] Record the simple ones yourself with a phone: keyboard, can opening, paper, stamp, real clay being squashed. These give the channel its own sound.
- [ ] Do **not** use the real Windows sounds or a real modem recording taken from a film or game. Make sound-alikes.
- [ ] Write one line per file in `assets/LICENSES.md`: file, source, licence, date.

## 4. Fonts

- [ ] One heavy caption font and one "stamp" font, both free for commercial use (for example from Google Fonts). Save the licence file next to them.

## 5. Accounts and channels

- [ ] YouTube channel and TikTok account for the series, same name and avatar.
- [ ] Read the current monetization requirements of both programs for **your country** before planning income. Some programs are limited to certain countries.
- [ ] Playlists: "La Oficina — Temporada 1" and "¿Quién desenchufó a Kronos?".
- [ ] Later, optional: a Google Cloud project with the YouTube Data API for scheduled uploads. TikTok uploads stay manual at first.

## 6. On your computer

- [ ] Node.js 20+, pnpm, FFmpeg, Git.
- [ ] Claude Code with a Claude subscription.
- [ ] Remotion (installed by the build). Read its licence terms; it is free for individuals and very small teams, companies above its size limit need a paid licence.
- [ ] About 50 GB of free disk for assets and renders.

## What costs money, in order

1. Image-to-video clips (by far the most per second).
2. Image generation (many attempts per usable shot).
3. Voices (cheap per episode).
4. Claude subscription (fixed).
5. Sound and fonts (can be free).

Control the cost with the A/B shot rule in the style guide: mostly animated stills, at most four video clips per episode.
