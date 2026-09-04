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

// Stage theme "Gig View": a full-screen mirror of the MIDI controller for playing.
// Two rows laid out like the pedal: top = snapshots A-D, bottom = a page of four
// presets + a pager. A preset with snapshots always has one active (server rule). Tapping a snapshot
// or preset tile does what the pedal switch does. The pager pages through the bank
// four presets at a time (the pedal's UP/DOWN switches still step presets; PiPedal's
// banks would give pedal parity). Opened by swiping up on the snapshot strip (or its
// handle); closed by swiping down anywhere or tapping the header.

import React from 'react';
import { PiPedalModel, PiPedalModelFactory, PresetIndex } from './PiPedalModel';
import { Pedalboard } from './Pedalboard';
import { snapshotColor, SNAPSHOT_STRIP_SLOTS } from './SnapshotStrip';
import { STAGE } from './StageTheme';

const PRESET_SLOTS = 4;                 // pedal bottom row: PC 0-3
const PRESET_COLOR = "#4d8dff";         // pedal shows presets blue
const ARROW_COLOR = "#ff9f1a";          // pedal shows the arrows orange
const SWIPE_CLOSE_PX = 70;

interface GigViewProps {
    open: boolean;
    pedalboard: Pedalboard;
    selectedSnapshot: number;
    onClose: () => void;
}
interface GigViewState {
    presets: PresetIndex;
    page: number | null;   // null = follow the selected preset
}

export default class GigView extends React.Component<GigViewProps, GigViewState> {
    private model: PiPedalModel;
    private swipeStartY: number | null = null;

    constructor(props: GigViewProps) {
        super(props);
        this.model = PiPedalModelFactory.getInstance();
        this.state = { presets: this.model.presets.get(), page: null };
        this.onPresetsChanged = this.onPresetsChanged.bind(this);
    }
    private onPresetsChanged(value: PresetIndex) { this.setState({ presets: value, page: null }); }

    componentDidMount() { this.model.presets.addOnChangedHandler(this.onPresetsChanged); }
    componentWillUnmount() { this.model.presets.removeOnChangedHandler(this.onPresetsChanged); }

    // ---- swipe down anywhere (tiles included) closes; the tap that ends a swipe is ignored ----
    private swiped = false;
    private onPointerDown(e: React.PointerEvent) {
        this.swipeStartY = e.clientY;
        this.swiped = false;
    }
    private onPointerUp(e: React.PointerEvent) {
        if (this.swipeStartY !== null && e.clientY - this.swipeStartY > SWIPE_CLOSE_PX) {
            this.swiped = true;
            this.props.onClose();
        }
        this.swipeStartY = null;
    }
    private tapAllowed(): boolean {
        if (this.swiped) { this.swiped = false; return false; }
        return true;
    }

    private tile(key: string, opts: {
        label: string; sub?: string; color: string; active?: boolean; dim?: boolean; onTap?: () => void; big?: boolean;
    }) {
        let { label, sub, color, active, dim, onTap, big } = opts;
        return (
            <div key={key} className="gig-tile"
                onClick={() => { if (this.tapAllowed() && onTap) onTap(); }}
                style={{
                    flex: big ? "1.4 1 0" : "1 1 0", minWidth: 0, borderRadius: 14, position: "relative",
                    padding: "14px 18px", boxSizing: "border-box", cursor: onTap ? "pointer" : "default",
                    background: dim ? "transparent" : STAGE.panelGradient,
                    border: dim ? `1px dashed ${STAGE.border}` : `1px solid ${active ? color + "a0" : STAGE.wire}`,
                    boxShadow: dim ? "none" : (active ? `${STAGE.innerHighlight}, ${STAGE.shadow}, 0 0 24px 0 ${color}55` : `${STAGE.innerHighlight}, ${STAGE.shadow}`),
                    userSelect: "none", WebkitTapHighlightColor: "transparent", touchAction: "none",
                    transition: `border-color ${STAGE.ease}, box-shadow ${STAGE.ease}`,
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: STAGE.displayFont, fontSize: 13, letterSpacing: "0.14em", color: STAGE.textDim, textTransform: "uppercase" }}>{key}</span>
                    <span style={{
                        width: 14, height: 14, borderRadius: "50%",
                        background: active ? color : (dim ? "#3a3d44" : color + "55"),
                        boxShadow: active ? `0 0 14px 3px ${color}99, inset 0 -1px 2px rgba(0,0,0,0.4)` : "inset 0 1px 2px rgba(0,0,0,0.6)",
                        transition: `background ${STAGE.ease}, box-shadow ${STAGE.ease}`,
                    }} />
                </div>
                <div>
                    <div style={{
                        fontFamily: STAGE.displayFont, fontSize: 23, letterSpacing: "0.01em", lineHeight: 1.15,
                        color: dim ? STAGE.border : (active ? STAGE.text : STAGE.textDim),
                        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
                        wordBreak: "break-word",
                    }}>{label}</div>
                    {sub && <div style={{ fontFamily: STAGE.bodyFont, fontSize: 13, color: STAGE.textDim, marginTop: 4 }}>{sub}</div>}
                </div>
            </div>
        );
    }

