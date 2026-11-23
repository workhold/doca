export const desktopTabVisibilityEvent = "doca-desktop-tab-visibility";

export function isDesktopWorkspaceTab() {
  return window.frameElement?.hasAttribute("data-doca-workspace-tab") ?? false;
}

export function desktopTabActive() {
  return !isDesktopWorkspaceTab() || !window.frameElement?.hasAttribute("hidden");
}
