<a id="app-插件缓存与附件能力"></a>

# App 外掛快取與附件能力

[English](plugin-native.md)

`host.ai.open` 在原生外掛容器透過新增的 `assistant.open` 操作開啟原生個人助手。引數和錯誤語義見[啟動契約](plugin-assistant.zh-Hant.md)。提示詞/上下文不進入導航 URL，賬號憑據不進入 WebView；預填請求在記憶體中按賬號和一次性啟動標識消費。

公開型別來自 `@smartdoca/plugin-sdk/native`，透過 `PluginWebHost.native` 使用。在 Web 為 null；App 外掛容器中提供：

- `storage.get(key)` / `set(key, value)` / `remove(key)` / `clear()`：字串快取，單值最多 200 萬字元，每個外掛最多 2000 萬字元。
- `attachments.save({path,name,mime})` / `share(...)`：path 是外掛 API 下相對路徑，例如 `/mailboxes/123/attachments/456?download=true`。

快取名稱空間由原生宿主繫結伺服器、線上確認的使用者 ID 和外掛 ID，外掛不能指定其他身份。資料儲存在 App 持久目錄，跨重啟保留，退出或移除賬號時清理對應伺服器快取。寫入序列執行，新快照完成後再替換舊快照。WebView 保持臨時隔離，登入 Cookie 不作為持久快取方案。

原生先線上核驗登入身份再載入外掛。已有外掛 IndexedDB 程式碼不會自動遷移或接管；外掛應顯式採用 native.storage。不支援完全離線冷啟動，解除安裝 App 或系統清理儲存不保證快取保留。

附件下載經宿主內部鑑權派發，禁止外掛重定向到外域；原生會話 token 不交給 WebView。最大附件 32 MiB。儲存/分享結束清理臨時檔案。

Android save 使用系統目錄選擇，返回 completed 或 canceled。iOS save 和 share 開啟系統分享面板，返回 presented；系統介面不提供可靠的最終儲存/取消結果，因此 presented 不能當成儲存成功。

頁面解除安裝或賬號切換取消正在執行的原生請求。郵箱繫結在 Web 完成，不提供原生 OAuth 流程。

當前已透過型別檢查和協議/宿主下載測試，快取永續性、系統分享及儲存仍需 iOS/Android 真機驗收。
