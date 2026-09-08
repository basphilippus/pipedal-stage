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

// Single-line text that stays put when it fits and slowly scrolls back and forth
// when it overflows (stage tiles: long preset/snapshot names stay readable instead
// of being truncated).

import React, { useLayoutEffect, useRef, useState } from 'react';

interface MarqueeTextProps {
    text: string;
    style?: React.CSSProperties;   // applied to the clipping box (font, colour, size)
    className?: string;
    lines?: number;                // lines allowed before falling back to a marquee (default 1)
    speed?: number;                // px per second of travel
}

// Fit mode: normal wrapping, clipped to `lines` lines. When the text needs more lines
// than that, the component switches to a single-line marquee that scrolls back and forth.
export default function MarqueeText(props: MarqueeTextProps) {
    const outer = useRef<HTMLDivElement>(null);
    const inner = useRef<HTMLSpanElement>(null);
    const [mode, setMode] = useState<"fit" | "marquee">("fit");
    const [overflow, setOverflow] = useState(0);
    const lines = props.lines ?? 1;

    useLayoutEffect(() => {
        const measure = () => {
            if (!outer.current || !inner.current) return;
            let cs = getComputedStyle(inner.current);
            let lh = parseFloat(cs.lineHeight);
            if (!isFinite(lh)) lh = parseFloat(cs.fontSize) * 1.2;
            if (mode === "fit") {
                // needs more than `lines` lines? (inner is unclamped, so its height is the full text)
                let needed = Math.round(inner.current.getBoundingClientRect().height / lh);
                if (needed > lines) setMode("marquee");
            } else {
                let d = inner.current.scrollWidth - outer.current.clientWidth;
                if (d <= 2) {
                    // fits on one line again (e.g. the box grew): go back to normal wrapping
                    setMode("fit");
                    setOverflow(0);
                } else {
                    setOverflow(d);
                }
            }
        };
        measure();
        let ro: ResizeObserver | undefined;
        if (typeof ResizeObserver !== "undefined" && outer.current) {
            ro = new ResizeObserver(measure);
            ro.observe(outer.current);
        }
        return () => { ro?.disconnect(); };
    }, [props.text, mode, lines]);

    // text changed: re-evaluate from fit mode
    useLayoutEffect(() => { setMode("fit"); setOverflow(0); }, [props.text]);

    const speed = props.speed ?? 35;
    const travel = overflow + 12;                       // a little air past the end
    const duration = overflow ? Math.max(5, (travel / speed) * 2 + 3) : 0; // there, pause, back, pause
    const marquee = mode === "marquee";
    return (
        <div ref={outer} className={props.className}
            style={{
                overflow: "hidden", whiteSpace: marquee ? "nowrap" : "normal",
                maxHeight: marquee ? undefined : `calc(${lines} * 1.15em)`, wordBreak: "break-word",
                ...props.style,
            }}>
            <span ref={inner} style={{
                display: "inline-block", maxWidth: marquee ? undefined : "100%",
                willChange: overflow ? "transform" : undefined,
                animation: overflow ? `stageMarquee ${duration}s linear infinite` : "none",
                ["--marquee-shift" as any]: `${-travel}px`,
            }}>{props.text}</span>
            {overflow > 0 && (
                <style>{`@keyframes stageMarquee { 0%, 18% { transform: translateX(0); } 48%, 62% { transform: translateX(var(--marquee-shift)); } 92%, 100% { transform: translateX(0); } }`}</style>
            )}
        </div>
    );
}
