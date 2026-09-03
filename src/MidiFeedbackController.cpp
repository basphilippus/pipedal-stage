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

#include "pch.h"
#include "MidiFeedbackController.hpp"
#include "PluginType.hpp"
#include "PluginHost.hpp"
#include "Lv2Log.hpp"
#include "util.hpp"

#include <alsa/asoundlib.h>

#include <algorithm>

using namespace pipedal;

namespace
{
    constexpr const char *BYPASS_SYMBOL = "__bypass";
    constexpr const char *SEQ_ID_PREFIX = "seq:";

    constexpr uint8_t SYSEX_MFR_ID = 0x7D; // non-commercial
    constexpr uint8_t SYSEX_TAG_0 = 0x50;  // 'P'
    constexpr uint8_t SYSEX_TAG_1 = 0x50;  // 'P'
    constexpr uint8_t SYSEX_VERSION = 0x01;
    constexpr uint8_t SYSEX_CMD_SET_SWITCH = 0x01;
    constexpr uint8_t SYSEX_CMD_CLEAR_ALL = 0x02;
    constexpr uint8_t SYSEX_CMD_SET_PC_LABEL = 0x03;

    // LED color codes shared with the controller firmware.
    constexpr uint8_t COLOR_WHITE = 0;
    constexpr uint8_t COLOR_RED = 1;
    constexpr uint8_t COLOR_ORANGE = 2;
    constexpr uint8_t COLOR_YELLOW = 3;
    constexpr uint8_t COLOR_GREEN = 4;
    constexpr uint8_t COLOR_CYAN = 5;
    constexpr uint8_t COLOR_BLUE = 6;
    constexpr uint8_t COLOR_PURPLE = 7;
    constexpr uint8_t COLOR_MAGENTA = 8;

    uint8_t ColorForPluginType(PluginType type)
    {
        switch (type)
        {
        case PluginType::DistortionPlugin:
        case PluginType::WaveshaperPlugin:
        case PluginType::AmplifierPlugin:
        case PluginType::SimulatorPlugin:
            return COLOR_RED;
        case PluginType::PitchPlugin:
        case PluginType::SpectralPlugin:
            return COLOR_PURPLE;
        case PluginType::EQPlugin:
        case PluginType::MultiEQPlugin:
        case PluginType::ParaEQPlugin:
        case PluginType::FilterPlugin:
        case PluginType::HighpassPlugin:
        case PluginType::LowpassPlugin:
        case PluginType::BandpassPlugin:
        case PluginType::AllpassPlugin:
        case PluginType::CombPlugin:
            return COLOR_CYAN;
        case PluginType::ReverbPlugin:
        case PluginType::DelayPlugin:
            return COLOR_BLUE;
        case PluginType::ModulatorPlugin:
        case PluginType::ChorusPlugin:
        case PluginType::FlangerPlugin:
        case PluginType::PhaserPlugin:
            return COLOR_GREEN;
        case PluginType::CompressorPlugin:
        case PluginType::DynamicsPlugin:
        case PluginType::GatePlugin:
        case PluginType::LimiterPlugin:
        case PluginType::ExpanderPlugin:
            return COLOR_YELLOW;
        default:
            return COLOR_WHITE;
        }
    }

    struct SeqAddr
    {
        int client = -1;
        int port = -1;
    };

