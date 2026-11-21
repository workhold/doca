import { useMemo } from "react";
import { FileText } from "lucide-react";
import type { CanvasRichTextExtension } from "@smartdoca/canvas";
import { api, type Detail } from "@web/shared/api.js";
import { UserMention } from "@web/shared/components/user-mention.js";
import {
  lookupUsers,
  mentionLabel,
} from "@web/features/comments/rich-comments.js";
import { LocaleScope, useI18n } from "@web/shared/i18n.js";
import { workspaceDocumentId } from "./internal-document-id.js";

type Data = { userId?: string; documentId?: string; label: string };
export function useCanvasRichExtensions() {
  const i18n = useI18n();
  const { t } = i18n;
  return useMemo<CanvasRichTextExtension[]>(
    () => [
      {
        type: "custom:user-mention",
        label: t("comment.mention"),
        inline: true,
        create: (data) => ({
          label: "@" + (data as Data).label.replace(/^@/, ""),
          data: data!,
        }),
        render: ({ element }) => (
          <LocaleScope value={i18n}>
          <UserMention
            id={(element.data as Data).userId!}
            name={element.label}
            className="document-user-mention"
          />
          </LocaleScope>
        ),
        suggestions: {
          trigger: "@",
          search: async (query, { signal }) =>
            (await lookupUsers(query, signal)).map((user) => ({
              id: user.id,
              label: mentionLabel(user),
              data: { userId: user.id, label: mentionLabel(user) },
            })),
        },
      },
      {
        type: "custom:document-reference",
        label: t("workspace.kind.document"),
        inline: true,
        create: (data) => ({ label: (data as Data).label, data: data! }),
        render: ({ element }) => (
          <span className="document-inline-reference">
            <a
              href={`#/r/${(element.data as Data).documentId}`}
              target="_blank"
              rel="noopener noreferrer"
              onMouseDown={(event) => event.preventDefault()}
            >
              <FileText size={15} />
              {element.label}
            </a>
          </span>
        ),
        matchPaste: (text) => !!workspaceDocumentId(text),
        paste: async (text, { signal }) => {
          const id = workspaceDocumentId(text);
          if (!id) return undefined;
          const detail = await api<Detail>(
            `/resources/${id}`,
            "GET",
            undefined,
            signal,
          );
          return detail.resource.kind === "document"
            ? { documentId: id, label: detail.resource.title }
            : undefined;
        },
      },
    ],
    [i18n, t],
  );
}
