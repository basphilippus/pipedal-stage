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
import GxTunerControl from './GxTunerControl';
import { STAGE } from './StageTheme';

export const TOOB_TUNER_URI = "http://two-play.com/plugins/toob-tuner";
const TUNER_SCALE = 2.2;

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
    return (
        <div className="tuner-overlay" data-open={tuner ? "true" : "false"} aria-hidden={!tuner}
            onClick={() => { if (tuner) model.setPedalboardControl(tuner.instanceId, "MUTE", 0); }}
            style={{
                position: "fixed", left: 0, top: 0, right: 0, bottom: 0, zIndex: 1300,
                background: STAGE.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                opacity: tuner ? 1 : 0, pointerEvents: tuner ? "auto" : "none",
                transition: "opacity 180ms cubic-bezier(0.2, 0.8, 0.2, 1)", userSelect: "none", touchAction: "none",
            }}>
            <div style={{ fontFamily: STAGE.displayFont, fontSize: 16, letterSpacing: "0.2em", color: STAGE.accent, marginBottom: 28 }}>
                TUNER · OUTPUT MUTED
            </div>
            {/* Bare dial (220x100 CSS px) scaled up; wrapper reserves the scaled box so flex layout stays honest. */}
            <div style={{ width: 220 * TUNER_SCALE, height: 100 * TUNER_SCALE, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {tuner && (
                    <div style={{ transform: `scale(${TUNER_SCALE})`, transformOrigin: "center" }}>
                        <GxTunerControl instanceId={tuner.instanceId} valueIsMidi={false} />
                    </div>
                )}
            </div>
            <div style={{ fontFamily: STAGE.displayFont, fontSize: 12, letterSpacing: "0.16em", color: STAGE.textDim, marginTop: 36 }}>
                TAP ANYWHERE OR PRESS UP + DOWN TO RETURN
            </div>
        </div>
    );
}
