import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  fetch: vi.fn(),
  saved: vi.fn(),
  closed: vi.fn(),
}));
vi.mock("@/app/actions/admin", () => ({
  createBook: mocks.create,
  updateBook: mocks.update,
  fetchBookForAdmin: mocks.fetch,
  deleteBook: vi.fn(),
}));
vi.mock("./ImageUploadField", () => ({ default: () => null }));
import BookEditDialog from "./BookEditDialog";
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  mocks.create.mockResolvedValue({ ok: true, data: "new-book-id" });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function mount() {
  await act(async () =>
    root.render(
      <BookEditDialog
        open
        bookId={null}
        onSaved={mocks.saved}
        onClose={mocks.closed}
      />,
    ),
  );
}
async function field(label: string, value: string) {
  const input = Array.from(document.querySelectorAll("input,textarea")).find(
    (input) =>
      input.id ===
      Array.from(document.querySelectorAll("label")).find((l) =>
        l.textContent?.startsWith(label),
      )?.htmlFor,
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      input.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function save() {
  return Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent === "Save",
  )!;
}
async function valid() {
  await field("Slug", "test-book");
  await field("Title", "Test Book");
  await field("Description", "A meaningful description of the new book.");
  await field("Level", "B1");
}
it("submits a valid new book, refreshes the library and closes only after success", async () => {
  await mount();
  await valid();
  await act(async () => save().click());
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      slug: "test-book",
      title: "Test Book",
      level: "B1",
      cover: null,
      reading_time_minutes: null,
    }),
  );
  expect(mocks.saved).toHaveBeenCalledOnce();
  expect(mocks.closed).toHaveBeenCalledOnce();
});
it("renders server validation/storage errors and retains the form", async () => {
  mocks.create.mockResolvedValue({
    ok: false,
    error: "Book storage does not match the website schema.",
  });
  await mount();
  await valid();
  await act(async () => save().click());
  expect(document.body.textContent).toContain("Book storage does not match");
  expect(mocks.closed).not.toHaveBeenCalled();
  expect(mocks.saved).not.toHaveBeenCalled();
});
it("rejects a blank description and locks rapid duplicate Save presses", async () => {
  await mount();
  await act(async () => save().click());
  expect(mocks.create).not.toHaveBeenCalled();
  await valid();
  let finish!: (value: unknown) => void;
  mocks.create.mockImplementationOnce(
    () => new Promise((resolve) => (finish = resolve)),
  );
  await act(async () => {
    save().click();
    save().click();
  });
  expect(mocks.create).toHaveBeenCalledOnce();
  await act(async () => finish({ ok: true, data: "new" }));
  expect(mocks.saved).toHaveBeenCalledOnce();
});
