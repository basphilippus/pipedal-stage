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

// Stage theme block icons: one line-art glyph per plugin category, drawn in the
// category colour on the dark tile (Quad Cortex style), replacing the stock
// negative-space white squares. 24x24 grid, 1.75 px strokes, round caps.

import React from 'react';
import { PluginType } from './Lv2Plugin';

// Same grouping as MidiFeedbackController::ColorForPluginType / SnapshotStrip so the
// screen agrees with the pedal LEDs.
export function stageCategoryColor(type: PluginType | undefined): string {
    switch (type) {
        case PluginType.DistortionPlugin: case PluginType.WaveshaperPlugin:
        case PluginType.AmplifierPlugin: case PluginType.SimulatorPlugin: case PluginType.NamPlugin:
            return "#ff6a3d";
        case PluginType.PitchPlugin: case PluginType.SpectralPlugin:
            return "#c06cff";
        case PluginType.EQPlugin: case PluginType.MultiEQPlugin: case PluginType.ParaEQPlugin:
        case PluginType.FilterPlugin: case PluginType.HighpassPlugin: case PluginType.LowpassPlugin:
        case PluginType.BandpassPlugin: case PluginType.AllpassPlugin: case PluginType.CombPlugin:
            return "#36d6e7";
        case PluginType.ReverbPlugin: case PluginType.DelayPlugin: case PluginType.SpatialPlugin:
            return "#4d8dff";
        case PluginType.ModulatorPlugin: case PluginType.ChorusPlugin:
        case PluginType.FlangerPlugin: case PluginType.PhaserPlugin:
            return "#3ddc84";
        case PluginType.CompressorPlugin: case PluginType.DynamicsPlugin: case PluginType.GatePlugin:
        case PluginType.LimiterPlugin: case PluginType.ExpanderPlugin: case PluginType.EnvelopePlugin:
            return "#f5d64d";
        default:
            return "#cfd3d9";
    }
}

type Glyph = React.ReactNode;

// ---- glyphs (stroke-based; fill only where noted) ---------------------------------
const G: { [k: string]: Glyph } = {
    // Amp head: box, grille lines, two knobs.
    amp: <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M6 9.5h7M6 12h7M6 14.5h7" />
        <circle cx="16.5" cy="10.5" r="1.4" /><circle cx="16.5" cy="14.5" r="1.4" />
    </>,
    // Neural capture: node graph.
    nam: <>
        <circle cx="5" cy="8" r="1.6" /><circle cx="5" cy="16" r="1.6" />
        <circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="8" r="1.6" /><circle cx="19" cy="16" r="1.6" />
        <path d="M6.5 8.7l3.9 2.4M6.5 15.3l3.9-2.4M13.7 11.2l3.7-2.3M13.7 12.8l3.7 2.3" />
    </>,
    // Cabinet: box with a speaker cone.
    cab: <>
        <rect x="4" y="3.5" width="16" height="17" rx="2" />
        <circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" />
    </>,
    // Drive: clipped wave.
    drive: <>
        <path d="M3 12h2.5l2-6 3 12 3-12 3 12 2-6H21" />
    </>,
    // EQ: three sliders.
    eq: <>
        <path d="M6 4v16M12 4v16M18 4v16" />
        <circle cx="6" cy="9" r="1.9" fill="currentColor" /><circle cx="12" cy="14.5" r="1.9" fill="currentColor" /><circle cx="18" cy="8" r="1.9" fill="currentColor" />
    </>,
    // Filter: low-pass curve.
    filter: <>
        <path d="M3 8h8c2.5 0 3.5 1 4.5 3.5S18 19 21 19" />
        <path d="M3 19h18" strokeOpacity="0.4" />
    </>,
    // Gate: bracket closing on a signal.
    gate: <>
        <path d="M3 12h4M17 12h4" />
        <path d="M8 6v12M16 6v12" />
        <path d="M10 12l1.2-3 1.6 6 1.2-3" />
    </>,
    // Compressor: waves squeezed by arrows.
    comp: <>
        <path d="M12 3v4M12 21v-4" />
        <path d="M9.5 5.5L12 8l2.5-2.5M9.5 18.5L12 16l2.5 2.5" />
        <path d="M4 12h2l1.5-2 2 4 2-4 2 4 2-4 1.5 2h3" />
    </>,
    // Delay: repeats fading.
    delay: <>
        <path d="M4 5v14" />
        <path d="M9 8v8" strokeOpacity="0.8" /><path d="M14 10v4" strokeOpacity="0.55" /><path d="M19 11v2" strokeOpacity="0.35" />
    </>,
    // Reverb: expanding arcs.
    reverb: <>
        <circle cx="6" cy="12" r="1.5" fill="currentColor" />
        <path d="M10 8a5.5 5.5 0 0 1 0 8" /><path d="M14 5.5a9.5 9.5 0 0 1 0 13" strokeOpacity="0.7" /><path d="M18 3a13.5 13.5 0 0 1 0 18" strokeOpacity="0.4" />
    </>,
    // Modulation: sine.
    mod: <>
        <path d="M3 12c2.2-6 4.3-6 6.5 0s4.3 6 6.5 0 4.3-6 5 0" />
    </>,
    // Pitch: note with up/down arrows.
    pitch: <>
        <path d="M13 16V5l5 1.5" /><circle cx="10.5" cy="16.5" r="2.5" />
        <path d="M4 9l2-2 2 2M6 7v10M4 15l2 2 2-2" strokeOpacity="0.8" />
    </>,
    // Tuner: needle meter.
    tuner: <>
        <path d="M4 17a8 8 0 0 1 16 0" /><path d="M12 17L15 9.5" />
        <path d="M6.5 11l1 1M17.5 11l-1 1M12 8v1.5" strokeOpacity="0.7" />
        <circle cx="12" cy="17" r="1.2" fill="currentColor" />
    </>,
    // Utility / other: wrench.
    util: <>
        <path d="M14.5 6.5a4 4 0 0 0 5 5L11 20a2 2 0 0 1-3-3l8.5-8.5z" />
        <path d="M17.5 3.5l3 3" />
    </>,
    // Volume / mixer: fader and speaker.
    mixer: <>
        <path d="M4 5v14M4 11h5M13 8l4-3v14l-4-3H11V8h2z" />
    </>,
    // Generator / oscillator: sawtooth.
    osc: <>
        <path d="M3 17l6-10v10l6-10v10l6-10" />
    </>,
    // Looper / player: circular arrow.
    loop: <>
        <path d="M17 6.5A7.5 7.5 0 1 0 19.5 12" /><path d="M16 3.5l1.5 3-3.5.5" />
    </>,
    // Spectral / analyser: bars.
    spectral: <>
        <path d="M4 19V13M8 19V8M12 19V4M16 19V10M20 19V15" />
    </>,
    // Splitter: fork.
    split: <>
        <path d="M3 12h5c2 0 3-1 4-3s2-3 4-3h5M8 12c2 0 3 1 4 3s2 3 4 3h5" />
    </>,
    // Chain terminal (input/output): jack dot on the wire.
    terminal: <>
        <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </>,
    // Error / missing: triangle.
    error: <>
        <path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" />
    </>,
};