    // Resolve "seq:<clientName>/<portName>" selection ids to write-capable
    // sequencer addresses, using our own handle (EnumeratePorts() filters out
    // write-only ports, so it cannot be used here).
    std::vector<SeqAddr> ResolveWritePorts(snd_seq_t *seq, const std::vector<std::string> &selectionIds)
    {
        std::vector<SeqAddr> result;

        snd_seq_client_info_t *clientInfo;
        snd_seq_port_info_t *portInfo;
        snd_seq_client_info_alloca(&clientInfo);
        snd_seq_port_info_alloca(&portInfo);

        for (const std::string &id : selectionIds)
        {
            if (id.rfind(SEQ_ID_PREFIX, 0) != 0)
            {
                continue;
            }
            std::string rest = id.substr(strlen(SEQ_ID_PREFIX));
            size_t slash = rest.find('/');
            std::string wantClient = slash == std::string::npos ? rest : rest.substr(0, slash);
            std::string wantPort = slash == std::string::npos ? std::string() : rest.substr(slash + 1);

            // Never send feedback into loopback or PiPedal-owned clients:
            // "Midi Through" routes straight back into PiPedal's own input,
            // turning every feedback CC into a phantom foot-switch press.
            if (wantClient == "Midi Through" || wantClient.rfind("PiPedal", 0) == 0)
            {
                continue;
            }

            SeqAddr exactMatch;
            SeqAddr fallbackMatch;

            snd_seq_client_info_set_client(clientInfo, -1);
            while (snd_seq_query_next_client(seq, clientInfo) >= 0)
            {
                if (wantClient != snd_seq_client_info_get_name(clientInfo))
                {
                    continue;
                }
                int clientId = snd_seq_client_info_get_client(clientInfo);
                snd_seq_port_info_set_client(portInfo, clientId);
                snd_seq_port_info_set_port(portInfo, -1);
                while (snd_seq_query_next_port(seq, portInfo) >= 0)
                {
                    unsigned caps = snd_seq_port_info_get_capability(portInfo);
                    constexpr unsigned WRITE_CAPS = SND_SEQ_PORT_CAP_WRITE | SND_SEQ_PORT_CAP_SUBS_WRITE;
                    if ((caps & WRITE_CAPS) != WRITE_CAPS)
                    {
                        continue;
                    }
                    SeqAddr addr{clientId, snd_seq_port_info_get_port(portInfo)};
                    if (fallbackMatch.client < 0)
                    {
                        fallbackMatch = addr;
                    }
                    if (!wantPort.empty() && wantPort == snd_seq_port_info_get_name(portInfo))
                    {
                        exactMatch = addr;
                        break;
                    }
                }
            }
            SeqAddr chosen = exactMatch.client >= 0 ? exactMatch : fallbackMatch;
            if (chosen.client >= 0)
            {
                result.push_back(chosen);
            }
        }
        return result;
    }
}

MidiFeedbackController::MidiFeedbackController(PiPedalModel &model)
    : model(model)
{
}

MidiFeedbackController::~MidiFeedbackController()
{
    Close();
}

MidiFeedbackController::ptr MidiFeedbackController::Create(PiPedalModel &model)
{
    return ptr(new MidiFeedbackController(model));
}

void MidiFeedbackController::Start()
{
    if (started)
    {
        return;
    }
    started = true;
    RebuildSnapshotSwitches(model.GetSystemMidiBidings());

    senderThread = std::jthread([this](std::stop_token stopToken)
                                { SenderThreadProc(stopToken); });

    // Seed connections from the current MIDI input selection.
    AlsaSequencerConfiguration config = model.GetAlsaSequencerConfiguration();
    OnAlsaSequencerConfigurationChanged(config);

    // Seed the preset program number.
    PresetIndex presets;
    model.GetPresets(&presets);
    OnPresetsChanged(CLIENT_ID, presets);

    // Hotplug: a device re-plug does not re-fire the configuration callback
    // (the model only notifies when the configuration *differs*), so watch
    // for device arrivals ourselves.
    deviceMonitor = AlsaSequencerDeviceMonitor::Create();
    deviceMonitor->StartMonitoring(
        [this](AlsaSequencerDeviceMonitor::MonitorAction action, int client, const std::string &clientName)
        {
            if (action != AlsaSequencerDeviceMonitor::MonitorAction::DeviceAdded)
            {
                return;
            }
            std::vector<std::string> ids;
            {
                std::lock_guard<std::mutex> lock(qMutex);
                ids = connectionIds;
            }
            std::string prefix = std::string(SEQ_ID_PREFIX) + clientName;
            bool relevant = false;
            for (const std::string &id : ids)
            {
                if (id.rfind(prefix, 0) == 0)
                {
                    relevant = true;
                    break;
                }
            }
            if (!relevant)
            {
                return;
            }
            // The device's MIDI stack (CircuitPython on the MIDI Captain)
            // takes several seconds to boot after USB enumeration; refresh
            // twice so cold boots reliably receive their state.
            for (int attempt = 0; attempt < 2; ++attempt)
            {
                std::this_thread::sleep_for(std::chrono::milliseconds(attempt == 0 ? 3000 : 5000));
                Event reconnect;
                reconnect.type = EvType::Reconnect;
                reconnect.connectionIds = ids;
                Enqueue(std::move(reconnect));
                Pedalboard pedalboard = model.GetCurrentPedalboardCopy();
                OnPedalboardChanged(CLIENT_ID, pedalboard);
                lastProgramSent = -1; // force PC resend so the preset banner populates
                lastSentPcLabels.clear(); // device may have rebooted; resend names
                PresetIndex presets;
                model.GetPresets(&presets);
                OnPresetsChanged(CLIENT_ID, presets);
            }
        });
}

