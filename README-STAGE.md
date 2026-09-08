# PiPedal Stage (unofficial build)

This branch (`stage`) is an **unofficial** build of [PiPedal](https://github.com/rerdavies/pipedal) by
Robin Davies, maintained by Bas Philippus for a Raspberry Pi 5 guitar rig with a 7" touchscreen and a
Paint Audio MIDI Captain foot controller. It tracks upstream `main` (currently v2.0.110) and adds:

- **Stage theme** — a fourth colour theme (Settings → Color theme) designed for a small touchscreen
  on stage: knobs with value arcs, chain tiles, snapshot strip with A–D tiles, Gig View (presets +
  pager on top, snapshots below), full-screen tuner mode, LED-style meters.
- **MIDI feedback** — `MidiFeedbackController` sends CC/PC/SysEx to a bidirectional foot controller:
  bypass and snapshot LED state, preset labels per page, banner text, tempo. Protocol documented in
  `src/MidiFeedbackController.hpp`. Firmware for the MIDI Captain lives in a separate rig repository.
- **Preset paging** — foot switches page through presets four at a time; PC 0–3 load from the current
  page; the pager is shared with the UI.
- **Snapshots as the stomp layer** — system MIDI bindings `snapshot1..6`; a preset with snapshots
  always loads with one active.
- **Tuner mode** — system binding `tuner` toggles the TooB Tuner's mute and shows a full-screen tuner
  (a tuner block is borrowed for presets without one).
- **Global tap tempo** — system bindings `tapTempo` / `tempoNudge` / `tempoPicker`; tempo is pushed to
  every port with a stock *Tap Tempo* MIDI binding, with per-knob subdivisions (long-press a time knob).
- **Gapless preset switching** — the new chain is warmed up off the realtime thread before the swap.
- **Custom-build guard** — `PIPEDAL_CUSTOM_BUILD_TAG` disables the in-app updater so an upstream
  package can't silently replace the custom binary.

Stock Light/Dark themes and the on-disk preset/settings format are unchanged; presets made here open
in stock PiPedal (extra MIDI bindings are simply ignored there).

Upstream-worthy fixes are submitted to rerdavies/pipedal as separate clean pull requests; this branch
is not intended to be merged as a whole.

Build and install exactly like upstream (see the upstream README). Licensing follows upstream's
`LICENSE.md`; files added on this branch are MIT.
