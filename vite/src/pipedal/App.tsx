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

import React from 'react';

import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import VirtualKeyboardHandler from './VirtualKeyboardHandler';
import AppThemed from "./AppThemed";
import { isDarkMode, isStageTheme } from './DarkMode';
import Tone3000AuthComplete from './Tone3000AuthComplete';
import FontTest from './FontTest';

import IconTest from './IconTest';

declare module '@mui/material/styles' {
    interface Theme {
        mainBackground: React.CSSProperties['color'];
        toolbarColor: React.CSSProperties['color'];
        stage: boolean; // true for the "Stage" theme: components may switch to stage-specific styling.
    }
    interface ThemeOptions {
        mainBackground?: React.CSSProperties['color'];
        toolbarColor?: React.CSSProperties['color'];
        stage?: boolean;
    }
    interface Palette {
        actionBar: Palette['primary'];
    }
    interface PaletteOptions {
        actionBar: PaletteOptions['primary'];
    }

}

declare module '@mui/material/Button' {
    interface ButtonPropsVariantOverrides {
        dialogPrimary: true;
        dialogSecondary: true;
    }
}


// declare module '@mui/styles/defaultTheme' {
//     // eslint-disable-next-line @typescript-eslint/no-empty-interface
//     interface DefaultTheme extends Theme { }
// }




// "Stage" theme: dark, high-contrast look for the touchscreen kiosk. Near-black
// ground, flat panels with hairline borders, one warm amber accent (LED/valve glow),
// geometric display type. Selected in Settings > Color theme.
import { STAGE } from './StageTheme';

