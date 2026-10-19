import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".mp4": "video/mp4", ".webm": "video/webm"
};
const immutableName = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-z]+$/i;
type Context = { params: Promise<{ path: string[] }> };

function inside(root: string, target: string) {
  const location = relative(root, target);
  return location !== "" && !isAbsolute(location) && location !== ".." && !location.startsWith(`..${sep}`);
}

async function serve(request: NextRequest, context: Context, head: boolean) {
  const { path: segments } = await context.params;
  if (!Array.isArray(segments) || !segments.length || segments.length > 4 ||
    segments.some(segment => !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(segment) || segment.includes(".."))) {
    return new Response(null, { status: 404 });
  }
  const root = resolve(process.cwd(), "public", "uploads");
  const requested = resolve(root, ...segments);
  const contentType = contentTypes[extname(requested).toLowerCase()];
  if (!contentType || !inside(root, requested)) return new Response(null, { status: 404 });

  try {
    // Resolve symlinks as well as textual traversal before opening an uploaded file.
    const [canonicalRoot, canonicalFile] = await Promise.all([realpath(root), realpath(requested)]);
    if (!inside(canonicalRoot, canonicalFile)) return new Response(null, { status: 404 });
    const metadata = await stat(canonicalFile);
    if (!metadata.isFile()) return new Response(null, { status: 404 });
    const etag = `"${metadata.size}-${Math.trunc(metadata.mtimeMs)}"`;
    const headers = new Headers({
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      "ETag": etag,
      "Last-Modified": metadata.mtime.toUTCString(),
      "Cache-Control": immutableName.test(basename(canonicalFile)) ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate"
    });
    if (request.headers.get("if-none-match")?.split(",").map(value => value.trim()).includes(etag)) {
      return new Response(null, { status: 304, headers });
    }
    let start = 0;
    let end = metadata.size - 1;
    let status = 200;
    const requestedRange = request.headers.get("range");
    const ifRange = request.headers.get("if-range");
    if (requestedRange && (!ifRange || ifRange === etag || ifRange === metadata.mtime.toUTCString())) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(requestedRange);
      if (range && (range[1] || range[2])) {
        if (range[1]) {
          start = Number(range[1]);
          if (range[2]) end = Math.min(Number(range[2]), end);
        } else {
          start = Math.max(0, metadata.size - Number(range[2]));
          if (Number(range[2]) === 0) start = metadata.size;
        }
      }
      if (!range || (!range[1] && !range[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= metadata.size) {
        headers.set("Content-Range", `bytes */${metadata.size}`);
        return new Response(null, { status: 416, headers });
      }
      status = 206;
      headers.set("Content-Range", `bytes ${start}-${end}/${metadata.size}`);
    }
    headers.set("Content-Length", String(Math.max(0, end - start + 1)));
    if (head || !metadata.size) return new Response(null, { status, headers });
    const stream = Readable.toWeb(createReadStream(canonicalFile, { start, end })) as ReadableStream<Uint8Array>;
    return new Response(stream, { status, headers });
  } catch {
    return new Response(null, { status: 404 });
  }
}

export function GET(request: NextRequest, context: Context) { return serve(request, context, false); }
export function HEAD(request: NextRequest, context: Context) { return serve(request, context, true); }
