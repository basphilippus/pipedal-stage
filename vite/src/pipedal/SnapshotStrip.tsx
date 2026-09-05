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

// Stage theme: the snapshot strip. One tile per pedal switch (snapshots 1..4 of the
// current preset), mirroring the controller's top row. Tap = recall. Long-press = a
// small sheet to save the current sound into the slot, rename/recolour, copy from
// another slot, or clear it. The main page is the snapshot editor: whatever you
// change edits the active snapshot, and the tile shows a drift dot until saved.

import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { PiPedalModel, PiPedalModelFactory } from './PiPedalModel';
import { Pedalboard, Snapshot } from './Pedalboard';
import { colorKeys } from './MaterialColors';
import { STAGE } from './StageTheme';

export const SNAPSHOT_STRIP_SLOTS = 4;
const LONG_PRESS_MS = 450;

// Vivid tile/LED colours for the Material colour keys used by snapshots. Same
// grouping as MidiFeedbackController::ColorForColorKey so screen and pedal agree.
const KEY_COLORS: { [key: string]: string } = {
    red: "#ff4d4d", deepOrange: "#ff6a3d", pink: "#ff5fa2",
    orange: "#ff9f1a", amber: "#ffbf2e",
    yellow: "#f5d64d", lime: "#d4e157",
    green: "#3ddc84", lightGreen: "#8be04e", teal: "#2ec4b6",
    cyan: "#36d6e7", lightBlue: "#4fc3f7",
    blue: "#4d8dff", indigo: "#7986ff",
    purple: "#c06cff", deepPurple: "#9b6bff",
    grey: "#cfd3d9", blueGrey: "#a9b4c2", brown: "#c8a27a",
};
export function snapshotColor(key: string | undefined): string {
    return (key && KEY_COLORS[key]) || "#e6e8ec";
}
// Default colours for slots saved without choosing one.
const DEFAULT_SLOT_COLORS = ["amber", "red", "cyan", "purple", "green", "blue"];

interface SnapshotStripProps {
    pedalboard: Pedalboard;
    selectedSnapshot: number;
    onOpenGigView?: () => void;   // swipe up on the strip, or tap its handle
}
interface SnapshotStripState {
    sheetIndex: number;         // slot open in the sheet, -1 = closed
    sheetName: string;
    sheetColor: string;
    copyMenuAnchor: HTMLElement | null;
    tick: number;               // bumps on snapshot-modified events (pedalboard is mutated in place)
}

export default class SnapshotStrip extends React.Component<SnapshotStripProps, SnapshotStripState> {
    private model: PiPedalModel;
    private pressTimer?: number;
    private pressFired = false;
    private swipeStartY: number | null = null;
    private static readonly SWIPE_OPEN_PX = 60;

    constructor(props: SnapshotStripProps) {
        super(props);
        this.model = PiPedalModelFactory.getInstance();
        this.state = { sheetIndex: -1, sheetName: "", sheetColor: "", copyMenuAnchor: null, tick: 0 };
        this.onSnapshotModified = this.onSnapshotModified.bind(this);
    }
    private onSnapshotModified() {
        this.setState({ tick: this.state.tick + 1 });
    }
    componentDidMount() {
        this.model.onSnapshotModified.addEventHandler(this.onSnapshotModified);
    }
    componentWillUnmount() {
        this.model.onSnapshotModified.removeEventHandler(this.onSnapshotModified);
        this.clearPressTimer();
    }

    private snapshots(): (Snapshot | null)[] {
        let result = Snapshot.cloneSnapshots(this.props.pedalboard.snapshots);
        while (result.length < 6) result.push(null);
        return result;
    }
    private slot(index: number): Snapshot | null {
        let snapshots = this.props.pedalboard.snapshots;
        return index < snapshots.length ? snapshots[index] : null;
    }

    // ---- gestures ----
    private clearPressTimer() {
        if (this.pressTimer !== undefined) {
            window.clearTimeout(this.pressTimer);
            this.pressTimer = undefined;
        }
    }
    private onPointerDown(index: number) {
        this.pressFired = false;
        this.clearPressTimer();
        this.pressTimer = window.setTimeout(() => {
            this.pressTimer = undefined;
            this.pressFired = true;
            this.openSheet(index);
        }, LONG_PRESS_MS);
    }
    private onPointerUp(index: number, e?: React.PointerEvent) {
        let wasPending = this.pressTimer !== undefined;
        this.clearPressTimer();
        // Swipe up from a tile opens the Gig View instead of tapping the tile.
        if (e && this.swipeStartY !== null && this.swipeStartY - e.clientY > SnapshotStrip.SWIPE_OPEN_PX) {
            this.swipeStartY = null;
            this.props.onOpenGigView?.();
            return;
        }
        this.swipeStartY = null;
        if (wasPending && !this.pressFired) {
            // short tap: recall (empty slot: open the sheet so it can be saved)
            if (this.slot(index)) {
                this.model.selectSnapshot(index);
            } else {
                this.openSheet(index);
            }
        }
    }
    private onPointerCancel() {
        this.clearPressTimer();
    }

