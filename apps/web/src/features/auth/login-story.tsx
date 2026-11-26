import { useEffect, useState } from "react";
import {
  Check,
  FileText,
  Lightbulb,
  MousePointer2,
  Pencil,
  Table2,
  Workflow,
} from "lucide-react";
import { useI18n } from "@web/shared/i18n.js";
import "./login-story.css";

const editors = [
  { id: "document", timings: [520, 1160, 1500] },
  { id: "spreadsheet", timings: [800, 950, 1650] },
  { id: "canvas", timings: [630, 980, 2050] },
] as const;

const staticDemoQuery = "(prefers-reduced-motion: reduce), (max-width: 760px)";
const finished = 2;

function DocumentDemo({ step, moving }: { step: number; moving: boolean }) {
  const { t } = useI18n();
  const review = t("login.demo.reviewNotes");
  const [characters, setCharacters] = useState(0);

  useEffect(() => {
    if (step === 0) setCharacters(0);
    if (step !== 1 || !moving || characters >= review.length) return;
    const timer = window.setTimeout(
      () => setCharacters((count) => count + 1),
      740 / review.length,
    );
    return () => window.clearTimeout(timer);
  }, [step, moving, characters, review.length]);

  return (
    <div className="login-demo-document">
      <div className="login-demo-file">
        <FileText />
        {t("login.demo.brief")}
      </div>
      <h2>{t("login.demo.checklist")}</h2>
      <p>{t("login.demo.intro")}</p>
      <div className="login-demo-checklist">
        <div className="login-demo-task">
          <span className="login-demo-checkbox" data-complete="true">
            <Check />
          </span>
          {t("login.demo.feedback")}
        </div>
        <div className="login-demo-task" data-editing={step < finished}>
          <span
            className="login-demo-checkbox"
            data-complete={step === finished}
          >
            <Check />
          </span>
          <span>
            {step === finished
              ? review
              : step === 1
                ? review.slice(0, characters)
                : ""}
            {step < finished && <i className="login-demo-caret" />}
          </span>
        </div>
      </div>
    </div>
  );
}

function SpreadsheetDemo({ step }: { step: number }) {
  const { t } = useI18n();
  const committed = step === finished;
  const editing = step === 1;
  const initialHours = 2;
  const editedHours = 4;
  const reviewHours = committed ? editedHours : initialHours;
  const rows = [
    { task: t("login.demo.research"), hours: 3 },
    { task: t("login.demo.design"), hours: 5 },
    { task: t("login.demo.review"), hours: reviewHours },
  ];
  const total = rows.reduce((sum, row) => sum + row.hours, 0);
  const cell = committed ? "B5" : "B4";
  const formula = committed
    ? "=SUM(B2:B4)"
    : editing
      ? editedHours
      : reviewHours;

  return (
    <div className="login-demo-spreadsheet">
      <div className="login-demo-file">
        <Table2 />
        {t("login.demo.hoursTitle")}
      </div>
      <div className="login-demo-formula">
        <span>{cell}</span>
        <i>ƒx</i>
        <code>{formula}</code>
      </div>
      <table className="login-demo-grid">
        <colgroup>
          <col className="login-demo-row-index" />
          <col />
          <col className="login-demo-hours-column" />
        </colgroup>
        <thead>
          <tr>
            <td />
            <th scope="col">A</th>
            <th scope="col" data-active="true">
              B
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="login-demo-grid-heading">
            <th scope="row">1</th>
            <td>{t("login.demo.task")}</td>
            <td>{t("login.demo.hours")}</td>
          </tr>
          {rows.map(({ task, hours }, index) => {
            const address = "B" + (index + 2);
            const selected = address === cell;
            const draft = selected && editing;
            return (
              <tr key={address}>
                <th scope="row" data-active={selected}>
                  {index + 2}
                </th>
                <td>{task}</td>
                <td data-cell={address} data-selected={selected}>
                  {draft ? editedHours : hours}
                  {draft && <i className="login-demo-caret" />}
                </td>
              </tr>
            );
          })}
          <tr className="login-demo-total">
            <th scope="row" data-active={committed}>
              5
            </th>
            <td>{t("login.demo.total")}</td>
            <td data-cell="B5" data-selected={committed}>
              <strong key={total}>{total}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CanvasDemo({ step }: { step: number }) {
  const { t } = useI18n();
  return (
    <div className="login-demo-canvas">
      <div className="login-demo-file">
        <Workflow />
        {t("login.demo.canvasTitle")}
      </div>
      <div className="login-demo-nodes">
        <div className="login-demo-node login-demo-node-idea">
          <Lightbulb />
          {t("login.demo.idea")}
        </div>
        <span className="login-demo-edge" />
        <div className="login-demo-node login-demo-node-plan">
          <Pencil />
          {t("login.demo.plan")}
        </div>
        <span className="login-demo-edge" data-drawn={step === finished} />
        <div
          className="login-demo-node login-demo-node-review"
          data-step={step}
        >
          <Check />
          {t("login.demo.review")}
        </div>
      </div>
    </div>
  );
}

export function LoginStory() {
  const { t } = useI18n();
  const [frame, setFrame] = useState({ editor: 0, step: 0 });
  const [staticOnly, setStaticOnly] = useState(
    () =>
      typeof globalThis.matchMedia === "function" &&
      window.matchMedia(staticDemoQuery).matches,
  );
  const active = editors[frame.editor]!;
  const moving = !staticOnly;
  const step = staticOnly ? finished : frame.step;

  useEffect(() => {
    const media = window.matchMedia(staticDemoQuery);
    const update = () => setStaticOnly(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!moving) return;
    const timer = window.setTimeout(() => {
      setFrame(
        frame.step === finished
          ? { editor: (frame.editor + 1) % editors.length, step: 0 }
          : { ...frame, step: frame.step + 1 },
      );
    }, active.timings[frame.step]);
    return () => window.clearTimeout(timer);
  }, [active, frame, moving]);

  return (
    <section className="auth-story">
      <h1>
        {t("login.headline")}
        <br />
        <span>{t("login.headlineRest")}</span>
      </h1>
      <p>
        {t("login.tagline")}
        <br />
        {t("login.taglineRest")}
      </p>
      <div className="login-editor-demo">
        <div
          className="login-demo-stage"
          data-editor={active.id}
          data-step={step}
          data-moving={moving}
          aria-hidden="true"
        >
          <div className="login-demo-route login-demo-route-sheet" />
          <div className="login-demo-route login-demo-route-canvas" />
          <DocumentDemo
            step={active.id === "document" ? step : finished}
            moving={moving}
          />
          <SpreadsheetDemo
            step={active.id === "spreadsheet" ? step : finished}
          />
          <CanvasDemo step={active.id === "canvas" ? step : finished} />
          <span className="login-demo-pointer">
            <MousePointer2 />
          </span>
        </div>
      </div>
    </section>
  );
}
