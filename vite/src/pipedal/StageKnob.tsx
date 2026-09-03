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

// Knob for the "Stage" theme: a brushed-metal cap with a lit pointer inside a
// track arc, with an accent arc from the minimum to the current value.
//
// PluginControl drives the knob imperatively while dragging (no re-render per
// pointer move): it calls updateStageKnob(svg, range) on the root <svg>, which
// rotates the cap group and redraws the value arc.

import React from 'react';

export const STAGE_KNOB_MIN_ANGLE = -135;
export const STAGE_KNOB_MAX_ANGLE = 135;

const TRACK_WIDTH = 3;

let gradientIdCounter = 0;

function arcPath(cx: number, cy: number, r: number, fromAngle: number, toAngle: number): string {
    let largeArcFlag = (toAngle - fromAngle) > 180 ? 1 : 0;
    let sx = cx + r * Math.sin(fromAngle * Math.PI / 180);
    let sy = cy - r * Math.cos(fromAngle * Math.PI / 180);
    let ex = cx + r * Math.sin(toAngle * Math.PI / 180);
    let ey = cy - r * Math.cos(toAngle * Math.PI / 180);
    return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArcFlag} 1 ${ex} ${ey}`;
}

function rangeToAngle(range: number): number {
    if (range < 0) range = 0;
    if (range > 1) range = 1;
    return STAGE_KNOB_MIN_ANGLE + range * (STAGE_KNOB_MAX_ANGLE - STAGE_KNOB_MIN_ANGLE);
}

/** Update the cap rotation and the value arc of a rendered StageKnob without re-rendering. */
export function updateStageKnob(svg: SVGSVGElement, range: number): void {
    let rotor = svg.querySelector<SVGGElement>(".stage-knob-rotor");
    if (rotor) {
        rotor.style.transform = `rotate(${rangeToAngle(range)}deg)`;
    }
    let arc = svg.querySelector<SVGPathElement>(".stage-knob-value");
    if (arc) {
        let size = Number(svg.dataset.size ?? 52);
        let r = (size - TRACK_WIDTH) / 2;
        let angle = rangeToAngle(range);
        if (range > 0.005) {
            arc.setAttribute("d", arcPath(size / 2, size / 2, r, STAGE_KNOB_MIN_ANGLE, angle));
            arc.style.visibility = "visible";
        } else {
            arc.style.visibility = "hidden";
        }
    }
}

export function isStageKnob(el: Element | null | undefined): boolean {
    return !!el && (el as HTMLElement).dataset?.stageKnob === "1";
}

export interface StageKnobProps extends React.SVGProps<SVGSVGElement> {
    size: number;        // outer diameter (track arc)
    capSize: number;     // cap diameter
    range: number;       // 0..1
    accent: string;
    dimmed?: boolean;
}

const StageKnob = React.forwardRef<SVGSVGElement, StageKnobProps>((props, ref) => {
    const { size, capSize, range, accent, dimmed, style, ...svgProps } = props;
    const ids = React.useMemo(() => {
        let n = ++gradientIdCounter;
        return { cap: `stageKnobCap${n}`, rim: `stageKnobRim${n}`, glow: `stageKnobGlow${n}` };
    }, []);

    let c = size / 2;
    let trackR = (size - TRACK_WIDTH) / 2;
    let capR = capSize / 2;
    let angle = rangeToAngle(range);
    let pointerLen = capR * 0.62;

    return (
        <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`}
            data-stage-knob="1" data-size={size}
            style={{ display: "block", overflow: "visible", touchAction: "none", overscrollBehavior: "none", opacity: dimmed ? 0.45 : 1, ...style }}
            {...svgProps}
        >
            <defs>
                {/* Cap: brushed metal, lit from the top. */}
                <radialGradient id={ids.cap} cx="50%" cy="35%" r="70%">
                    <stop offset="0%" stopColor="#6a6e76" />
                    <stop offset="55%" stopColor="#3a3d44" />
                    <stop offset="100%" stopColor="#1d1f24" />
                </radialGradient>
                {/* Rim: thin bright edge at the top, dark at the bottom. */}
                <linearGradient id={ids.rim} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
                </linearGradient>
                <filter id={ids.glow} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1.6" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {/* Track + value arc. */}
            <path d={arcPath(c, c, trackR, STAGE_KNOB_MIN_ANGLE, STAGE_KNOB_MAX_ANGLE)}
                fill="none" stroke="#ffffff" strokeOpacity={0.14} strokeWidth={TRACK_WIDTH} strokeLinecap="round" />
            <path className="stage-knob-value"
                d={arcPath(c, c, trackR, STAGE_KNOB_MIN_ANGLE, angle)}
                fill="none" stroke={accent} strokeWidth={TRACK_WIDTH} strokeLinecap="round"
                filter={`url(#${ids.glow})`}
                style={{ visibility: range > 0.005 ? "visible" : "hidden" }} />

            {/* Drop shadow under the cap. */}
            <circle cx={c} cy={c + 1.5} r={capR} fill="#000" opacity={0.55} />
            {/* Cap. */}
            <circle cx={c} cy={c} r={capR} fill={`url(#${ids.cap})`} />
            <circle cx={c} cy={c} r={capR - 0.5} fill="none" stroke={`url(#${ids.rim})`} strokeWidth={1} />

            {/* Rotor: pointer; transform is driven imperatively while dragging. */}
            <g className="stage-knob-rotor" style={{ transformOrigin: `${c}px ${c}px`, transform: `rotate(${angle}deg)` }}>
                <line x1={c} y1={c - capR + 4} x2={c} y2={c - capR + 4 + pointerLen}
                    stroke="#0b0c0e" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
                <line x1={c} y1={c - capR + 4} x2={c} y2={c - capR + 4 + pointerLen}
                    stroke={accent} strokeWidth={2.2} strokeLinecap="round" filter={`url(#${ids.glow})`} />
            </g>
        </svg>
    );
});
StageKnob.displayName = "StageKnob";

export default StageKnob;
