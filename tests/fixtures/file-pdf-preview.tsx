import { createRoot } from "react-dom/client";
import { OpenFileViewerPreview } from "@web/features/files/open-file-viewer-preview.js";
import { LocaleProvider } from "@web/shared/i18n.js";

createRoot(document.getElementById("root")!).render(
  <LocaleProvider initialLocale="en">
    <div style={{ width: 480, height: 640 }}>
      <OpenFileViewerPreview
        file={{ url: "/api/v1/files/items/preview/content", name: "fixture.pdf", mime: "application/pdf" }}
      />
    </div>
  </LocaleProvider>,
);
