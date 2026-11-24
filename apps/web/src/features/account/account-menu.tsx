import { NavigationArea } from "@web/plugins/navigation.js";
import { useEffect, useRef } from "react";
import { Tooltip } from "antd";
import { Globe, House, LogOut, WifiOff } from "lucide-react";
import type { Me, User } from "@web/shared/api.js";
import { Avatar } from "@web/features/account/profile.js";
import { useI18n } from "@web/shared/i18n.js";
export function AccountMenu({
  user,
  me,
  logout,
  onError,
  refresh,
  showWorkspaceLink = false,
}: {
  user: User;
  me: Me | null;
  logout: () => void;
  onError: (message: string) => void;
  refresh: () => Promise<void>;
  showWorkspaceLink?: boolean;
}) {
  const { t } = useI18n();
  const root = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (root.current) root.current.open = false;
  };
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (e.target instanceof Node && !root.current?.contains(e.target))
        close();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && root.current?.open) {
        close();
        root.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    window.addEventListener("hashchange", close);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("hashchange", close);
    };
  }, []);
  const displayName = user.display_name || user.public_id || user.id;
  return (
    <details
      className="account-menu"
      ref={root}
      onToggle={(e) => {
        if (e.currentTarget.open)
          void refresh().catch((e) => onError(e.message));
      }}
    >
      <Tooltip
        title={t("account.menu")}
        placement="bottom"
        mouseEnterDelay={0.3}
      >
        <summary aria-label={t("account.menu")}>
          <Avatar
            name={displayName}
            avatar={me?.preferences.avatar}
            assetId={me?.preferences.avatar_asset_id}
            sourceUrl={me?.avatarUrl}
          />
        </summary>
      </Tooltip>
      <div className="account-menu-panel">
        <div className="account-menu-profile">
          <Avatar
            name={displayName}
            avatar={me?.preferences.avatar}
            assetId={me?.preferences.avatar_asset_id}
            sourceUrl={me?.avatarUrl}
          />
          <strong className="account-menu-nickname">{displayName}</strong>
        </div>
        <nav aria-label={t("account.menuNav")}>
          <NavigationArea
            slot="web.user"
            afterEntry={{
              id: "doca.mcp",
              node: (
                <a
                  href="#/browser-assistant"
                  onClick={close}
                  data-entry-id="doca.browser-assistant"
                >
                  <Globe size={16} />
                  <span>{t("clipper.title")}</span>
                </a>
              ),
            }}
          />
          {showWorkspaceLink && (
            <a href="#/home" onClick={close}>
              <House size={16} />
              {t("account.workspace")}
            </a>
          )}
          <a href="#/offline" onClick={close}>
            <WifiOff size={16} aria-hidden="true" />
            {t("offline.title")}
          </a>
          <button
            type="button"
            onClick={() => {
              close();
              logout();
            }}
          >
            <LogOut size={16} />
            {t("account.signOut")}
          </button>
        </nav>
      </div>
    </details>
  );
}
