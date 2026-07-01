import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
    getGetAnthropicConversationQueryKey, 
    getListAnthropicConversationsQueryKey, 
    getListAnthropicMessagesQueryKey 
} from "@workspace/api-client-react";

export function useStream() {
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamedContent, setStreamedContent] = useState("");
    const [streamError, setStreamError] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const streamMessage = useCallback(async (conversationId: number, data: { content: string, mode: "fix"|"edit"|"generate"|"translate"|"explain"|"document"|"test", code?: string, language?: string, image?: string, imageMediaType?: string, sourceUrl?: string }) => {
        setIsStreaming(true);
        setStreamedContent("");
        setStreamError(null);

        try {
            const res = await fetch(`${import.meta.env.BASE_URL}api/anthropic/conversations/${conversationId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok || !res.body) {
                throw new Error("The request failed. Please try again.");
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let finished = false;

            while (!finished) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split(/\r?\n\r?\n/);
                buffer = events.pop() || "";

                for (const event of events) {
                    const dataLines = event
                        .split(/\r?\n/)
                        .filter((l) => l.startsWith("data:"))
                        .map((l) => l.slice(5).replace(/^ /, ""));
                    if (dataLines.length === 0) continue;
                    const jsonStr = dataLines.join("\n");
                    try {
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.error) {
                            setStreamError(String(parsed.error));
                            finished = true;
                            break;
                        }
                        if (parsed.done) {
                            finished = true;
                            break;
                        }
                        if (parsed.content) {
                            setStreamedContent((prev) => prev + parsed.content);
                        }
                    } catch {
                        // ignore malformed frame
                    }
                }
            }
        } catch (err) {
            setStreamError(err instanceof Error ? err.message : "The request failed. Please try again.");
        } finally {
            setIsStreaming(false);
            queryClient.invalidateQueries({ queryKey: getGetAnthropicConversationQueryKey(conversationId) });
            queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListAnthropicMessagesQueryKey(conversationId) });
        }
    }, [queryClient]);

    return { streamMessage, isStreaming, streamedContent, setStreamedContent, streamError, setStreamError };
}
