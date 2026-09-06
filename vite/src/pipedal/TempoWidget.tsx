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

// Stage tempo tile: shows the global tempo, pulses on the beat, tap = tap tempo.
// The pedal's encoder push does the same over MIDI (system binding "tapTempo");
// the encoder rotate nudges by 1 BPM. Hidden when the daemon has no tempo support.

import React from 'react';
import { PiPedalModel, PiPedalModelFactory } from './PiPedalModel';
import { STAGE } from './StageTheme';

interface TempoWidgetState {
    bpm: number;
    pulse: number;   // remounts the LED so its animation re-phases on every tap
}

export default class TempoWidget extends React.Component<{}, TempoWidgetState> {
    private model: PiPedalModel;

    constructor(props: {}) {
        super(props);
        this.model = PiPedalModelFactory.getInstance();
        this.state = { bpm: this.model.tempo.get(), pulse: 0 };
        this.onTempo = this.onTempo.bind(this);
        this.onTap = this.onTap.bind(this);
    }
    componentDidMount() {
        this.model.tempo.addOnChangedHandler(this.onTempo);
        this.model.tempoTapCount.addOnChangedHandler(this.onTap);
    }
    componentWillUnmount() {
        this.model.tempo.removeOnChangedHandler(this.onTempo);
        this.model.tempoTapCount.removeOnChangedHandler(this.onTap);
    }
    private onTempo(bpm: number) { this.setState({ bpm: bpm }); }
    private onTap() { this.setState((s) => ({ pulse: s.pulse + 1 })); }

    render() {
        const bpm = this.state.bpm;
        if (!(bpm > 0)) return null;
        const beatSeconds = 60 / bpm;
        return (
            <div className="tempo-widget" onClick={() => this.model.tapTempo()} title="Tap tempo"
                style={{
                    flex: "0 0 86px", height: 60, borderRadius: 10, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer",
                    border: `1px solid ${STAGE.border}`, background: STAGE.panelGradient,
                    userSelect: "none", WebkitTapHighlightColor: "transparent",
                }}>
                <style>{`@keyframes tempoPulse { 0% { opacity: 1; transform: scale(1.25); } 35% { opacity: 0.25; transform: scale(1); } 100% { opacity: 0.25; transform: scale(1); } }`}</style>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, lineHeight: 1 }}>
                    <span style={{ fontFamily: STAGE.displayFont, fontSize: 24, color: STAGE.text }}>{Math.round(bpm)}</span>
                    <span style={{ fontFamily: STAGE.displayFont, fontSize: 9, letterSpacing: "0.16em", color: STAGE.textDim }}>BPM</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span key={this.state.pulse} style={{
                        width: 7, height: 7, borderRadius: "50%", background: STAGE.accent,
                        boxShadow: `0 0 6px ${STAGE.accent}`,
                        animation: `tempoPulse ${beatSeconds}s cubic-bezier(0.2, 0.8, 0.2, 1) infinite`,
                    }} />
                    <span style={{ fontFamily: STAGE.displayFont, fontSize: 10, letterSpacing: "0.2em", color: STAGE.textDim }}>TAP</span>
                </div>
            </div>
        );
    }
}
