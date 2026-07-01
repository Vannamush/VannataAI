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
  ArrowLeftRight,
} from "lucide-react";
import { useLocation } from "wouter";

type Mode =
  | "fix"
  | "edit"
  | "generate"
  | "convert"
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
  showCodeLang: boolean;
  showHumanLang: boolean;
  showInstructions: boolean;
  sourceLabel: string;
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
    showCodeLang: true,
    showHumanLang: false,
    showInstructions: true,
    sourceLabel: "Source Code",
    promptPlaceholder: "Describe the bug (optional)...",
    defaultPrompt: "Fix the bugs in this code.",
  },
  {
    key: "edit",
    title: "Edit Code",
    desc: "Refactor or modify",
    icon: <Edit3 className="h-4 w-4" />,
    needsCode: true,
    showCodeLang: true,
    showHumanLang: false,
    showInstructions: true,
    sourceLabel: "Source Code",
    promptPlaceholder: "Describe the changes you want...",
    defaultPrompt: "Improve this code.",
  },
  {
    key: "generate",
    title: "Generate",
    desc: "Write from scratch",
    icon: <FileCode2 className="h-4 w-4" />,
    needsCode: false,
    showCodeLang: false,
    showHumanLang: false,
    showInstructions: true,
    sourceLabel: "Source Code",
    promptPlaceholder: "Describe the files you want to generate...",
    defaultPrompt: "",
  },
  {
    key: "convert",
    title: "Convert",
    desc: "To another language",
    icon: <ArrowLeftRight className="h-4 w-4" />,
    needsCode: true,
    showCodeLang: true,
    showHumanLang: false,
    showInstructions: true,
    sourceLabel: "Source Code",
    promptPlaceholder: "Any conversion notes (optional)...",
    defaultPrompt: "Convert this code.",
  },
  {
    key: "translate",
    title: "Translate",
    desc: "Between spoken languages",
    icon: <Languages className="h-4 w-4" />,
    needsCode: true,
    showCodeLang: false,
    showHumanLang: true,
    showInstructions: false,
    sourceLabel: "Text",
    promptPlaceholder: "",
    defaultPrompt: "Translate this input.",
  },
  {
    key: "explain",
    title: "Explain",
    desc: "Understand code",
    icon: <BookOpen className="h-4 w-4" />,
    needsCode: true,
    showCodeLang: true,
    showHumanLang: true,
    showInstructions: true,
    sourceLabel: "Source Code",
    promptPlaceholder: "Anything specific to explain? (optional)",
    defaultPrompt: "Explain what this code does.",
  },
  {
    key: "document",
    title: "Document",
    desc: "Add comments & docs",
    icon: <FileText className="h-4 w-4" />,
    needsCode: true,
    showCodeLang: true,
    showHumanLang: false,
    showInstructions: true,
    sourceLabel: "Source Code",
    promptPlaceholder: "Doc style notes (optional)...",
    defaultPrompt: "Add documentation and comments to this code.",
  },
  {
    key: "test",
    title: "Tests",
    desc: "Generate unit tests",
    icon: <FlaskConical className="h-4 w-4" />,
    needsCode: true,
    showCodeLang: true,
    showHumanLang: false,
    showInstructions: true,
    sourceLabel: "Source Code",
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

const HUMAN_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Chinese (Simplified)",
  "Japanese",
  "Korean",
  "Hindi",
  "Arabic",
  "Russian",
];

const CODE_LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "sql",
  "html",
  "css",
  "bash",
];

