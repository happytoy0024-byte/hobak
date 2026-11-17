---
name: antigravity-design-expert
description: Core UI/UX engineering skill for building highly interactive, spatial, weightless, and glassmorphism-based web interfaces using GSAP and 3D CSS.
risk: safe
source: sickn33/agentic-awesome-skills (skills/antigravity-design-expert/SKILL.md)
tags:
  - domain/skills
  - artifact/skill
  - frontend-and-design
---

# Antigravity UI & Motion Design Expert

## Design Principles (The "Antigravity" Vibe)

- **Weightlessness:** UI cards and elements should appear to float. Use layered, soft, diffused drop-shadows (e.g., `box-shadow: 0 20px 40px rgba(0,0,0,0.05)`).
- **Spatial Depth:** Utilize Z-axis layering. Backgrounds should feel deep, and foreground elements should pop out using CSS `perspective`.
- **Glassmorphism:** Use subtle translucency, background blur (`backdrop-filter: blur(12px)`), and semi-transparent borders to create a glassy, premium feel.
- **Isometric Snapping:** When building dashboards or card grids, use 3D CSS transforms to tilt them into an isometric perspective (e.g., `transform: rotateX(60deg) rotateZ(-45deg)`).

## Motion & Animation Rules

- **Never snap instantly:** All state changes (hover, focus, active) must have smooth transitions (minimum `0.3s ease-out`).
- **Responsive feedback:** Keep focus, active, and validation feedback immediately visible. Animate decorative changes only when useful; reduced-motion users (`prefers-reduced-motion: reduce`) receive static states.
