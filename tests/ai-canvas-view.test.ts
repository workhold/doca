import { afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { build } from "vite";
import { randomBytes, randomUUID } from "node:crypto";
import sharp from "sharp";
import { openTestDatabase } from "./database.js";
import { createUser } from "@core/modules/identity/passwords.js";
import { createContent } from "@core/workflows/resources.js";
import {
  readAIDocument,
  editAIDocument,
  digest,
} from "@core/workflows/ai-documents.js";
import { renderCanvas } from "@server/services/ai/canvas-render.js";
import {
  createCanvasView,
  canvasViewSchema,
  renderCanvasSnapshot,
} from "@server/services/ai/canvas-view.js";
import {
  bindToolImageFrames,
  hoistToolImages,
  transmittedToolImageFrames,
  type ToolImageSelection,
} from "@server/services/ai/tool-media.js";
import { modelPromptImages } from "@server/services/ai/model-image.js";
import { checkpointMessages } from "@server/services/ai/checkpoint.js";
import { aiDefaults, saveAIConfig } from "@core/modules/ai/config.js";
import { createApp } from "@server/app/create-app.js";
import { completionResponse } from "./ai-mock.js";
import { canvasRoutingAudit } from "@server/services/ai/canvas-command-audit.js";
import {
  createStorage,
  storageConfigForProfile,
  storageRuntime,
} from "@server/adapters/storage.js";
import { objectKey } from "@server/services/storage-policy.js";
import type { Schema } from "@db/index.js";
import { createAIRunner } from "@server/services/ai/runner.js";

it("distinguishes requested automatic routing from native persisted drawing fields", () => {
  expect(canvasRoutingAudit([
    { type: "createFlowchart", nodes: [{ text: "private content" }], edges: [
      { id: "auto", mode: "elbow", autoRoute: true },
      { id: "manual", mode: "elbow", sourcePort: "right", targetPort: "left", offset: 400 },
    ] },
    { type: "diagramEdge", id: "clear", sourcePort: "top", targetPort: "bottom", offset: null },
    { type: "patch", id: "node", patch: { fill: "red" } },
  ])).toEqual([
    { command: "createFlowchart", id: "auto", automaticRequested: true, requestedMode: "elbow", providedRoutingFields: [] },
    { command: "createFlowchart", id: "manual", automaticRequested: false, requestedMode: "elbow", providedRoutingFields: ["sourcePort", "targetPort", "offset"] },
    { command: "diagramEdge", id: "clear", automaticRequested: false, requestedMode: undefined, providedRoutingFields: ["sourcePort", "targetPort", "offset"] },
  ]);
});

beforeAll(async () => {
  await build({
    configFile: "apps/server/canvas-render.vite.config.ts",
    logLevel: "silent",
  });
}, 30_000);
let db: Awaited<ReturnType<typeof openTestDatabase>>,
  ctx: any,
  resourceId: string;
beforeEach(async () => {
  db = await openTestDatabase({ driver: "sqlite", path: ":memory:" });
  ctx = {
    actor: {
      ...(await createUser(
        db,
        {
          login: "canvas-visual",
          displayName: "Canvas Visual",
          password: "isolated-canvas-visual",
        },
        { bootstrap: true },
      )),
      admin: 1,
    },
  };
  resourceId = (
    await createContent(db).create(ctx.actor, {
      kind: "document",
      format: "canvas",
      title: "Isolated visual board",
    })
  ).id;
  const initial = await readAIDocument(db, ctx, resourceId);
  await editAIDocument(
    db,
    ctx,
    resourceId,
    { seq: initial.seq, epochId: initial.epochId! },
    [
      {
        type: "add",
        element: {
          id: "group",
          tag: "Group",
          x: -200,
          y: 100,
          children: [
            {
              id: "red",
              tag: "Rect",
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              fill: "#ff0000",
            },
            {
              id: "blue",
              tag: "Rect",
              x: 120,
              y: 0,
              width: 100,
              height: 100,
              fill: "#0000ff",
            },
            {
              id: "title",
              tag: "Text",
              x: 0,
              y: 120,
              text: "画板视觉验收",
              fontSize: 30,
              fill: "#111111",
            },
          ],
        },
      },
    ],
    randomUUID(),
  );
});
afterEach(async () => {
  await db.destroy();
});
const read = () => readAIDocument(db, ctx, resourceId);
const view = () => createCanvasView({ db, ctx, vision: true, read });

async function transport(output: any, capacity = 4) {
  const selected: ToolImageSelection[] = [];
  // Mastra converts media into current AI SDK file parts before metering.
  const sdkOutput = {
    ...output,
    value: output.value.map((part: any) =>
      part.type === "media"
        ? {
            type: "file",
            mediaType: part.mediaType,
            data: { type: "data", data: Buffer.from(part.data, "base64") },
          }
        : part,
    ),
  };
  const input = [
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolName: "canvas_view",
          toolCallId: "visual-test",
          output: sdkOutput,
        },
      ],
    },
  ];
  const prompt = await modelPromptImages(
    hoistToolImages(input, capacity, (frame) => selected.push(frame)),
  );
  return {
    prompt,
    frames: transmittedToolImageFrames(
      prompt,
      bindToolImageFrames(selected, prompt),
    ),
    input,
  };
}