function stageThemeOptions(): Parameters<typeof createTheme>[0] {
    return {
        cssVariables: true,
        stage: true,
        mainBackground: STAGE.bg,
        toolbarColor: STAGE.panel,
        shape: { borderRadius: 6 },
        typography: {
            fontFamily: STAGE.bodyFont,
            fontSize: 14,
            h6: { fontFamily: STAGE.displayFont, letterSpacing: "0.02em" },
            subtitle1: { fontFamily: STAGE.displayFont, letterSpacing: "0.02em" },
            button: { fontFamily: STAGE.displayFont, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 400 },
            caption: { letterSpacing: "0.02em" },
        },
        palette: {
            mode: 'dark',
            primary: { main: STAGE.accent, contrastText: "#1a1200" },
            secondary: { main: "#FF6060" },
            background: { default: STAGE.bg, paper: STAGE.panel },
            text: { primary: STAGE.text, secondary: STAGE.textDim },
            divider: STAGE.border,
            actionBar: { main: STAGE.panel, contrastText: STAGE.text },
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: { backgroundColor: STAGE.bg },
                    // Touch UI: no scrollbars in the plugin control panel (content still scrolls).
                    '#mainPageControls ::-webkit-scrollbar, #pedalboardScroll::-webkit-scrollbar': { display: 'none' },
                    // Keyboard up: snapshot sheet hugs the top and drops its secondary controls so
                    // Name + Save stay visible above the keys.
                    'body.osk-visible .snapshot-sheet .MuiDialog-container': { alignItems: 'flex-start', paddingTop: 6 },
                    'body.osk-visible .snapshot-sheet .snapshot-sheet-extra': { display: 'none !important' }, // beats the inline display:flex
                    '#mainPageControls *, #pedalboardScroll': { scrollbarWidth: 'none' },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: { backgroundImage: "none" }, // no MUI elevation tint: flat panels.
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: STAGE.panel,
                        backgroundImage: "none",
                        boxShadow: "none",
                        borderBottom: `1px solid ${STAGE.border}`,
                    },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: { border: `1px solid ${STAGE.border}` },
                },
            },
            MuiDivider: {
                styleOverrides: { root: { borderColor: STAGE.border } },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        '& .MuiTouchRipple-ripple': { transform: 'scale(1.9)' },
                    },
                    containedPrimary: {
                        borderRadius: 6,
                        paddingLeft: "18px", paddingRight: "18px",
                        boxShadow: "none",
                        '&:hover': { boxShadow: STAGE.accentGlow },
                    },
                    containedSecondary: {
                        borderRadius: 6,
                        paddingLeft: "18px", paddingRight: "18px",
                        boxShadow: "none",
                    },
                    outlined: { borderColor: STAGE.border },
                },
                variants: [
                    { props: { variant: 'dialogPrimary' }, style: { color: STAGE.accent } },
                    { props: { variant: 'dialogSecondary' }, style: { color: STAGE.textDim } },
                ],
            },
            MuiSwitch: {
                // Bypass toggles read as an LED: dim when off, amber with a glow when on.
                styleOverrides: {
                    switchBase: {
                        '&.Mui-checked .MuiSwitch-thumb': {
                            backgroundColor: STAGE.accent,
                            boxShadow: STAGE.accentGlow,
                        },
                        '&.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: STAGE.accent,
                            opacity: 0.35,
                        },
                    },
                    thumb: { backgroundColor: "#6b7078", boxShadow: "none", transition: `background-color ${STAGE.ease}, box-shadow ${STAGE.ease}` },
                    track: { backgroundColor: "#3a3d44", opacity: 1 },
                },
            },
            MuiInput: {
                // Control value fields: hairline underline instead of the Material text-field look.
                styleOverrides: {
                    input: { fontVariantNumeric: "tabular-nums" },
                    underline: {
                        '&:before': { borderBottom: `1px solid ${STAGE.border}` },
                        '&:hover:not(.Mui-disabled):before': { borderBottom: `1px solid ${STAGE.textDim}` },
                        '&:after': { borderBottom: `2px solid ${STAGE.accent}` },
                    },
                },
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        '&.Mui-selected': {
                            backgroundColor: 'rgba(245,165,36,0.14)',
                            '&:hover': { backgroundColor: 'rgba(245,165,36,0.2)' },
                        },
                    },
                },
            },
            MuiTooltip: {
                styleOverrides: {
                    // Also the value readout while dragging a knob: big enough to read from standing height.
                    tooltip: { backgroundColor: STAGE.panelRaised, border: `1px solid ${STAGE.border}`, color: STAGE.text, fontSize: 15, fontFamily: STAGE.displayFont, letterSpacing: "0.03em", padding: "6px 12px", fontVariantNumeric: "tabular-nums" },
                },
            },
        },
    };
}

