import type { Actor } from "@core/modules/identity/passwords.js";

export type AssistantSkill = {
  id: string;
  name: string;
  description: string;
  content: string;
  formats: string[];
};
export type ExternalToolOptions = {
  actor: Actor;
  catalogOnly?: boolean;
  authorize: (toolId: string) => Promise<void>;
  allowsTool: (toolId: string) => boolean;
  allowsSkill: (skillId: string) => boolean;
};
export type AssistantToolRuntime = {
  tools: {
    id: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }[];
  skills: AssistantSkill[];
  call: (
    toolId: string,
    input: Record<string, unknown>,
    requestId: string,
  ) => Promise<{
    output: unknown;
    modelOutput: any;
    delivered: () => void;
    aborted: () => void;
  }>;
};