it("renders native board pixels, negative world coordinates and selected children without writes", async () => {
  const before = await read();
  const source = before.value as any;
  const original = JSON.stringify(source);
  const rendered = await renderCanvas({ source, assets: {} });
  const { data, info } = await sharp(Buffer.from(rendered.png, "base64"))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixel = (x: number, y: number) => {
    const px = Math.floor(
      ((x - rendered.sourceRect.x) * info.width) / rendered.sourceRect.width,
    );
    const py = Math.floor(
      ((y - rendered.sourceRect.y) * info.height) / rendered.sourceRect.height,
    );
    return [
      ...data.subarray(
        (py * info.width + px) * 3,
        (py * info.width + px) * 3 + 3,
      ),
    ];
  };
  expect(pixel(-150, 150)).toEqual([255, 0, 0]);
  expect(pixel(-30, 150)).toEqual([0, 0, 255]);
  expect(rendered.sourceRect.x).toBeLessThan(-200);
  expect(rendered.warnings).toContainEqual(
    expect.objectContaining({ code: "FONT_NOT_EMBEDDED_SYSTEM_FALLBACK" }),
  );
  const selected = await renderCanvas({
    source,
    assets: {},
    elementIds: ["blue"],
  });
  expect(selected.sourceRect.x).toBeLessThan(-80);
  expect(selected.sourceRect.x).toBeGreaterThan(-100);
  const crop = await renderCanvas({
    source,
    assets: {},
    region: { x: -200, y: 100, width: 100, height: 100 },
  });
  expect(crop.sourceRect).toEqual({ x: -200, y: 100, width: 100, height: 100 });
  expect(
    (await sharp(Buffer.from(crop.png, "base64")).stats()).channels[0]!.mean,
  ).toBe(255);
  expect(JSON.stringify(source)).toBe(original);
  const after = await read();
  expect(after.seq).toBe(before.seq);
  expect(after.epochId).toBe(before.epochId);
  expect(after.value).toEqual(before.value);
}, 30_000);

