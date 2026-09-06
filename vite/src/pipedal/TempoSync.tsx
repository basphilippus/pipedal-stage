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

import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import MidiBinding from './MidiBinding';
import { PiPedalModel } from './PiPedalModel';
import { Pedalboard } from './Pedalboard';
import { UiControl } from './Lv2Plugin';
import { isStageTheme } from './DarkMode';
import { STAGE } from './StageTheme';

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

// Picker options by index: 0 = Free, 1.. = SUBDIVISIONS (used for encoder navigation).
export const TEMPO_SYNC_OPTIONS: (number | null)[] = [null, ...SUBDIVISIONS.map((s) => s.scale)];
export function tempoSyncOptionIndex(scale: number | null): number {
    if (scale === null) return 0;
    let sub = subdivisionFor(scale);
    return 1 + SUBDIVISIONS.indexOf(sub);
}

export interface TempoSyncTarget {
    instanceId: number;
    control: UiControl;
    itemName: string;
}

// Which knob a pedal-driven picker should edit: the selected block's first time/rate
// knob; else the first synced knob in the chain; else the first time/rate knob at all.
export function findTempoSyncTarget(model: PiPedalModel): TempoSyncTarget | null {
    let pedalboard = model.pedalboard.get();
    if (!pedalboard) return null;
    let candidates = (instanceId: number, uri: string, name: string): TempoSyncTarget[] => {
        let plugin = model.getUiPlugin(uri);
        if (!plugin) return [];
        return plugin.controls.filter((c) => c.isDial() && c.canDoTapTempo())
            .map((c) => ({ instanceId: instanceId, control: c, itemName: name }));
    };
    try {
        if (pedalboard.selectedPlugin >= 0) {
            let item = pedalboard.getItem(pedalboard.selectedPlugin);
            if (item) {
                let c = candidates(item.instanceId, item.uri, item.pluginName ?? "");
                if (c.length) return c[0];
            }
        }
    } catch (e) { /* terminal ids */ }
    let firstAny: TempoSyncTarget | null = null;
    for (let item of pedalboard.itemsGenerator()) {
        let c = candidates(item.instanceId, item.uri, item.pluginName ?? "");
        if (!c.length) continue;
        if (!firstAny) firstAny = c[0];
        let synced = c.find((t) => tempoSyncBinding(pedalboard, t.instanceId, t.control.symbol) !== null);
        if (synced) return synced;
    }
    return firstAny;
}

export interface TempoSyncSheetProps {
    open: boolean;
    title: string;
    currentScale: number | null;    // null = free
    highlight?: number;             // option index the encoder is resting on (pedal-driven picker)
    primaryColor: string;
    onChoose: (scale: number | null) => void;
    onClose: () => void;
}

export function TempoSyncSheet(props: TempoSyncSheetProps) {
    let stage = isStageTheme();
    let accent = stage ? STAGE.accent : props.primaryColor;
    let itemStyle = (index: number, scale: number | null): React.CSSProperties => {
        let selected = scale === props.currentScale;
        let highlighted = props.highlight === index;
        return {
            display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px",
            borderRadius: 8, cursor: "pointer", userSelect: "none", WebkitTapHighlightColor: "transparent",
            border: `1px solid ${selected ? accent : (stage ? STAGE.border : "transparent")}`,
            background: highlighted ? (stage ? "rgba(245,165,36,0.28)" : "rgba(128,128,128,0.35)")
                : selected ? (stage ? "rgba(245,165,36,0.12)" : "rgba(128,128,128,0.15)") : undefined,
            boxShadow: highlighted ? `0 0 0 2px ${accent}` : undefined,
            fontFamily: stage ? STAGE.bodyFont : undefined,
            transition: "background 120ms, box-shadow 120ms",
        };
    };
    return (
        <Dialog open={props.open} onClose={props.onClose} className="tempo-sync-sheet" fullWidth maxWidth="xs">
            <DialogTitle style={{ fontFamily: stage ? STAGE.displayFont : undefined }}>{props.title}</DialogTitle>
            <DialogContent>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ ...itemStyle(0, null), gridColumn: "1 / -1" }} onClick={() => props.onChoose(null)}>
                        <span>Free (set by hand)</span>
                    </div>
                    {SUBDIVISIONS.map((s, i) => (
                        <div key={s.label} style={itemStyle(i + 1, s.scale)} onClick={() => props.onChoose(s.scale)}>
                            <span>{s.name}</span>
                            <span style={{ opacity: 0.7, fontFamily: stage ? STAGE.displayFont : undefined }}>{s.label}</span>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>
                    {props.highlight !== undefined
                        ? "Turn the encoder to choose, push to confirm, hold to cancel."
                        : "Synced knobs follow the global tempo (tap tempo / encoder)."}
                </div>
            </DialogContent>
        </Dialog>
    );
}