void MidiFeedbackController::Close()
{
    if (closed)
    {
        return;
    }
    closed = true;
    if (deviceMonitor)
    {
        deviceMonitor->StopMonitoring();
        deviceMonitor = nullptr;
    }
    if (senderThread.joinable())
    {
        senderThread.request_stop();
        Enqueue(Event{.type = EvType::Quit});
        senderThread.join();
    }
}

uint8_t MidiFeedbackController::ResolveChannel(int bindingChannel) const
{
    if (bindingChannel >= 0 && bindingChannel <= 15)
    {
        return (uint8_t)bindingChannel;
    }
    if (configMidiChannel >= 0 && configMidiChannel <= 15)
    {
        return (uint8_t)configMidiChannel;
    }
    return 0;
}

uint8_t MidiFeedbackController::ColorForUri(const std::string &uri)
{
    auto pluginInfo = model.GetPluginInfo(uri);
    if (!pluginInfo)
    {
        return COLOR_WHITE;
    }
    return ColorForPluginType(uri_to_plugin_type(pluginInfo->plugin_class()));
}

std::string MidiFeedbackController::SanitizeLabel(const std::string &text)
{
    std::string result;
    result.reserve(MAX_LABEL_LENGTH);
    for (char c : text)
    {
        if (result.size() >= MAX_LABEL_LENGTH)
        {
            break;
        }
        result.push_back((c >= 0x20 && c <= 0x7E) ? c : '?');
    }
    return result;
}

std::vector<uint8_t> MidiFeedbackController::MakeSetSwitchSysEx(const BypassBinding &binding) const
{
    std::string label = binding.label;
    std::vector<uint8_t> frame;
    frame.reserve(11 + label.size());
    frame.insert(frame.end(), {0xF0, SYSEX_MFR_ID, SYSEX_TAG_0, SYSEX_TAG_1, SYSEX_VERSION,
                               SYSEX_CMD_SET_SWITCH,
                               (uint8_t)(binding.cc & 0x7F),
                               ResolveChannel(binding.channel),
                               binding.color,
                               (uint8_t)label.size()});
    for (char c : label)
    {
        frame.push_back((uint8_t)c);
    }
    frame.push_back(0xF7);
    return frame;
}

std::vector<uint8_t> MidiFeedbackController::MakeClearAllSysEx()
{
    return {0xF0, SYSEX_MFR_ID, SYSEX_TAG_0, SYSEX_TAG_1, SYSEX_VERSION, SYSEX_CMD_CLEAR_ALL, 0xF7};
}

std::vector<uint8_t> MidiFeedbackController::MakePcLabelSysEx(uint8_t program, const std::string &name)
{
    std::string label = SanitizeLabel(name);
    std::vector<uint8_t> frame;
    frame.reserve(10 + label.size());
    frame.insert(frame.end(), {0xF0, SYSEX_MFR_ID, SYSEX_TAG_0, SYSEX_TAG_1, SYSEX_VERSION,
                               SYSEX_CMD_SET_PC_LABEL,
                               (uint8_t)(program & 0x7F),
                               (uint8_t)label.size()});
    for (char c : label)
    {
        frame.push_back((uint8_t)c);
    }
    frame.push_back(0xF7);
    return frame;
}

