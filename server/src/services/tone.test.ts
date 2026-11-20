import assert from "node:assert/strict";
import test from "node:test";

import { getToneInstruction } from "./tone.js";

test("professional tone becomes a professional system instruction", () => {
  assert.equal(
    getToneInstruction("professional"),
    "Use a professional tone. Be clear, respectful, and precise.",
  );
});

test("casual tone becomes a casual system instruction", () => {
  assert.equal(
    getToneInstruction("casual"),
    "Use a casual, friendly tone. Keep the conversation natural and approachable.",
  );
});

test("concise tone becomes a concise system instruction", () => {
  assert.equal(
    getToneInstruction("concise"),
    "Use a concise tone. Prioritize the essential information and avoid unnecessary detail.",
  );
});