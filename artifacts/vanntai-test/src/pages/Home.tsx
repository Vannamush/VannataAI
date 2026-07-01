import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import {
  useListExamples,
  useCreateAnthropicConversation,
  useGetAnthropicConversation,
  useListAnthropicMessages,
  getGetAnthropicConversationQueryKey,
  getListAnthropicMessagesQueryKey,
} from "@workspace/api-client-react";
import { useStream } from "@/hooks/use-stream";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wrench,
  Edit3,
  FileCode2,
  Languages,
  BookOpen,
  FileText,
  FlaskConical,
  Sparkles,
  Send,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";

type Mode =
  | "fix"
  | "edit"
  | "generate"
  | "translate"
  | "explain"
  | "document"
  | "test";

interface ModeSpec {
  key: Mode;
  title: string;
  desc: string;
  icon: React.ReactNode;
  needsCode: boolean;
  promptPlaceholder: string;
  defaultPrompt: string;
}

const MODES: ModeSpec[] = [
  {
    key: "fix",
    title: "Fix Code",
    desc: "Debug & repair",
    icon: <Wrench className="h-4 w-4" />,
    needsCode: true,
    promptPlaceholder: "Describe the bug (optional)...",
    defaultPrompt: "Fix the bugs in this code.",
  },
  {
    key: "edit",
    title: "Edit Code",
    desc: "Refactor or modify",
    icon: <Edit3 className="h-4 w-4" />,
    needsCode: true,
    promptPlaceholder: "Describe the changes you want...",
    defaultPrompt: "Improve this code.",
  },
  {
    key: "generate",
    title: "Generate",
    desc: "Write from scratch",
    icon: <FileCode2 className="h-4 w-4" />,
    needsCode: false,
    promptPlaceholder: "Describe the files you want to generate...",
    defaultPrompt: "",
  },
  {
    key: "translate",
    title: "Translate",
    desc: "Between languages",
    icon: <Languages className="h-4 w-4" />,
    needsCode: true,
    promptPlaceholder: "Any extra notes (optional)...",
    defaultPrompt: "Translate this code.",
  },
  {
    key: "explain",
    title: "Explain",
    desc: "Understand code",
    icon: <BookOpen className="h-4 w-4" />,
    needsCode: true,
    promptPlaceholder: "Anything specific to explain? (optional)",
    defaultPrompt: "Explain what this code does.",
  },
  {
    key: "document",
    title: "Document",
    desc: "Add comments & docs",
    icon: <FileText className="h-4 w-4" />,
    needsCode: true,
    promptPlaceholder: "Doc style notes (optional)...",
    defaultPrompt: "Add documentation and comments to this code.",
  },
  {
    key: "test",
    title: "Tests",
    desc: "Generate unit tests",
    icon: <FlaskConical className="h-4 w-4" />,
    needsCode: true,
    promptPlaceholder: "Framework or cases to cover (optional)...",
    defaultPrompt: "Write unit tests for this code.",
  },
];

const MODE_MAP: Record<Mode, ModeSpec> = MODES.reduce(
  (acc, m) => {
    acc[m.key] = m;
    return acc;
  },
  {} as Record<Mode, ModeSpec>,
);

const TARGET_LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C#",
  "C++",
  "Ruby",
  "PHP",
  "Kotlin",
  "Swift",
];