void MidiFeedbackController::EnqueuePresetLabels(const PresetIndex &presets)
{
    const auto &entries = presets.presets();
    for (size_t i = 0; i < entries.size() && i < 8; ++i)
    {
        auto found = lastSentPcLabels.find((uint8_t)i);
        if (found != lastSentPcLabels.end() && found->second == entries[i].name())
        {
            continue; // unchanged since last send
        }
        lastSentPcLabels[(uint8_t)i] = entries[i].name();
        Event event;
        event.type = EvType::SendSysEx;
        event.sysex = MakePcLabelSysEx((uint8_t)i, entries[i].name());
        Enqueue(std::move(event));
    }
}

void MidiFeedbackController::Enqueue(Event &&event)
{
    {
        std::lock_guard<std::mutex> lock(qMutex);
        queue.push_back(std::move(event));
    }
    qCv.notify_one();
}

void MidiFeedbackController::EnqueueBindingState(const BypassBinding &binding, bool enabled)
{
    Event event;
    event.type = EvType::SendCC;
    event.channel = ResolveChannel(binding.channel);
    event.d1 = (uint8_t)(binding.cc & 0x7F);
    event.d2 = enabled ? 127 : 0;
    Enqueue(std::move(event));
}

void MidiFeedbackController::RebuildBindings(const Pedalboard &pedalboard)
{
    bindings.clear();
    // GetAllPlugins flattens split-chain children; it is non-const, so walk a copy.
    Pedalboard board = pedalboard;
    for (PedalboardItem *item : board.GetAllPlugins())
    {
        for (const MidiBinding &midiBinding : item->midiBindings())
        {
            // All CONTROL-type bindings get LED feedback: __bypass and
            // toggle-ish plugin controls alike (e.g. a tuner's Mute).
            if (midiBinding.bindingType() != BINDING_TYPE_CONTROL)
            {
                continue;
            }
            if (IsSnapshotSwitch(midiBinding.channel(), midiBinding.control()))
            {
                continue; // the snapshot switch owns this CC's LED and label
            }
            BypassBinding binding;
            binding.instanceId = item->instanceId();
            binding.symbol = midiBinding.symbol();
            binding.channel = midiBinding.channel();
            binding.cc = midiBinding.control();
            binding.color = ColorForUri(item->uri());
            binding.label = SanitizeLabel(item->title().empty() ? item->pluginName() : item->title());
            bindings.push_back(std::move(binding));
        }
    }
}

