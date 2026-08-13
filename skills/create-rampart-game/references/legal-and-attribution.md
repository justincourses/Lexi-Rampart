# Rights, attribution, privacy, and disclaimer workflow

This reference is a technical risk checklist, not legal advice, a legal opinion, or a license grant. Laws and service terms vary by jurisdiction and change over time. Recommend review by a qualified lawyer when public distribution, commercial use, minors, personal data, trademarks, third-party content, or unclear ownership is material.

## Do not confuse visibility with permission

At the 2026-08-13 local audit, the Lexi Rampart repository did not contain a top-level `LICENSE`, `LICENSE.md`, or `LICENSE.txt`. Recheck the selected revision every time.

GitHub explains that without a license, default copyright law applies and public availability does not by itself grant permission to reproduce, distribute, or create derivative works. GitHub's platform terms may permit viewing and forking on GitHub, but that is not the same as a general software/content license.

Official reference: <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository>

Consequences for the skill:

- Do not call the repository “open source” merely because it is public.
- Do not tell a user that cloning, forking, or AI-assisted transformation clears reuse rights.
- Confirm that the user owns the relevant material, has permission, or has selected a valid license path before copying into another distributed product.
- When permission is unclear, analysis, architectural learning, and a clean minimal skeleton are safer than copying expressive code, text, branding, or assets.
- A disclaimer cannot replace permission or a license.

## Inventory rights by material, not repository

Create an inventory with `material`, `path/source`, `owner`, `license/permission`, `required notice`, `intended use`, and `unresolved risk`.

Review separately:

- source code and contributions;
- word lists and any upstream dataset;
- seal, favicon, name, enemy names, UI copy, and visual identity;
- fonts and font delivery;
- music data, generated arrangements, and recordings;
- sound effects;
- documentation, screenshots, and marketing material;
- third-party packages and transitive dependencies;
- analytics, hosting, and external service terms;
- user-provided files or AI-generated material.

One license never automatically covers all categories.

## Existing asset notices

The repository includes license notices beside Kenney UI and impact audio in `public/assets/audio/**/License.txt`, and the README describes these sounds as CC0. Preserve those notices and verify the exact files.

Creative Commons' CC0 summary says CC0 permits broad reuse but does not affect patent or trademark rights, does not clear other persons' privacy/publicity rights, does not imply endorsement, and carries no warranty. Apply CC0 only to the material actually associated with it.

Official reference: <https://creativecommons.org/publicdomain/zero/1.0/>

Do not infer that the repository's code, word lists, brand, seal, fonts, music, or skill are CC0 because some audio files are.

## Branding and endorsement

Before publishing a derivative:

- decide whether the product keeps or changes “Lexi Rampart / 词垒守卫” and the seal;
- avoid implying that the original author, contributors, Kenney, Creative Commons, Microsoft, Google, Cloudflare, or any upstream dataset endorses the derivative;
- inspect names, logos, domain names, and store listings for trademark or passing-off risk;
- distinguish factual attribution from promotional endorsement.

If the user lacks permission to reuse branding, preserve the design principles while creating a distinct name, seal, copy, and identity.

## Analytics and privacy

The current `index.html` includes a Microsoft Clarity analytics script. Treat analytics as an operator-owned integration, not a harmless visual dependency.

Microsoft describes Clarity as behavior analytics that can capture rendering and interactions such as mouse movement, clicks, and scrolling. Its current documentation says Clarity should not be used on sites/apps targeting users under 18 and describes consent-signal requirements for some regions. Recheck the current official terms and documentation for the intended audience and jurisdiction:

- <https://learn.microsoft.com/en-gb/clarity/faq>
- <https://learn.microsoft.com/en-us/clarity/setup-and-installation/cookie-cmps>

For a new project or operator:

- never retain the original Clarity project ID silently;
- use [clarity-management.md](clarity-management.md) to guide one explicit remove-or-replace choice, then perform and verify the edit automatically;
- disable/remove analytics until the operator deliberately configures its own account and privacy process, or replace it only with an operator-owned Project ID;
- document data categories, purposes, recipients, retention, consent, opt-out, and audience constraints as applicable;
- avoid exposing spelling input, saved state, identifiers, or sensitive content to analytics;
- review whether a child-directed or education-oriented game is compatible with the analytics service at all;
- provide a non-tracking local development mode.

Project ID replacement is configuration, not compliance. Do not describe the site as compliant merely because the ID belongs to the user.

The game also references remote Google Fonts and may be deployed through Cloudflare. Review the current terms, privacy behavior, data flows, and self-hosting alternatives for the actual deployment. Do not make compliance guarantees from source inspection alone.

## User content and educational claims

- Validate word data provenance, content suitability, and redistribution rights.
- Keep the statement that CEFR grouping is referential, not official certification, a complete curriculum, or an assessment.
- Do not add medical, educational-outcome, safety, or accessibility-compliance claims without evidence and appropriate review.
- If accepting user content, define moderation, privacy, retention, deletion, and infringement-reporting processes before public operation.

## Software, security, and data disclaimer

Project and skill disclaimers should state, subject to applicable law:

- material is provided for informational/development purposes and “as is”;
- there is no promise of uninterrupted operation, accuracy, security, merchantability, fitness for a particular purpose, or non-infringement;
- local saves can be lost, cleared, corrupted, or made incompatible by browser/device/update behavior;
- users/operators are responsible for testing, backups, security review, deployment configuration, lawful content, and regulatory obligations;
- third-party services and packages remain governed by their own terms;
- AI-generated plans or code can be incomplete or incorrect and require human review;
- the disclaimer is not itself a software/content license and does not change third-party rights.

Do not claim that a disclaimer eliminates all liability. Its effect depends on applicable law, assent, wording, and facts.

## High-risk confirmation gate

Stop for explicit confirmation before:

- copying material without a verified license/permission;
- applying a new license to code with multiple or unclear contributors;
- removing license notices or attribution;
- publishing under the original brand without clear authorization;
- enabling analytics for a new operator, child-directed audience, or jurisdiction with unresolved consent/privacy requirements;
- deploying a derivative to production with unresolved rights or data-flow questions;
- making legal-compliance, official certification, or endorsement claims.

Explain the concrete unresolved question and a safer alternative. Direct-execution mode does not bypass this gate.

## Release review checklist

- [ ] Selected source revision and ownership are recorded.
- [ ] Top-level license or permission is verified; absence is not misrepresented.
- [ ] Third-party code, data, fonts, audio, music, and art are inventoried.
- [ ] Required notices are preserved in source and distribution.
- [ ] Brand/trademark/endorsement risk is reviewed.
- [ ] Analytics IDs belong to the operator and privacy/consent/audience decisions are documented.
- [ ] Secrets and original deployment identifiers are absent.
- [ ] CEFR and other product claims are appropriately qualified.
- [ ] README links to the project's disclaimer and license/notice information.
- [ ] A qualified professional reviews material unresolved legal questions.

## Skill-specific notice

`create-rampart-game` guides source analysis and implementation. It does not certify that a reuse is lawful, that a product complies with any law or platform policy, or that generated code is free of defects or third-party rights. The invoking user and deploying operator remain responsible for authorization, review, testing, notices, privacy, security, and use.
