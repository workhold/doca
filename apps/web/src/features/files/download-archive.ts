import { Zip, ZipPassThrough } from "fflate";
import { fileUrl, type FileItem } from "@web/shared/api.js";
import { splitFileName } from "./file-interactions.js";

export async function downloadArchive(
  files: FileItem[],
  messages: { failed: string; tooLarge: string },
) {
  const maxSize = 0xffff_ffff;
  if (files.length >= 0xffff || files.reduce((total, file) => total + file.size, 0) >= maxSize) {
    throw new Error(messages.tooLarge);
  }
  const chunks: BlobPart[] = [];
  let size = 0;
  const zip = new Zip((error, data) => {
    if (error) throw error;
    size += data.length;
    if (size >= maxSize) throw new Error(messages.tooLarge);
    chunks.push(data as Uint8Array<ArrayBuffer>);
  });
  const names = new Set<string>();
  for (const file of files) {
    const response = await fetch(fileUrl(file.id, true));
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error(`${messages.failed} (${file.name})`);
    }
    // Keep entries at the ZIP root and give collisions distinct names even
    // on case-insensitive filesystems.
    const base = file.name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").replace(/[. ]+$/, "") || "file";
    const { base: stem, ext } = splitFileName(base, "file");
    let name = base;
    for (let suffix = 2; names.has(name.toLowerCase()); suffix++) {
      name = `${stem} (${suffix})${ext}`;
    }
    names.add(name.toLowerCase());
    const entry = new ZipPassThrough(name);
    zip.add(entry);
    const reader = response.body.getReader();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        entry.push(chunk.value);
      }
      entry.push(new Uint8Array(), true);
    } finally {
      void reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }
  zip.end();
  return new Blob(chunks, { type: "application/zip" });
}
