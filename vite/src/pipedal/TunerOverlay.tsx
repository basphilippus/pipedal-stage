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

// Stage "tuner mode": while the TooB Tuner block is muted (pedal UP+DOWN combo, or the
// Mute switch), a full-screen tuner covers the UI. Tap anywhere (or press the combo
// again) to unmute and return.

import { PiPedalModelFactory } from './PiPedalModel';
import { Pedalboard, PedalboardItem } from './Pedalboard';
import { useState } from 'react';
import GxTunerControl, { TunerPitchInfo } from './GxTunerControl';
import { STAGE } from './StageTheme';

export const TOOB_TUNER_URI = "http://two-play.com/plugins/toob-tuner";
const TUNER_SCALE = 1.9;
const IN_TUNE = "#3ddc84";

export function findMutedTuner(pedalboard: Pedalboard): PedalboardItem | null {
    for (let item of pedalboard.itemsGenerator()) {
        if (item.uri === TOOB_TUNER_URI && item.getControlValue("MUTE") >= 0.5) {
            return item;
        }
    }
    return null;
}

export default function TunerOverlay(props: { pedalboard: Pedalboard }) {
    let tuner = findMutedTuner(props.pedalboard);
    let model = PiPedalModelFactory.getInstance();
    const [pitch, setPitch] = useState<TunerPitchInfo>({ valid: false, name: "", cents: 0, inTune: false });
    // note name -> letter + accidental (the control uses "#" and the flat sign)
    let m = /^([A-G])([#\u266d]?)(-?\d+)$/.exec(pitch.name);
    let letter = m ? m[1] : "";
    let accidental = m ? m[2] : "";
    let octave = m ? m[3] : "";
    let centsText = pitch.valid ? (pitch.cents >= 0 ? "+" : "\u2212") + Math.abs(Math.round(pitch.cents)) : "";
    let noteColor = pitch.valid ? (pitch.inTune ? IN_TUNE : STAGE.text) : STAGE.border;
    return (
        <div className="tuner-overlay" data-open={tuner ? "true" : "false"} aria-hidden={!tuner}
            onClick={() => { if (tuner) model.setPedalboardControl(tuner.instanceId, "MUTE", 0); }}
            style={{
                position: "fixed", left: 0, top: 0, right: 0, bottom: 0, zIndex: 1300,
                background: STAGE.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                opacity: tuner ? 1 : 0, pointerEvents: tuner ? "auto" : "none",
                transition: "opacity 180ms cubic-bezier(0.2, 0.8, 0.2, 1)", userSelect: "none", touchAction: "none",
            }}>
            <div style={{ fontFamily: STAGE.displayFont, fontSize: 16, letterSpacing: "0.2em", color: STAGE.accent, marginBottom: 6 }}>
                TUNER · OUTPUT MUTED
            </div>
            {/* Big note + cents. Green when within 3 cents. */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 18, height: 150, marginBottom: 4 }}>
                {pitch.valid ? (
                    <span style={{ fontFamily: STAGE.displayFont, fontSize: 150, lineHeight: 1, color: noteColor, transition: "color 120ms",
                        textShadow: pitch.inTune ? `0 0 28px ${IN_TUNE}66` : "none", minWidth: 110, textAlign: "right" }}>
                        {letter}
                    </span>
                ) : (
                    <span style={{ fontFamily: STAGE.displayFont, fontSize: 14, letterSpacing: "0.3em", color: STAGE.border, alignSelf: "center" }}>
                        LISTENING
                    </span>
                )}
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, minWidth: 120 }}>
                    <span style={{ fontFamily: STAGE.displayFont, fontSize: 44, lineHeight: 1, color: noteColor }}>{accidental}{octave}</span>
                    <span style={{ fontFamily: STAGE.displayFont, fontSize: 30, lineHeight: 1, letterSpacing: "0.04em",
                        color: pitch.valid ? (pitch.inTune ? IN_TUNE : STAGE.accent) : STAGE.border }}>
                        {centsText}{pitch.valid ? <span style={{ fontSize: 16, marginLeft: 6, color: STAGE.textDim }}>CENTS</span> : ""}
                    </span>
                </span>
            </div>
            {/* Bare dial (220x100 CSS px) scaled up; wrapper reserves the scaled box so flex layout stays honest. */}
            <div style={{ width: 220 * TUNER_SCALE, height: 100 * TUNER_SCALE, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {tuner && (
                    <div style={{ transform: `scale(${TUNER_SCALE})`, transformOrigin: "center" }}>
                        <GxTunerControl instanceId={tuner.instanceId} valueIsMidi={false} onPitchInfo={setPitch} />
                    </div>
                )}
            </div>
            <div style={{ fontFamily: STAGE.displayFont, fontSize: 12, letterSpacing: "0.16em", color: STAGE.textDim, marginTop: 36 }}>
                TAP ANYWHERE OR PRESS UP + DOWN TO RETURN
            </div>
        </div>
    );
}
