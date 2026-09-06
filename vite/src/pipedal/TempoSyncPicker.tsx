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

// Tempo-sync picker driven from the pedal: hold the encoder to open it for the selected
// block's time knob, turn to move the highlight, push to confirm, hold again to cancel.
// While it is open the server routes encoder events here instead of tap/nudge.

import React from 'react';
import { PiPedalModel, PiPedalModelFactory } from './PiPedalModel';
import { TempoSyncSheet, TempoSyncTarget, TEMPO_SYNC_OPTIONS, findTempoSyncTarget, tempoSyncBinding, tempoSyncOptionIndex, setTempoSync, subdivisionFor } from './TempoSync';

interface TempoSyncPickerProps { primaryColor: string; }
interface TempoSyncPickerState {
    target: TempoSyncTarget | null;
    highlight: number;
}

export default class TempoSyncPicker extends React.Component<TempoSyncPickerProps, TempoSyncPickerState> {
    private model: PiPedalModel;
    private lastSeq = 0;

    constructor(props: TempoSyncPickerProps) {
        super(props);
        this.model = PiPedalModelFactory.getInstance();
        this.state = { target: null, highlight: 0 };
        this.onEvent = this.onEvent.bind(this);
    }
    componentDidMount() {
        this.lastSeq = this.model.tempoPickerEvent.get().seq;
        this.model.tempoPickerEvent.addOnChangedHandler(this.onEvent);
    }
    componentWillUnmount() {
        this.model.tempoPickerEvent.removeOnChangedHandler(this.onEvent);
        if (this.state.target) this.model.setTempoPickerOpen(false);
    }
    private currentScale(target: TempoSyncTarget): number | null {
        let b = tempoSyncBinding(this.model.pedalboard.get(), target.instanceId, target.control.symbol);
        return b ? subdivisionFor(b.rotaryScale).scale : null;
    }
    private open() {
        let target = findTempoSyncTarget(this.model);
        if (!target) return; // nothing in this preset can follow tempo
        this.setState({ target: target, highlight: tempoSyncOptionIndex(this.currentScale(target)) });
        this.model.setTempoPickerOpen(true);
    }
    private close() {
        if (!this.state.target) return;
        this.setState({ target: null });
        this.model.setTempoPickerOpen(false);
    }
    private choose(scale: number | null) {
        let target = this.state.target;
        if (target) setTempoSync(this.model, target.instanceId, target.control.symbol, scale);
        this.close();
    }
    private onEvent(ev: { seq: number; kind: number; delta: number }) {
        if (ev.seq === this.lastSeq) return;
        this.lastSeq = ev.seq;
        switch (ev.kind) {
            case 0:
                if (this.state.target) this.close(); else this.open();
                break;
            case 1:
                if (this.state.target) {
                    let n = TEMPO_SYNC_OPTIONS.length;
                    this.setState((s) => ({ highlight: (((s.highlight + ev.delta) % n) + n) % n }));
                }
                break;
            case 2:
                if (this.state.target) this.choose(TEMPO_SYNC_OPTIONS[this.state.highlight]);
                break;
        }
    }
    render() {
        let target = this.state.target;
        if (!target) return null;
        return (
            <TempoSyncSheet open={true} title={target.itemName + " · " + target.control.name + " · Tempo sync"}
                currentScale={this.currentScale(target)} highlight={this.state.highlight}
                primaryColor={this.props.primaryColor}
                onChoose={(scale) => this.choose(scale)} onClose={() => this.close()} />
        );
    }
}
