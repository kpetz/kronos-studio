# Style guide — the clay look

## The look in one paragraph

Hand-made plasticine stop-motion. Chunky puppets about three heads tall, oversized heads, bulging eyes with heavy lids, visible fingerprints and tool marks in the clay, matte surfaces, slightly lumpy edges. Muted, slightly dirty palette: beige, olive, teal, mustard, brick red. Soft studio lighting with gentle shadows, shallow depth of field, miniature-set feeling. The office is a 1990s office: beige plastic, CRT monitors, sticky notes, cables.

## Motion: how it reads as stop-motion

- Compositions run at 24 fps. Character motion is held **on twos** (new pose every 2 frames, i.e. 12 poses per second). Never smooth-interpolate a character.
- Add 1–2 px of random position jitter per pose and a faint flicker in exposure.
- Squash and stretch on impacts, held for 2–3 poses.
- Camera moves are simple: locked shot, slow push-in, hard cut. No drone or handheld moves.
- Text overlays ("DATO REAL", episode number, captions) are crisp and do not jitter, except the rubber stamp, which lands with a 3-pose squash.

## Two ways to make a shot

| | A. Animated still | B. Image-to-video |
|---|---|---|
| How | One or more generated stills (poses), animated in Remotion: pose swaps on twos, jitter, zoom, shake, mouth flaps | A generated still used as first frame for a video model, 3–6 s |
| Cost | Low | High |
| Consistency | High | Medium; check every clip |
| Use for | Dialogue, reactions, inserts of screens and text, narrator shots | The hook, the main physical gag, the final hit |

Default budget per episode: **most shots are type A; at most 4 shots are type B**. The storyboard agent marks each shot A or B and justifies each B.

## Character consistency

1. Every character has a folder `assets/characters/<id>/` with: `sheet.png` (front, 3/4, side, back), `expressions.png` (neutral, panic, angry, smug, crying, asleep), and `notes.md` (fixed traits).
2. Every image request for a character **attaches that character's sheet as a reference image**. Text alone is never enough.
3. Fixed traits are repeated in words in every prompt (see the block below).
4. One set = one plate. Office backgrounds are generated once into `assets/sets/` and reused; characters are composited over them or generated with the plate as a second reference.
5. A shot fails QA if hair, clothing colour, eye colour, proportions or number of fingers differ from the sheet.

## Fixed trait blocks (paste into prompts)

- **kronos**: beige 1990s CRT monitor made of clay, a single large green eye filling the screen, small green power light, yellowed plastic
- **junior**: young man, messy brown hair, huge purple eye bags, tired worried face, dark teal hoodie, dark jeans, red sneakers, holding a mug
- **jefe**: older man, grey slicked-back hair, thick grey moustache, angry eyebrows, dark suit, shouting
- **casandra**: woman, thick round glasses, dark hair in a messy bun with a pencil through it, olive green cardigan, beige skirt, hugging a folder of reports, unimpressed
- **impresora**: beige office printer made of clay, grumpy face, paper tray as a mouth
- **cliente**: man with a bright red face and a throbbing vein on his forehead
- **legal**: woman lawyer, grey suit, small glasses, carrying an endless paper scroll that trails on the floor
- **hacker**: figure in a black hoodie and eye mask, calm smile

(Update these when the open canon questions in the bible are decided.)

## Prompt templates

**Still (type A or first frame for B)**
```
Stop-motion claymation still, handmade plasticine puppets with visible fingerprints
and tool marks, matte clay, miniature 1990s office set, soft studio lighting,
shallow depth of field, muted palette.
SHOT: <framing: close-up | medium | wide>, <camera angle>.
CHARACTERS: <fixed trait block(s)>.
ACTION: <one clear pose or moment, present tense>.
SET: <plate name and what is visible>.
COMPOSITION: main action inside the centre vertical third, clean space at top and
bottom for captions. No text, no logos, no watermarks.
```

**Image-to-video (type B)**
```
Stop-motion animation shot on twos, slight frame jitter, handmade clay puppets.
<what moves, in order, in one or two sentences>. Camera: <locked | slow push-in>.
Duration <3–6> s. Nothing else in the frame changes. No new characters, no text.
```

**Negative guidance (where the tool supports it)**
```
smooth CGI, glossy plastic, photorealistic skin, 2D cartoon, extra fingers,
extra characters, text, subtitles, watermark, logo, brand names
```

On-screen text (emails, screens, signs, the "DATO REAL" stamp) is **never generated inside the image**. It is rendered by Remotion on top, so the Spanish is always correct.

## Formats

- Master picture: 16:9 at the highest resolution the image tool gives, with all essential action inside the centre 9:16 column. The vertical episode is a centre crop; the long video uses the full frame. Verify the crop sharpness in the pilot; if it is soft, generate vertical masters instead and present the long video in vertical.
- Vertical: 1080×1920, 24 fps. Wide: 1920×1080, 24 fps.
- Caption safe zone (vertical): keep captions between 60 % and 78 % of the height; nothing important in the bottom 15 % or the right 12 % (platform buttons).

## Captions and type

- Captions: one or two lines, 3–5 words at a time, heavy sans-serif, white with dark outline, word highlight in mustard.
- Speaker colour on the name tag only: Narrador white, Kronos green, Junior teal, Jefe red, Casandra olive.
- "DATO REAL": red rubber-stamp frame, slightly rotated, numbered steps in white on a dark card.
- Fonts must be licensed for commercial use and stored in `assets/fonts/` with their licence.
