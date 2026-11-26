<a id="架构与实现边界"></a>

# 架構與實現邊界

[English](architecture.md)

基線：宿主 0.2.23 / SDK 0.1.11，2026-10-28 按原始碼核對文件。本文說明已實現的組裝與邊界，外部服務和裝置行為需單獨驗收。先看[功能與邊界](features.zh-Hant.md)。

<a id="应用与模块"></a>

## 應用與模組

Doca 是 TypeScript 外掛化單體。開發時 React/Vite 與 Fastify 監聽不同埠，瀏覽器透過同一來源訪問；生產由 Fastify 提供構建後的 Web 頁面和 API。Cordis 管理程序內服務與生命週期，公開 SDK 定義外掛邊界。

```text
浏览器：React + 五种文档编辑器
  │ 同源 HTTP / WebSocket，宿主认证会话
Fastify：Host/Origin 校验、路由、安全与静态资源
  │
宿主组装：账号、文档、文件、搜索、AI、知识整理
  │ 从安装目录发现可信业务插件
Core 领域规则 / Kysely 数据库访问
  │
单机 SQLite，或共享 PostgreSQL + Redis + 文件后端
```

預設宿主包括富文字、Markdown、表格、簡報、畫板、文件許可權、發現、檔案、來源訂閱與知識冊、認證、註冊稽核、安全審計和原始 AI 用量事實。隨手記、郵箱、日曆、會員、計費、業務配額與內容稽核屬於獨立業務，預設不安裝這些提供者。模板、素材與文件元素具備宿主介面，預設提供者為零。

<a id="目录"></a>

## 目錄

| 路徑 | 職責 |
| --- | --- |
| `apps/server/src/main.ts` | 啟動、監聽、關閉 |
| `apps/server/src/bootstrap/config.ts` | 來源、資料庫、代理與 Redis 配置 |
| `apps/server/src/app/create-app.ts` | HTTP 路由、會話與安全邊界 |
| `apps/server/src/plugins/composition.ts` | 內建服務與已安裝外掛組裝 |
| `apps/server/src/routes` | 宿主 HTTP 入口 |
| `apps/server/src/services` | 協同、搜尋、AI 等應用服務 |
| `apps/web/src/app/app.tsx` | 工作臺路由與功能組裝 |
| `apps/web/src/features/documents/document-editor.tsx` | 五個已安裝編輯器的分派 |
| `packages/core/src` | 領域規則、授權與事務 |
| `packages/db/src/create-schema.ts` | 新庫建立與啟動對賬共用的最新目標 DDL |
| `packages/plugin-sdk` | 公開服務端、Web 與外掛介面 |
| `tests` | 隔離單元與整合檢查 |

網頁透過 HTTP DTO 呼叫，不匯入資料庫或密碼內部模組。業務外掛使用公開 SDK 服務，不匯入宿主原始碼、不建立全域性執行時橋，見[外掛架構](plugin-architecture.zh-Hant.md)和[實現狀態](plugin-sdk-contract.zh-Hant.md)。

<a id="身份与安全"></a>

## 身份與安全

一次部署是一套賬號體系，沒有組織、空間或租戶表。註冊和外部身份源預設關閉，不建立預設管理員。密碼採用隨機鹽與 scrypt，資料庫儲存會話摘要；瀏覽器、掃碼和 WebView 會話預設 24 小時，移動 Bearer 會話預設 180 天，均可透過[會話配置](configuration.zh-Hant.md#登录有效期)調整。改密碼、停用賬號會撤銷會話。

所有請求檢查配置的 Host，寫入還檢查同源 Origin。本站 cookie 為 HttpOnly、SameSite=Strict，HTTPS 時帶 Secure。支援外部 OIDC 與社交適配，聯絡方式驗證和賬號找回已經實現，但需要驗證閘道器。註冊審批使用獨立稽核流程。尚不提供 OIDC 服務端、SAML 或 IdP 全域性退出，見[認證](authentication.zh-Hant.md)。

管理身份不授予私有內容訪問權；缺少讀取許可權通常返回 404，可讀但無操作許可權返回 403。ACL、繼承授權、公開、收錄和分享各有規則，隱藏祖先不會洩露，見[許可權](permission-inheritance.zh-Hant.md)和[發現](public-resource-discovery.zh-Hant.md)。

<a id="持久化与协同"></a>

## 持久化與協同

後設資料使用 HTTP 和版本檢查。五種編輯器共用宿主 WebSocket 生命週期，各有 Yjs codec。服務端驗證內容、複查授權，提交後才確認儲存；後設資料版本、正文序號、epoch、schema 和歷史 ID 分別管理。五種格式均有歷史讀取，目前僅富文字和 Markdown 支援恢復，見[協同](collaboration.zh-Hant.md)和[文件歷史](document-experience.zh-Hant.md)。

單機使用 SQLite、AI 和 Webhook 資料庫及本地檔案。PostgreSQL 使用獨立 Webhook 資料庫和 AI schema。多副本需要共享資料庫、檔案後端，以及承擔事件、線上狀態與限流的 Redis；未配置 Redis 時這些實現僅在程序內，已配置但故障時不靜默回退。資料庫任務使用租約或 outbox，不只存在程序內，見[配置](configuration.zh-Hant.md)和[水平擴充套件](horizontal-scaling.zh-Hant.md)。

物件儲存穩定儲存 ID 與引用，環境配置物理後端，儲存管理頁只讀。私有下載複查授權；CDN 只提供短期授權地址，不代替儲存。備份覆蓋每個資料庫、引用後端、外掛歸檔和受保護配置，見[檔案儲存](storage.zh-Hant.md)。

已安裝外掛使用共享註冊記錄和不可變歸檔，每例項需要啟動時恢復的可寫快取目錄；人工重啟使目標版本生效。託管私有 SQL、物件與憑證已實現，任務排空、臨時工作區和更強程序隔離尚未交付。版本和結構嚴格校驗，不支援的基線被拒絕；本文不增加遷移或相容適配，已有資料必須保留，見[發行要求](releases/0.2.23.zh-CN.md)及[資料庫升級規範](database-schema-evolution.zh-Hant.md)。

<a id="当前限制与验收"></a>

## 當前限制與驗收

評論執行緒和通知使用獨立分頁介面，文件詳情不是全部評論匯出。持久本地副本與 outbox 已實現，完整離線應用外殼尚未提供。原生裝置接入、真實身份/AI 平臺、生產 S3/CDN 和目標基礎設施故障恢復，仍需各自驗收。隔離測試只證明已宣告範圍，構建透過不代表外部服務均可用。