    // ---- sheet ----
    private openSheet(index: number) {
        let snapshot = this.slot(index);
        this.setState({
            sheetIndex: index,
            sheetName: snapshot ? snapshot.name : "Snap " + (index + 1),
            sheetColor: snapshot ? snapshot.color : DEFAULT_SLOT_COLORS[index % DEFAULT_SLOT_COLORS.length],
            copyMenuAnchor: null,
        });
    }
    private closeSheet() {
        this.setState({ sheetIndex: -1, copyMenuAnchor: null });
    }
    private sheetNameOrDefault(): string {
        let name = this.state.sheetName.trim();
        return name === "" ? "Snap " + (this.state.sheetIndex + 1) : name;
    }
    private saveHere() {
        let index = this.state.sheetIndex;
        let snapshots = this.snapshots();
        let snapshot = this.props.pedalboard.makeSnapshot();
        snapshot.name = this.sheetNameOrDefault();
        snapshot.color = this.state.sheetColor;
        snapshots[index] = snapshot;
        this.model.setSnapshots(snapshots, index);
        this.model.saveCurrentPreset(); // snapshots live in the preset: persist, or a preset change loses them
        this.closeSheet();
    }
    private applyNameAndColor() {
        let index = this.state.sheetIndex;
        let snapshots = this.snapshots();
        let snapshot = snapshots[index];
        if (snapshot) {
            snapshot.name = this.sheetNameOrDefault();
            snapshot.color = this.state.sheetColor;
            this.model.setSnapshots(snapshots, -1);
            this.model.saveCurrentPreset();
        }
        this.closeSheet();
    }
    private copyFrom(sourceIndex: number) {
        let index = this.state.sheetIndex;
        let snapshots = this.snapshots();
        let source = snapshots[sourceIndex];
        if (source) {
            let copy = Snapshot.cloneSnapshots([source])[0]!;
            copy.name = this.sheetNameOrDefault();
            copy.color = this.state.sheetColor;
            copy.isModified = false;
            snapshots[index] = copy;
            this.model.setSnapshots(snapshots, -1);
            this.model.saveCurrentPreset();
        }
        this.closeSheet();
    }
    // Back to the preset as saved, with no snapshot selected (see GigView.recallBase).
    private recallBase() {
        let presets = this.model.presets.get();
        if (presets.selectedInstanceId !== 0) {
            this.model.loadPreset(presets.selectedInstanceId);
        }
        this.model.selectSnapshot(-1);
        this.closeSheet();
    }
    private clearSlot() {
        let index = this.state.sheetIndex;
        let snapshots = this.snapshots();
        snapshots[index] = null;
        this.model.setSnapshots(snapshots, -1);
        this.model.saveCurrentPreset();
        this.closeSheet();
    }

