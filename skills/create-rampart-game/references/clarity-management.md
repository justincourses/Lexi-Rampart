# Microsoft Clarity removal and replacement

Use this workflow whenever source audit finds Microsoft Clarity and the task creates a new game, changes operator/domain, prepares publication, or directly concerns analytics.

The bundled helper edits only the recognizable Lexi Rampart Clarity loader in `index.html`. It refuses ambiguous or multiple loaders instead of guessing.

## 1. Inspect before asking

Run either source audit or the focused inspector:

```bash
node skills/create-rampart-game/scripts/audit-rampart.mjs <repo-root>
node skills/create-rampart-game/scripts/configure-clarity.mjs inspect <repo-root>
```

If no Clarity loader exists, record that fact and do not ask an irrelevant analytics question.

If Clarity exists in an unchanged project owned by the same operator and analytics is outside the task, do not rewrite it silently. If ownership is unclear or publication/operator/domain changes, include Clarity in the opening confirmation.

## 2. Guide one explicit choice

Offer two actionable choices in the opening intake:

1. **Remove Clarity** — recommended for a new game, education-oriented or potentially under-18 audience, privacy-minimized build, or any case where the user does not already operate a Clarity project.
2. **Replace with my Project ID** — use only when the user owns/controls the target Clarity project and supplies the ID. Explain that replacement alone does not configure consent, privacy notice, masking, retention, audience suitability, or regional obligations.

Do not carry the original Project ID into a new runnable copy while waiting for a later decision. Obtain this choice before source copying/editing finishes so an unattended run does not pause near deployment.

An explicit request such as “remove Clarity” or “replace Clarity with abc123” is already confirmation. Do not ask the same question again. A generic “direct execution” instruction without a remove/replace choice is not confirmation for analytics.

For a new game/operator/domain, keeping the source ID is not a third default option. Retain it only when the user affirmatively confirms that the existing ID belongs to the same operator and should continue for the same property, then still report the privacy/audience review status.

## 3. Apply the confirmed action

### Remove

```bash
node skills/create-rampart-game/scripts/configure-clarity.mjs remove <repo-root>
```

This removes the whole recognized inline Clarity loader, not merely the ID. Do not leave a dead placeholder, empty tag, or request to `clarity.ms`.

### Replace

```bash
node skills/create-rampart-game/scripts/configure-clarity.mjs replace <repo-root> <user-project-id>
```

The helper accepts only a conservative ID character set and changes only the loader's Project ID. Do not write the ID into logs beyond the confirmation/status output, and never invent a placeholder ID.

If the helper reports no loader, multiple loaders, or an unrecognized shape, inspect `index.html` and present the exact situation before editing manually. Do not broaden a regular expression until it can be proven to target only Clarity.

## 4. Verify the result

Always rerun:

```bash
node skills/create-rampart-game/scripts/configure-clarity.mjs inspect <repo-root>
npm run build
```

Then verify:

- removal: inspector reports `present: false`, built HTML contains no Clarity loader, and no request goes to `clarity.ms` during a browser smoke/manual load;
- replacement: inspector reports exactly one loader with the confirmed ID, the old ID is absent from source and built HTML, and network traffic targets only the user's Clarity project;
- both: startup, asset recovery, CSP/security headers if present, and the rest of the game still work.

Use `rg -n "clarity|clarity\.ms" <repo-root>` to find documentation, consent code, CSP entries, or duplicate integrations that the focused helper intentionally does not edit. Review each result rather than deleting every mention blindly.

## 5. Complete the operational review

For replacement, explicitly record:

- operator ownership of the Project ID;
- intended domains and environments;
- audience, especially whether users under 18 are targeted;
- privacy notice and consent-mode/CMP decision;
- text/input masking and sensitive content review;
- development/staging behavior;
- how users can exercise applicable choices or opt out;
- current Microsoft terms/documentation review date.

If these decisions are not ready, keep Clarity removed/disabled. Do not claim that this skill or the helper script establishes legal compliance.
