import { audiobookHandler, type AudioStore } from "./handler.ts";
function assert(value: unknown): asserts value {
  if (!value) throw new Error("Assertion failed");
}
const chapterId = "11111111-1111-4111-8111-111111111111";
function fixture(user: string | null, premium: boolean) {
  const calls: string[] = [];
  const store: AudioStore = {
    authenticate: () => Promise.resolve(user),
    premium: () => Promise.resolve(premium),
    availability: () => {
      calls.push("availability");
      return Promise.resolve([{
        chapterId,
        language: "ar",
        narrator: null,
        durationSeconds: 15,
      }]);
    },
    play: (_id, language, actor) => {
      calls.push(`${actor}/${language}`);
      return Promise.resolve({
        sourceType: "supabase_storage",
        url: "https://test/signed",
        expiresIn: 900,
        positionSeconds: 3,
      });
    },
    progress: () => {
      calls.push("progress");
      return Promise.resolve();
    },
  };
  const request = (body: unknown) =>
    audiobookHandler(store)(
      new Request("https://test", {
        method: "POST",
        headers: { authorization: "Bearer user-token" },
        body: JSON.stringify(body),
      }),
    );
  return { calls, request };
}
Deno.test("rejects invalid authentication before private access", async () => {
  const f = fixture(null, true);
  assert(
    (await f.request({ action: "play", chapterId, language: "ar" })).status ===
      401,
  );
  assert(f.calls.length === 0);
});
Deno.test("availability never returns storage paths or signed links", async () => {
  const f = fixture("free", false);
  const response = await f.request({ action: "availability", chapterId });
  const result = await response.json();
  assert(response.status === 200 && result.audio.length === 1);
  assert(
    !JSON.stringify(result).includes("url") &&
      !JSON.stringify(result).includes("storage"),
  );
});
Deno.test("fresh entitlement gates signing and progress for every request", async () => {
  const f = fixture("free", false);
  assert(
    (await f.request({ action: "play", chapterId, language: "ar" })).status ===
      403,
  );
  assert(
    (await f.request({
      action: "progress",
      chapterId,
      language: "ar",
      positionSeconds: 3,
      completed: false,
    })).status === 403,
  );
  assert(f.calls.length === 0);
});
Deno.test("language-specific playback uses verified actor, never a body user ID", async () => {
  const f = fixture("verified-user", true);
  const response = await f.request({
    action: "play",
    chapterId,
    language: "en",
    userId: "attacker",
  });
  assert(response.status === 200);
  assert(f.calls[0] === "verified-user/en");
  assert((await response.json()).expiresIn === 900);
});
Deno.test("rejects invalid chapter, language, action and progress without storage access", async () => {
  const f = fixture("paid", true);
  for (
    const body of [
      { action: "play", chapterId: "../../other", language: "ar" },
      { action: "play", chapterId, language: "xx" },
      { action: "remove", chapterId },
      {
        action: "progress",
        chapterId,
        language: "ar",
        positionSeconds: -1,
        completed: false,
      },
    ]
  ) assert((await f.request(body)).status === 400);
  assert(f.calls.length === 0);
});
