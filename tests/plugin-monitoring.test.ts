import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, definePlugin } from "@smartdoca/plugin-sdk";
import { PluginHost } from "../packages/plugin-host/src/index.js";
import {
  monitoringServiceToken,
  telemetryServiceToken,
  type MonitoringServiceV1,
  type TelemetryServiceV1,
} from "@smartdoca/plugin-sdk/monitoring";
import { createPluginPlatformClient } from "@smartdoca/plugin-sdk/web";
import {
  MonitoringBuffer,
  summarizeHttp,
  redactMonitoringFields,
} from "@server/services/monitoring-buffer.js";
import {
  createHostMonitoring,
  type HostMonitoring,
} from "@server/services/monitoring.js";
import { scopeInstalledPlugin } from "@server/plugins/scope.js";
import {
  createRealtimeCluster,
  type RealtimeCluster,
} from "@server/services/realtime/cluster.js";
import { createApp } from "@server/app/create-app.js";
import { openTestDatabase } from "./database.js";
import { createUser } from "@core/modules/identity/passwords.js";
import { createContent } from "@core/workflows/resources.js";
import { enqueueProjection } from "@core/modules/automation/jobs.js";
import type { DB } from "@db/index.js";

describe("bounded operational telemetry", () => {
  it("counts completed requests, errors and aborts and merges histograms rather than percentiles", () => {
    let now = Date.now();
    const a = new MonitoringBuffer("a", () => now),
      b = new MonitoringBuffer("b", () => now);
    try {
      for (const [status, duration] of [
        [200, 15],
        [404, 45],
        [500, 130],
      ] as const) {
        a.begin();
        a.request("GET", "/documents/:id", status, duration);
      }
      a.begin();
      a.request("GET", "/documents/:id", null, 90);
      b.begin();
      b.request("GET", "/documents/:id", 200, 5);
      b.begin();
      now += 10000;
      const result = summarizeHttp([a.snapshot(), b.snapshot()], 60, now);
      expect(result.http).toMatchObject({
        requests: 4,
        clientErrors: 1,
        serverErrors: 1,
        aborted: 1,
        inFlight: 1,
        qps: 0.4,
        errorRate: 0.25,
      });
      expect(result.http.latencyMs).toMatchObject({
        count: 4,
        sum: 195,
        min: 5,
        max: 130,
        p95: 130,
      });
      expect(result.routes).toHaveLength(1);
      now += 310000;
      expect(summarizeHttp([a.snapshot()], 60, now).http).toMatchObject({
        requests: 0,
        errorRate: null,
        latencyMs: { count: 0, p95: null },
      });
    } finally {
      a.close();
      b.close();
    }
  });
  it("redacts nested secrets, query credentials, document bodies and error stacks", () => {
    const output = redactMonitoringFields({
      apiKey: "sk-secret",
      nested: {
        authorization: "Bearer private",
        body: "document body",
        url: "https://user:password@example.test/error?token=private#secret",
        safe: "Bearer private password=secret",
      },
      stack: "private source",
      count: 3,
    });
    const text = JSON.stringify(output);
    for (const secret of [
      "sk-secret",
      "private",
      "document body",
      "user:password",
      "?token",
      "#secret",
      "password=secret",
    ])
      expect(text).not.toContain(secret);
    expect(output).toMatchObject({
      count: 3,
      nested: { url: "https://example.test/error" },
    });
  });
  it("preserves per-instance custom metrics and rejects changed kinds, namespaces, secrets and excess cardinality", () => {
    const buffer = new MonitoringBuffer("metric-test");
    try {
      buffer.record("example.monitor", {
        name: "example.monitor.jobs",
        kind: "counter",
        value: 2,
        labels: { kind: "sync" },
      });
      buffer.record("example.monitor", {
        name: "example.monitor.jobs",
        kind: "counter",
        value: 3,
        labels: { kind: "sync" },
      });
      expect(buffer.snapshot().series[0]).toMatchObject({
        value: 5,
        pluginId: "example.monitor",
      });
      expect(() =>
        buffer.record("example.monitor", {
          name: "example.monitor.jobs",
          kind: "gauge",
          value: 3,
          labels: { kind: "sync" },
        }),
      ).toThrow("Metric kind");
      expect(() =>
        buffer.record("example.monitor", {
          name: "other.count",
          kind: "counter",
          value: 1,
        }),
      ).toThrow("namespace");
      expect(() =>
        buffer.record("example.monitor", {
          name: "example.monitor.secret",
          kind: "gauge",
          value: 1,
          labels: { apiKey: "private" },
        }),
      ).toThrow("Sensitive");
      for (let index = 0; index < 199; index++)
        buffer.record("example.monitor", {
          name: "example.monitor.states",
          kind: "gauge",
          value: index,
          labels: { state: String(index) },
        });
      expect(() =>
        buffer.record("example.monitor", {
          name: "example.monitor.states",
          kind: "gauge",
          value: 0,
          labels: { state: "overflow" },
        }),
      ).toThrow("limit");
      expect(buffer.snapshot().instance.rejectedMetricSeries).toBe(1);
    } finally {
      buffer.close();
    }
  });
});

