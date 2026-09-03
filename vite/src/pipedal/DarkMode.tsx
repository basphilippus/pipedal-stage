// Copyright (c) Robin E.R. Davies
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

import { AndroidHostInterface, getAndroidHost } from "./AndroidHost";

export enum ColorTheme {
    Light,
    Dark,
    System,
    Stage   // dark, high-contrast "stage rig" look for the touchscreen kiosk.
};

// A "?theme=stage|dark|light|system" URL parameter seeds the stored preference once
// (handy for the kiosk URL and for testing); the Settings dialog can still change it afterwards.
(function seedColorSchemeFromUrl() {
    try {
        let param = new URL(window.location.href).searchParams.get("theme");
        if (!param) return;
        let value: string | undefined = undefined;
        switch (param.toLowerCase()) {
            case "stage": value = "Stage"; break;
            case "dark": value = "Dark"; break;
            case "light": value = "Light"; break;
            case "system": value = "System"; break;
        }
        if (value && localStorage.getItem("colorScheme") !== value) {
            localStorage.setItem("colorScheme", value);
        }
    } catch (e) { /* ignore */ }
})();


export function getEffectiveColorScheme(): ColorTheme {
    let androidHost = (window as any).AndroidHost as AndroidHostInterface;
    if (androidHost) {
        if (androidHost.isDarkTheme)
            return androidHost.isDarkTheme() ? ColorTheme.Dark: ColorTheme.Light;
        return ColorTheme.Dark;
    }
    return getColorScheme();
    
}

export function getColorScheme(): ColorTheme {
    let androidHost = (window as any).AndroidHost as AndroidHostInterface;
    if (androidHost) {
        switch (androidHost.getThemePreference() as number)
        {
            case 0: return ColorTheme.Light;
            case 1: return ColorTheme.Dark;
            default:
            case 2: return ColorTheme.System;
        }
    }
    switch (localStorage.getItem('colorScheme')) {
        case "Light":
            return ColorTheme.Light;
        default:
        case null:
        case "Dark":
            return ColorTheme.Dark;
        case "System":
            return ColorTheme.System;
        case "Stage":
            return ColorTheme.Stage;
    }
}
export function setColorScheme(value: ColorTheme): void {
    let androidHost = (window as any).AndroidHost as AndroidHostInterface;
    if (androidHost) {
        switch (value) {
            case ColorTheme.Light:
                androidHost.setThemePreference(0);
                break;
            case ColorTheme.Dark:
            case ColorTheme.Stage:
                androidHost.setThemePreference(1);
                break;
            default:
            case ColorTheme.System:
                androidHost.setThemePreference(2);
                break;

        }
    }

    var storageValue;
    switch (value) {
        default:
        case ColorTheme.Light:
            storageValue = "Light";
            break;
        case ColorTheme.Dark:
            storageValue = "Dark";
            break;

        case ColorTheme.System:
            storageValue = "System";
            break;
        case ColorTheme.Stage:
            storageValue = "Stage";
            break;
    }
    localStorage.setItem("colorScheme", storageValue);
}

var gIsDarkTheme: boolean| undefined = undefined;

export function isDarkMode(): boolean {
    if (gIsDarkTheme !== undefined)
    {
        return gIsDarkTheme;
    }
    var colorTheme = getColorScheme();
    if (colorTheme === ColorTheme.System) {
        let androidHost = getAndroidHost();
        if (androidHost)
        {
            if (androidHost.isDarkTheme)
            {
                return gIsDarkTheme = androidHost.isDarkTheme();
            }
            return gIsDarkTheme = true;
        }
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return gIsDarkTheme = true;
        }
    }
    return gIsDarkTheme = (colorTheme === ColorTheme.Dark || colorTheme === ColorTheme.Stage);
}

// The Stage theme is a dark theme (isDarkMode() is true) with its own palette,
// typography and control styling. Not available when hosted by the Android app.
export function isStageTheme(): boolean {
    if (getAndroidHost()) return false;
    return getColorScheme() === ColorTheme.Stage;
}