it("requires the overview's exact pixels and same snapshot receipt to reach a successful model response", async () => {
  const session = view();
  const receipt: any = await session.tool.execute!({ resourceId }, {} as any);
  expect(JSON.stringify(receipt)).not.toContain("base64");
  const output: any = await session.tool.toModelOutput!(receipt);
  const lost = await transport(output, 0);
  expect(JSON.stringify(lost.prompt)).toContain("重新调用 canvas_view");
  session.observe(lost.frames).complete();
  expect(session.hasViewed(resourceId, receipt.snapshotHash)).toBe(false);
  const sent = await transport(output);
  expect(sent.frames).toHaveLength(1);
  const labels = sent.prompt.flatMap((message: any) =>
    message.role === "user"
      ? message.content
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text)
      : [],
  );
  expect(
    labels.some(
      (text: string) =>
        text.includes(resourceId) && text.includes(receipt.snapshotHash),
    ),
  ).toBe(true);
  const pending = session.observe(sent.frames);
  pending.abort();
  expect(session.hasViewed(resourceId, receipt.snapshotHash)).toBe(false);
  session.observe(sent.frames).complete();
  expect(session.hasViewed(resourceId, receipt.snapshotHash)).toBe(true);
  const snapshot = await read();
  expect(
    session.hasViewed(
      resourceId,
      digest({ value: snapshot.value, resource: snapshot.resource }),
    ),
  ).toBe(true);
  expect(session.hasViewed(resourceId, "other-snapshot")).toBe(false);
  expect(JSON.stringify(checkpointMessages(sent.input))).not.toContain(
    output.value[2].data,
  );
  const forged = await session.tool.toModelOutput!({
    ...receipt,
    seq: 999,
  } as any);
  expect((forged as any).value.error).toBe(true);
}, 30_000);

it("does not count local views as full visual acceptance and rejects nonvisual models and unauthorized reads", async () => {
  const session = view();
  const receipt: any = await session.tool.execute!(
    { resourceId, elementIds: ["red"] },
    {} as any,
  );
  const output = await session.tool.toModelOutput!(receipt);
  session.observe((await transport(output)).frames).complete();
  expect(session.hasViewed(resourceId, receipt.snapshotHash)).toBe(false);
  const noVision = createCanvasView({ db, ctx, vision: false, read });
  await expect(
    noVision.tool.execute!({ resourceId }, {} as any),
  ).rejects.toThrow("图片理解");
  const denied = createCanvasView({
    db,
    ctx: { ...ctx, allowedResources: [] },
    vision: true,
    read: (id) => readAIDocument(db, { ...ctx, allowedResources: [] }, id),
  });
  await expect(denied.tool.execute!({ resourceId }, {} as any)).rejects.toThrow(
    "授权范围",
  );
  expect(
    canvasViewSchema.safeParse({
      resourceId,
      elementIds: ["red"],
      region: { x: 0, y: 0, width: 100, height: 100 },
    }).success,
  ).toBe(false);
  const controller = new AbortController();
  controller.abort();
  await expect(
    renderCanvas(
      { source: (await read()).value as any, assets: {} },
      controller.signal,
    ),
  ).rejects.toThrow();
}, 30_000);

it("reports native export approximations instead of silently hiding visual differences", async () => {
  const snapshot = await read();
  const source: any = structuredClone(snapshot.value);
  source.scene.children[0].children[0].blur = 8;
  const result = await renderCanvas({ source, assets: {} });
  expect(result.warnings).toContainEqual(
    expect.objectContaining({
      code: "UNSUPPORTED_EFFECT_blur",
      elementId: "red",
    }),
  );
  await expect(
    renderCanvas({ source, assets: {}, elementIds: ["missing"] }),
  ).rejects.toThrow("SELECTION_NOT_FOUND");
}, 30_000);

it("queues concurrent detail renders and removes a canceled queued request without losing capacity", async () => {
  const input = { source: (await read()).value as any, assets: {} };
  const controller = new AbortController();
  const renders = [renderCanvas(input), renderCanvas(input), renderCanvas(input)];
  const canceled = renderCanvas(input, controller.signal);
  const stopped = expect(canceled).rejects.toThrow();
  controller.abort();
  const results = await Promise.all(renders);
  await stopped;
  expect(results.every(result => result.width > 0 && result.height > 0)).toBe(true);
  expect((await renderCanvas(input)).width).toBe(results[0]!.width);
}, 60_000);