void MidiFeedbackController::EnqueueFullRefresh()
{
    Enqueue(Event{.type = EvType::ClearCache});

    // Turn off switches whose binding disappeared with this refresh (e.g. the
    // new preset doesn't bind them) — otherwise their LEDs keep stale state.
    std::vector<uint16_t> currentKeys;
    for (const BypassBinding &binding : bindings)
    {
        currentKeys.push_back((uint16_t)((ResolveChannel(binding.channel) << 8) | (binding.cc & 0x7F)));
    }
    for (const SnapshotSwitch &sw : snapshotSwitches)
    {
        currentKeys.push_back((uint16_t)((ResolveChannel(sw.channel) << 8) | (sw.cc & 0x7F)));
    }
    for (uint16_t staleKey : lastRefreshKeys)
    {
        if (std::find(currentKeys.begin(), currentKeys.end(), staleKey) == currentKeys.end())
        {
            Event event;
            event.type = EvType::SendCC;
            event.channel = (uint8_t)(staleKey >> 8);
            event.d1 = (uint8_t)(staleKey & 0x7F);
            event.d2 = 0;
            Enqueue(std::move(event));
        }
    }
    lastRefreshKeys = std::move(currentKeys);

    // LED states. Look the enabled state up from a fresh copy so refreshes
    // triggered outside OnPedalboardChanged stay correct.
    Pedalboard board = model.GetCurrentPedalboardCopy();
    for (const BypassBinding &binding : bindings)
    {
        PedalboardItem *item = board.GetItem(binding.instanceId);
        bool on = false;
        if (item)
        {
            if (binding.symbol == BYPASS_SYMBOL)
            {
                on = item->isEnabled();
            }
            else
            {
                const ControlValue *controlValue = item->GetControlValue(binding.symbol);
                on = controlValue != nullptr && controlValue->value() >= 0.5f;
            }
        }
        EnqueueBindingState(binding, on);
    }
    EnqueueSnapshotStates(board.selectedSnapshot());

    // Labels and colors.
    Event clearAll;
    clearAll.type = EvType::SendSysEx;
    clearAll.sysex = MakeClearAllSysEx();
    Enqueue(std::move(clearAll));
    for (const BypassBinding &binding : bindings)
    {
        Event setSwitch;
        setSwitch.type = EvType::SendSysEx;
        setSwitch.sysex = MakeSetSwitchSysEx(binding);
        Enqueue(std::move(setSwitch));
    }
    const auto &snapshots = board.snapshots();
    for (const SnapshotSwitch &sw : snapshotSwitches)
    {
        BypassBinding label;
        label.channel = sw.channel;
        label.cc = sw.cc;
        std::shared_ptr<Snapshot> snapshot = ((size_t)sw.index < snapshots.size()) ? snapshots[sw.index] : nullptr;
        if (snapshot)
        {
            label.color = ColorForColorKey(snapshot->color_);
            label.label = SanitizeLabel(snapshot->name_);
        }
        else
        {
            label.color = COLOR_WHITE;
            label.label = "-";
        }
        Event setSwitch;
        setSwitch.type = EvType::SendSysEx;
        setSwitch.sysex = MakeSetSwitchSysEx(label);
        Enqueue(std::move(setSwitch));
    }
}

void MidiFeedbackController::RebuildSnapshotSwitches(const std::vector<MidiBinding> &systemBindings)
{
    snapshotSwitches.clear();
    for (const MidiBinding &binding : systemBindings)
    {
        if (binding.bindingType() != BINDING_TYPE_CONTROL)
        {
            continue;
        }
        const std::string &symbol = binding.symbol();
        if (symbol.size() == 9 && symbol.rfind("snapshot", 0) == 0 && symbol[8] >= '1' && symbol[8] <= '6')
        {
            SnapshotSwitch sw;
            sw.index = symbol[8] - '1';
            sw.channel = binding.channel();
            sw.cc = binding.control();
            snapshotSwitches.push_back(sw);
        }
    }
}

bool MidiFeedbackController::IsSnapshotSwitch(int channel, int cc) const
{
    for (const SnapshotSwitch &sw : snapshotSwitches)
    {
        if (sw.cc == cc && ResolveChannel(sw.channel) == ResolveChannel(channel))
        {
            return true;
        }
    }
    return false;
}

void MidiFeedbackController::EnqueueSnapshotStates(int64_t selectedSnapshot)
{
    for (const SnapshotSwitch &sw : snapshotSwitches)
    {
        Event event;
        event.type = EvType::SendCC;
        event.channel = ResolveChannel(sw.channel);
        event.d1 = (uint8_t)(sw.cc & 0x7F);
        event.d2 = (sw.index == selectedSnapshot) ? 127 : 0;
        Enqueue(std::move(event));
    }
}

// Snapshot colours are Material colour keys chosen in the UI (see MaterialColors.tsx).
uint8_t MidiFeedbackController::ColorForColorKey(const std::string &key)
{
    if (key == "red" || key == "deepOrange") return COLOR_RED;
    if (key == "pink") return COLOR_MAGENTA;
    if (key == "orange" || key == "amber") return COLOR_ORANGE;
    if (key == "yellow" || key == "lime") return COLOR_YELLOW;
    if (key == "green" || key == "lightGreen" || key == "teal") return COLOR_GREEN;
    if (key == "cyan" || key == "lightBlue") return COLOR_CYAN;
    if (key == "blue" || key == "indigo") return COLOR_BLUE;
    if (key == "purple" || key == "deepPurple") return COLOR_PURPLE;
    return COLOR_WHITE;
}

