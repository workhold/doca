import { useCanvasRichExtensions } from "./canvas-rich-extensions.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUserId } from "@web/shared/components/user-mention.js";
import { useI18n } from "@web/shared/i18n.js";
import * as Y from "yjs";
import { PresentationWorkspace } from "@smartdoca/slides";
import "@smartdoca/slides/styles.css";
import { CanvasEditor } from "@smartdoca/canvas";
import { CanvasModel } from "@smartdoca/canvas/model";
import {
  SpreadsheetEditor,
  type SpreadsheetEditorHandle,
} from "@smartdoca/sheet";
import {
  restoreExlsxDocument,
  createExlsxCollaborationSession,
  type ExlsxCollaborationSession,
} from "@smartdoca/sheet/yjs";
import { fromBase64 } from "@web/features/documents/realtime.js";
import { assetUrl } from "@web/shared/api.js";
import { Feedback } from "@web/shared/components/feedback.js";
import { useAttachmentPreview } from "./attachment-preview.js";
import { canvasImageGallery } from "./canvas-image-gallery.js";
import "@smartdoca/canvas/style.css";
import "@smartdoca/sheet/style.css";
import "@web/features/documents/surface.css";
export type SurfacePreviewData = {
  format: string;
  epochId: string;
  baseline?: any;
  update: string;
};
export default function SurfacePreview({
  id,
  surface,
  trash = false,
  audit = false,
}: {
  id: string;
  surface: SurfacePreviewData;
  trash?: boolean;
  audit?: boolean;
}) {
  const { t, locale } = useI18n();
  const currentUserId = useCurrentUserId();
  const richTextExtensions = useCanvasRichExtensions();
  const sheetHandle = useRef<SpreadsheetEditorHandle | null>(null);
  const sheetReady = useCallback((handle: SpreadsheetEditorHandle) => {
    sheetHandle.current = handle;
  }, []);
  const [model, setModel] = useState<
      CanvasModel | ExlsxCollaborationSession | Y.Doc | null
    >(null),
    [error, setError] = useState("");
  const attachmentPreview = useAttachmentPreview({
    trash,
    audit,
    imageResources: () =>
      model instanceof CanvasModel
        ? canvasImageGallery(model.getValue().scene)
        : [],
    sheetImages: () => sheetHandle.current?.getImageGallery() ?? [],
  });
  useEffect(() => {
    let disposed = false,
      cleanup = () => {};
    void (async () => {
      const update = fromBase64(surface.update);
      if (surface.format === "presentation") {
        const doc = new Y.Doc();
        Y.applyUpdate(doc, update);
        cleanup = () => doc.destroy();
        if (!disposed) setModel(doc);
      } else if (surface.format === "canvas") {
        const m = CanvasModel.restore({
          codec: "aidcanvas-yjs",
          schemaVersion: 1,
          epochId: surface.epochId,
          update,
        });
        m.setReadOnly(true);
        cleanup = () => m.dispose();
        if (!disposed) setModel(m);
      } else {
        const doc = await restoreExlsxDocument({
          baseline: surface.baseline,
          update,
          checkpointSeq: 0,
        });
        const session = await createExlsxCollaborationSession({
          doc,
          baseline: surface.baseline,
          sessionId: crypto.randomUUID(),
          readOnly: true,
        });
        cleanup = () => {
          session.dispose();
          doc.destroy();
        };
        if (!disposed) setModel(session);
      }
      if (disposed) cleanup();
    })().catch((e) => {
      if (!disposed) setError(e.message);
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [surface]);
  const resolve = (id: string) =>
    /^[a-f0-9-]{36}$/.test(id)
      ? assetUrl(id) + (audit ? "?audit=1" : trash ? "?trashPreview=1" : "")
      : "";
  return (
    <div className="surface-editor" style={{ height: "65vh" }}>
      {attachmentPreview.dialog}
      <Feedback message={error} tone="error" />
      {model instanceof Y.Doc ? (
        <PresentationWorkspace
          locale={locale}
          document={model}
          onImagePreview={attachmentPreview.onSlidesImagePreview}
          readOnly
          chrome="embedded"
          resources={{
            resolveUrl: resolve,
            uploadImage: async () => {
              throw Error("只读预览不能上传");
            },
          }}
        />
      ) : model instanceof CanvasModel ? (
        <CanvasEditor
          locale={locale}
          model={model}
          hostManaged
          mode="readonly"
          showHeader={false}
          richTextExtensions={richTextExtensions}
          className="doca-canvas"
          resources={{
            resolveUrl: resolve,
            resolveDownloadUrl: (path) => {
              const url = resolve(path);
              return url ? `${url}${trash || audit ? "&" : "?"}download=1` : "";
            },
          }}
          onResourcePreview={attachmentPreview.onCanvasResourcePreview}
          onAttachmentPreview={attachmentPreview.onCanvasAttachmentPreview}
        />
      ) : model ? (
        <SpreadsheetEditor
          locale={locale}
          currentUserId={currentUserId}
          onAttachmentPreview={attachmentPreview.onSheetAttachmentPreview}
          onImagePreview={attachmentPreview.onSheetImagePreview}
          onReady={sheetReady}
          onError={(error) => setError(error.message)}
          workbookId={id}
          collaboration={model}
          readOnly
          showHeader={false}
          showSaveState={false}
          autoSave={false}
          resourceAdapter={{
            upload: async () => {
              throw Error("只读预览不能上传");
            },
            resolve: async (r) => resolve(r.id),
          }}
          style={{ height: "100%", minHeight: 0 }}
        />
      ) : (
        <p>{t("trash.loadingPreview")}</p>
      )}
    </div>
  );
}