it("uses the native route label anchor so explicit and automatic offsets survive actual SVG rendering", async () => {
  const initial = await read();
  await editAIDocument(db, ctx, resourceId, { seq: initial.seq, epochId: initial.epochId! }, [{
    type: "createFlowchart", id: "native-route", x: 500, y: 500,
    nodes: [{ id: "route-a", text: "A", x: 0, y: 0, width: 200, height: 100, shape: "rect" },
      { id: "route-b", text: "B", x: 500, y: 200, width: 200, height: 100, shape: "rect" },
      { id: "route-obstacle", text: "中间节点", x: 300, y: 100, width: 120, height: 120, shape: "rect" }],
    edges: [{ id: "route-edge", sourceId: "route-a", targetId: "route-b", mode: "elbow", sourcePort: "bottom", targetPort: "bottom", offset: 900, label: "project_id", labelOffset: { x: 0, y: -30 } }],
  }], randomUUID());
  const snapshot = await read();
  const group = (snapshot.value as any).scene.children.find((n: any) => n.id === "native-route");
  const label = group.children.find((n: any) => n.data?.kind === "connector-label");
  const rendered = await renderCanvas({ source: snapshot.value as any, assets: {}, elementIds: [label.id] });
  // Native SVG bounds include four world units of export padding.
  // Halfway along the normalized asymmetric path is (750,132),
  // rather than the raw bend center (900,232).
  expect(rendered.bounds.x + 4).toBeCloseTo(500 + 750 - label.width / 2, 0);
  expect(rendered.bounds.y + 4).toBeCloseTo(500 + 132 - 30 - label.height / 2, 0);
  expect(rendered.bounds.x + 4).toBeCloseTo(500 + label.x, 0);
  expect(rendered.bounds.y + 4).toBeCloseTo(500 + label.y, 0);
  await editAIDocument(db, ctx, resourceId, { seq: snapshot.seq, epochId: snapshot.epochId! }, [{
    type: "diagramEdge", id: "route-edge", sourcePort: "right", targetPort: "left", mode: "elbow", offset: null, autoLabel: true,
  }], randomUUID());
  const automatic = await read();
  const autoGroup = (automatic.value as any).scene.children.find((n: any) => n.id === "native-route");
  const autoLabel = autoGroup.children.find((n: any) => n.id === label.id);
  for (const node of autoGroup.children.filter((n: any) => n.data?.kind === "diagram-node"))
    expect(autoLabel.x + autoLabel.width <= node.x || autoLabel.x >= node.x + node.width ||
      autoLabel.y + autoLabel.height <= node.y || autoLabel.y >= node.y + node.height).toBe(true);
  const autoRender = await renderCanvas({ source: automatic.value as any, assets: {}, elementIds: [label.id] });
  expect(autoRender.bounds.x + 4).toBeCloseTo(500 + autoLabel.x, 0);
  expect(autoRender.bounds.y + 4).toBeCloseTo(500 + autoLabel.y, 0);
}, 30_000);

it("records delegated overview evidence only after successful inspection and never for a crop or a failed read", async () => {
  const snapshot = await read();
  const hash = digest({ value: snapshot.value, resource: snapshot.resource });
  let reject = false;
  const delegated = createCanvasView({ db, ctx, vision: false, read, inspect: async (image, receipt) => {
    expect(image.mime).toBe("image/png");
    expect((await sharp(Buffer.from(image.data, "base64")).metadata()).width).toBe(receipt.width);
    if (reject) throw Error("incomplete vision response");
    return "已检查实际像素";
  } });
  await delegated.tool.execute!({ resourceId, elementIds: ["red"] }, {} as any);
  expect(delegated.hasViewed(resourceId, hash)).toBe(false);
  reject = true;
  await expect(delegated.tool.execute!({ resourceId }, {} as any)).rejects.toThrow("incomplete");
  expect(delegated.hasViewed(resourceId, hash)).toBe(false);
  reject = false;
  const receipt = await delegated.tool.execute!({ resourceId }, {} as any);
  expect(delegated.hasViewed(resourceId, hash)).toBe(false);
  expect(await delegated.tool.toModelOutput!(receipt)).toMatchObject({ type: "json", value: { inspection: "已检查实际像素" } });
  const prompt = [{ role: "tool", content: [{ type: "tool-result", toolName: "canvas_view", output: { type: "json", value: receipt } }] }];
  delegated.observe([], prompt).abort();
  expect(delegated.hasViewed(resourceId, hash)).toBe(false);
  delegated.observe([], prompt).complete();
  expect(delegated.hasViewed(resourceId, hash)).toBe(true);
  delegated.clear();
  expect(delegated.hasViewed(resourceId, hash)).toBe(false);
}, 30_000);

