# Echospace

A 3D spatial audio environment built with Three.js and the Web Audio API.

Walk through a dark space of floating objects, each with its own procedurally generated sound. Sounds are positioned in 3D with HRTF panning, so headphones are recommended. One object stays hidden until you find it.

## Audio

- HRTF spatial panning with the Web Audio PannerNode, no audio library
- Seven synthesis voices (drone, pulse, granular, breath, chime, sub, whisper), all generated in real time with no samples
- Fundamentals spaced apart across the voices to limit masking between objects
- Reverb send that changes with distance to the nearest object
- Sympathetic resonance: objects with a harmonic relationship swell when you approach their partner
- Procedural footsteps, boundary wind, and a real-time FFT visualiser

## Run locally

Pointer lock needs a local server, so opening index.html directly won't work.

```
npx serve .
```

Then open the address it prints, usually http://localhost:3000.

## Controls

WASD or arrow keys to move, mouse to look, click to interact. Escape opens the menu, with controls, story, credits and a link back to the portfolio. On touch devices, the left stick moves and the right stick looks.

## Stack

Three.js r128, Web Audio API, vanilla JavaScript. No build tools.

Built by [AL!Z](https://alizpasztor.com).
