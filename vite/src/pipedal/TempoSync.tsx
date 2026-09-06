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

// Tempo sync for time/rate ports. A port follows the global tempo when it carries a
// stock "Tap Tempo" MIDI binding; that binding's rotaryScale field holds the
// subdivision as beats per repeat (1 = quarter note, 0.75 = dotted eighth, ...).
// Storage stays vanilla; upstream ignores rotaryScale on tap-tempo bindings.

import MidiBinding from './MidiBinding';
import { PiPedalModel } from './PiPedalModel';
import { Pedalboard } from './Pedalboard';

export interface Subdivision {
    scale: number;   // beats per repeat
    label: string;   // short, for chips
    name: string;    // long, for menus
}

export const SUBDIVISIONS: Subdivision[] = [
    { scale: 4, label: "1/1", name: "Whole note" },
    { scale: 2, label: "1/2", name: "Half note" },
    { scale: 1.5, label: "1/4·", name: "Dotted quarter" },
    { scale: 1, label: "1/4", name: "Quarter note" },
    { scale: 0.75, label: "1/8·", name: "Dotted eighth" },
    { scale: 2 / 3, label: "1/4T", name: "Quarter triplet" },
    { scale: 0.5, label: "1/8", name: "Eighth note" },
    { scale: 1 / 3, label: "1/8T", name: "Eighth triplet" },
    { scale: 0.25, label: "1/16", name: "Sixteenth" },
];

export function subdivisionFor(scale: number): Subdivision {
    let best = SUBDIVISIONS[3];
    let bestDist = Number.MAX_VALUE;
    for (let s of SUBDIVISIONS) {
        let d = Math.abs(s.scale - scale);
        if (d < bestDist) { bestDist = d; best = s; }
    }
    return best;
}

// The tap-tempo binding of a port, or null when the port runs free.
export function tempoSyncBinding(pedalboard: Pedalboard | undefined, instanceId: number, symbol: string): MidiBinding | null {
    if (!pedalboard) return null;
    try {
        let item = pedalboard.getItem(instanceId);
        if (!item || !item.midiBindings) return null;
        for (let b of item.midiBindings) {
            if (b.symbol === symbol) {
                return b.bindingType === MidiBinding.BINDING_TYPE_TAP_TEMPO ? b : null;
            }
        }
    } catch (e) { /* chain terminals */ }
    return null;
}

// scale = null: run free (binding removed). Otherwise sync at that subdivision.
export function setTempoSync(model: PiPedalModel, instanceId: number, symbol: string, scale: number | null) {
    let existing = tempoSyncBinding(model.pedalboard.get(), instanceId, symbol);
    let binding = existing ? existing.clone() : new MidiBinding();
    binding.symbol = symbol;
    if (scale === null) {
        binding.bindingType = MidiBinding.BINDING_TYPE_NONE;
        binding.rotaryScale = 1;
    } else {
        binding.bindingType = MidiBinding.BINDING_TYPE_TAP_TEMPO;
        binding.rotaryScale = scale;
    }
    model.setMidiBinding(instanceId, binding);
}