it("renders an explicit empty viewport and embeds only authorized image assets", async () => {
  const empty = await renderCanvas({
    source: { scene: { tag: "Leafer", children: [] } },
    assets: {},
  });
  expect(empty.empty).toBe(true);
  expect(
    (await sharp(Buffer.from(empty.png, "base64")).stats()).channels.every(
      (channel) => channel.min === 255 && channel.max === 255,
    ),
  ).toBe(true);
  const profile = await db
    .selectFrom("storage_profiles")
    .selectAll()
    .where("active", "=", 1)
    .executeTakeFirstOrThrow();
  const assetId = randomUUID(),
    runtime = storageRuntime(),
    key = objectKey(assetId, "image/png");
  const data = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#8764c0" },
  })
    .png()
    .toBuffer();
  await createStorage(runtime).put(
    storageConfigForProfile(runtime, profile),
    key,
    data,
    "image/png",
    "fixture.png",
  );
  await db
    .insertInto("assets")
    .values({
      id: assetId,
      owner_id: ctx.actor.id,
      uploaded_by: ctx.actor.id,
      resource_id: resourceId,
      purpose: "attachment",
      profile_id: profile.id,
      object_key: key,
      filename: "fixture.png",
      mime: "image/png",
      size: data.length,
      created_at: new Date().toISOString(),
      deleted_at: null,
    })
    .execute();
  const snapshot = await read();
  await editAIDocument(
    db,
    ctx,
    resourceId,
    { seq: snapshot.seq, epochId: snapshot.epochId! },
    [
      {
        type: "add",
        element: {
          id: "photo",
          tag: "Image",
          x: 400,
          y: 0,
          width: 100,
          height: 100,
          data: { resourcePath: assetId },
        },
      },
    ],
    randomUUID(),
  );
  const session = view();
  const receipt = await session.tool.execute!(
    { resourceId, elementIds: ["photo"] },
    {} as any,
  );
  const output: any = await session.tool.toModelOutput!(receipt);
  const stats = await sharp(
    Buffer.from(output.value[2].data, "base64"),
  ).stats();
  expect(stats.channels[2]!.mean).toBeGreaterThan(stats.channels[0]!.mean);
  const frozen = await read();
  const frozenView = createCanvasView({ db, ctx, vision: true, read: async () => frozen });
  const other = await createUser(
    db,
    {
      login: "other-visual",
      displayName: "Other",
      password: "isolated-other-visual",
    },
    { actor: ctx.actor },
  );
  await db
    .updateTable("assets")
    .set({ owner_id: other.id, resource_id: null })
    .where("id", "=", assetId)
    .execute();
  await expect(
    frozenView.tool.execute!({ resourceId }, {} as any),
  ).rejects.toThrow("无权读取画板图片");
}, 30_000);

it("inspects a host-accepted PNG over native IO's 10MiB limit without changing its source bytes or document", async () => {
  const profile = await db.selectFrom("storage_profiles").selectAll().where("active", "=", 1).executeTakeFirstOrThrow();
  const assetId = randomUUID(), runtime = storageRuntime(), key = objectKey(assetId, "image/png");
  const data = await sharp(randomBytes(3000 * 1200 * 3), { raw: { width: 3000, height: 1200, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer();
  expect(data.length).toBeGreaterThan(10 * 1024 * 1024);
  await createStorage(runtime).put(storageConfigForProfile(runtime, profile), key, data, "image/png", "large.png");
  await db.insertInto("assets").values({ id: assetId, owner_id: ctx.actor.id, uploaded_by: ctx.actor.id, resource_id: resourceId, purpose: "attachment", profile_id: profile.id, object_key: key, filename: "large.png", mime: "image/png", size: data.length, created_at: new Date().toISOString(), deleted_at: null }).execute();
  const initial = await read();
  await editAIDocument(db, ctx, resourceId, { seq: initial.seq, epochId: initial.epochId! }, [{ type: "add", element: { id: "large-photo", tag: "Image", x: 400, y: 0, width: 400, height: 160, data: { resourcePath: assetId } } }], randomUUID());
  const before = await read();
  for (const query of [{ resourceId }, { resourceId, elementIds: ["large-photo"] }]) {
    const { result } = await renderCanvasSnapshot({ db, ctx, read, storage: runtime }, query);
    expect(result.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "LARGE_IMAGE_PREVIEW" })]));
    expect((await sharp(Buffer.from(result.png, "base64")).metadata()).width).toBe(result.width);
  }
  expect(await read()).toEqual(before);
  expect(await createStorage(runtime).read(storageConfigForProfile(runtime, profile), key, data.length)).toEqual(data);
}, 30_000);

