<a id="身份认证、注册审批与账号绑定"></a>
<a id="身份认证注册审批与账号绑定"></a>

# 身份認證、註冊審批與賬號繫結

[English](authentication.md)

適用於當前無空間、無組織架構的輕量 Doca。本文同時說明本地賬號、外部身份源、註冊審批和登入方式切換規則。

<a id="产品边界与调研结论"></a>

## 產品邊界與調研結論

一個 Doca 使用者可繫結多種登入身份；文件、許可權、頭像和偏好始終歸屬穩定的 `users.id`。不按郵箱、暱稱或手機號自動合併賬號，必須先登入原賬號，再主動繫結。

參考 [Better Auth 的賬號關聯設計](https://better-auth.com/docs/concepts/users-accounts)，將使用者資料與登入身份分離，但採用顯式繫結，不啟用隱式郵箱關聯。參考 [authentik User Write stage](https://docs.goauthentik.io/add-secure-apps/flows-stages/stages/user_write/) 將建立與啟用賬號分開，支援待稽核狀態。這些是設計參考，沒有遷移現有賬號到 Better Auth，也未依賴 authentik 服務。

後臺採用獨立全頁外殼：自己的導航、內容滾動區、返回工作臺入口，不再巢狀文件工作區。賬號設定也採用獨立導航。結構參考 [shadcn/ui Dashboard](https://ui.shadcn.com/examples/dashboard) 的側欄與分割槽、[表單指南](https://ui.shadcn.com/docs/forms) 的分組與反饋，保留 Doca 的飛書風格配色及自定義選擇框，不替換元件庫。

<a id="三类注册策略"></a>

## 三類註冊策略

「管理員後臺 → 登入與註冊」分別設定：

| 入口 | 不允許新使用者加入 | 自動註冊 | 需要審批 |
| --- | --- | --- | --- |
| 本站賬號密碼 | 關閉註冊入口 | 註冊後直接登入 | 建立 pending 使用者 |
| 企業 OIDC SSO | 只允許已繫結身份登入 | 首次登入建立使用者 | 首次登入建立 pending 使用者 |
| Google/GitHub/微信/QQ | 只允許已繫結身份登入 | 首次登入建立使用者 | 首次登入建立 pending 使用者 |

已有繫結的 active 使用者不受“關閉註冊”影響，已有使用者仍可繫結身份。管理員手動建立的使用者直接 active。待稽核使用者沒有本站會話，不能訪問文件或 WebSocket。管理員在獨立註冊稽核頁批准或拒絕；普通使用者啟用/停用操作不能審批 pending 賬號。審批透過後需重新登入，不啟用舊授權流程。

預設不開啟外部註冊或任何身份源。保留賬號密碼入口，避免身份源故障導致管理員無法登入。本輪已增加聯絡方式驗證、手機驗證碼登入與密碼恢復；驗證碼傳送和嘗試限制使用共享資料庫，密碼登入和公開機器人 IP 限流在未配置 Redis 時使用程序內計數，配置 Redis 後共享計數。簡訊單獨配置准入規則，第三方來源可單獨覆蓋類別策略。

登入方式切換時，服務端會按啟用狀態、已驗證聯絡方式、密碼賬號標識和身份源憑據逐個檢查所有 active 使用者及管理員。只要有人在修改後沒有可用方式，就拒絕儲存。管理員可以先在“強制使用者補充登入方式”中選擇新方式；使用者下次開啟時必須完成驗證或繫結，全部完成後再關閉舊方式。僅新增方式時預設不強制。

<a id="支持的身份源"></a>

## 支援的身份源

- **OIDC SSO**：標準 Discovery，可接 Keycloak、authentik 等。採用 `openid-client` 6.8.8，授權碼 + PKCE S256、state、nonce，啟用 ID Token 簽名校驗及 issuer/audience/時效校驗。參考 [openid-client](https://github.com/panva/openid-client)。客戶端認證使用 `client_secret_post`，暫不支援私鑰 JWT、mTLS、SAML；純 OAuth2 不能當作 OIDC 配置。
- **Google**：固定 `https://accounts.google.com` Discovery，`openid profile`，宣告郵箱來源時額外申請郵箱許可權。參考 [Google OIDC 文件](https://developers.google.com/identity/openid-connect/reference)。
- **GitHub**：授權碼 + PKCE S256，`read:user`，透過 `/user` 獲取穩定數字 ID；宣告郵箱來源時增加 `user:email` 並讀取已驗證主郵箱。參考 [GitHub OAuth 官方文件](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)。
- **微信**：網站掃碼 `snsapi_login`，以 App ID 下的 OpenID 繫結，不用 UnionID 自動合併。不是公眾號網頁授權、小程式或移動 App 登入。
- **QQ**：網站 OAuth；token / me 用 JSON 格式，再讀取使用者資料；驗證 `me.client_id` 與配置一致。路徑與格式參考 [SocialiteProviders QQ 開源實現](https://github.com/SocialiteProviders/QQ/blob/master/Provider.php)。

微信/QQ 官方開發文件本次訪問受限；介面卡已實現並使用模擬響應測試，**未完成真實平臺驗收**。所有外部身份源都需部署方申請應用和憑據；網站資質、域名稽核及授權範圍以平臺控制檯當前要求為準。微信/QQ 此流程不傳送 PKCE，不能等同 OIDC 的 PKCE 能力。

當前只實現 SSO 客戶端。Doca 作為 OIDC 提供方、SAML、全域性 SSO 退出/撤銷同步尚未實現。身份源禁用賬號不會自動撤銷 Doca 已簽發的會話。瀏覽器會話預設 24 小時，可透過[登入有效期](configuration.zh-Hant.md#登录有效期)配置，已簽發會話保留原到期時間；需本站管理員停用賬號，或後續接入 IdP 生命週期事件。

<a id="部署步骤"></a>

## 部署步驟

1. 在各平臺註冊應用。使用已配置的 HTTP(S) `DOCA_ORIGIN`，代理保留已配置的 Host。
2. 在「平臺設定 → 服務憑據 → SSO 認證」新增憑據名稱和 Client Secret，設定自定義 SSO 允許來源。金鑰儲存在資料庫，儲存後生效，不回顯。

3. 新增身份源，填寫顯示名、Issuer（僅 OIDC）、Client/App ID 和憑據標識。先保持關閉，儲存取得回撥地址。
4. 原樣填入平臺回撥白名單：`https://doca.example.com/api/v1/auth/providers/<UUID>/callback`。每個身份源獨立地址，不支援任意返回 URL。
5. 配置註冊策略並啟用。在個人資訊頁面繫結或退出後測試登入。驗證完成前保留原管理員登入方式。

Google/GitHub/微信/QQ 的固定 HTTPS 域名內建允許。OIDC Issuer 及 Discovery 返回的授權、token、JWKS 等所有域名必須加入 服務憑據頁的「自定義 SSO 允許來源」（完整 origin，每行一個）。禁止網路重定向，顯式加入允許來源的自建身份源可用 HTTP，OIDC 同時允許其 HTTP Discovery 和端點。白名單由部署者維護，須配合網路出口策略，不要信任可變的不可信 DNS 或開放任意內網地址。

型別、Issuer、Client ID 是不可修改的名稱空間。更換發行者或應用時新建身份源，讓使用者主動繫結，不把原 ID 指向另一身份源。修改名稱、憑據標識和啟停狀態使用 version 樂觀鎖，使舊授權流程失效。停用身份源可能讓僅繫結該來源的使用者無法再次登入，應先安排替代繫結。新增登入方式預設不強制使用者使用；只有準備替換舊方式時，管理員才應設定“強制使用者補充登入方式”，待使用者完成補充後再關閉舊方式。

<a id="安全流程"></a>

## 安全流程

1. 同源 POST 發起；隨機 state、瀏覽器流程憑據、nonce、PKCE verifier。繫結要求先完成管理員配置的獨立安全驗證，憑證五分鐘內單次有效。
2. 儲存 state 和瀏覽器憑據的雜湊及十分鐘流程；流程 Cookie 為 HttpOnly/SameSite=Lax，主 Cookie 保持 HttpOnly/SameSite=Strict，HTTPS 下加 Secure。
3. 回撥驗證對應 provider、state、瀏覽器憑據，原子認領一次並校驗授權身份。日誌不記錄回撥查詢引數、code、token、提供方錯誤正文。
4. 固定重定向 `/#/auth/complete`，前端同源 POST 完成，恢復 Strict 主會話。繫結必須仍為最初發起的使用者和同一個會話，且獨立安全驗證憑證仍有效。
5. 事務消費流程，檢查 provider 版本、唯一身份歸屬、註冊策略與使用者狀態。pending 不發會話，active 只發 Doca 會話。

不持久化第三方 access/refresh token；僅儲存 subject、當時顯示名與關聯資訊。來源宣告的 HTTP(S) 頭像 URL可用於展示，服務端不盲目抓取；使用者上傳頭像仍走本站資源儲存。

解綁須最近驗證，不能移除最後一種**可用**方式，停用/缺憑據的提供方不計入保底。無密碼賬號可經最近驗證首次設定本站密碼；已有密碼走原修改密碼流程。公開使用者ID與本地登入名統一為有意義的唯一字串；來源未提供合適的使用者ID時必須補全，不再生成UUID名稱。內部使用者UUID保持穩定。

<a id="数据库"></a>

## 資料庫

當前資料庫基線包含以下身份結構（不會自動建立使用者或重置密碼）：

- `settings.registration_review`：本地註冊審批開關，配合原 registration；sso_registration/social_registration 為 closed/auto/approval。共享 revision 樂觀鎖。
- `account_flows`：儲存單次安全驗證憑證；會話不承擔安全驗證證明職責。
- `auth_providers`：配置、不可變名稱空間、version；不存金鑰。唯一 type+issuer+client_id。
- `auth_identities`：user_id → provider_id + subject。唯一 provider_id+subject 防搶綁；唯一 user_id+provider_id 限同一使用者在同一身份源繫結一個身份。
- `auth_flows`：十分鐘單次流程，stage 為 started/exchanging/verified，完成刪除，過期在發起新流程時清理。

<a id="http-接口"></a>

## HTTP 介面

字首 `/api/v1`，寫請求需匹配 Origin：

| 介面 | 許可權與行為 |
| --- | --- |
| GET /auth/providers | 公共；僅啟用且憑據就緒的 id/name/type |
| GET /admin/auth | 管理員；三類策略、revision、身份源、就緒狀態、回撥地址，無金鑰 |
| GET/PUT /admin/accounts/policy | 管理員；賬號密碼、手機/郵箱登入、密碼賬號型別及 `forcedLoginMethod`，儲存時校驗所有 active 使用者至少保留一種可用方式 |
| PUT /admin/auth/policy | 管理員；`{revision,local,sso,social}`，值 closed/auto/approval |
| POST /admin/auth/providers | 管理員；`{type,name,issuer,client_id,credential_ref,enabled,version:0}`，enabled 為 0/1 |
| PUT /admin/auth/providers/:id | 管理員；同上，version 取當前值，不可變欄位不可改 |
| POST /auth/providers/:id/start | `{intent:"login"\|"link"\|"security"\|"replace"}` → `{url}` 與流程 Cookie；link 需最近驗證 |
| GET /auth/providers/:id/callback | 授權回撥，交換和校驗身份，固定同源重定向 |
| POST /auth/complete | 消費驗證流程，返回 status active/linked/pending，active 簽發會話 |
| GET /me/identities | 登入；本地登入名、是否有密碼、繫結及可用狀態，無 subject/token |
| POST /auth/reauth | 登入；`{password}` 更新當前會話最近驗證時間 |
| POST /auth/password/setup | 最近驗證；`{password}` 12–128字元，僅首次設定，撤銷其他會話 |
| DELETE /me/identities/:id | 最近驗證；解綁本人身份，保護最後可用方式 |
| GET /admin/users?status=pending | 管理員；active/pending/disabled 過濾和分頁 |
| GET /admin/registration-reviews | 管理員 | pending/approved/rejected 分頁稽核記錄 |
| POST /admin/registration-reviews/:id | 管理員 | `{decision:"approved"\|"rejected",message?}` |
| PATCH /admin/users/:id | 管理員 | 普通 active/disabled 使用者啟停；pending 返回 409 |

`POST /auth/register` 響應增加 status，pending 時提示等待稽核，不自動登入。

<a id="测试与待验收项"></a>

## 測試與待驗收項

`tests/identity.test.ts` 使用 RSA 簽名的模擬 OIDC 響應，走真實 openid-client 校驗路徑，覆蓋 PKCE、簽名、nonce、issuer、Cookie、重複/過期回撥、會話繫結、策略、審批、解綁。各社交介面卡使用模擬 HTTP，不代表平臺應用稽核或公網聯調透過。

SQLite 與隔離 PostgreSQL 實庫均按當前建表定義執行完整迴歸。真實身份源、HTTPS 代理部署和賬號恢復能力需單獨驗收。

<a id="_2026-09-模块重构补充"></a>
<a id="2026-09-模块重构补充"></a>

## 2026-09 模組重構補充

身份領域位於 `packages/core/src/modules/identity`，協議適配位於 `apps/server/src/adapters/identity-providers.ts`。新增自定義 OAuth 2.0 授權碼/PKCE 適配，支援配置端點及穩定身份欄位，仍受 HTTP(S) 來源白名單約束。該適配與 OIDC 獨立，不把普通 OAuth token 當作 ID Token。

每個來源的 `profile_config` 宣告註冊欄位、來源、可修改與同步規則。資料不完整時 `/auth/complete` 返回 `needs_profile`，不建立完整會話；提交所需資料和聯絡方式驗證憑證後繼續註冊或審批。使用者名稱唯一約束和 provider+subject 身份繫結獨立，重名不合並賬號。自定義協議配置建立後不可重新指向其他身份名稱空間。
