import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("@/app/actions/storage", () => ({ uploadCoverImage: mocks.upload }));
vi.mock("./EpisodeThumbnailCropper", () => ({ default: () => null }));
import ImageUploadField from "./ImageUploadField";
let root: Root, host: HTMLDivElement;
const uploaded = vi.fn(),
  busy = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal(
    "Image",
    class {
      width = 100;
      height = 100;
      onload = () => {};
      set src(_value: string) {
        queueMicrotask(() => this.onload());
      }
    },
  );
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) => callback(new Blob(["image"], { type: "image/webp" })),
  );
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function render(path: string) {
  await act(async () =>
    root.render(
      <ImageUploadField
        label="Cover"
        bucket="covers"
        path={path}
        previewUrl={null}
        onUploaded={uploaded}
        onUploadingChange={busy}
      />,
    ),
  );
}
async function choose(file = new File(["image"], "cover.png", { type: "image/png" })) {
  const input = host.querySelector("input[type=file]")!;
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [file],
  });
  await act(async () =>
    input.dispatchEvent(new Event("change", { bubbles: true })),
  );
}
it("ignores a completed old upload after switching to another book path", async () => {
  let finish!: (value: unknown) => void;
  mocks.upload.mockImplementationOnce(
    () => new Promise((resolve) => (finish = resolve)),
  );
  await render("books/first.webp");
  await choose();
  expect(mocks.upload).toHaveBeenCalledOnce();
  expect(busy).toHaveBeenCalledWith(true);
  await render("books/second.webp");
  await act(async () => finish("https://example.com/first.webp"));
  expect(uploaded).not.toHaveBeenCalled();
  expect(busy).toHaveBeenLastCalledWith(false);
});
it("notifies the parent only after the current upload has persisted", async () => {
  mocks.upload.mockResolvedValue("https://example.com/current.webp");
  await render("books/current.webp");
  await choose();
  expect(uploaded).toHaveBeenCalledWith("https://example.com/current.webp");
  expect(busy).toHaveBeenLastCalledWith(false);
});

it('shows readable production upload failures without changing the saved reference',async()=>{
 mocks.upload.mockResolvedValue({ok:false,error:"We couldn't upload this cover. Please try again."})
 await render('books/current.webp');await choose();expect(host.querySelector('[role="alert"]')?.textContent).toContain("couldn't upload this cover");expect(uploaded).not.toHaveBeenCalled();expect(busy).toHaveBeenLastCalledWith(false)
})
it('validates unsupported and oversized files before contacting Storage',async()=>{
 await render('books/current.webp');await choose(new File(['PDF'],'cover.pdf',{type:'application/pdf'}));expect(host.textContent).toContain('Please choose a JPG, PNG or WebP image.');expect(mocks.upload).not.toHaveBeenCalled()
 const file=new File(['large'],'large.jpg',{type:'image/jpeg'});Object.defineProperty(file,'size',{value:21*1024*1024});await choose(file);expect(host.textContent).toContain('20 MB');expect(mocks.upload).not.toHaveBeenCalled()
})
it('releases a hung upload, permits retry and ignores the late completion',async()=>{
 vi.useFakeTimers();let finish!:(value:unknown)=>void
 mocks.upload.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));await render('books/current.webp');await choose()
 await act(async()=>{await vi.advanceTimersByTimeAsync(45000)})
 expect(host.textContent).toContain('Cover upload timed out. Please try again.');expect(busy).toHaveBeenLastCalledWith(false)
 mocks.upload.mockResolvedValue({ok:true,data:'https://example.com/retried.webp'});await choose();expect(uploaded).toHaveBeenCalledOnce();expect(uploaded).toHaveBeenCalledWith('https://example.com/retried.webp')
 await act(async()=>finish({ok:true,data:'https://example.com/late.webp'}));expect(uploaded).toHaveBeenCalledOnce()
})
it('rejects unreadable images without uploading them',async()=>{
 vi.stubGlobal('Image',class {onload: (()=>void)|null=null;onerror: (()=>void)|null=null;set src(_value:string){queueMicrotask(()=>this.onerror?.())}})
 await render('books/current.webp');await choose();expect(host.textContent).toContain("couldn't be read");expect(mocks.upload).not.toHaveBeenCalled();expect(busy).toHaveBeenLastCalledWith(false)
})
