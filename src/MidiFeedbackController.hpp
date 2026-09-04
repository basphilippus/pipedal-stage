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

#pragma once

#include "PiPedalModelSubscriberBase.hpp"
#include "AlsaSequencer.hpp"

#include <condition_variable>
#include <deque>
#include <memory>
#include <mutex>
#include <thread>
#include <unordered_map>
#include <vector>

// MIDI state feedback out: mirrors plugin bypass state, preset selection, and
// per-switch labels/colors to a connected MIDI foot controller so its LEDs and
// display track PiPedal's true state (e.g. Paint Audio MIDI Captain running
// midi-captain-max firmware). Output connections mirror the MIDI *input*
// selection in AlsaSequencerConfiguration.
//
// SysEx protocol (version 1, non-commercial mfr id 0x7D):
//   header:     F0 7D 50 50 01
//   SET_SWITCH:   01 <cc 0-119> <channel 0-15> <color 0-8> <labelLen 0-16> <ascii...> F7
//   CLEAR_ALL:    02 F7
//   SET_PC_LABEL: 03 <program 0-127> <labelLen 0-16> <ascii...> F7
// The receiving firmware ignores frames not starting with the full header.

namespace pipedal
{
    class MidiFeedbackController
        : public PiPedalModelSubscriberBase,
          public std::enable_shared_from_this<MidiFeedbackController>
    {
    public:
        using ptr = std::shared_ptr<MidiFeedbackController>;
        static ptr Create(PiPedalModel &model);
        ~MidiFeedbackController();

        // Call after AddNotificationSubscription: starts the sender thread,
        // seeds connections and current state.
        void Start();

        // IPiPedalModelSubscriber
        int64_t GetClientId() override { return CLIENT_ID; }
        void Close() override;
        void OnItemEnabledChanged(int64_t clientId, int64_t pedalItemId, bool enabled) override;
        void OnControlChanged(int64_t clientId, int64_t pedalItemId, const std::string &symbol, float value) override;
        void OnMidiValueChanged(int64_t instanceId, const std::string &symbol, float value) override;
        void OnPedalboardChanged(int64_t clientId, const Pedalboard &pedalboard) override;
        void OnPresetsChanged(int64_t clientId, const PresetIndex &presets) override;
        void OnAlsaSequencerConfigurationChanged(const AlsaSequencerConfiguration &configuration) override;
        void OnSelectedSnapshotChanged(int64_t selectedSnapshot) override;
        void OnPresetPageChanged(int64_t page) override;
        void OnSystemMidiBindingsChanged(const std::vector<MidiBinding> &bindings) override;

    private:
        explicit MidiFeedbackController(PiPedalModel &model);

        // Sentinel client id: web clients are >= 0, MIDI-origin notifications use -1.
        static constexpr int64_t CLIENT_ID = -2;
        static constexpr size_t MAX_LABEL_LENGTH = 16;

        enum class EvType
        {
            SendCC,
            SendPC,
            SendSysEx,
            Reconnect,
            ClearCache,
            Quit
        };
        struct Event
        {
            EvType type;
            uint8_t channel = 0;
            uint8_t d1 = 0; // CC number / program number
            uint8_t d2 = 0; // CC value
            std::vector<uint8_t> sysex;              // owns SysEx bytes (F0..F7)
            std::vector<std::string> connectionIds;  // for Reconnect
        };

        struct BypassBinding
        {
            int64_t instanceId = -1;
            std::string symbol; // "__bypass" or a plugin control symbol
            int channel = -1;   // -1 = follow config midiChannel
            int cc = 0;
            uint8_t color = 0;
            std::string label;
        };

        // ---- callback-side state (only touched under PiPedalModel's mutex) ----
        // A system MIDI binding "snapshot1".."snapshot6" of CONTROL type: the switch
        // selects a snapshot of the current preset. Its LED shows the active snapshot
        // (radio-style), its label/colour come from the snapshot. Takes precedence over
        // any block binding on the same CC.
        struct SnapshotSwitch
        {
            int index = 0;   // 0-based snapshot index
            int channel = -1;
            int cc = 0;
        };

        PiPedalModel &model;
        std::vector<BypassBinding> bindings;
        std::vector<SnapshotSwitch> snapshotSwitches;
        int32_t configMidiChannel = -1;
        std::vector<std::string> connectionIds;
        std::vector<uint16_t> lastRefreshKeys; // (channel<<8)|cc sent in the previous refresh
        std::unordered_map<uint8_t, std::string> lastSentPcLabels;
        int64_t lastProgramSent = -1;
        bool started = false;
        bool closed = false;

        // ---- queue (shared) ----
        std::mutex qMutex;
        std::condition_variable qCv;
        std::deque<Event> queue;

        // ---- sender-thread-only state ----
        std::jthread senderThread;
        AlsaSequencerDeviceMonitor::ptr deviceMonitor;

        uint8_t ResolveChannel(int bindingChannel) const;
        uint8_t ColorForUri(const std::string &uri);
        static std::string SanitizeLabel(const std::string &text);

        void RebuildBindings(const Pedalboard &pedalboard);
        void RebuildSnapshotSwitches(const std::vector<MidiBinding> &systemBindings);
        bool IsSnapshotSwitch(int channel, int cc) const;
        void EnqueueSnapshotStates(int64_t selectedSnapshot);
        static uint8_t ColorForColorKey(const std::string &key);
        void EnqueueFullRefresh();
        void EnqueueBindingState(const BypassBinding &binding, bool enabled);
        void Enqueue(Event &&event);

        std::vector<uint8_t> MakeSetSwitchSysEx(const BypassBinding &binding) const;
        static std::vector<uint8_t> MakeClearAllSysEx();
        static std::vector<uint8_t> MakePcLabelSysEx(uint8_t program, const std::string &name);
        void EnqueuePresetLabels(const PresetIndex &presets); // labels + lit key for the current preset page

        void SenderThreadProc(std::stop_token stopToken);
    };
}