void MidiFeedbackController::OnSelectedSnapshotChanged(int64_t selectedSnapshot)
{
    EnqueueSnapshotStates(selectedSnapshot);
}

void MidiFeedbackController::OnSystemMidiBindingsChanged(const std::vector<MidiBinding> &systemBindings)
{
    RebuildSnapshotSwitches(systemBindings);
    RebuildBindings(model.GetCurrentPedalboardCopy());
    EnqueueFullRefresh();
}

void MidiFeedbackController::OnItemEnabledChanged(int64_t clientId, int64_t pedalItemId, bool enabled)
{
    for (const BypassBinding &binding : bindings)
    {
        if (binding.instanceId == pedalItemId && binding.symbol == BYPASS_SYMBOL)
        {
            EnqueueBindingState(binding, enabled);
        }
    }
}

void MidiFeedbackController::OnControlChanged(int64_t clientId, int64_t pedalItemId, const std::string &symbol, float value)
{
    for (const BypassBinding &binding : bindings)
    {
        if (binding.instanceId == pedalItemId && binding.symbol == symbol)
        {
            EnqueueBindingState(binding, value >= 0.5f);
        }
    }
}

void MidiFeedbackController::OnMidiValueChanged(int64_t instanceId, const std::string &symbol, float value)
{
    // MIDI-origin control changes (the pedal's own stomps) arrive here rather
    // than through OnControlChanged.
    OnControlChanged(CLIENT_ID, instanceId, symbol, value);
}

void MidiFeedbackController::OnPedalboardChanged(int64_t clientId, const Pedalboard &pedalboard)
{
    RebuildBindings(pedalboard);
    EnqueueFullRefresh();
}

void MidiFeedbackController::OnPresetsChanged(int64_t clientId, const PresetIndex &presets)
{
    const auto &entries = presets.presets();
    for (size_t i = 0; i < entries.size() && i < 128; ++i)
    {
        if (entries[i].instanceId() == presets.selectedInstanceId())
        {
            if ((int64_t)i != lastProgramSent)
            {
                lastProgramSent = (int64_t)i;
                Event event;
                event.type = EvType::SendPC;
                event.channel = ResolveChannel(-1);
                event.d1 = (uint8_t)i;
                Enqueue(std::move(event));
            }
            break;
        }
    }
    EnqueuePresetLabels(presets);
}

void MidiFeedbackController::OnAlsaSequencerConfigurationChanged(const AlsaSequencerConfiguration &configuration)
{
    configMidiChannel = configuration.midiChannel();
    std::vector<std::string> ids;
    for (const AlsaSequencerPortSelection &selection : configuration.connections())
    {
        ids.push_back(selection.id());
    }
    {
        std::lock_guard<std::mutex> lock(qMutex);
        connectionIds = ids;
    }
    Event reconnect;
    reconnect.type = EvType::Reconnect;
    reconnect.connectionIds = std::move(ids);
    Enqueue(std::move(reconnect));

    RebuildBindings(model.GetCurrentPedalboardCopy());
    EnqueueFullRefresh();
}