const FAMILY_COLOR: { [k: string]: string } = {
    amp: "#ff6a3d", nam: "#ff6a3d", drive: "#ff6a3d", cab: "#ffbf2e",
    eq: "#36d6e7", filter: "#36d6e7",
    gate: "#f5d64d", comp: "#f5d64d",
    delay: "#4d8dff", reverb: "#4d8dff",
    mod: "#3ddc84", pitch: "#c06cff", tuner: "#e6e8ec", spectral: "#c06cff",
    mixer: "#cfd3d9", osc: "#cfd3d9", loop: "#3ddc84", split: "#cfd3d9", util: "#cfd3d9",
    terminal: "#5a5e66", error: "#ff4d4d",
};

// Many LV2 plugins are typed as plain "Plugin"; the name usually says what it is.
function familyByName(name: string | undefined): string | null {
    if (!name) return null;
    let n = " " + name.toLowerCase() + " ";
    if (n.includes("__terminal")) return "terminal";
    if (n.includes("tuner")) return "tuner";
    if (n.includes("loop") || n.includes("player")) return "loop";
    if (n.includes("cab") || n.includes(" ir ") || n.includes("convolution") || n.includes("impulse")) return "cab";
    if (n.includes("split") || n.includes("mixer")) return "split";
    if (n.includes("neural") || n.includes(" nam ") || n.includes("capture") || n.includes("nameless") || n.includes("precision")) return "nam";
    if (n.includes("drop") || n.includes("pitch") || n.includes("whammy") || n.includes("harmon") || n.includes("octav") || n.includes("capo") || n.includes("voices")) return "pitch";
    if (n.includes("gate") || n.includes("noise")) return "gate";
    if (n.includes("comp") || n.includes("limit")) return "comp";
    if (n.includes("delay") || n.includes("echo")) return "delay";
    if (n.includes("reverb") || n.includes("verb") || n.includes("spring") || n.includes("plate") || n.includes("hall")) return "reverb";
    if (n.includes("chorus") || n.includes("flang") || n.includes("phas") || n.includes("trem") || n.includes("vibrat") || n.includes("rotary")) return "mod";
    if (n.includes(" eq") || n.includes("equal") || n.includes("tone") || n.includes("band")) return "eq";
    if (n.includes("wah") || n.includes("filter")) return "filter";
    if (n.includes("drive") || n.includes("dist") || n.includes("fuzz") || n.includes("boost") || n.includes("screamer") || n.includes("tube")) return "drive";
    if (n.includes("amp")) return "amp";
    if (n.includes("volume") || n.includes("gain") || n.includes("level")) return "mixer";
    return null;
}

