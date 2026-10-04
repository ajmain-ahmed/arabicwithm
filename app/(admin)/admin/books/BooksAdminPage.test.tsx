import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
vi.mock('@mui/icons-material', () => ({ Edit: () => null, Add: () => null, ExpandMore: () => null, Search: () => null, Close: () => null }));
const mocks = vi.hoisted(() => ({ books: vi.fn(), chapters: vi.fn() }));
vi.mock("@/app/actions/admin", () => ({
  fetchBooksIndexForAdmin: mocks.books,
}));
vi.mock("../components/BookEditDialog", () => ({
  default: ({ open, onSaved }: { open: boolean; onSaved: () => void }) =>
    open ? <button onClick={onSaved}>Simulate persisted book</button> : null,
}));
vi.mock("../components/ChapterEditDialog", () => ({ default: () => null }));
import BooksAdminPage from "./page";
let root: Root, host: HTMLDivElement;
const row = {
  id: "book",
  title: "Newly persisted book",
  slug: "new-book",
  title_ar: null,
  author: null,
  description: "Description",
  cover: null,
  cover_crop: { x: 50, y: 50, zoom: 1 },
  reading_time_minutes: null,
  level: "B1",
  category: "Drama",
  created_at: null,
  updated_at: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.chapters.mockResolvedValue([]);
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
it("refreshes from one catalogue snapshot and discards a late pre-creation response", async () => {
  let finish!: (value: unknown) => void;
  mocks.books
    .mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
    .mockResolvedValueOnce({ books: [row], chapters: [] });
  await act(async () => root.render(<BooksAdminPage />));
  await act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((b) => b.textContent === "New book")!
      .click(),
  );
  await act(async () =>
    Array.from(host.querySelectorAll("button"))
      .find((b) => b.textContent === "Simulate persisted book")!
      .click(),
  );
  expect(host.textContent).toContain("Newly persisted book");
  await act(async () => finish({ books: [], chapters: [] }));
  expect(host.textContent).toContain("Newly persisted book");
  expect(mocks.books).toHaveBeenCalledTimes(2);
  expect(mocks.chapters).not.toHaveBeenCalled();
});
