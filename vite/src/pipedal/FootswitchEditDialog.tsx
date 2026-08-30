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
import DialogEx from './DialogEx';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import ClearIcon from '@mui/icons-material/Clear';
import { Footswitch, isValidFootswitchName, isValidFootswitchCc } from './FootswitchConfig';

interface EditRow {
    name: string;
    ccText: string;
}

interface FootswitchEditDialogProps {
    open: boolean;
    footswitches: Footswitch[];
    onOk: (switches: Footswitch[]) => void;
    onClose: () => void;
}

interface FootswitchEditDialogState {
    rows: EditRow[];
}

function toRows(switches: Footswitch[]): EditRow[] {
    return switches.map((s) => ({ name: s.name, ccText: s.cc.toString() }));
}

export default class FootswitchEditDialog
    extends React.Component<FootswitchEditDialogProps, FootswitchEditDialogState> {

    constructor(props: FootswitchEditDialogProps) {
        super(props);
        this.state = { rows: toRows(props.footswitches) };
    }

    componentDidUpdate(prevProps: FootswitchEditDialogProps) {
        if (this.props.open && !prevProps.open) {
            this.setState({ rows: toRows(this.props.footswitches) });
        }
    }

    private parseCc(text: string): number | null {
        if (!/^\d+$/.test(text.trim())) return null;
        let value = parseInt(text.trim(), 10);
        return isValidFootswitchCc(value) ? value : null;
    }

    private rowErrors(): { name: boolean, cc: boolean }[] {
        let ccCounts = new Map<number, number>();
        for (let row of this.state.rows) {
            let cc = this.parseCc(row.ccText);
            if (cc !== null) {
                ccCounts.set(cc, (ccCounts.get(cc) ?? 0) + 1);
            }
        }
        return this.state.rows.map((row) => {
            let cc = this.parseCc(row.ccText);
            return {
                name: !isValidFootswitchName(row.name),
                cc: cc === null || (ccCounts.get(cc) ?? 0) > 1
            };
        });
    }

    private hasErrors(): boolean {
        return this.rowErrors().some((e) => e.name || e.cc);
    }

    private handleAdd() {
        let used = new Set<number>();
        for (let row of this.state.rows) {
            let cc = this.parseCc(row.ccText);
            if (cc !== null) used.add(cc);
        }
        let nextCc = 15;
        while (used.has(nextCc) && nextCc <= 119) ++nextCc;
        this.setState({
            rows: [...this.state.rows,
            { name: String.fromCharCode(65 + (this.state.rows.length % 26)), ccText: nextCc.toString() }]
        });
    }

    private handleOk() {
        let switches: Footswitch[] = this.state.rows.map((row) => ({
            name: row.name.trim(),
            cc: this.parseCc(row.ccText) as number
        }));
        this.props.onOk(switches);
    }

    render() {
        let errors = this.rowErrors();
        return (
            <DialogEx tag="footswitchEdit" open={this.props.open} onClose={this.props.onClose}
                onEnterKey={() => { if (!this.hasErrors()) this.handleOk(); }}
            >
                <DialogTitle>Foot switches</DialogTitle>
                <DialogContent>
                    {this.state.rows.map((row, index) => (
                        <div key={index} style={{ display: "flex", flexFlow: "row nowrap", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                            <TextField variant="standard" label="Name" value={row.name}
                                error={errors[index].name}
                                inputProps={{ maxLength: 8 }}
                                style={{ width: 100 }}
                                onChange={(e) => {
                                    let rows = [...this.state.rows];
                                    rows[index] = { ...rows[index], name: e.target.value };
                                    this.setState({ rows: rows });
                                }} />
                            <TextField variant="standard" label="CC" value={row.ccText}
                                error={errors[index].cc}
                                helperText={errors[index].cc ? "0-119, unique" : " "}
                                style={{ width: 80 }}
                                onChange={(e) => {
                                    let rows = [...this.state.rows];
                                    rows[index] = { ...rows[index], ccText: e.target.value };
                                    this.setState({ rows: rows });
                                }} />
                            <IconButton aria-label="remove" size="small"
                                onClick={() => {
                                    let rows = [...this.state.rows];
                                    rows.splice(index, 1);
                                    this.setState({ rows: rows });
                                }}>
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </div>
                    ))}
                    <Button variant="text" onClick={() => this.handleAdd()}>Add switch</Button>
                </DialogContent>
                <DialogActions>
                    <Button variant="dialogSecondary" onClick={this.props.onClose}>Cancel</Button>
                    <Button variant="dialogPrimary" disabled={this.hasErrors()}
                        onClick={() => this.handleOk()}>OK</Button>
                </DialogActions>
            </DialogEx>
        );
    }
}
