<a id="插件架构"></a>

# 外掛架構

[English](plugin-architecture.md)

[SDK 契約](plugin-sdk-contract.zh-Hant.md) 定義核心與業務邊界，[開發規範](plugin-development.zh-Hant.md) 列出當前可用介面。

plugin-contracts 定義 manifest 與生命週期；plugin-sdk 提供注入、事件、貢獻和 effect；plugin-host 校驗依賴並管理啟動和逆序關閉。composition 組裝核心檔案、文件、搜尋和 AI，再從獨立安裝目錄引入業務外掛。

業務外掛透過公開 files、users、permissions、http、policies、events 和 ai 服務對接宿主。註冊歸屬外掛例項，不透過宿主私有資料庫型別或程序全域性橋接獲取服務。Web 外掛提供獨立構建產物，由活動清單動態載入。

宿主保留身份認證、授權、檔案、文件協同、安全審計、AI 原始用量及按模型速率折算的統一 Token 用量。會員、積分、貨幣價格、內容稽核和郵件不再包含核心表、專用工具或頁面入口；未來郵箱外掛獨立管理業務後端、資料和驗收。

通用目錄樹插槽、更多業務能力服務化和資金預留補償協議仍以契約的實現狀態表為準，不能把提案 API 當作可用匯出。

外掛持久化全部由宿主管理，安裝包必須宣告 `doca.storage: "host"`。外掛負責模型與授權，不負責驅動、儲存路徑或本地/遠端配置。SDK 0.1.7 已匯出託管 SQL 與內部物件；SDK 0.1.9 已匯出服務端加密憑證，詳見[儲存規範](plugin-horizontal-scaling.zh-Hant.md)。
