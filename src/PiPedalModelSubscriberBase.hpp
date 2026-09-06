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

#include "PiPedalModel.hpp"

namespace pipedal
{
    // Adapter: no-op implementations for every IPiPedalModelSubscriber
    // notification, so subscribers that care about a handful of events
    // (e.g. MidiFeedbackController) only override what they use.
    // GetClientId() and Close() remain pure.
    class PiPedalModelSubscriberBase : public IPiPedalModelSubscriber
    {
    public:
        void OnItemEnabledChanged(int64_t clientId, int64_t pedalItemId, bool enabled) override {}
        void OnItemUseModUiChanged(int64_t clientId, int64_t pedalItemId, bool enabled) override {}
        void OnControlChanged(int64_t clientId, int64_t pedalItemId, const std::string &symbol, float value) override {}
        void OnInputVolumeChanged(float value) override {}
        void OnOutputVolumeChanged(float value) override {}
        void OnUpdateStatusChanged(const UpdateStatus &updateStatus) override {}
        void OnLv2StateChanged(int64_t pedalItemId, const Lv2PluginState &newState) override {}
        void OnVst3ControlChanged(int64_t clientId, int64_t pedalItemId, const std::string &symbol, float value, const std::string &state) override {}
        void OnPedalboardChanged(int64_t clientId, const Pedalboard &pedalboard) override {}
        void OnPresetsChanged(int64_t clientId, const PresetIndex &presets) override {}
        void OnPresetChanged(bool changed) override {}
        void OnSnapshotModified(int64_t selectedSnapshot, bool modified) override {}
        void OnPresetPageChanged(int64_t page) override {}
    void OnTempoChanged(double bpm) override {}
        void OnSelectedSnapshotChanged(int64_t selectedSnapshot) override {}
        void OnPluginPresetsChanged(const std::string &pluginUri) override {}
        void OnChannelRouterSettingsChanged(int64_t clientId, const ChannelRouterSettings &channelRouterSettings) override {}
        void OnVuMeterUpdate(const std::vector<VuUpdateX> &updates) override {}
        void OnBankIndexChanged(const BankIndex &bankIndex) override {}
        void OnJackServerSettingsChanged(const JackServerSettings &jackServerSettings) override {}
        void OnJackConfigurationChanged(const JackConfiguration &jackServerConfiguration) override {}
        void OnLoadPluginPreset(int64_t instanceId, const std::vector<ControlValue> &controlValues) override {}
        void OnMidiValueChanged(int64_t instanceId, const std::string &symbol, float value) override {}
        void OnNotifyMidiListener(int64_t clientHandle, uint8_t cc0, uint8_t cc1, uint8_t cc2) override {}
        void OnNotifyPatchProperty(int64_t clientModel, uint64_t instanceId, const std::string &propertyUri, const std::string &atomJson) override {}
        void OnWifiConfigSettingsChanged(const WifiConfigSettings &wifiConfigSettings) override {}
        void OnWifiDirectConfigSettingsChanged(const WifiDirectConfigSettings &wifiDirectConfigSettings) override {}
        void OnGovernorSettingsChanged(const std::string &governor) override {}
        void OnFavoritesChanged(const std::map<std::string, bool> &favorites) override {}
        void OnShowStatusMonitorChanged(bool show) override {}
        void OnSystemMidiBindingsChanged(const std::vector<MidiBinding> &bindings) override {}
        void OnNotifyPathPatchPropertyChanged(int64_t instanceId, const std::string &pathPatchPropertyString, const std::string &atomString) override {}
        void OnErrorMessage(const std::string &message) override {}
        void OnTone3000DownloadStarted(int64_t handle, const std::string &title) override {}
        void OnTone3000DownloadProgress(const Tone3000DownloadProgress &progress) override {}
        void OnTone3000DownloadComplete(int64_t handle, const std::string &resultPath) override {}
        void OnTone3000DownloadError(int64_t handle, const std::string &errorMessage) override {}
        void OnLv2PluginsChanging() override {}
        void OnNetworkChanging(bool hotspotConnected) override {}
        void OnHasWifiChanged(bool hasWifi) override {}
        void OnAlsaSequencerConfigurationChanged(const AlsaSequencerConfiguration &alsaSequencerConfiguration) override {}
    };
}
