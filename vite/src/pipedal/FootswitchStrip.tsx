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

// Stage theme: a strip of foot-switch tiles mirroring what the MIDI controller shows.
// One tile per configured foot switch (Settings-persisted list, see FootswitchConfig),
// showing the bound block's name and an LED in the block's category colour, lit when
// the bound control is on. Tapping a tile toggles the control, exactly like the pedal.

import React from 'react';
import { PiPedalModel, PiPedalModelFactory } from './PiPedalModel';
import { Footswitch } from './FootswitchConfig';
import { Pedalboard, PedalboardItem } from './Pedalboard';
import MidiBinding from './MidiBinding';
import { PluginType } from './Lv2Plugin';
import { STAGE } from './StageTheme';

// Mirrors MidiFeedbackController::ColorForPluginType (src/MidiFeedbackController.cpp),
// so the on-screen LED matches the pedal's LED.
function ledColorForPluginType(type: PluginType | undefined): string {
    switch (type) {
        case PluginType.DistortionPlugin:
        case PluginType.WaveshaperPlugin:
        case PluginType.AmplifierPlugin:
        case PluginType.SimulatorPlugin:
            return "#ff4d4d";
        case PluginType.PitchPlugin:
        case PluginType.SpectralPlugin:
            return "#c06cff";
        case PluginType.EQPlugin:
        case PluginType.MultiEQPlugin:
        case PluginType.ParaEQPlugin:
        case PluginType.FilterPlugin:
        case PluginType.HighpassPlugin:
        case PluginType.LowpassPlugin:
        case PluginType.BandpassPlugin:
        case PluginType.AllpassPlugin:
        case PluginType.CombPlugin:
            return "#36d6e7";
        case PluginType.ReverbPlugin:
        case PluginType.DelayPlugin:
            return "#4d8dff";
        case PluginType.ModulatorPlugin:
        case PluginType.ChorusPlugin:
        case PluginType.FlangerPlugin:
        case PluginType.PhaserPlugin:
            return "#3ddc84";
        case PluginType.CompressorPlugin:
        case PluginType.DynamicsPlugin:
        case PluginType.GatePlugin:
        case PluginType.LimiterPlugin:
        case PluginType.ExpanderPlugin:
            return "#f5d64d";
        default:
            return "#e6e8ec";
    }
}

interface Assignment {
    footswitch: Footswitch;
    item: PedalboardItem | null;
    binding: MidiBinding | null;
    label: string;
    color: string;
    isOn: boolean;
}

interface FootswitchStripProps {
    pedalboard: Pedalboard;
}
interface FootswitchStripState {
    footswitches: Footswitch[];
}

export default class FootswitchStrip extends React.Component<FootswitchStripProps, FootswitchStripState> {
    private model: PiPedalModel;

    constructor(props: FootswitchStripProps) {
        super(props);
        this.model = PiPedalModelFactory.getInstance();
        this.state = { footswitches: this.model.footswitches.get() };
        this.onFootswitchesChanged = this.onFootswitchesChanged.bind(this);
    }
    private onFootswitchesChanged(value: Footswitch[]) {
        this.setState({ footswitches: value });
    }
    componentDidMount() {
        this.model.footswitches.addOnChangedHandler(this.onFootswitchesChanged);
    }
    componentWillUnmount() {
        this.model.footswitches.removeOnChangedHandler(this.onFootswitchesChanged);
    }

    private resolve(footswitch: Footswitch): Assignment {
        for (let item of this.props.pedalboard.itemsGenerator()) {
            if (item.isEmpty() || item.isSplit() || item.isStart() || item.isEnd()) continue;
            for (let binding of item.midiBindings) {
                if (binding.bindingType !== MidiBinding.BINDING_TYPE_CONTROL || binding.control !== footswitch.cc) continue;
                let plugin = this.model.getUiPlugin(item.uri);
                let label = item.title !== "" ? item.title : (item.pluginName ?? plugin?.name ?? "?");
                let isOn = binding.symbol === "__bypass"
                    ? item.isEnabled
                    : item.getControlValue(binding.symbol) > 0.5;
                if (binding.symbol !== "__bypass") {
                    let port = plugin?.controls.find((c) => c.symbol === binding.symbol);
                    if (port) label = label + " · " + port.name;
                }
                return { footswitch, item, binding, label, color: ledColorForPluginType(plugin?.plugin_type), isOn };
            }
        }
        return { footswitch, item: null, binding: null, label: "", color: STAGE.textDim, isOn: false };
    }

    private handleTap(a: Assignment) {
        if (!a.item || !a.binding) return;
        if (a.binding.symbol === "__bypass") {
            this.model.setPedalboardItemEnabled(a.item.instanceId, !a.item.isEnabled);
        } else {
            let port = this.model.getUiPlugin(a.item.uri)?.controls.find((c) => c.symbol === a.binding!.symbol);
            let on = port?.max_value ?? 1;
            let off = port?.min_value ?? 0;
            this.model.setPedalboardControl(a.item.instanceId, a.binding.symbol, a.isOn ? off : on);
        }
    }

    render() {
        let assignments = this.state.footswitches.map((fs) => this.resolve(fs));
        if (assignments.length === 0) return null;
        return (
            <div style={{
                flex: "0 0 auto", display: "flex", flexFlow: "row nowrap", gap: 12,
                padding: "8px 16px 10px 16px", borderTop: `1px solid ${STAGE.border}`, background: STAGE.bg,
            }}>
                {assignments.map((a) => {
                    let assigned = a.item !== null;
                    let ledColor = a.isOn ? a.color : "#3a3d44";
                    return (
                        <div key={a.footswitch.cc}
                            onClick={() => this.handleTap(a)}
                            style={{
                                flex: "1 1 0", minWidth: 0, height: 60, borderRadius: 10, position: "relative",
                                padding: "7px 14px", boxSizing: "border-box", cursor: assigned ? "pointer" : "default",
                                background: assigned ? STAGE.panelGradient : "transparent",
                                border: assigned ? `1px solid ${a.isOn ? a.color + "80" : STAGE.wire}` : `1px dashed ${STAGE.border}`,
                                boxShadow: assigned ? `${STAGE.innerHighlight}, ${STAGE.shadow}` : "none",
                                userSelect: "none", WebkitTapHighlightColor: "transparent",
                                transition: `border-color ${STAGE.ease}, box-shadow ${STAGE.ease}`,
                            }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{
                                    fontFamily: STAGE.displayFont, fontSize: 11, letterSpacing: "0.12em",
                                    color: STAGE.textDim, textTransform: "uppercase",
                                }}>{a.footswitch.name}</span>
                                <span style={{
                                    width: 11, height: 11, borderRadius: "50%", background: ledColor,
                                    boxShadow: a.isOn ? `0 0 10px 2px ${a.color}99, inset 0 -1px 2px rgba(0,0,0,0.4)` : "inset 0 1px 2px rgba(0,0,0,0.6)",
                                    transition: `background ${STAGE.ease}, box-shadow ${STAGE.ease}`,
                                }} />
                            </div>
                            <div style={{
                                marginTop: 2, fontFamily: STAGE.displayFont, fontSize: 17, letterSpacing: "0.02em",
                                color: assigned ? (a.isOn ? STAGE.text : STAGE.textDim) : STAGE.border,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>{assigned ? a.label : "—"}</div>
                        </div>
                    );
                })}
            </div>
        );
    }
}
