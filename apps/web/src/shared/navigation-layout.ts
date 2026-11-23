import type { ResolvedNavigation } from "@smartdoca/web-plugin-registry";
import { api } from "./api.js";

let pending: Promise<ResolvedNavigation> | undefined;
export function fetchNavigationLayout() {
  if (!pending)
    pending = api<ResolvedNavigation>("/navigation").finally(() => {
      pending = undefined;
    });
  return pending;
}
export async function navigateToDefaultHome() {
  const data = await fetchNavigationLayout();
  const entry = data.entries.find((e) => e.id === data.layout.home?.web);
  location.hash = entry?.webPath ?? "/home";
}