const theme = createTheme(
    isStageTheme() ? stageThemeOptions() :
    isDarkMode() ?
        {
            cssVariables: true,
            components: {
                // MuiTouchRipple: {
                //     styleOverrides: {
                //         root: {
                //             borderRadius: 'inherit',
                //             overflow: 'hidden',
                //         },
                //         ripple: {
                //             color: '#F88 !important',
                //             borderRadius: 'inherit',

                //             '&.MuiTouchRipple-ripplePulsate': {
                //                 //animation: 'none !important',

                //                 // Make focus ripple fill the entire button
                //                 '&.MuiTouchRipple-child': {
                //                     width: '100%',
                //                     height: '100%',
                //                     borderRadius: 'inherit',
                //                     transform: 'scale(1.4)', // Override the default scaling
                //                 }
                //             },
                //             '&.MuiTouchRipple-ripple': {
                //                 '&:focus': {
                //                     // Make focus ripple fill the entire button
                //                     transform: 'scale(1.4)',
                //                     width: '100%',
                //                     height: '100%',
                //                     color: '#F88',
                //                     borderRadius: 'inherit',
                //                 },
                //             },
                //         },
                //         child: {
                //             borderRadius: 'inherit',
                //         }
                //     }
                // },
                MuiButton: {
                    styleOverrides: {
                        root: {
                            '& .MuiTouchRipple-ripple': {
                                transform: 'scale(1.9)',
                            }
                        },
                        containedPrimary: {
                            borderRadius: '9999px',
                            paddingLeft: "16px", paddingRight: "16px",
                            textTransform: "none"
                        },
                        containedSecondary: {
                            borderRadius: '9999px',
                            paddingLeft: "16px", paddingRight: "16px",
                            textTransform: "none"
                        }

                    },
                    variants: [
                        {
                            props: { variant: 'dialogPrimary' },
                            style: {
                                color: "#FFFFFF"
                            }
                        },
                        {
                            props: { variant: 'dialogSecondary', },
                            style: {
                                color: "rgb(255,255,255,0.7)"
                            },
                        },
                    ],
                },
            },

            palette: {
                mode: 'dark',
                primary: {
                    main: '#A770E4'// #6750A4"   // #5B5690  #60529A  #5C5694
                },
                secondary: {
                    main: "#FF6060"
                },
                actionBar: {
                    main: '#130b22ff',
                    contrastText: '#FFFFFF'
                }

            },
            mainBackground: "#222",
            toolbarColor: '#222',
            stage: false
        }
        :
        {
            cssVariables: true,
            components: {
                /* make the selection state for MuiListItemButtons a smidgen darker (light theme only) */
                MuiListItemButton: {
                    styleOverrides: {
                        root: ({ theme }) => ({
                            '&.Mui-selected': {
                                backgroundColor: 'rgba(0, 0, 0, 0.2)', // Adjust for desired darkness
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.25)', // Slightly darker on hover
                                },
                            },
                        }),
                    },
                },
                MuiButton: {
                    styleOverrides: {
                        root: {
                            '& .MuiTouchRipple-root': {
                                borderRadius: 'inherit',
                            },
                            '& .MuiTouchRipple-ripple': {
                                transform: 'scale(1.9)!important',
                            }
                        },
                        containedPrimary: {
                            borderRadius: '9999px',
                            paddingLeft: "16px", paddingRight: "16px",
                            textTransform: "none"
                        },
                        containedSecondary: {
                            borderRadius: '9999px',
                            paddingLeft: "16px", paddingRight: "16px",
                            textTransform: "none"
                        }

                    },
                    variants: [
                        {
                            props: { variant: 'dialogPrimary' },
                            style: {
                                color: "rgb(0,0,0,0.87)"
                            }
                        },
                        {
                            props: { variant: 'dialogSecondary', },
                            style: {
                                color: "rgb(0,0,0,0.6)"
                            },
                        },
                    ],
                },
            },
            palette: {
                primary: {
                    main: "#6750A4"   // #5B5690  #60529A  #5C5694
                },
                secondary: {
                    main: "#FF6060"
                },
                actionBar: {
                    main: '#130b22ff',
                    contrastText: '#FFFFFF'
                }



            },
            mainBackground: "#FFFFFF",
            toolbarColor: '#FFFFFF',
            stage: false


        }
);



type AppThemeProps = {

};


function isTone3000Auth() {
    let url = new URL(window.location.href);
    let param = url.searchParams.get("api_key");
    return (param !== null && param !== "")
}
function isFontTest() {
    let url = new URL(window.location.href);
    let param = url.searchParams.get("fontTest");
    return (param !== null)
}
function isIconTest() {
    let url = new URL(window.location.href);
    let param = url.searchParams.get("iconTest");
    return (param !== null)
}

const App = (class extends React.Component {
    // Before the component mounts, we initialise our state

    constructor(props: AppThemeProps) {
        super(props);
        this.state = {
        };
        if (!App.virtualKeyboardHandler) {
            App.virtualKeyboardHandler = new VirtualKeyboardHandler();
        }
    }

    static virtualKeyboardHandler?: VirtualKeyboardHandler;

    render() {
        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    {
                        isTone3000Auth() && (<Tone3000AuthComplete />)
                        || isFontTest() && (<FontTest />)
                        || isIconTest() && (<IconTest />)
                        || (<AppThemed />)
                    }
                </ThemeProvider>
            </StyledEngineProvider>
        );
    }
}
);

export default App;
