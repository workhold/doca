import { useSyncExternalStore } from "react";
import { UserBadge } from "@web/shared/components/user-badge.js";

let currentUserId: string | null = null;
const listeners = new Set<() => void>();

export function setCurrentUserId(id: string | null) {
  if (currentUserId === id) return;
  currentUserId = id;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCurrentUserId() {
  return useSyncExternalStore(subscribe, () => currentUserId, () => null);
}

/** Style the host's user links without changing SDK rendering or document data. */
export function UserMentionLinkStyles() {
  const id = useCurrentUserId();
  if (!id) return null;
  return (
    <style>{`a[href="#/u/${CSS.escape(id)}"] {
      --mention-background: #3370ff;
      --mention-color: #fff;
      --mention-padding: 0.05em 0.45em;
    }`}</style>
  );
}

export function UserMention({
  id,
  name,
  className = "",
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const self = useCurrentUserId();
  const label = name.replace(/^@/, "");
  return (
    <span
      className={`user-mention${self && self === id ? " is-self" : ""}${className ? ` ${className}` : ""}`}
    >
      <UserBadge id={id} name={label} noAvatar>
        @{label}
      </UserBadge>
    </span>
  );
}
