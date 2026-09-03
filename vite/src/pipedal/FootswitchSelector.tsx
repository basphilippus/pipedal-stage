// Copyright (c) 2026 PiPedal contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to do
// so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import React from 'react';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import { PiPedalModel, PiPedalModelFactory } from './PiPedalModel';
import { PedalboardItem } from './Pedalboard';
import MidiBinding from './MidiBinding';
import { Footswitch } from './FootswitchConfig';
import FootswitchEditDialog from './FootswitchEditDialog';
import ToolTipEx from './ToolTipEx';

// Quick-assign selector: binds the selected block's bypass to a named foot
// switch (a MIDI CC, toggle-on-rising-edge), stealing the CC from any other
// block in the preset. Shown next to the bypass switch in the main toolbar.

interface FootswitchSelectorProps {
    pedalboardItem: PedalboardItem | null;
}

interface FootswitchSelectorState {
    menuAnchorEl: HTMLElement | null;
    editDialogOpen: boolean;
    footswitches: Footswitch[];
}

export default class FootswitchSelector
    extends React.Component<FootswitchSelectorProps, FootswitchSelectorState> {

    private model: PiPedalModel;

    constructor(props: FootswitchSelectorProps) {
        super(props);
        this.model = PiPedalModelFactory.getInstance();
        this.state = {
            menuAnchorEl: null,
            editDialogOpen: false,
            footswitches: this.model.footswitches.get()
        };
        this.onFootswitchesChanged = this.onFootswitchesChanged.bind(this);
    }

    private onFootswitchesChanged(value: Footswitch[]) {
        this.setState({ footswitches: value });
    }

    componentDidMount() {
        this.model.footswitches.addOnChangedHandler(this.onFootswitchesChanged);
        this.setState({ footswitches: this.model.footswitches.get() });
    }

    componentWillUnmount() {
        this.model.footswitches.removeOnChangedHandler(this.onFootswitchesChanged);
    }

    private currentCc(): number | null {
        let item = this.props.pedalboardItem;
        if (!item) return null;
        let binding = item.getMidiBinding("__bypass");
        if (binding.bindingType !== MidiBinding.BINDING_TYPE_CONTROL) return null;
        return binding.control;
    }

    // CCs bound to snapshot1..6 in System MIDI bindings select snapshots; a block bound to
    // the same CC would toggle on every snapshot change.
    private snapshotCcs(): Set<number> {
        let result = new Set<number>();
        for (let b of this.model.systemMidiBindings.get()) {
            if (b.bindingType === MidiBinding.BINDING_TYPE_CONTROL && /^snapshot[1-6]$/.test(b.symbol)) {
                result.add(b.control);
            }
        }
        return result;
    }
    private currentLabel(): string {
        let cc = this.currentCc();
        if (cc === null) return "–"; // – unassigned
        let footswitch = this.state.footswitches.find((s) => s.cc === cc);
        let label = footswitch ? footswitch.name : "CC" + cc;
        return this.snapshotCcs().has(cc) ? label + " !" : label;
    }

    private handleSelect(cc: number | null) {
        this.setState({ menuAnchorEl: null });
        let item = this.props.pedalboardItem;
        if (!item) return;
        this.model.setBypassFootswitch(item.instanceId, cc);
    }

    render() {
        let item = this.props.pedalboardItem;
        if (!item || item.isEmpty() || item.isSplit() || item.isStart() || item.isEnd()) {
            return null;
        }
        let currentCc = this.currentCc();
        return (
            <div style={{ flex: "0 0 auto" }}>
                <ToolTipEx title={currentCc !== null && this.snapshotCcs().has(currentCc)
                    ? "Foot switch — CC also selects a snapshot; unassign (–) to stop the double action"
                    : "Foot switch"}>
                    <Button size="small" variant="text" color="inherit"
                        style={{ textTransform: "none", minWidth: 36, opacity: currentCc === null ? 0.6 : 1.0 }}
                        onClick={(e) => this.setState({ menuAnchorEl: e.currentTarget })}
                    >
                        {this.currentLabel()}
                    </Button>
                </ToolTipEx>
                <Menu anchorEl={this.state.menuAnchorEl}
                    open={this.state.menuAnchorEl !== null}
                    onClose={() => this.setState({ menuAnchorEl: null })}
                >
                    <MenuItem selected={currentCc === null} onClick={() => this.handleSelect(null)}>
                        {"–"}
                    </MenuItem>
                    {this.state.footswitches.filter((footswitch) => !this.snapshotCcs().has(footswitch.cc)).map((footswitch) => (
                        <MenuItem key={footswitch.cc} selected={currentCc === footswitch.cc}
                            onClick={() => this.handleSelect(footswitch.cc)}>
                            {footswitch.name + " (CC " + footswitch.cc + ")"}
                        </MenuItem>
                    ))}
                    {this.state.footswitches.some((footswitch) => this.snapshotCcs().has(footswitch.cc)) && (
                        <MenuItem disabled dense>
                            {this.state.footswitches.filter((f) => this.snapshotCcs().has(f.cc)).map((f) => f.name).join(", ") + ": snapshot switches"}
                        </MenuItem>
                    )}
                    <Divider />
                    <MenuItem onClick={() => this.setState({ menuAnchorEl: null, editDialogOpen: true })}>
                        Edit switches…
                    </MenuItem>
                </Menu>
                <FootswitchEditDialog
                    open={this.state.editDialogOpen}
                    footswitches={this.state.footswitches}
                    onClose={() => this.setState({ editDialogOpen: false })}
                    onOk={(switches) => {
                        this.setState({ editDialogOpen: false });
                        this.model.setFootswitchConfig(switches);
                    }}
                />
            </div>
        );
    }
}
