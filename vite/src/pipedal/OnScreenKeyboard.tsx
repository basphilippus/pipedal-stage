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

// Minimal on-screen keyboard for kiosk builds (touchscreen with no system
// keyboard, e.g. cage/Wayland which lacks layer-shell for wvkbd).
// Enabled by loading the UI with ?vkb=1 — phones/desktops are unaffected.
// Slides up when a text input/textarea gains focus; keys write through
// React's native value setter so controlled inputs see normal input events.

export function onScreenKeyboardEnabled(): boolean {
    // ?vkb=1 arms it explicitly. The kiosk is also the only client that loads the UI
    // from localhost, and the app rewrites the URL on some navigations (dropping the
    // query), so treat a localhost origin as the kiosk too.
    if (new URLSearchParams(window.location.search).get("vkb") === "1") return true;
    let host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

interface OnScreenKeyboardState {
    visible: boolean;
    shifted: boolean;
    symbols: boolean;
}

const ROWS_LOWER = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["⇧", "z", "x", "c", "v", "b", "n", "m", "⌫"],
    ["#+=", " ", "↵", "▼"]
];
const ROWS_SYMBOLS = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"],
    ["-", "_", "=", "+", "[", "]", "/", "\\", ";"],
    ["'", "\"", ",", ".", "?", ":", "~", "`", "⌫"],
    ["abc", " ", "↵", "▼"]
];

export default class OnScreenKeyboard extends React.Component<{}, OnScreenKeyboardState> {

    private target: HTMLInputElement | HTMLTextAreaElement | null = null;

    constructor(props: {}) {
        super(props);
        this.state = { visible: false, shifted: false, symbols: false };
        this.handleFocusIn = this.handleFocusIn.bind(this);
        this.handleFocusOut = this.handleFocusOut.bind(this);
    }

    private static isTextField(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
        if (el instanceof HTMLTextAreaElement) return true;
        if (!(el instanceof HTMLInputElement)) return false;
        return ["text", "search", "number", "password", "email", "url", "tel"].indexOf(el.type) !== -1;
    }

    private handleFocusIn(e: FocusEvent) {
        if (OnScreenKeyboard.isTextField(e.target)) {
            this.target = e.target;
            this.setState({ visible: true });
        }
    }

    private handleFocusOut(e: FocusEvent) {
        // Delay: focus may move to another field or to a keyboard key.
        setTimeout(() => {
            if (!OnScreenKeyboard.isTextField(document.activeElement)) {
                this.target = null;
                this.setState({ visible: false });
            }
        }, 100);
    }

    componentDidMount() {
        document.addEventListener("focusin", this.handleFocusIn);
        document.addEventListener("focusout", this.handleFocusOut);
    }

    componentWillUnmount() {
        document.removeEventListener("focusin", this.handleFocusIn);
        document.removeEventListener("focusout", this.handleFocusOut);
    }

    private setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
        let prototype = el instanceof HTMLTextAreaElement
            ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        let setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        setter?.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
    }

    private pressKey(key: string) {
        let el = this.target;
        if (!el) return;
        if (key === "⇧") {
            this.setState({ shifted: !this.state.shifted });
            return;
        }
        if (key === "#+=") { this.setState({ symbols: true }); return; }
        if (key === "abc") { this.setState({ symbols: false }); return; }
        if (key === "▼") {
            el.blur();
            this.target = null;
            this.setState({ visible: false });
            return;
        }
        if (key === "↵") {
            el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
            return;
        }
        let start = el.selectionStart ?? el.value.length;
        let end = el.selectionEnd ?? el.value.length;
        let value = el.value;
        if (key === "⌫") {
            if (start === end && start > 0) start = start - 1;
            this.setNativeValue(el, value.slice(0, start) + value.slice(end));
            el.setSelectionRange?.(start, start);
        } else {
            let ch = key === " " ? " " : (this.state.shifted ? key.toUpperCase() : key);
            this.setNativeValue(el, value.slice(0, start) + ch + value.slice(end));
            el.setSelectionRange?.(start + ch.length, start + ch.length);
            if (this.state.shifted) this.setState({ shifted: false });
        }
    }

    render() {
        if (!this.state.visible) return null;
        let rows = this.state.symbols ? ROWS_SYMBOLS : ROWS_LOWER;
        return (
            <div style={{
                position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20000,
                background: "#222", padding: "6px 4px 8px 4px",
                userSelect: "none", touchAction: "manipulation"
            }}
                onMouseDown={(e) => e.preventDefault() /* keep focus on the field */}
            >
                {rows.map((row, ri) => (
                    <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 4 }}>
                        {row.map((key, ki) => {
                            let flex = key === " " ? "6 1 0" : (key.length > 1 ? "1.6 1 0" : "1 1 0");
                            let display = key === " " ? "␣" :
                                (this.state.shifted && key.length === 1 && !this.state.symbols ? key.toUpperCase() : key);
                            return (
                                <button key={ki}
                                    style={{
                                        flex: flex, minWidth: 0, height: 42, fontSize: 18,
                                        color: "#fff", background: key.length > 1 && key !== "#+=" && key !== "abc" ? "#444" : "#333",
                                        border: "1px solid #555", borderRadius: 6
                                    }}
                                    onClick={() => this.pressKey(key)}
                                >
                                    {display}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    }
}
