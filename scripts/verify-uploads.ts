import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { NextRequest } from "next/server";
import { GET, HEAD } from "../src/app/uploads/[...path]/route";

async function verify() {
  const initialDirectory = process.cwd();
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "a2e-upload-verification-"));
  const uploads = join(temporaryDirectory, "public", "uploads");
  const uuidFile = "00000000-0000-4000-8000-000000000001.png";
  const content = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  await mkdir(uploads, { recursive: true });
  await writeFile(join(uploads, uuidFile), content);
  await writeFile(join(uploads, "legacy.png"), content);
  await writeFile(join(uploads, "blocked.svg"), "<svg></svg>");
  await mkdir(join(temporaryDirectory, "outside"));
  await writeFile(join(temporaryDirectory, "outside", "secret.png"), content);
  process.chdir(temporaryDirectory);
  const get = (path: string[], headers?: Record<string, string>) => GET(
    new NextRequest(`https://a2e.invalid/uploads/${path.join("/")}`, { headers }),
    { params: Promise.resolve({ path }) }
  );
  try {
    const complete = await get([uuidFile]);
    assert.equal(complete.status, 200);
    assert.equal(complete.headers.get("content-type"), "image/png");
    assert.equal(complete.headers.get("x-content-type-options"), "nosniff");
    assert.match(complete.headers.get("cache-control") ?? "", /immutable/);
    assert.deepEqual(Buffer.from(await complete.arrayBuffer()), content);
    const etag = complete.headers.get("etag");
    assert.ok(etag);
    const head = await HEAD(new NextRequest(`https://a2e.invalid/uploads/${uuidFile}`), { params: Promise.resolve({ path: [uuidFile] }) });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-length"), String(content.length));
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    assert.equal((await get([uuidFile], { "if-none-match": etag })).status, 304);
    const prefix = await get([uuidFile], { range: "bytes=0-1" });
    assert.equal(prefix.status, 206);
    assert.equal(prefix.headers.get("content-range"), `bytes 0-1/${content.length}`);
    assert.deepEqual(Buffer.from(await prefix.arrayBuffer()), content.subarray(0, 2));
    const suffix = await get([uuidFile], { range: "bytes=-2" });
    assert.equal(suffix.status, 206);
    assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), content.subarray(content.length - 2));
    for (const range of ["bytes=999-", "bytes=-0", "bytes=2-1", "bytes=0-1,3-4", "bytes=-"]) {
      assert.equal((await get([uuidFile], { range })).status, 416, range);
    }
    assert.equal((await get([uuidFile], { range: "bytes=0-1", "if-range": '"obsolete"' })).status, 200);
    assert.match((await get(["legacy.png"])).headers.get("cache-control") ?? "", /must-revalidate/);
    for (const path of [["..", "secret.png"], ["%2e%2e", "secret.png"], ["blocked.svg"], ["missing.png"], ["a/b.png"]]) {
      assert.equal((await get(path)).status, 404, path.join("/"));
    }
    // Windows directory junctions also exercise canonical path containment.
    await symlink(join(temporaryDirectory, "outside"), join(uploads, "escape"), process.platform === "win32" ? "junction" : "dir");
    assert.equal((await get(["escape", "secret.png"])).status, 404);
    console.log("Upload route verified: GET/HEAD, MIME, cache, ranges, missing files, traversal and symlink escape.");
  } finally {
    process.chdir(initialDirectory);
    const resolvedTemporary = resolve(temporaryDirectory);
    assert.ok(resolvedTemporary.startsWith(`${resolve(tmpdir())}${sep}a2e-upload-verification-`));
    await rm(resolvedTemporary, { recursive: true });
  }
}

verify().catch(error => { console.error(error); process.exitCode = 1; });
