# Visual, interaction, and audio language

Verify current values in `styles.css`, `index.html`, and relevant runtime modules. Use this guide to preserve the design system or translate it coherently into a new theme.

## Art direction

The interface reads as a printed campaign dossier laid over a dark fortress command surface:

- warm paper, ink, grain, dashed rules, stamps, chapter numbers, and off-register shadows;
- dark charcoal gameplay wells with brass, ember, moss, and mana accents;
- strong editorial hierarchy rather than glossy app cards;
- geometric CSS silhouettes for battlefield scenery, fortress, and enemies;
- restrained bilingual labels used like field-manual metadata;
- square or lightly irregular edges, not a generic rounded-card dashboard.

The visual system is information-dense but not ornamental for its own sake. Borders, symbols, colors, stamps, and motion identify resource type, threat, status, and hierarchy.

## Core palette

Current root tokens:

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#1b1b16` | primary ink/dark command surface |
| `--ink-soft` | `#35372c` | secondary dark surface |
| `--paper` | `#e4ddc8` | page background |
| `--paper-deep` | `#c8bea2` | aged paper depth |
| `--paper-light` | `#f1ead6` | cards and headers |
| `--red` | `#d55237` | danger/ember/action accent |
| `--red-dark` | `#7e281f` | strong action/stamp |
| `--blue` | `#4e9eb9` | mana/information accent |
| `--green` | `#6b9c52` | repair/defense accent |
| `--gold` | `#d8a834` | focus/reward/command accent |
| `--cream` | `#f8f0d5` | light text on dark surfaces |

Resource feedback uses brighter local variants, including ember `#ee7659`, mana `#76cae1`, moss `#92c273`, and coin `#f1c75e`.

For a new game, retain the tonal relationships even if hues change: paper base, nearly black ink, one danger/action color, one reward/focus color, and clearly distinct resource accents with adequate contrast.

## Typography

- Main Chinese UI: `Noto Serif SC` with Song/Songti fallback.
- Brand title: `Ma Shan Zheng` with Kaiti fallback.
- Letter puzzle: system monospace for fixed rhythm.
- Numeric HUD: tabular numerals.
- Eyebrows and metadata: small, heavy, tracked, often uppercase or bilingual.

Do not apply the display brush face broadly. Its scarcity makes the brand lockup feel like a seal/title rather than a themed font pack.

The current Google Fonts import is a third-party network dependency. A production fork should review availability, privacy, licensing, and self-hosting requirements rather than assuming the import is legally or operationally neutral.

## Page hierarchy

The primary screen is structured as:

1. topbar: seal/brand, difficulty/wave/kills/score, campaign and media controls;
2. dark status rail: wall/shield, threat message, recommended word throughput;
3. two-column game grid: active word workshop on the left and battlefield/arsenal on the right;
4. overlays: orientation guard, campaign briefing, resume, rules, settlement, leaderboard;
5. contextual tooltips and live status regions.

The left/right split makes production and consumption visible simultaneously. Preserve this simultaneity for new concepts whenever the coupled loop is real-time.

## Component language

- Panels use hard borders, inset outlines, dashed inner frames, and offset shadows.
- Resource tiles use a dark ground plus a colored bottom rule and stable symbol.
- Primary actions resemble stamped command strips with an offset black shadow.
- Modals resemble physical briefing sheets, slightly rotated, with classification stamps.
- Meters are narrow, high-contrast rails with restrained gradients.
- Difficulty cards reveal selection with a dark fill and colored bottom rule.
- Tables use dashed row rules, tabular numerals, and a dark current-row highlight.
- Focus uses a visible gold outline with separation from the control.

Avoid excessive blur, glassmorphism, floating pills, giant gradients, and interchangeable SaaS cards unless the user explicitly requests a new visual language.

## Spelling surface

- A heavy framed dark well separates the task from the paper shell.
- Metadata shows reference level and previewed reward before the word.
- Word slots use a monospace baseline and strong bottom rules.
- Missing letters use gold/red emphasis; correct fills pop briefly; revealed errors shake and turn warm red.
- Three circular error marks show remaining tolerance without a separate form submission.
- QWERTY keys are tactile DOM buttons with beveled bottom edges, hover lift, press depth, focus rings, and wrong-key feedback.

The UI teaches input order through layout, prompt text, state, and keyboard parity rather than a tutorial-only explanation.

## Battlefield

The battlefield uses CSS geometry and flat layered scenery:

- paper sky, gray-green mountains, scratched texture, lane lines, watchtowers, muted sun;
- a left-side fortress and right-to-left enemy pressure;
- compact ally stats at upper left and target dossier at upper right;
- low-opacity battle log near the bottom;
- distinct enemy silhouettes, colors, size, role marks, health bars, and status effects.

Keep interactive overlays compact enough that the battlefield remains readable. Effects should reinforce targeting, damage, status, or reward—not conceal them.

## Motion and feedback

Motion durations are short and causal:

- input lock and wrong feedback are immediate;
- resource gain/spend pulses show numeric change;
- projectiles and impacts connect attack to damage;
- upgrade banners and stamps briefly interrupt hierarchy because progression is rare and important;
- wave announcements frame phase changes;
- ambient enemy movement and flag motion remain decorative.

Use transform and opacity where possible. Preserve pause, cancellation, CSS fallback, and reduced motion. Reduced motion must retain state clarity through color, text, and final placement.

## Sound

The system layers:

- licensed static UI/impact sounds from `public/assets/`;
- generated tones for compact feedback;
- browser speech synthesis for optional word pronunciation;
- MIDI-style campaign tracks with user-controlled enable/skip.

Audio is enhancement, never the only signal. Speech failure is silent and non-blocking. New playback cancels queued speech to prevent backlog. Muting combat sound also mutes pronunciation in the current product.

Preserve license notices beside third-party audio. Do not assume one asset's CC0 status covers the rest of the repository.

## Responsive and accessible behavior

- Desktop is the primary full-information layout.
- Header and HUD sizes are controlled through density tokens at 1024, 1280, 1440, and 1920 tiers.
- Narrow landscape uses a fixed natural canvas width and scales the whole shell.
- Narrow portrait displays a dedicated rotate-device guard and makes the shell inert.
- Smaller portrait fallback CSS still exists for overlays and content.
- `prefers-reduced-motion` collapses animation duration.
- semantic buttons, labels, groups, status regions, focus entry/return, and keyboard shortcuts remain first-class.

When changing UI, manually inspect at least:

- a standard desktop viewport;
- 1024-ish desktop/tablet landscape;
- compact phone landscape;
- portrait orientation guard;
- keyboard-only navigation;
- reduced motion;
- long Chinese and English strings;
- pause overlay and each affected modal.

## Translating the style into a new game

Preserve the design grammar, not only the hex values:

- identify the fictional document or instrument the interface represents;
- give each resource a symbol, hue, name, and downstream purpose;
- keep the producer and consumer visible together;
- reserve stamps and large motion for campaign-level events;
- make live numbers tabular and causal changes explicit;
- use material texture subtly so text remains readable;
- adapt the seal, battlefield silhouettes, labels, and copy only after the rights review.