    // Two half-height buttons: page up / page down, with a "5–8 of 12" readout.
    private pagerTile(page: number, pageCount: number, total: number) {
        let first = page * PRESET_SLOTS + 1;
        let last = Math.min(total, (page + 1) * PRESET_SLOTS);
        let half = (label: string, enabled: boolean, onTap: () => void) => (
            <div onClick={() => { if (enabled && this.tapAllowed()) onTap(); }}
                style={{
                    flex: "1 1 0", display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: STAGE.displayFont, fontSize: 28, color: enabled ? ARROW_COLOR : STAGE.border,
                    cursor: enabled ? "pointer" : "default", userSelect: "none", WebkitTapHighlightColor: "transparent",
                }}>{label}</div>
        );
        return (
            <div key="pager" className="gig-tile" style={{
                flex: "1 1 0", minWidth: 0, borderRadius: 14, boxSizing: "border-box",
                background: STAGE.panelGradient, border: `1px solid ${STAGE.wire}`,
                boxShadow: `${STAGE.innerHighlight}, ${STAGE.shadow}`, touchAction: "none",
                display: "flex", flexDirection: "column", overflow: "hidden",
            }}>
                {half("▲", page > 0, () => this.setState({ page: page - 1 }))}
                <div style={{
                    textAlign: "center", fontFamily: STAGE.displayFont, fontSize: 12, letterSpacing: "0.1em",
                    color: STAGE.textDim, padding: "4px 0", borderTop: `1px solid ${STAGE.border}`, borderBottom: `1px solid ${STAGE.border}`,
                }}>{total === 0 ? "NO PRESETS" : `${first}–${last} OF ${total}`}</div>
                {half("▼", page < pageCount - 1, () => this.setState({ page: page + 1 }))}
            </div>
        );
    }

    render() {
        if (!this.props.open) return null;
        let presets = this.state.presets;
        let pb = this.props.pedalboard;
        let current = presets.presets.find((p) => p.instanceId === presets.selectedInstanceId);
        let activeSnapshot = this.props.selectedSnapshot >= 0 ? pb.snapshots[this.props.selectedSnapshot] : null;

        let top: React.ReactNode[] = [];
        for (let i = 0; i < SNAPSHOT_STRIP_SLOTS; ++i) {
            let s = i < pb.snapshots.length ? pb.snapshots[i] : null;
            top.push(this.tile(String.fromCharCode(65 + i), {
                label: s ? s.name : "—", color: snapshotColor(s?.color), active: s !== null && i === this.props.selectedSnapshot, dim: s === null,
                onTap: s ? () => this.model.selectSnapshot(i) : undefined,
            }));
        }
        // Fifth column stays empty so the rows line up with the pedal (its UP switch
        // steps presets; the screen pages via the pager below).
        top.push(<div key="spacer" style={{ flex: "1 1 0", minWidth: 0 }} />);

        // Presets come in pages of four (the pedal's PC 0-3 row). Default page = the one
        // holding the selected preset.
        let selectedIx = Math.max(0, presets.presets.findIndex((p) => p.instanceId === presets.selectedInstanceId));
        let pageCount = Math.max(1, Math.ceil(presets.presets.length / PRESET_SLOTS));
        let page = this.state.page ?? Math.floor(selectedIx / PRESET_SLOTS);
        page = Math.min(Math.max(0, page), pageCount - 1);
        let bottom: React.ReactNode[] = [];
        for (let i = 0; i < PRESET_SLOTS; ++i) {
            let ix = page * PRESET_SLOTS + i;
            let p = ix < presets.presets.length ? presets.presets[ix] : null;
            bottom.push(this.tile(String(ix + 1), {
                label: p ? p.name : "—", color: PRESET_COLOR, active: p !== null && p.instanceId === presets.selectedInstanceId, dim: p === null,
                onTap: p ? () => this.model.loadPreset(p.instanceId) : undefined,
            }));
        }
        bottom.push(this.pagerTile(page, pageCount, presets.presets.length));

        return (
            <div className="gig-view"
                onPointerDown={(e) => this.onPointerDown(e)} onPointerUp={(e) => this.onPointerUp(e)}
                style={{
                    position: "fixed", left: 0, top: 0, right: 0, bottom: 0, zIndex: 1250, background: STAGE.bg,
                    display: "flex", flexDirection: "column", padding: "10px 16px 14px 16px", boxSizing: "border-box",
                    touchAction: "none", userSelect: "none",
                }}>
                <div onClick={() => { if (this.tapAllowed()) this.props.onClose(); }} style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "4px 6px 12px 6px", cursor: "pointer" }}>
                    <span style={{ fontFamily: STAGE.displayFont, fontSize: 34, letterSpacing: "0.01em", color: STAGE.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {current ? current.name : ""}
                    </span>
                    {activeSnapshot && (
                        <span style={{ fontFamily: STAGE.displayFont, fontSize: 20, color: snapshotColor(activeSnapshot.color) }}>{activeSnapshot.name}</span>
                    )}
                    <span style={{ flex: "1 1 auto" }} />
                    <span style={{ fontFamily: STAGE.displayFont, fontSize: 12, letterSpacing: "0.12em", color: STAGE.textDim }}>SWIPE DOWN TO CLOSE</span>
                </div>
                <div style={{ flex: "1 1 0", display: "flex", gap: 14, minHeight: 0 }}>{top}</div>
                <div style={{ height: 14 }} />
                <div style={{ flex: "1 1 0", display: "flex", gap: 14, minHeight: 0 }}>{bottom}</div>
            </div>
        );
    }
}