export function Home() {
  const [match, params] = useRoute("/conversation/:id");
  const activeId = match ? Number(params.id) : null;
  const [, setLocation] = useLocation();

  const [mode, setMode] = useState<Mode>("fix");
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [targetLang, setTargetLang] = useState("Python");

  const { data: examples } = useListExamples();
  const createConv = useCreateAnthropicConversation();
  const { streamMessage, isStreaming, streamedContent, streamError } = useStream();

  const { data: conversation } = useGetAnthropicConversation(activeId!, {
    query: { enabled: !!activeId, queryKey: getGetAnthropicConversationQueryKey(activeId!) },
  });
  const { data: messages, isLoading: isLoadingMessages } = useListAnthropicMessages(activeId!, {
    query: { enabled: !!activeId, queryKey: getListAnthropicMessagesQueryKey(activeId!) },
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, streamedContent]);

  useEffect(() => {
    if (conversation && !isStreaming) {
      setMode(conversation.mode as Mode);
    }
  }, [conversation, isStreaming]);

  const spec = MODE_MAP[mode];

  const buildContent = () => {
    const trimmed = prompt.trim();
    if (mode === "translate") {
      const note = trimmed ? ` ${trimmed}` : "";
      return `Translate this code to ${targetLang}.${note}`;
    }
    return trimmed || spec.defaultPrompt;
  };

  const canSubmitNew = () => {
    if (mode === "generate") return !!prompt.trim();
    if (spec.needsCode) return !!code.trim();
    return !!prompt.trim();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // In an active conversation, follow-ups always use the prompt box.
    if (activeId) {
      if (!prompt.trim()) return;
      const followUp = { content: prompt.trim(), mode };
      setPrompt("");
      await streamMessage(activeId, followUp);
      return;
    }

    if (!canSubmitNew()) return;

    const content = buildContent();
    const requestData = {
      content,
      mode,
      code: spec.needsCode ? code : undefined,
      language: spec.needsCode ? language : undefined,
    };

    const newConv = await createConv.mutateAsync({
      data: {
        title: content.slice(0, 40) + (content.length > 40 ? "..." : ""),
        mode: mode as any,
      },
    });
    const convId = newConv.id;
    setLocation(`/conversation/${convId}`);

    setPrompt("");
    setCode("");

    await streamMessage(convId, requestData);
  };

  const handleExampleClick = (example: any) => {
    setMode(example.mode as Mode);
    setPrompt(example.prompt);
    setCode(example.code || "");
    if (example.language) setLanguage(example.language);
  };

  const isGenerating = createConv.isPending || isStreaming;

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full pt-6 pb-6 px-6 gap-6 relative">
      {!activeId ? (
        <ScrollArea className="flex-1">
          <div className="flex flex-col justify-center max-w-3xl mx-auto w-full py-6">
            <div className="mb-10 text-center space-y-3">
              <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Vanntai Test</h1>
              <p className="text-lg text-muted-foreground">
                Fix, edit, translate, explain, document, test, and generate code.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {MODES.map((m) => (
                <ModeButton
                  key={m.key}
                  active={mode === m.key}
                  onClick={() => setMode(m.key)}
                  icon={m.icon}
                  title={m.title}
                  desc={m.desc}
                />
              ))}
            </div>

            <div className="bg-card border shadow-sm rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-shadow">
              <div className="p-4 flex flex-col gap-4">
                {spec.needsCode && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Source Code
                      </Label>
                      <div className="flex items-center gap-2">
                        {mode === "translate" && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">to</span>
                            <select
                              value={targetLang}
                              onChange={(e) => setTargetLang(e.target.value)}
                              className="h-7 rounded-md border bg-background text-xs px-2"
                            >
                              {TARGET_LANGUAGES.map((l) => (
                                <option key={l} value={l}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <Input
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          placeholder="Language"
                          className="h-7 w-32 text-xs"
                        />
                      </div>
                    </div>
                    <Textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Paste your code here..."
                      className="min-h-[120px] font-mono text-sm resize-none bg-muted/30 border-0 focus-visible:ring-0 p-3"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Instructions
                  </Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={spec.promptPlaceholder}
                    className="min-h-[80px] text-base resize-none border-0 focus-visible:ring-0 p-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="bg-muted/30 border-t p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground hidden sm:inline-block">
                  Press{" "}
                  <kbd className="font-mono bg-background border px-1.5 py-0.5 rounded text-[10px]">
                    Cmd ↵
                  </kbd>{" "}
                  to submit
                </span>
                <Button
                  onClick={handleSubmit}
                  disabled={isGenerating || !canSubmitNew()}
                  size="sm"
                  className="gap-2 px-6"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isGenerating ? "Processing..." : "Run"}
                </Button>
              </div>
            </div>

            {examples && examples.filter((e) => e.mode === mode).length > 0 && (
              <div className="mt-8">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">
                  Try an example
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {examples
                    .filter((e) => e.mode === mode)
                    .slice(0, 3)
                    .map((ex) => (
                      <Button
                        key={ex.id}
                        variant="outline"
                        size="sm"
                        className="bg-background hover:bg-muted text-xs h-auto py-2 px-3 justify-start text-left max-w-[220px]"
                        onClick={() => handleExampleClick(ex)}
                      >
                        <span className="truncate">{ex.title}</span>
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-card border rounded-xl shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b bg-muted/20">
            <div className="p-2 bg-primary/10 rounded-md text-primary">{spec.icon}</div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate">{conversation?.title || "Loading..."}</h2>
              <p className="text-xs text-muted-foreground">{spec.title} Mode</p>
            </div>
          </div>

          {/* Chat Area */}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-6 max-w-3xl mx-auto pb-4">
              {isLoadingMessages ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-3/4" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-5 py-4 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted/50 rounded-tl-sm w-full"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <div className="text-[15px] whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <Markdown content={msg.content} />
                      )}
                    </div>
                  </div>
                ))
              )}

              {isStreaming && (
                <div className="flex flex-col items-start gap-2">
                  <div className="max-w-[90%] w-full rounded-2xl rounded-tl-sm px-5 py-4 bg-muted/50">
                    {streamedContent ? (
                      <Markdown content={streamedContent} />
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Generating response...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {streamError && !isStreaming && (
                <div className="flex flex-col items-start gap-2">
                  <div className="max-w-[90%] w-full rounded-2xl rounded-tl-sm px-5 py-4 border border-destructive/40 bg-destructive/10 text-destructive text-sm">
                    {streamError}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-background">
            <div className="max-w-3xl mx-auto flex gap-3">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Follow up..."
                className="min-h-[44px] max-h-[200px] resize-y py-3 text-sm focus-visible:ring-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button
                onClick={handleSubmit}
                disabled={isGenerating || !prompt.trim()}
                size="icon"
                className="h-[44px] w-[44px] shrink-0 rounded-xl"
              >
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-start p-4 rounded-xl border text-left transition-all
        ${
          active
            ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-sm"
            : "bg-card hover:bg-accent hover:border-accent-foreground/20"
        }
      `}
    >
      <div
        className={`p-2 rounded-lg mb-3 ${
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {icon}
      </div>
      <span className={`font-semibold text-sm mb-1 ${active ? "text-foreground" : "text-muted-foreground"}`}>
        {title}
      </span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  );
}
