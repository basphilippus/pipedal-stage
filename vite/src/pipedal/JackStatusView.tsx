// Copyright (c) Robin E.R. Davies
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

import React from 'react';
import { PiPedalModel, PiPedalModelFactory,State } from './PiPedalModel';
import JackHostStatus from './JackHostStatus';
import { isStageTheme } from './DarkMode';
import { STAGE } from './StageTheme';




interface JackStatusViewProps {

};

interface JackStatusViewState {
    jackStatus?: JackHostStatus;
}


export default class JackStatusView extends React.Component<JackStatusViewProps, JackStatusViewState>
{
    model: PiPedalModel;

    constructor(props: JackStatusViewProps) {
        super(props);
        this.state = {
            jackStatus: undefined
        };
        this.model = PiPedalModelFactory.getInstance();
        this.tick = this.tick.bind(this);
    }

    private waitingForTick: boolean = false;
    tick() {
        if (this.model.state.get() === State.Ready) {
            if (this.waitingForTick) return;
            this.waitingForTick = true;
            this.model.getJackStatus()
                .then(jackStatus => {
                    this.waitingForTick = false;
                    this.setState({jackStatus: jackStatus});
                })
                .catch(error => { 
                    this.waitingForTick = false;
                });
        } else {
            this.waitingForTick = false;
        }
    }

    timerHandle?: number;
    componentDidMount() {
        this.timerHandle = setInterval(this.tick, 1000);
    }
    componentWillUnmount() {
        if (this.timerHandle) {
            clearTimeout(this.timerHandle);
            this.timerHandle = undefined;
        }
    }

    render() {
        if (isStageTheme()) {
            // Stage: no permanent diagnostics readout. Show a small chip only when
            // something is wrong (recent xrun, audio stopped, SoC too hot).
            let st = this.state.jackStatus;
            if (!st) return null;
            let recentXrun = st.msSinceLastUnderrun >= 0 && st.msSinceLastUnderrun < 15 * 1000;
            let hot = st.temperaturemC > 75000;
            let down = !st.active || st.restarting;
            if (!recentXrun && !hot && !down) return null;
            let text = down ? "AUDIO STOPPED"
                : (recentXrun ? "XRUN " + st.underruns : "") + (recentXrun && hot ? " · " : "") + (hot ? Math.round(st.temperaturemC / 1000) + "°C" : "");
            return (
                <div style={{
                    position: "absolute", right: 16, bottom: 110, zIndex: 10,
                    padding: "4px 10px", borderRadius: 6,
                    background: "rgba(255,77,77,0.12)", border: "1px solid rgba(255,77,77,0.5)", color: "#ff6b6b",
                    fontFamily: STAGE.displayFont, fontSize: 12, letterSpacing: "0.08em", whiteSpace: "nowrap",
                }}>
                    {text}
                </div>
            );
        }
        return (
            <div style={{
                position: "absolute", right: 30, bottom: 2,left: 30, height: 30, 
                paddingRight: 20, paddingBottom: 6,
                textAlign: "center", opacity: 0.7, whiteSpace: "nowrap", fontSize: 12, zIndex: 10, fontWeight: 900
            }}>
                {JackHostStatus.getDisplayView("",this.state.jackStatus) }
            </div>
        );

    }
}