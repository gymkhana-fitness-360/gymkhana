import { handleAssistantChat } from "@/lib/assistant/service";

export const runtime = "nodejs";
export const maxDuration = 30;

export const POST = handleAssistantChat;
