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

// Named foot switches for quick-assign bindings. Persisted server-side as an
// opaque JSON string in UserSettings (see setFootswitchConfig /
// getFootswitchConfig in PiPedalModel).

export interface Footswitch {
    name: string;
    cc: number;
}

export const DEFAULT_FOOTSWITCHES: Footswitch[] = [
    { name: "A", cc: 15 },
    { name: "B", cc: 16 },
    { name: "C", cc: 17 }
];

export function isValidFootswitchName(name: string): boolean {
    let trimmed = name.trim();
    return trimmed.length >= 1 && trimmed.length <= 8;
}

export function isValidFootswitchCc(cc: number): boolean {
    return Number.isInteger(cc) && cc >= 0 && cc <= 119;
}

// Parse the stored JSON. Empty or invalid input yields the defaults, which
// also covers daemons that predate the setting.
export function parseFootswitchConfig(json: string): Footswitch[] {
    if (!json || json.length === 0) {
        return DEFAULT_FOOTSWITCHES;
    }
    try {
        let parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            return DEFAULT_FOOTSWITCHES;
        }
        let result: Footswitch[] = [];
        for (let entry of parsed) {
            if (typeof entry.name !== "string" || typeof entry.cc !== "number"
                || !isValidFootswitchName(entry.name) || !isValidFootswitchCc(entry.cc)) {
                return DEFAULT_FOOTSWITCHES;
            }
            result.push({ name: entry.name.trim(), cc: entry.cc });
        }
        return result;
    } catch {
        return DEFAULT_FOOTSWITCHES;
    }
}

export function serializeFootswitchConfig(switches: Footswitch[]): string {
    return JSON.stringify(switches.map((s) => ({ name: s.name.trim(), cc: s.cc })));
}