describe("public monitoring services on isolated data", () => {
  let db: DB, realtime: RealtimeCluster, monitoring: HostMonitoring;
  beforeEach(async () => {
    db = await openTestDatabase({ driver: "sqlite", path: ":memory:" });
    realtime = await createRealtimeCluster({ instanceId: "test-instance" });
    monitoring = await createHostMonitoring(
      db,
      new MonitoringBuffer("test-instance", Date.now, 2),
      realtime,
      {},
    );
  });
  afterEach(async () => {
    await monitoring?.close();
    await realtime?.close();
    await db?.destroy();
  });
  it("reports eviction gaps, resumes filtered cursors and rejects changed queries or invalid cursors", async () => {
    for (let index = 0; index < 4; index++)
      monitoring.telemetry.log("example.monitor", {
        level: index === 3 ? "error" : "info",
        module: "jobs",
        message: "Job " + index,
      });
    const first = await monitoring.service.logs({ limit: 1 });
    expect(first.gaps).toMatchObject([{ reason: "evicted", dropped: 2 }]);
    expect(first.items.map((row) => row.sequence)).toEqual([3]);
    expect(first.hasMore).toBe(true);
    const second = await monitoring.service.logs({
      limit: 1,
      cursor: first.cursor,
    });
    expect(second.items.map((row) => row.sequence)).toEqual([4]);
    expect(second.gaps).toEqual([]);
    expect(
      (await monitoring.service.logs({ cursor: second.cursor })).items,
    ).toEqual([]);
    await expect(
      monitoring.service.logs({ cursor: second.cursor, level: "error" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      monitoring.service.logs({ cursor: "garbage" }),
    ).rejects.toMatchObject({ status: 400 });
    const filtered = await monitoring.service.logs({ level: "error" });
    expect(filtered.items.map((row) => row.sequence)).toEqual([4]);
    expect(
      (
        await monitoring.service.logs({
          level: "error",
          cursor: filtered.cursor,
        })
      ).items,
    ).toEqual([]);
    const controller = new AbortController();
    controller.abort();
    await expect(
      monitoring.service.metrics({}, { signal: controller.signal }),
    ).rejects.toHaveProperty("name", "AbortError");
  });
  it("preserves per-epoch cursor order across clock reversal and protects buffered facts from caller mutation", async () => {
    let now = Date.now();
    const buffer = new MonitoringBuffer("clock-test", () => now);
    const clock = await createHostMonitoring(db, buffer, realtime, {});
    try {
      clock.telemetry.log("example.monitor", {
        level: "info",
        module: "jobs",
        message: "First",
      });
      now -= 1000;
      clock.telemetry.log("example.monitor", {
        level: "info",
        module: "jobs",
        message: "Second",
      });
      const first = await clock.service.logs({ limit: 1 });
      expect(first.items.map((row) => row.sequence)).toEqual([1]);
      const returned = first.items[0] as unknown as { message: string };
      returned.message = "Changed";
      expect(buffer.snapshot().logs[0]!.message).toBe("First");
      const next = await clock.service.logs({ limit: 1, cursor: first.cursor });
      expect(next.items.map((row) => row.sequence)).toEqual([2]);
      expect((await clock.service.logs({ cursor: next.cursor })).items).toEqual(
        [],
      );
    } finally {
      await clock.close();
    }
  });
  it("reports actual active resources and deduplicated realtime people without consulting heartbeat data", async () => {
    const admin = {
      ...(await createUser(
        db,
        {
          login: "stats",
          displayName: "Stats",
          password: "monitoring-test-password",
        },
        { bootstrap: true },
      )),
      admin: 1,
    };
    await createContent(db).create(admin, {
      title: "Public document",
      kind: "document",
      format: "markdown",
    });
    const removed = await createContent(db).create(admin, {
      title: "Deleted document",
      kind: "document",
      format: "markdown",
    });
    await db
      .updateTable("resources")
      .set({ deleted_at: new Date().toISOString() })
      .where("id", "=", removed.id)
      .execute();
    await db
      .insertInto("user_presence")
      .values({ user_id: admin.id, last_seen_at: new Date().toISOString() })
      .execute();
    expect(await monitoring.service.stats({})).toMatchObject({
      documents: 1,
      users: 1,
      activeUsers: 1,
      scope: "shared-database",
    });
    expect(await monitoring.service.online({})).toMatchObject({
      uniqueUsers: 0,
      connections: 0,
      source: "realtime-connections",
    });
    for (const id of ["tab-a", "tab-b"])
      await realtime.upsert({
        connectionId: id,
        userId: admin.id,
        name: "Admin",
        color: "#000",
        room: "document-a",
        selection: null,
      });
    expect(await monitoring.service.online({})).toMatchObject({
      uniqueUsers: 1,
      connections: 2,
      activeDocuments: 1,
      users: [
        { userId: admin.id, connections: 2, documentIds: ["document-a"] },
      ],
    });
    await realtime.close();
    await expect(monitoring.service.online({})).rejects.toMatchObject({
      status: 503,
    });
  });
  it("pages and redacts existing audit, distinguishes unknown AI usage, and exposes job backlog without payloads", async () => {
    const actor = await createUser(
      db,
      {
        login: "audit",
        displayName: "Audit",
        password: "monitoring-test-password",
      },
      { bootstrap: true },
    );
    const start = Date.now() - 10000;
    for (let index = 0; index < 3; index++)
      await db
        .insertInto("security_audit")
        .values({
          id: randomUUID(),
          actor_id: actor.id,
          user_id: actor.id,
          action: "test.logged",
          details: JSON.stringify({ password: "secret", outcome: "ok" }),
          created_at: new Date(start + index).toISOString(),
        })
        .execute();
    const first = await monitoring.service.audit({
      source: "security",
      action: "test.logged",
      limit: 1,
    });
    expect(first.items[0]).toMatchObject({
      details: { password: "[redacted]", outcome: "ok" },
      detailsValid: true,
    });
    const next = await monitoring.service.audit({
      source: "security",
      action: "test.logged",
      limit: 2,
      cursor: first.nextCursor,
    });
    expect(next.items).toHaveLength(2);
    expect(next.items.map((row) => row.id)).not.toContain(first.items[0]!.id);
    await expect(
      monitoring.service.audit({
        source: "resource",
        cursor: first.nextCursor,
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      monitoring.service.audit({ source: "security", resourceId: "document" }),
    ).rejects.toMatchObject({ status: 400 });
    const common = {
      user_id: actor.id,
      job_id: null,
      model_id: "test-model",
      model_snapshot: "{}",
      periods: "{}",
      state: "confirmed",
      input_tokens: 99,
      output_tokens: 88,
      cached_tokens: 77,
      created_at: new Date(start).toISOString(),
      updated_at: new Date(start).toISOString(),
    };
    await db
      .insertInto("ai_calls")
      .values([
        {
          ...common,
          id: "confirmed",
          usage: JSON.stringify({
            known: true,
            metrics: { input: 10, output: 20, cached: 0, image: 0, total: 30 },
            providerMetrics: { input: 5, output: 10, cached: null },
          }),
        },
        { ...common, id: "unknown", usage: "{}" },
        {
          ...common,
          id: "old-format",
          usage: JSON.stringify({
            known: true,
            metrics: { input: 10, output: 20, total: 30 },
          }),
        },
      ])
      .execute();
    const usage = await monitoring.service.aiUsage({ userId: actor.id });
    expect(usage.items.find((row) => row.callId === "confirmed")).toMatchObject(
      {
        usageStatus: "confirmed",
        ratedTokens: { total: 30 },
        providerMetrics: { cached: null },
      },
    );
    expect(usage.items.find((row) => row.callId === "unknown")).toMatchObject({
      usageStatus: "unknown",
      ratedTokens: null,
    });
    expect(
      usage.items.find((row) => row.callId === "old-format"),
    ).toMatchObject({ usageStatus: "invalid", ratedTokens: null });
    await enqueueProjection(db, "search", "test", { body: "private content" });
    await db
      .updateTable("projection_jobs")
      .set({
        last_error: "Bearer secret apiKey=private",
        lease_token: randomUUID(),
        lease_until: new Date(start).toISOString(),
        status: "running",
      })
      .where("id", "=", "search:test")
      .execute();
    expect(await monitoring.service.jobs({})).toMatchObject({
      expiredLeases: { projection: 1 },
      groups: [
        { source: "projection", kind: "search", status: "running", count: 1 },
      ],
    });
    const errors = await monitoring.service.jobErrors({ source: "projection" });
    expect(errors.items).toHaveLength(1);
    expect(JSON.stringify(errors)).not.toMatch(/secret|private|payload/);
    const health = await monitoring.service.health({});
    expect(health.dependencies).toContainEqual(
      expect.objectContaining({ name: "database", status: "ok" }),
    );
    expect(health.dependencies).toContainEqual(
      expect.objectContaining({ name: "file-storage", status: "not-probed" }),
    );
  });
  it("binds declared services to plugin ownership and releases access on disposal", async () => {
    const root = new Context();
    root.provide(monitoringServiceToken, monitoring.service);
    root.provide(telemetryServiceToken, monitoring.telemetry);
    const host = new PluginHost({ context: root });
    let captured: MonitoringServiceV1, telemetry: TelemetryServiceV1;
    host.register(
      scopeInstalledPlugin(
        definePlugin({
          manifest: {
            schemaVersion: 1,
            id: "example.monitor",
            version: "1.0.0",
            displayName: "Monitor",
            sdkRange: "^0.2.0",
          },
          injections: {
            required: [monitoringServiceToken, telemetryServiceToken],
          },
          async uninstall() {},
          mount(context) {
            captured = context.inject(monitoringServiceToken);
            telemetry = context.inject(telemetryServiceToken);
          },
        }),
      ),
    );
    await host.start();
    expect(monitoring.buffer.readers.has("example.monitor")).toBe(true);
    expect(() =>
      telemetry!.log("other.plugin", {
        level: "info",
        module: "jobs",
        message: "Denied",
      }),
    ).toThrow("namespace");
    await host.dispose();
    expect(monitoring.buffer.readers.has("example.monitor")).toBe(false);
    expect(() => captured!.stats({})).toThrow("disposed");
    const old = new PluginHost({ context: root });
    old.register(
      scopeInstalledPlugin(
        definePlugin({
          manifest: {
            schemaVersion: 1,
            id: "example.old",
            version: "1.0.0",
            displayName: "Old",
            sdkRange: "*",
          },
          injections: { required: [monitoringServiceToken] },
          async uninstall() {},
          mount(context) {
            context.inject(monitoringServiceToken);
          },
        }),
      ),
    );
    await expect(old.start()).rejects.toThrow("mount");
    await old.dispose();
    await root.dispose();
  });
});

it("serves a declared installed plugin through administrator-only Web transport and collects all HTTP routes", async () => {
  const db = await openTestDatabase({ driver: "sqlite", path: ":memory:" });
  const directory = await mkdtemp(join(tmpdir(), "doca-monitoring-plugin-"));
  const root = join(directory, "example.monitor");
  await mkdir(root);
  const manifest = {
    schemaVersion: 1,
    id: "example.monitor",
    version: "1.0.0",
    displayName: "Monitor",
    sdkRange: "^0.2.0",
  };
  await writeFile(join(root, "manifest.json"), JSON.stringify(manifest));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: "@example/monitor",
      version: "1.0.0",
      type: "module",
      doca: {
        storage: "host",
        dataVersion: "1",
        manifest: "./manifest.json",
        server: "./server.js",
      },
    }),
  );
  await writeFile(
    join(root, "server.js"),
    "export default () => ({manifest:" +
      JSON.stringify(manifest) +
      ",injections:{required:[{id:'monitoring.v1'},{id:'telemetry.v1'}]},async uninstall(){},mount(context){context.inject({id:'monitoring.v1'}); const telemetry=context.inject({id:'telemetry.v1'});telemetry.log('example.monitor',{level:'info',module:'example.monitor',message:'Monitor started',fields:{password:'must-not-leak'}});telemetry.record('example.monitor',{name:'example.monitor.startups',kind:'counter',value:1});}});",
  );
  let app: Awaited<ReturnType<typeof createApp>> | undefined;
  const origin = "http://localhost:39275",
    host = "localhost:39275",
    password = "monitoring-http-password";
  try {
    const admin = {
      ...(await createUser(
        db,
        { login: "admin", displayName: "Admin", password },
        { bootstrap: true },
      )),
      admin: 1,
    };
    await createUser(
      db,
      { login: "ordinary", displayName: "Ordinary", password },
      { actor: admin },
    );
    app = await createApp(db, { origin, pluginDirectory: directory });
    const login = async (name: string) => {
      const reply = await app!.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        headers: { host, origin },
        payload: { login: name, password },
      });
      expect(reply.statusCode).toBe(200);
      return String(reply.headers["set-cookie"]).split(";")[0]!;
    };
    const cookie = await login("admin"),
      ordinary = await login("ordinary");
    const invoke = async (
      operation: string,
      input: unknown,
      session = cookie,
      pluginId = "example.monitor",
    ) =>
      app!.inject({
        method: "POST",
        url: "/api/v1/plugin-platform/" + pluginId + "/" + operation,
        headers: {
          host,
          origin,
          cookie: session,
          "content-type": "application/json",
        },
        payload: JSON.stringify(input),
      });
    const client = createPluginPlatformClient(
      async <T>(operation: string, input: unknown): Promise<T> => {
        const reply = await invoke(operation, input);
        expect(reply.statusCode).toBe(200);
        return reply.json<T>();
      },
    );
    expect(await client.monitoring.stats({})).toMatchObject({ users: 2 });
    await app.inject({
      url: "/missing/a?token=never-record-me",
      headers: { host },
    });
    const metrics = await client.monitoring.metrics({ windowSeconds: 60 });
    expect(metrics.http.requests).toBeGreaterThanOrEqual(4);
    expect(metrics.series).toContainEqual(
      expect.objectContaining({ name: "example.monitor.startups", value: 1 }),
    );
    const logs = await client.monitoring.logs({});
    expect(JSON.stringify(logs)).not.toMatch(/never-record-me|must-not-leak/);
    expect(logs.items).toContainEqual(
      expect.objectContaining({
        pluginId: "example.monitor",
        message: "Monitor started",
      }),
    );
    expect((await invoke("monitoring.stats", {}, ordinary)).statusCode).toBe(
      403,
    );
    expect(
      (await invoke("monitoring.stats", {}, cookie, "example.unknown"))
        .statusCode,
    ).toBe(404);
    expect(
      (await invoke("monitoring.metrics", { windowSeconds: 301 })).statusCode,
    ).toBe(400);
    expect((await invoke("monitoring.unknown", {})).statusCode).toBe(404);
    await db
      .updateTable("users")
      .set({ admin: 0 })
      .where("id", "=", admin.id)
      .execute();
    expect((await invoke("monitoring.stats", {})).statusCode).toBe(403);
  } finally {
    await app?.close();
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);
