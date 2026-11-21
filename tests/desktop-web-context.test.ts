import { afterAll, beforeAll, expect, test } from "vitest";
import {
  publicWorkspaceUrl,
  updateDesktopContext,
  workspaceIdentityOrigin,
} from "../apps/web/src/shared/desktop-context.js";
import { workspaceDocumentId } from "../apps/web/src/features/documents/internal-document-id.js";

const documentId = "03de5763-cbc4-4027-968e-727cbd18cdd8";
const previousLocation = Object.getOwnPropertyDescriptor(globalThis, "location");

beforeAll(() => {
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin: "http://127.0.0.1:43111", pathname: "/" },
  });
});

afterAll(() => {
  if (previousLocation) Object.defineProperty(globalThis, "location", previousLocation);
  else Reflect.deleteProperty(globalThis, "location");
});

test("remote desktop uses the selected service's public identity for document links", () => {
  updateDesktopContext(new Headers({
    "X-Doca-Desktop-Mode": "remote",
    "X-Doca-Desktop-Origin": "https://team.example.com",
  }));
  expect(workspaceIdentityOrigin()).toBe("https://team.example.com");
  expect(publicWorkspaceUrl(`/#/r/${documentId}`)).toBe(`https://team.example.com/#/r/${documentId}`);
  expect(workspaceDocumentId(`https://team.example.com/#/r/${documentId}`)).toBe(documentId);
  expect(workspaceDocumentId(`https://other.example.com/#/r/${documentId}`)).toBeNull();

  updateDesktopContext(new Headers());
  expect(workspaceIdentityOrigin()).toBe("http://127.0.0.1:43111");
  expect(workspaceDocumentId(`https://team.example.com/#/r/${documentId}`)).toBeNull();
  expect(workspaceDocumentId(`http://127.0.0.1:43111/#/r/${documentId}`)).toBe(documentId);
});