it("exports the current canvas to one authorized downloadable PNG without image generation or canvas writes", async () => {
  const now = new Date().toISOString();
  const session: Schema["ai_sessions"] = { id: randomUUID(), user_id: ctx.actor.id, title: "Canvas export", model_id: null, resource_ids: JSON.stringify([resourceId]), mentioned_resource_ids: "[]", approved_resource_ids: "[]", archived: 0, revision: 1, created_at: now, updated_at: now };
  const job: Schema["ai_jobs"] = { id: randomUUID(), session_id: session.id, user_id: ctx.actor.id, model_id: "mcp-client", status: "running", input: JSON.stringify({ text: "将当前画面发我PNG", scope: "all", references: [], attachments: [], files: [], skillIds: [], webSearch: false }), digest: "export", result: "", error: "", lease: randomUUID(), lease_until: new Date(Date.now() + 60000).toISOString(), attempts: 1, cancelled: 0, created_at: now, updated_at: now };
  await db.insertInto("ai_sessions").values(session).execute();
  await db.insertInto("ai_jobs").values(job).execute();
  const runtime = storageRuntime();
  const runner = createAIRunner(db, { storage: runtime, fetch: async () => { throw new Error("Export must not call a model"); } });
  try {
    const tools = await runner.externalTools(job, new AbortController().signal, { actor: ctx.actor, allowsTool: id => id === "canvas_export", allowsSkill: () => true, authorize: async () => {} });
    expect(tools.tools.find(tool => tool.id === "canvas_export")?.inputSchema).toMatchObject({ type: "object" });
    const before = await read(), requestId = randomUUID();
    const args = { resourceId, name: "current-canvas.png" };
    const exported: any = (await tools.call("canvas_export", args, requestId)).output;
    expect(exported.ok).toBe(true);
    expect(exported.file.mime).toBe("image/png");
    expect(exported.file.downloadUrl).toBe(`/api/v1/files/items/${exported.file.id}/content?download=1`);
    const replay: any = (await tools.call("canvas_export", args, requestId)).output;
    expect(replay.file.id).toBe(exported.file.id);
    expect(await db.selectFrom("file_items").select("id").where("name", "=", "current-canvas.png").execute()).toHaveLength(1);
    const object = await db.selectFrom("file_items as f").innerJoin("file_storage_objects as o", "o.id", "f.storage_object_id").selectAll("o").where("f.id", "=", exported.file.id).executeTakeFirstOrThrow();
    const profile = await db.selectFrom("storage_profiles").selectAll().where("id", "=", object.profile_id).executeTakeFirstOrThrow();
    const png = await createStorage(runtime).read(storageConfigForProfile(runtime, profile), object.object_key, object.size);
    expect((await sharp(png).metadata()).format).toBe("png");
    expect((await sharp(png).stats()).channels[0]!.max).toBe(255);
    expect(await db.selectFrom("ai_calls").select("id").execute()).toHaveLength(0);
    expect(await read()).toEqual(before);
    await expect(tools.call("canvas_export", { ...args, elementIds: ["red"], region: { x: 0, y: 0, width: 100, height: 100 } }, randomUUID())).rejects.toThrow("region 与 elementIds");
  } finally {
    await runner.close();
  }
}, 30_000);

