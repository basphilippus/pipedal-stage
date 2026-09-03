// Design tokens for the "Stage" color theme (see docs/stage-ui-plan.md in the rig repo).
// Kept in its own module so components can import them without pulling in App.tsx.
export const STAGE = {
    bg: "#0e0f11",
    panel: "#17181b",
    panelRaised: "#1e2024",
    panelGradient: "linear-gradient(180deg, #1c1e22 0%, #141518 100%)",
    panelTop: "#1b1d21",          // colour at the top edge of panelGradient (for labels sitting on the border)
    innerHighlight: "inset 0 1px 0 rgba(255,255,255,0.04)",
    shadow: "0 2px 8px rgba(0,0,0,0.5)",
    border: "#2a2c31",
    wire: "#3a3d44",
    accent: "#f5a524",
    accentGlow: "0 0 10px rgba(245,165,36,0.55)",
    text: "#f2f2f2",
    textDim: "#9aa0a8",
    displayFont: "'Nexa', 'Roboto', sans-serif",
    bodyFont: "'Questrial', 'Roboto', sans-serif",
    ease: "180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
};
