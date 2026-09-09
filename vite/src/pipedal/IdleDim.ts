// Copyright (c) 2026 Bas Philippus
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// Kiosk idle dim: after N minutes without touch/keys/pedal activity the backlight is
// set to a low level (not persisted); any activity restores the saved brightness.
// Settings live in the kiosk browser's localStorage (per device, like the theme).

import { PiPedalModel } from './PiPedalModel';

export interface IdleDimSettings {
    enabled: boolean;
    minutes: number;   // 1, 2, 5, 10, 30
    level: number;     // percent while dimmed
}
const KEY = "kioskIdleDim";
const DEFAULTS: IdleDimSettings = { enabled: false, minutes: 5, level: 10 };

export function getIdleDimSettings(): IdleDimSettings {
    try {
        let raw = localStorage.getItem(KEY);
        if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) { /* storage unavailable */ }
    return { ...DEFAULTS };
}
export function setIdleDimSettings(settings: IdleDimSettings) {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
    window.dispatchEvent(new Event("pipedal-idledim-changed"));
}

let started = false;
export function startIdleDim(model: PiPedalModel) {
    if (started) return;
    started = true;
    let settings = getIdleDimSettings();
    let timer: number | undefined;
    let dimmed = false;

    const restore = () => {
        if (dimmed) {
            dimmed = false;
            let b = model.brightness.get();
            if (b > 0) model.setTemporaryBrightness(b);
        }
    };
    const dim = () => {
        if (!settings.enabled || model.brightness.get() < 0) return;
        dimmed = true;
        model.setTemporaryBrightness(settings.level);
    };
    const arm = () => {
        if (timer !== undefined) window.clearTimeout(timer);
        timer = undefined;
        if (settings.enabled) timer = window.setTimeout(dim, settings.minutes * 60000);
    };
    const activity = () => { restore(); arm(); };

    window.addEventListener("pointerdown", activity, { capture: true, passive: true });
    window.addEventListener("keydown", activity, { capture: true });
    // pedal / MIDI driven changes count as activity too
    model.pedalboard.addOnChangedHandler(activity);
    model.presets.addOnChangedHandler(activity);
    model.tempoTapCount.addOnChangedHandler(activity);
    window.addEventListener("pipedal-idledim-changed", () => { settings = getIdleDimSettings(); restore(); arm(); });
    arm();
}