void MidiFeedbackController::SenderThreadProc(std::stop_token stopToken)
{
    SetThreadName("midiFeedback");

    snd_seq_t *seq = nullptr;
    int ourPort = -1;
    std::vector<SeqAddr> destinations;
    std::unordered_map<uint16_t, uint8_t> lastSent; // (channel << 8) | cc -> value
    bool sendFailureLogged = false;

    int rc = snd_seq_open(&seq, "default", SND_SEQ_OPEN_DUPLEX, 0);
    if (rc < 0)
    {
        Lv2Log::error("MidiFeedback: cannot open ALSA sequencer: %s", snd_strerror(rc));
        return;
    }
    snd_seq_set_client_name(seq, "PiPedal Feedback");
    ourPort = snd_seq_create_simple_port(
        seq, "feedback",
        SND_SEQ_PORT_CAP_READ | SND_SEQ_PORT_CAP_SUBS_READ,
        SND_SEQ_PORT_TYPE_MIDI_GENERIC | SND_SEQ_PORT_TYPE_APPLICATION);
    if (ourPort < 0)
    {
        Lv2Log::error("MidiFeedback: cannot create output port: %s", snd_strerror(ourPort));
        snd_seq_close(seq);
        return;
    }

    auto disconnectAll = [&]()
    {
        for (const SeqAddr &addr : destinations)
        {
            snd_seq_disconnect_to(seq, ourPort, addr.client, addr.port);
        }
        destinations.clear();
        lastSent.clear();
    };

    auto sendEvent = [&](snd_seq_event_t &ev) -> bool
    {
        snd_seq_ev_set_source(&ev, ourPort);
        snd_seq_ev_set_subs(&ev);
        snd_seq_ev_set_direct(&ev);
        int rc = snd_seq_event_output(seq, &ev);
        if (rc >= 0)
        {
            rc = snd_seq_drain_output(seq);
        }
        if (rc < 0)
        {
            if (!sendFailureLogged)
            {
                Lv2Log::warning("MidiFeedback: send failed: %s (will retry on reconnect)", snd_strerror(rc));
                sendFailureLogged = true;
            }
            destinations.clear();
            lastSent.clear();
            return false;
        }
        return true;
    };

    while (true)
    {
        Event event;
        {
            std::unique_lock<std::mutex> lock(qMutex);
            qCv.wait(lock, [&]()
                     { return !queue.empty() || stopToken.stop_requested(); });
            if (queue.empty())
            {
                break; // stop requested
            }
            event = std::move(queue.front());
            queue.pop_front();
        }

        switch (event.type)
        {
        case EvType::Quit:
        {
            disconnectAll();
            snd_seq_close(seq);
            return;
        }
        case EvType::ClearCache:
        {
            lastSent.clear();
            break;
        }
        case EvType::Reconnect:
        {
            disconnectAll();
            sendFailureLogged = false;
            destinations = ResolveWritePorts(seq, event.connectionIds);
            for (const SeqAddr &addr : destinations)
            {
                int rc = snd_seq_connect_to(seq, ourPort, addr.client, addr.port);
                if (rc < 0 && rc != -EBUSY)
                {
                    Lv2Log::warning("MidiFeedback: cannot connect to %d:%d: %s",
                                    addr.client, addr.port, snd_strerror(rc));
                }
            }
            if (!destinations.empty())
            {
                Lv2Log::info("MidiFeedback: connected to %d MIDI destination(s).", (int)destinations.size());
            }
            break;
        }
        case EvType::SendCC:
        {
            if (destinations.empty())
            {
                break;
            }
            // No identical-value suppression: the controller's local LED can
            // drift from our last-sent value (e.g. momentary switches reset
            // their LED on release), and the firmware never re-transmits
            // received CCs, so redundant sends are loop-safe and idempotent.
            snd_seq_event_t ev;
            snd_seq_ev_clear(&ev);
            snd_seq_ev_set_controller(&ev, event.channel, event.d1, event.d2);
            sendEvent(ev);
            break;
        }
        case EvType::SendPC:
        {
            if (destinations.empty())
            {
                break;
            }
            snd_seq_event_t ev;
            snd_seq_ev_clear(&ev);
            snd_seq_ev_set_pgmchange(&ev, event.channel, event.d1);
            sendEvent(ev);
            break;
        }
        case EvType::SendSysEx:
        {
            if (destinations.empty() || event.sysex.empty())
            {
                break;
            }
            snd_seq_event_t ev;
            snd_seq_ev_clear(&ev);
            snd_seq_ev_set_sysex(&ev, event.sysex.size(), event.sysex.data());
            sendEvent(ev);
            break;
        }
        }
    }
    disconnectAll();
    snd_seq_close(seq);
}