it.each([true, false])("checks canvas pixels with direct vision=%s and refuses review until the fixed snapshot was seen", async (directVision) => {
  await saveAIConfig(
    db,
    {
      ...aiDefaults,
      defaultModel: "visual-test",
      mediaModel: "image-reader",
      maxSteps: 12,
      vendors: [
        {
          id: "vendor",
          name: "Isolated",
          provider: "compatible",
          baseUrl: "https://model.example.test/v1",
          apiKey: "isolated-test-key",
          enabled: true,
        },
      ],
      models: [
        {
          id: "visual-test",
          vendorId: "vendor",
          model: directVision ? "isolated" : "doubao-seed-2.1-lite",
          alias: "Visual",
          enabled: true,
          maxInput: 64000,
          maxOutput: 4000,
          tools: true,
          vision: directVision,
        },
        { id: "image-reader", vendorId: "vendor", model: "image-reader", alias: "Image reader",
          enabled: true, maxInput: 64000, maxOutput: 4000, vision: true, tools: false },
      ],
    },
    0,
  );
  let executorStep = 0,
    reviewerStep = 0,
    executorSawImages = false,
    reviewerSawImages = false,
    reviewSeq = -1,
    inspections = 0;
  const receipts = (body: any) =>
    body.messages
      .filter((message: any) => message.role === "tool")
      .map((message: any) => {
        const value = JSON.parse(message.content);
        return Array.isArray(value)
          ? JSON.parse(value.find((part) => part.type === "text").text)
          : value;
      });
  const hasPixels = (body: any) =>
    body.messages.some(
      (message: any) =>
        message.role === "user" &&
        Array.isArray(message.content) &&
        message.content.some(
          (part: any) =>
            part.type === "image_url" &&
            part.image_url.url.startsWith("data:image/"),
        ),
    );
  const fetcher = (async (_url: any, init: any) => {
    const body = JSON.parse(String(init?.body));
    if (body.model === "image-reader") {
      expect(hasPixels(body)).toBe(true);
      const context = body.messages.flatMap((message: any) => Array.isArray(message.content) ? message.content : [])
        .find((part: any) => part.type === "text" && part.text.includes('"originalRequest"'));
      const facts = JSON.parse(context.text).source;
      expect(facts.sceneIndexCoordinateSpace).toBe("parent-local");
      expect(facts.sceneIndex).toContainEqual(expect.objectContaining({ id: "red", parentId: "group", x: 0 }));
      if (reviewerStep >= 3) expect(facts.seq).toBe(reviewSeq);
      inspections++;
      return completionResponse({
        id: `inspection-${inspections}`, object: "chat.completion", created: 1, model: body.model,
        choices: [{ index: 0, message: { role: "assistant", content: "已实际查看此保存快照：方块和标题可见，无遮挡。" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 100, completion_tokens: 40, total_tokens: 140 },
      }, !!body.stream);
    }
    if (!directVision) {
      expect(hasPixels(body)).toBe(false);
      expect(body.thinking).toEqual({ type: "disabled" });
      expect(body.reasoning_effort).toBeUndefined();
    } else expect(body.thinking).toBeUndefined();
    const review = body.tools.some(
      (tool: any) => tool.function?.name === "submit_review",
    );
    const results = receipts(body);
    let name: string | undefined,
      args: any,
      text = "已保存画板并检查画面。";
    if (!review) {
      const step = executorStep++;
      if (step === 0) {
        name = "document_read";
        args = { resourceId };
      } else if (step === 1) {
        name = "canvas_view";
        args = { resourceId };
      } else if (step === 2) {
        executorSawImages = directVision ? hasPixels(body) : !!results.at(-1)?.inspection;
        const current = results.find((result: any) => result.resource);
        name = "canvas_edit";
        args = {
          resourceId,
          seq: current.seq,
          epochId: current.epochId,
          operations: [
            { type: "patch", id: "red", patch: { fill: "#00ff00" } },
          ],
        };
      } else if (step === 3) {
        name = "canvas_view";
        args = { resourceId };
      } else expect(directVision ? hasPixels(body) : !!results.at(-1)?.inspection).toBe(true);
    } else {
      const step = reviewerStep++;
      const submit = () => {
        name = "submit_review";
        args = {
          verdict: "pass",
          summary: "已核对保存内容和整板画面",
          checks: [
            {
              requirement: "绿色方块及完整布局",
              passed: true,
              evidence: "固定保存快照包含绿色方块，整板图片可见完整布局",
            },
          ],
        };
      };
      if (step === 0) {
        name = "document_read";
        args = { resourceId };
      } else if (step === 1) {
        reviewSeq = results.at(-1).seq;
        submit();
      } else if (step === 2) {
        expect(results.at(-1).error).toContain("尚未完成视觉验收");
        // A collaborator changes the live board after the reviewer froze its snapshot.
        const current = await read();
        await editAIDocument(
          db,
          ctx,
          resourceId,
          { seq: current.seq, epochId: current.epochId! },
          [{ type: "patch", id: "red", patch: { fill: "#ff00ff" } }],
          randomUUID(),
        );
        name = "canvas_view";
        args = { resourceId };
      } else if (step === 3) {
        reviewerSawImages = directVision ? hasPixels(body) : !!results.at(-1)?.inspection;
        expect(results.at(-1).seq).toBe(reviewSeq);
        submit();
      } else {
        expect(results.at(-1).accepted).toBe(true);
        text = "验收完成。";
      }
    }
    return completionResponse(
      {
        id: `visual-${review}-${executorStep}-${reviewerStep}`,
        object: "chat.completion",
        created: 1,
        model: body.model,
        choices: [
          {
            index: 0,
            message: name
              ? {
                  role: "assistant",
                  content: null,
                  tool_calls: [
                    {
                      id: `call-${review}-${executorStep}-${reviewerStep}`,
                      type: "function",
                      function: { name, arguments: JSON.stringify(args) },
                    },
                  ],
                }
              : { role: "assistant", content: text },
            finish_reason: name ? "tool_calls" : "stop",
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 40, total_tokens: 140 },
      },
      !!body.stream,
    );
  }) as typeof fetch;
  const origin = "http://localhost:39139";
  const app = await createApp(db, {
    origin,
    ai: { memory: { driver: "sqlite", url: ":memory:" }, fetch: fetcher },
  });
  try {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { host: "localhost:39139", origin },
      payload: { login: "canvas-visual", password: "isolated-canvas-visual" },
    });
    const cookie = String(login.headers["set-cookie"]).split(";")[0]!;
    const request = (method: any, url: string, payload?: any) =>
      app.inject({
        method,
        url: `/api/v1${url}`,
        headers: { host: "localhost:39139", origin, cookie },
        payload,
      });
    const sessionId = (
      await request("POST", "/ai/sessions", {
        modelId: "visual-test",
        resourceIds: [resourceId],
      })
    ).json().id;
    const jobId = randomUUID();
    const sent = await request("POST", `/ai/sessions/${sessionId}/messages`, {
      id: jobId,
      text: "把红色方块改成绿色并检查整板画面",
      modelId: "visual-test",
      scope: "document",
      currentResourceId: resourceId,
      references: [{ resourceId }],
    });
    expect(sent.statusCode).toBeLessThan(300);
    let job: any;
    for (let attempt = 0; attempt < 500; attempt++) {
      job = (await request("GET", `/ai/sessions/${sessionId}`))
        .json()
        .jobs.find((item: any) => item.id === jobId);
      if (job && !["queued", "running"].includes(job.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(job.status, JSON.stringify(job)).toBe("completed");
    expect(executorSawImages).toBe(true);
    expect(reviewerSawImages).toBe(true);
    expect(reviewerStep).toBeGreaterThanOrEqual(4);
    expect(inspections).toBe(directVision ? 0 : 3);
    expect((await read()).seq).toBeGreaterThan(reviewSeq);
  } finally {
    await app.close();
  }
}, 60_000);