export function Home() {
  const [match, params] = useRoute("/conversation/:id");
  const activeId = match ? Number(params.id) : null;
  const [, setLocation] = useLocation();

  const [mode, setMode] = useState<Mode>("fix");
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [targetLang, setTargetLang] = useState("javascript");
  const [humanLang, setHumanLang] = useState("Spanish");
  const [fromLang, setFromLang] = useState("Auto-detect");
  const [explainLangKind, setExplainLangKind] = useState<"human" | "code">("human");
  const [translateSource, setTranslateSource] = useState<
    "text" | "file" | "image" | "website"
  >("text");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageData, setImageData] = useState("");
  const [imageMediaType, setImageMediaType] = useState("");
  const [imageName, setImageName] = useState("");
  const [fileName, setFileName] = useState("");

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
      const from = fromLang !== "Auto-detect" ? ` from ${fromLang}` : "";
      if (translateSource === "image") {
        return `Read the text in this image and translate it${from} into ${humanLang}.`;
      }
      if (translateSource === "website") {
        return `Translate the text from this website${from} into ${humanLang}.`;
      }
      return `Translate the following${from} into ${humanLang}.`;
    }
    if (mode === "convert") {
      const note = trimmed ? ` ${trimmed}` : "";
      return `Convert the following code from ${language} to ${targetLang}.${note}`;
    }
    if (mode === "explain") {
      const base = trimmed || spec.defaultPrompt;
      if (explainLangKind === "human") {
        return `${base} Respond in ${humanLang} and break down what each part means.`;
      }
      return `${base} Break down what each part means.`;
    }
    return trimmed || spec.defaultPrompt;
  };

  const canSubmitNew = () => {
    if (mode === "generate") return !!prompt.trim();
    if (mode === "translate") {
      if (translateSource === "image") return !!imageData;
      if (translateSource === "website") return !!sourceUrl.trim();
      return !!code.trim();
    }
    if (spec.needsCode) return !!code.trim();
    return !!prompt.trim();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // In an active conversation, follow-ups always use the prompt box.
    if (activeId) {
      if (!prompt.trim()) return;
      const trimmed = prompt.trim();
      let content = trimmed;
      if (mode === "translate") {
        const from = fromLang !== "Auto-detect" ? ` from ${fromLang}` : "";
        content = `Translate the following${from} into ${humanLang}. ${trimmed}`;
      } else if (mode === "convert") {
        content = `Convert the following code from ${language} to ${targetLang}. ${trimmed}`;
      } else if (mode === "explain") {
        content =
          explainLangKind === "human"
            ? `${trimmed} Respond in ${humanLang} and break down what each part means.`
            : `${trimmed} Break down what each part means.`;
      }
      const followUp = { content, mode };
      setPrompt("");
      await streamMessage(activeId, followUp);
      return;
    }

    if (!canSubmitNew()) return;

    const content = buildContent();
    const isImage = mode === "translate" && translateSource === "image";
    const isWebsite = mode === "translate" && translateSource === "website";
    const includeCode = spec.needsCode && !isImage && !isWebsite;
    const includeCodeLang =
      spec.showCodeLang || (mode === "explain" && explainLangKind === "code");

    const requestData = {
      content,
      mode,
      code: includeCode ? code : undefined,
      language: includeCodeLang ? language : undefined,
      image: isImage ? imageData : undefined,
      imageMediaType: isImage ? imageMediaType : undefined,
      sourceUrl: isWebsite ? sourceUrl.trim() : undefined,
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
    if (example.mode === "translate") setTranslateSource("text");
    if (example.language) setLanguage(example.language);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      setImageData(comma >= 0 ? result.slice(comma + 1) : result);
      setImageMediaType(file.type || "image/png");
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCode(String(reader.result || ""));
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const TRANSLATE_SOURCES: { key: typeof translateSource; label: string }[] = [
    { key: "text", label: "Text / Code" },
    { key: "file", label: "Text file" },
    { key: "image", label: "Image" },
    { key: "website", label: "Website" },
  ];

  const isGenerating = createConv.isPending || isStreaming;

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full pt-4 pb-4 px-3 sm:pt-6 sm:pb-6 sm:px-6 gap-4 sm:gap-6 relative">
      {!activeId ? (
        <ScrollArea className="flex-1">
          <div className="flex flex-col justify-center max-w-3xl mx-auto w-full py-6">
            <div className="mb-10 text-center space-y-3">
              <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Vanntai Test</h1>
              <p className="text-lg text-muted-foreground">
                Fix, edit, generate, convert, explain, document, and test code, plus translate between spoken languages.
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
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {spec.sourceLabel}
                      </Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {mode === "explain" && (
                          <div className="flex items-center rounded-md border overflow-hidden text-xs">
                            <button
                              type="button"
                              onClick={() => setExplainLangKind("human")}
                              className={`px-2.5 py-1 transition-colors ${explainLangKind === "human" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                            >
                              Spoken
                            </button>
                            <button
                              type="button"
                              onClick={() => setExplainLangKind("code")}
                              className={`px-2.5 py-1 transition-colors ${explainLangKind === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                            >
                              Code
                            </button>
                          </div>
                        )}
                        {mode === "translate" && (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">from</span>
                              <select
                                value={fromLang}
                                onChange={(e) => setFromLang(e.target.value)}
                                className="h-7 rounded-md border bg-background text-xs px-2"
                              >
                                <option value="Auto-detect">Auto-detect</option>
                                {HUMAN_LANGUAGES.map((l) => (
                                  <option key={l} value={l}>
                                    {l}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">to</span>
                              <select
                                value={humanLang}
                                onChange={(e) => setHumanLang(e.target.value)}
                                className="h-7 rounded-md border bg-background text-xs px-2"
                              >
                                {HUMAN_LANGUAGES.map((l) => (
                                  <option key={l} value={l}>
                                    {l}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                        {mode === "explain" && explainLangKind === "human" && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">in</span>
                            <select
                              value={humanLang}
                              onChange={(e) => setHumanLang(e.target.value)}
                              className="h-7 rounded-md border bg-background text-xs px-2"
                            >
                              {HUMAN_LANGUAGES.map((l) => (
                                <option key={l} value={l}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {((mode !== "explain" && mode !== "translate" && spec.showCodeLang) ||
                          (mode === "explain" && explainLangKind === "code")) && (
                          <div className="flex items-center gap-1">
                            {mode === "convert" && (
                              <span className="text-xs text-muted-foreground">from</span>
                            )}
                            <select
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              className="h-7 rounded-md border bg-background text-xs px-2"
                            >
                              {CODE_LANGUAGES.map((l) => (
                                <option key={l} value={l}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {mode === "convert" && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">to</span>
                            <select
                              value={targetLang}
                              onChange={(e) => setTargetLang(e.target.value)}
                              className="h-7 rounded-md border bg-background text-xs px-2"
                            >
                              {CODE_LANGUAGES.map((l) => (
                                <option key={l} value={l}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {mode === "translate" && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {TRANSLATE_SOURCES.map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => setTranslateSource(s.key)}
                            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${translateSource === s.key ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:bg-muted"}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {mode === "translate" && translateSource === "image" ? (
                      <div className="space-y-2">
                        <label className="flex flex-col items-center justify-center gap-2 min-h-[120px] rounded-md border-2 border-dashed bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors p-4">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                          {imageData ? (
                            <img
                              src={`data:${imageMediaType};base64,${imageData}`}
                              alt={imageName}
                              className="max-h-40 rounded-md object-contain"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Click to upload an image
                            </span>
                          )}
                        </label>
                        {imageName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {imageName}
                          </p>
                        )}
                      </div>
                    ) : mode === "translate" && translateSource === "website" ? (
                      <Input
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="text-sm"
                      />
                    ) : mode === "translate" && translateSource === "file" ? (
                      <div className="space-y-2">
                        <label className="flex items-center justify-center gap-2 min-h-[52px] rounded-md border-2 border-dashed bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors p-3 text-sm text-muted-foreground">
                          <input
                            type="file"
                            accept=".txt,.md,.csv,.json,.log,text/*"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                          {fileName ? `Loaded: ${fileName}` : "Click to upload a text file"}
                        </label>
                        {code && (
                          <Textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="min-h-[100px] font-mono text-sm resize-none bg-muted/30 border-0 focus-visible:ring-0 p-3"
                          />
                        )}
                      </div>
                    ) : (
                      <Textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={
                          mode === "translate"
                            ? "Paste text to translate..."
                            : "Paste your code here..."
                        }
                        className="min-h-[120px] font-mono text-sm resize-none bg-muted/30 border-0 focus-visible:ring-0 p-3"
                      />
                    )}
                  </div>
                )}

                {spec.showInstructions && (
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
                )}
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
          <ScrollArea className="flex-1 p-3 sm:p-6" ref={scrollRef}>
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
