# Website mobile regression

Run `npm run test:browser` with port 3000 available. The suite uses installed
Chrome on Windows. Set `PLAYWRIGHT_CHROME_PATH` for another Chrome/Chromium
installation and `OPENSSL_PATH` if OpenSSL is not installed with Git for Windows.

The local fixture server starts Next with synthetic Supabase accounts and
catalogue records. It exercises the normal SSR cookies, server identity checks,
role checks and entitlement checks. It does not create live accounts, change
subscriptions, submit feedback, or update live content. Fixture authentication
is confined to that local backend. `AWM_BROWSER_TEST` only chooses the separate
`.next-browser` build directory; production has no authentication bypass.
Each run clears only that generated build directory. The real `.next` catalogue
cache and `.env.local` remain separate.

Coverage includes:

- Guest, free, premium, reviewer and administrator sessions.
- Exact ordinary drawer entries, all primary destinations, drawer dismissal,
  touch targets, Profile refresh/history, and shared desktop Profile links.
- Authorized reviewer entry and ordinary-user privilege visibility.
- Free-user upgrade offering, actual native audio decoding and advancing time,
  one audio element across reader modes/settings/scroll/resize, and sign-out.
- Explore geometry at 320px, 390px, landscape and changing viewport heights;
  measured header padding changes; sound across clips; manual mute persistence;
  one active player; one autoplay rejection and gesture recovery.
- Uncaught JavaScript exceptions, application console errors and horizontal
  overflow. HTTP resource errors are excluded from the application-console
  assertion so external font/network availability does not masquerade as a
  JavaScript regression.

The YouTube sound cases use a controlled IFrame API contract to make policy
rejection and player lifecycles reproducible. The reader uses real decodable
HTTPS test media, not a mocked `HTMLAudioElement.play()` method. Account tests
use fixture accounts rather than live paid accounts. Screenshots and failed-test
traces are written under `test-results` and are ignored by Git.

Separate production smoke checks used the real public catalogue at 320px and
390px, plus desktop Read at 1280px. Home, Read, Watch, Memory, Feedback, Support,
Profile sign-in and Explore returned successfully without horizontal overflow
or uncaught JavaScript exceptions. The live Explore player began exactly below
the navbar and mounted one YouTube iframe.

These checks use automated Chrome with touch support. Physical iOS/Safari and
Android device testing, actual payment checkout, and live paid-account playback
were not performed.