function familyByType(type: PluginType): string {
    switch (type) {
        case PluginType.AmplifierPlugin: case PluginType.SimulatorPlugin: return "amp";
        case PluginType.NamPlugin: return "nam";
        case PluginType.DistortionPlugin: case PluginType.WaveshaperPlugin: return "drive";
        case PluginType.EQPlugin: case PluginType.MultiEQPlugin: case PluginType.ParaEQPlugin: return "eq";
        case PluginType.FilterPlugin: case PluginType.HighpassPlugin: case PluginType.LowpassPlugin:
        case PluginType.BandpassPlugin: case PluginType.AllpassPlugin: case PluginType.CombPlugin: return "filter";
        case PluginType.GatePlugin: case PluginType.ExpanderPlugin: return "gate";
        case PluginType.CompressorPlugin: case PluginType.LimiterPlugin: case PluginType.DynamicsPlugin: case PluginType.EnvelopePlugin: return "comp";
        case PluginType.DelayPlugin: return "delay";
        case PluginType.ReverbPlugin: case PluginType.SpatialPlugin: return "reverb";
        case PluginType.ChorusPlugin: case PluginType.FlangerPlugin: case PluginType.PhaserPlugin: case PluginType.ModulatorPlugin: return "mod";
        case PluginType.PitchPlugin: return "pitch";
        case PluginType.SpectralPlugin: case PluginType.AnalyserPlugin: return "spectral";
        case PluginType.MixerPlugin: return "mixer";
        case PluginType.OscillatorPlugin: case PluginType.GeneratorPlugin: case PluginType.InstrumentPlugin: return "osc";
        case PluginType.ErrorPlugin: case PluginType.InvalidPlugin: return "error";
        default: return "util";
    }
}

export function stageFamily(type: PluginType, hintName?: string): string {
    return familyByName(hintName) ?? familyByType(type);
}

function glyphFor(type: PluginType): Glyph {
    switch (type) {
        case PluginType.AmplifierPlugin: case PluginType.SimulatorPlugin: return G.amp;
        case PluginType.NamPlugin: return G.nam;
        case PluginType.DistortionPlugin: case PluginType.WaveshaperPlugin: return G.drive;
        case PluginType.EQPlugin: case PluginType.MultiEQPlugin: case PluginType.ParaEQPlugin: return G.eq;
        case PluginType.FilterPlugin: case PluginType.HighpassPlugin: case PluginType.LowpassPlugin:
        case PluginType.BandpassPlugin: case PluginType.AllpassPlugin: case PluginType.CombPlugin: return G.filter;
        case PluginType.GatePlugin: case PluginType.ExpanderPlugin: return G.gate;
        case PluginType.CompressorPlugin: case PluginType.LimiterPlugin: case PluginType.DynamicsPlugin: case PluginType.EnvelopePlugin: return G.comp;
        case PluginType.DelayPlugin: return G.delay;
        case PluginType.ReverbPlugin: case PluginType.SpatialPlugin: return G.reverb;
        case PluginType.ChorusPlugin: case PluginType.FlangerPlugin: case PluginType.PhaserPlugin: case PluginType.ModulatorPlugin: return G.mod;
        case PluginType.PitchPlugin: return G.pitch;
        case PluginType.SpectralPlugin: case PluginType.AnalyserPlugin: return G.spectral;
        case PluginType.MixerPlugin: return G.mixer;
        case PluginType.OscillatorPlugin: case PluginType.GeneratorPlugin: case PluginType.InstrumentPlugin: return G.osc;
        case PluginType.ErrorPlugin: case PluginType.InvalidPlugin: return G.error;
        default: return G.util;
    }
}

export interface StagePluginIconProps {
    pluginType: PluginType;
    size?: number;
    color?: string;         // overrides the category colour (e.g. the block's chosen icon colour)
    opacity?: number;
    /** Some plugins are recognisable by name, not category (tuner, looper, cab IR). */
    hintName?: string;
    style?: React.CSSProperties;
    className?: string;
}

export default function StagePluginIcon(props: StagePluginIconProps) {
    let size = props.size ?? 24;
    let family = stageFamily(props.pluginType, props.hintName);
    let glyph = G[family] ?? glyphFor(props.pluginType);
    let color = props.color ?? FAMILY_COLOR[family] ?? stageCategoryColor(props.pluginType);
    return (
        <svg className={props.className} width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
            style={{ color: color, opacity: props.opacity ?? 1, display: "block", flex: "0 0 auto", ...props.style }}>
            {glyph}
        </svg>
    );
}
