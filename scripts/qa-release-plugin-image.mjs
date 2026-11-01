// Verify startup isolation in each actual release image, without external network or user data.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const image =
  process.env.DOCA_RELEASE_QA_IMAGE ?? `smartdoca/doca:${version}-candidate`;
const code = `
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {join} from 'node:path';
const root=await mkdtemp('/tmp/doca-plugin-isolation-');
process.env.DOCA_FILE_STORE_ID='isolation';
process.env.DOCA_FILE_STORES_JSON=JSON.stringify({version:1,stores:{isolation:{provider:'local',root:join(root,'objects')}}});
process.env.DOCA_CREDENTIAL_MASTER_KEY=randomBytes(32).toString('hex');
const {openDatabase}=await import('./packages/db/src/index.ts');
const {createUser}=await import('./packages/core/src/modules/identity/passwords.ts');
const {createApp}=await import('./apps/server/src/app/create-app.ts');
const {pluginServices}=await import('./packages/core/src/shared/plugin-services.ts');
for(const [id,sdkRange,dependencies] of [
 ['example.old','^0.1.9',[]],
 ['example.consumer','^0.2.0',[{id:'example.old',range:'^1.0.0'}]],
 ['example.healthy','^0.2.0',[]],
]) {
 const directory=join(root,'plugins',id);await mkdir(directory,{recursive:true});
 const manifest={schemaVersion:1,id,version:'1.0.0',sdkRange,displayName:id,dependencies};
 const pkg={name:id,version:'1.0.0',type:'module',doca:{storage:'host',dataVersion:'1',manifest:'./manifest.json',server:'./server.js'}};
 await writeFile(join(directory,'package.json'),JSON.stringify(pkg));
 await writeFile(join(directory,'manifest.json'),JSON.stringify(manifest));
 await writeFile(join(directory,'server.js'),id==='example.healthy'?'export default()=>({manifest:'+JSON.stringify(manifest)+',async uninstall(){}})':'throw Error("Unavailable plugin must never be imported")');
}
const db=await openDatabase({driver:'sqlite',path:join(root,'doca.db')});
await createUser(db,{login:'isolated-admin',displayName:'Isolated admin',password:'isolated-image-password'},{bootstrap:true});
const origin='http://127.0.0.1:39631',headers={host:'127.0.0.1:39631',origin};
let app;
try {
 app=await createApp(db,{origin,pluginDirectory:join(root,'plugins')});
 assert.equal((await app.inject({url:'/health',headers})).statusCode,200);
 const bootstrap=(await app.inject({url:'/api/v1/bootstrap',headers})).json();
 assert(bootstrap.plugins.some(p=>p.id==='example.healthy'));assert(!bootstrap.plugins.some(p=>p.id==='example.old'||p.id==='example.consumer'));
 const login=await app.inject({method:'POST',url:'/api/v1/auth/login',headers,payload:{login:'isolated-admin',password:'isolated-image-password'}});assert.equal(login.statusCode,200,login.body);
 const authenticated={...headers,cookie:String(login.headers['set-cookie']).split(';')[0]};
 const inventory=(await app.inject({url:'/api/v1/admin/plugins',headers:authenticated})).json();
 assert.equal(inventory.restartRequired,false);assert.equal(inventory.plugins.find(p=>p.id==='example.old').startupIssue.code,'sdk_incompatible');
 assert.equal(inventory.plugins.find(p=>p.id==='example.consumer').startupIssue.code,'dependency_unavailable');
 const write=await app.inject({method:'POST',url:'/api/v1/resources',headers:authenticated,payload:{kind:'document',format:'markdown',title:'Blocked'}});assert.equal(write.statusCode,503,write.body);
 const before=await db.selectFrom('plugin_registry').selectAll().execute();
 await app.close();app=await createApp(db,{origin,pluginDirectory:join(root,'plugins')});
 assert.deepEqual(await db.selectFrom('plugin_registry').selectAll().execute(),before);
 assert.equal(pluginServices(db).unavailablePlugins.size,2);
 console.log(JSON.stringify({passed:true,version:${JSON.stringify(version)},arch:process.arch,health:200,login:200,managementAvailable:true,oldCodeNeverImported:true,requiredDependentsIsolated:true,healthyPluginRunning:true,noFalseRestart:true,guardedWrites:503,registryPreservedAcrossRestart:true}));
} finally {await app?.close();await db.destroy();await rm(root,{recursive:true,force:true});}
`;
const result = await promisify(execFile)(
  "docker",
  [
    "run",
    "--rm",
    "--network",
    "none",
    "--entrypoint",
    "node",
    image,
    "--import",
    "tsx",
    "--input-type=module",
    "-e",
    code,
  ],
  { maxBuffer: 4 * 1024 * 1024 },
);
const report = result.stdout
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .find((item) => item?.passed === true);
assert(report, result.stdout + result.stderr);
const output = resolve(`artifacts/verification/release-${version}`);
await mkdir(output, { recursive: true });
await writeFile(
  `${output}/plugin-isolation-${report.arch === "x64" ? "amd64" : report.arch}.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
