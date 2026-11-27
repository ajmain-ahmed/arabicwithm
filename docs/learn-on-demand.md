# On-demand Learn landing page

The Learn landing page renders three compact launch cards in a centred 1120px
container. Phones stack the cards; desktop shows equal columns. An active card
spans the container so its existing activity engine has sufficient space.
Three existing square destination tiles remain centred beneath the cards, with
prefetch disabled to avoid loading dedicated activities on landing.

Start imports the selected activity on demand. Grammar has a separate bundle,
so starting a puzzle does not load its question bank. There is no server-side
random question selection or initial exercise payload. Cards have independent
loading/error state, a synchronous duplicate-tap lock and Close controls.
Closing unmounts only that activity; refresh restores all three launch cards.

Existing engines, bounded source-selection endpoints and completion behaviour
are reused. Grammar continuation draws from a shuffled remaining-question pool
before refilling, preserving feedback until the learner chooses the next item.
Memory excludes its previous source on continuation. Word Search retains its
existing new-game selection and gains an embedded completion Close action.
Home navigation occurs only through an explicit Home destination.

## Workload evidence

The prior expanded architecture was measured in an isolated checkout: loading
Learn issued two activity requests (`/api/learn/puzzle`, `/api/learn/memory`)
and selected a Grammar question on the server. The new landing issues zero
activity requests and does not mount activity engines or select a question.
Measurements are written to `artifacts/learn-demand/*-workload.json` by
`e2e/learn-workload.pw.ts`. These are activity request counts, not counts of
unrelated site chrome/assets or production Worker CPU measurements.

Screenshots and browser evidence are under ignored `artifacts/learn-demand/`.
`playwright.learn-demand.config.ts` checks Chrome, WebKit, Firefox and Edge.
Existing continuation tests now explicitly start activities, including after
refresh. CI retains the on-demand and continuation gates before deployment.

Local validation: sixteen on-demand/workload/recovery checks across the four browsers,
two extended continuation/matching checks (including authenticated Memory), and
all 1,700 unit tests pass. Screenshots include compact and expanded states at
390px and 1440px. TypeScript, lint and the production build are release gates.

Production CPU/resource-limit verification is reported separately from fixture
results. A Cloudflare challenge blocking the production smoke test does not
constitute a successful live activity test or a measured CPU improvement.
No schema migration, content mutation, publication change, website-language
change or Safari recovery change is part of this redesign.
