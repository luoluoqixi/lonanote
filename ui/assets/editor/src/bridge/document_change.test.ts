import assert from "node:assert/strict";
import { test } from "node:test";

import { isEditorDocumentChangedPayload } from "./protocol";

test("拒绝非法增量和lease身份", () => {
  assert.equal(
    isEditorDocumentChangedPayload({
      baseRevision: 0,
      localSequence: 1,
      text: "",
      change: { from: -1, to: 0, insert: "" },
    }),
    false,
  );
  assert.equal(
    isEditorDocumentChangedPayload({
      baseRevision: 0,
      localSequence: 1,
      text: "",
      leaseToken: 123,
    }),
    false,
  );
});
test("普通输入只传增量无需全文", () => {
  assert.equal(
    isEditorDocumentChangedPayload({
      baseRevision: 0,
      localSequence: 1,
      change: { from: 0, to: 0, insert: "a" },
    }),
    true,
  );
});