    // ---- render ----
    private renderTile(index: number) {
        let snapshot = this.slot(index);
        let active = index === this.props.selectedSnapshot && snapshot !== null;
        let color = snapshotColor(snapshot?.color);
        let letter = String.fromCharCode(65 + index); // A, B, C, D = pedal switch names
        return (
            <div key={index}
                onPointerDown={(e) => { e.preventDefault(); this.swipeStartY = e.clientY; this.onPointerDown(index); }}
                onPointerUp={(e) => this.onPointerUp(index, e)}
                onPointerCancel={() => this.onPointerCancel()}
                onContextMenu={(e) => { e.preventDefault(); }}
                style={{
                    flex: "1 1 0", minWidth: 0, height: 60, borderRadius: 10, position: "relative",
                    padding: "7px 14px", boxSizing: "border-box", cursor: "pointer",
                    background: snapshot
                        ? (active ? `linear-gradient(180deg, ${color}55 0%, ${color}22 100%), ${STAGE.panel}` : STAGE.panelGradient)
                        : "transparent",
                    border: snapshot ? `1px solid ${active ? color : STAGE.wire}` : `1px dashed ${STAGE.border}`,
                    borderLeft: snapshot ? `4px solid ${color}` : `1px dashed ${STAGE.border}`,
                    boxShadow: snapshot
                        ? (active ? `${STAGE.innerHighlight}, ${STAGE.shadow}, 0 0 14px 0 ${color}40` : `${STAGE.innerHighlight}, ${STAGE.shadow}`)
                        : "none",
                    userSelect: "none", WebkitTapHighlightColor: "transparent", touchAction: "none", // no pan: a touch must not turn into pointercancel
                    transition: `border-color ${STAGE.ease}, box-shadow ${STAGE.ease}`,
                }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                        fontFamily: STAGE.displayFont, fontSize: 13, letterSpacing: "0.12em",
                        color: snapshot ? color : STAGE.textDim, textTransform: "uppercase",
                    }}>{letter}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {snapshot?.isModified && (
                            <span title="Changed since saved" style={{
                                fontFamily: STAGE.displayFont, fontSize: 10, letterSpacing: "0.1em", color: STAGE.accent,
                            }}>EDITED</span>
                        )}
                        <span style={{
                            width: 11, height: 11, borderRadius: "50%",
                            background: active ? color : (snapshot ? color + "55" : "#3a3d44"),
                            boxShadow: active ? `0 0 10px 2px ${color}99, inset 0 -1px 2px rgba(0,0,0,0.4)` : "inset 0 1px 2px rgba(0,0,0,0.6)",
                            transition: `background ${STAGE.ease}, box-shadow ${STAGE.ease}`,
                        }} />
                    </span>
                </div>
                <div style={{
                    marginTop: 2, fontFamily: STAGE.displayFont, fontSize: 17, letterSpacing: "0.02em",
                    color: snapshot ? (active ? STAGE.text : STAGE.textDim) : STAGE.border,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{snapshot ? snapshot.name : "—"}</div>
            </div>
        );
    }

    private renderSheet() {
        let index = this.state.sheetIndex;
        if (index < 0) return null;
        let existing = this.slot(index) !== null;
        let others: number[] = [];
        for (let i = 0; i < 6; ++i) {
            if (i !== index && this.slot(i)) others.push(i);
        }
        return (
            <Dialog open={true} onClose={() => this.closeSheet()} maxWidth="xs" fullWidth className="snapshot-sheet">
                <DialogTitle style={{ fontFamily: STAGE.displayFont, letterSpacing: "0.04em" }}>
                    Snapshot {String.fromCharCode(65 + index)}
                </DialogTitle>
                <DialogContent>
                    <TextField variant="standard" fullWidth label="Name" value={this.state.sheetName}
                        inputProps={{ maxLength: 16 }}
                        onChange={(e) => this.setState({ sheetName: e.target.value })} />
                    <div className="snapshot-sheet-extra" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                        {colorKeys.map((key) => (
                            <div key={key} onClick={() => this.setState({ sheetColor: key })}
                                style={{
                                    width: 26, height: 26, borderRadius: "50%", background: snapshotColor(key), cursor: "pointer",
                                    boxShadow: key === this.state.sheetColor ? `0 0 0 2px ${STAGE.bg}, 0 0 0 4px ${STAGE.text}` : "none",
                                }} />
                        ))}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
                        <Button variant="contained" color="primary" onClick={() => this.saveHere()}>
                            {existing ? "Save current sound here" : "Save current sound"}
                        </Button>
                        <div className="snapshot-sheet-extra" style={{ fontSize: 12, color: STAGE.textDim, textAlign: "center" }}>
                            Saves the preset too.
                        </div>
                        {others.length > 0 && (
                            <Button className="snapshot-sheet-extra" variant="outlined" color="inherit" onClick={(e) => this.setState({ copyMenuAnchor: e.currentTarget })}>
                                Copy from…
                            </Button>
                        )}
                        <Menu anchorEl={this.state.copyMenuAnchor} open={this.state.copyMenuAnchor !== null}
                            onClose={() => this.setState({ copyMenuAnchor: null })}>
                            {others.map((i) => (
                                <MenuItem key={i} onClick={() => this.copyFrom(i)}>
                                    {String.fromCharCode(65 + i)} · {this.slot(i)!.name}
                                </MenuItem>
                            ))}
                        </Menu>
                        {this.props.selectedSnapshot >= 0 && (
                            <Button className="snapshot-sheet-extra" variant="outlined" color="inherit" onClick={() => this.recallBase()}>
                                Back to preset (no snapshot)
                            </Button>
                        )}
                        {existing && (
                            <Button className="snapshot-sheet-extra" variant="text" color="inherit" style={{ opacity: 0.7 }} onClick={() => this.clearSlot()}>
                                Clear slot
                            </Button>
                        )}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button variant="dialogSecondary" onClick={() => this.closeSheet()}>Cancel</Button>
                    {existing && (
                        <Button variant="dialogPrimary" onClick={() => this.applyNameAndColor()}>Apply name &amp; colour</Button>
                    )}
                </DialogActions>
            </Dialog>
        );
    }

    render() {
        let tiles: React.ReactNode[] = [];
        for (let i = 0; i < SNAPSHOT_STRIP_SLOTS; ++i) tiles.push(this.renderTile(i));
        return (
            <div style={{
                flex: "0 0 auto", display: "flex", flexFlow: "row nowrap", gap: 12,
                padding: "8px 16px 10px 16px", borderTop: `1px solid ${STAGE.border}`, background: STAGE.bg,
            }}>
                {tiles}
                {this.props.onOpenGigView && (
                    <div className="gig-handle" onClick={() => this.props.onOpenGigView!()}
                        title="Gig view"
                        style={{
                            flex: "0 0 34px", height: 60, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                            border: `1px solid ${STAGE.border}`, color: STAGE.textDim, fontSize: 18, cursor: "pointer",
                            userSelect: "none", WebkitTapHighlightColor: "transparent",
                        }}>⌃</div>
                )}
                {this.renderSheet()}
            </div>
        );
    }
}
