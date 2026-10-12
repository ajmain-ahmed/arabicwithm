import { processWork, type Work } from "./worker.ts";
import { ProviderError, type Transcript } from "./provider.ts";
import { pairTranslation, processTranslation } from "./translation.ts";

function assert(value: unknown): asserts value {
  if (!value) throw new Error("Assertion failed");
}
const raw: Transcript = {
  lang: "ar",
  content: [{ text: "مرحبا", offset: 84200, duration: 5500 }],
};
function work(): Work {
  return {
    website_generation: true,
    id: "video",
    lease_id: "lease",
    canonical_url: "https://youtu.be/GENERATE001",
    raw_transcript: null,
    provider_job_id: null,
    request_started_at: null,
    attempts: 0,
    provider_metadata: { title: "Saved" },
  };
}
Deno.test("website acquisition persists real provider timing before indexing", async () => {
  const events: Record<string, unknown>[] = [];
  const item = work();
  await processWork(item, {
    save: (_w, fields) => {
      events.push(fields);
      return Promise.resolve();
    },
    index: () => {
      assert(events.at(-1)?.raw_transcript === raw);
      return Promise.resolve();
    },
  }, {
    metadata: () => Promise.resolve({}),
    request: () => Promise.resolve({ kind: "transcript", raw }),
    poll: () => {
      throw new Error("Unexpected poll");
    },
  });
  assert(item.raw_transcript === raw && events.length === 2);
  assert(raw.content[0].offset === 84200 && raw.content[0].duration === 5500);
});
Deno.test("website rejects fabricated or fractional timing without indexing", async () => {
  for (const offset of [-1, 84.2]) {
    const events: Record<string, unknown>[] = [];
    await processWork(work(), {
      save: (_w, fields) => {
        events.push(fields);
        return Promise.resolve();
      },
      index: () => {
        throw new Error("Must not index");
      },
    }, {
      metadata: () => Promise.resolve({}),
      request: () =>
        Promise.resolve({
          kind: "transcript",
          raw: { ...raw, content: [{ ...raw.content[0], offset }] },
        }),
      poll: () => {
        throw new Error("Unexpected poll");
      },
    });
    assert(
      events.at(-1)?.status === "failed" &&
        events.at(-1)?.error_code === "invalid_timing",
    );
  }
});
Deno.test("English is paired only to the same real Arabic interval", () => {
  const source = [{
    id: 1,
    start_seconds: 84.2,
    end_seconds: 89.7,
    original_text: "مرحبا",
    english_text: null,
  }];
  const pairs = pairTranslation(source, {
    lang: "en",
    content: [{ text: "Hello", offset: 84200, duration: 5500 }],
  });
  assert(
    pairs.length === 1 && pairs[0].start === 84.2 &&
      pairs[0].english === "Hello",
  );
  assert(
    pairTranslation(source, {
      lang: "en",
      content: [{ text: "Ambiguous", offset: 84000, duration: 6000 }],
    }).length === 0,
  );
});
Deno.test("provider plan failure surfaces specifically without applying English", async () => {
  const events: Record<string, unknown>[] = [];
  await processTranslation(
    {
      transcript_id: "video",
      lease_id: "lease",
      request_started_at: null,
      raw_translation: null,
      attempts: 0,
    },
    "url",
    [],
    {
      save: (_w, fields) => {
        events.push(fields);
        return Promise.resolve();
      },
      apply: () => {
        throw new Error("Must not apply");
      },
    },
    {
      translate: () => {
        throw new ProviderError("provider_upgrade_required");
      },
    },
  );
  assert(
    events.at(-1)?.status === "unavailable" &&
      events.at(-1)?.error_code === "provider_upgrade_required",
  );
});
Deno.test("persisted acquisition is reindexed without purchasing another transcript", async () => {
  const item = { ...work(), raw_transcript: raw };
  let indexed = false;
  await processWork(item, {
    save: () => {
      throw new Error("Must not acquire");
    },
    index: () => {
      indexed = true;
      return Promise.resolve();
    },
  }, {
    metadata: () => {
      throw new Error("Must not acquire");
    },
    request: () => {
      throw new Error("Must not acquire");
    },
    poll: () => {
      throw new Error("Must not poll");
    },
  });
  assert(indexed);
});
