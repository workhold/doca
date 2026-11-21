export const desktopEn = {
  "desktop.switchBackend": "Switch backend",
  "desktop.switchFailed": "Could not open the connection manager.",
  "desktop.connect.title": "Connect Doca desktop",
  "desktop.connect.description": "Approve this sign-in to return to the desktop app. Only approve a request you started.",
  "desktop.connect.invalidRequest": "This desktop sign-in request is invalid. Start again from the app.",
  "desktop.connect.invalidReturn": "The return address is invalid.",
  "desktop.connect.failed": "Desktop sign-in failed. Start again from the app.",
  "desktop.connect.wait": "Connecting…",
  "desktop.connect.approve": "Approve and open Doca",
  "desktop.connect.openAgain": "Open Doca desktop again",
} as const;

export const desktopZh: Record<keyof typeof desktopEn, string> = {
  "desktop.switchBackend": "切换后端",
  "desktop.switchFailed": "无法打开后端连接管理窗口。",
  "desktop.connect.title": "连接 Doca 桌面版",
  "desktop.connect.description": "确认后将返回桌面应用。仅批准由你发起的登录请求。",
  "desktop.connect.invalidRequest": "桌面登录请求无效，请在桌面应用中重新发起。",
  "desktop.connect.invalidReturn": "返回桌面应用的地址无效。",
  "desktop.connect.failed": "桌面登录失败，请在桌面应用中重试。",
  "desktop.connect.wait": "正在连接…",
  "desktop.connect.approve": "确认并打开 Doca",
  "desktop.connect.openAgain": "再次打开 Doca 桌面版",
};
