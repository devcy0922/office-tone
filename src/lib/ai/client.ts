import { govailChat } from "@/lib/ai/govail";
import { rewriteMessage } from "@/lib/ai/rewrite";
import type { RewriteInput } from "@/lib/ai/types";

export const aiClient = {
  rewriteMessage,
  chat: govailChat,
};

export async function rewriteMessageFacade(input: RewriteInput) {
  return rewriteMessage(input);
}
