import { generateBadge } from "./generator.ts";
import { assert } from "https://deno.land/std@0.161.0/_util/assert.ts";

Deno.test("generator", async () => {
  const bytes = await generateBadge({
    name: "Alberto",
    company: "Synadia Communications, Inc",
  }, false);
  assert(bytes?.length);
});
