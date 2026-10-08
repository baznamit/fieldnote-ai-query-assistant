import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FileText,
  Leaf,
  Loader2,
  LockKeyhole,
  MessageSquare,
  Plus,
  RotateCcw,
  ShieldCheck,
  Square,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { querySchema, QUERY_LIMIT, type QueryResult } from "@/lib/query-schema";
import { startTestSession, submitQuery } from "@/lib/query.functions";
import loopImage from "@/assets/fieldnote-loop.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fieldnote — A little clarity, on demand" },
      {
        name: "description",
        content:
          "A focused AI query workspace. Ask a question, explore an idea, and get a thoughtful answer.",
      },
      { property: "og:title", content: "Fieldnote — Your query workspace" },
      {
        property: "og:description",
        content: "A quiet place for questions and thoughtful AI-powered answers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QueryWorkspace,
});

const prompts = [
  {
    icon: Code2,
    title: "Understand something",
    text: "Explain JWT authentication with a simple example.",
  },
  {
    icon: Leaf,
    title: "Explore an idea",
    text: "How can AI make outdoor equipment more sustainable?",
  },
  {
    icon: FileText,
    title: "Make a plan",
    text: "Outline a practical AWS deployment for a small web app.",
  },
];
type Entry = { id: string; query: string; result: QueryResult };

function Brand() {
  return (
    <div className="wordmark">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      fieldnote<span className="text-warm text-xl">.</span>
    </div>
  );
}

function QueryWorkspace() {
  const startSession = useServerFn(startTestSession);
  const ask = useServerFn(submitQuery);
  const [token, setToken] = useState<string>();
  const [sessionError, setSessionError] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [active, setActive] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const controller = useRef<AbortController | null>(null);
  const activeEntry = entries.find((entry) => entry.id === active);

  useEffect(() => {
    let mounted = true;
    startSession()
      .then(({ token }) => {
        if (mounted) setToken(token);
      })
      .catch(() => {
        if (mounted) setSessionError("Could not start a secure session.");
      });
    textarea.current?.focus();
    return () => {
      mounted = false;
      controller.current?.abort();
    };
  }, [startSession]);

  async function renewSession() {
    setSessionError("");
    try {
      setToken((await startSession()).token);
    } catch {
      setSessionError("Could not start a secure session.");
    }
  }

  function clearQuery() {
    controller.current?.abort();
    setPending(false);
    setActive(undefined);
    setInput("");
    setError("");
    textarea.current?.focus();
  }

  async function sendQuery() {
    if (pending || !token) return;
    const parsed = querySchema.safeParse({ query: input });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid question.");
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setPending(true);
    setError("");
    setActive(undefined);
    try {
      const response = await ask({
        data: parsed.data,
        headers: { Authorization: `Bearer ${token}` },
        signal: abort.signal,
      });
      if (abort.signal.aborted) return;
      if (!response.ok) {
        setError(response.error);
        if (response.status === 401) {
          setToken(undefined);
          setSessionError("Your session has expired.");
        }
        return;
      }
      const entry = { id: crypto.randomUUID(), query: parsed.data.query, result: response.result };
      setEntries((previous) => [entry, ...previous]);
      setActive(entry.id);
    } catch {
      if (!abort.signal.aborted) setError("The connection was interrupted. Please try again.");
    } finally {
      if (controller.current === abort) {
        setPending(false);
        controller.current = null;
        textarea.current?.focus();
      }
    }
  }

  function stopQuery() {
    controller.current?.abort();
    setPending(false);
    setError("Request stopped. Your question is still here.");
    textarea.current?.focus();
  }

  async function copyAnswer() {
    if (!activeEntry) return;
    try {
      await navigator.clipboard.writeText(activeEntry.result.answer);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access is unavailable in this browser.");
    }
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <div className="mt-2 pl-9 text-[11px] text-muted-foreground">
          A little clarity, on demand.
        </div>
        <Button
          variant="outline"
          className="mt-9 w-full justify-between h-10 bg-card"
          onClick={clearQuery}
        >
          <span className="flex items-center gap-2">
            <Plus />
            New query
          </span>
          <span className="text-xs text-muted-foreground">↗</span>
        </Button>
        <div className="mt-9 flex justify-between items-center px-2">
          <span className="eyebrow">This session</span>
          <span className="text-xs text-muted-foreground">
            {entries.length.toString().padStart(2, "0")}
          </span>
        </div>
        <div className="mt-3 space-y-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              Your questions will appear here.
            </div>
          ) : (
            entries.map((entry) => (
              <Button
                variant="ghost"
                key={entry.id}
                className="history-row"
                data-active={active === entry.id}
                onClick={() => {
                  setActive(entry.id);
                  setInput(entry.query);
                  setError("");
                  textarea.current?.focus();
                }}
              >
                <MessageSquare />
                <span>{entry.query}</span>
              </Button>
            ))
          )}
        </div>
        <div className="session-panel">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="size-4 text-primary" />
            <span>{token ? "Secure test session" : "Session unavailable"}</span>
            <span className="ml-auto status-dot" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            Session only. A fresh start when you leave.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <div className="size-8 bg-accent text-primary rounded-full flex items-center justify-center text-xs font-medium">
              D
            </div>
            <div>
              <div className="text-xs font-medium">Demo workspace</div>
              <div className="text-[10px] text-muted-foreground mt-1">Personal session</div>
            </div>
            <LockKeyhole className="ml-auto size-3.5 text-muted-foreground" />
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="workspace-header">
          <div className="desktop-header flex items-center gap-3">
            <span className="text-muted-foreground text-xs">Workspace</span>
            <span className="text-border">/</span>
            <span className="text-xs font-medium">Query assistant</span>
          </div>
          <div className="mobile-wordmark">
            <Brand />
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="status-dot" />
              {token ? "Session active" : "Connecting"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInfo(!info)}
              aria-expanded={info}
              className="gap-3"
            >
              AI-powered
              <ChevronDown className="size-3" />
            </Button>
          </div>
        </header>
        <main className="main-content">
          {info && (
            <div className="mb-6 border-b border-border pb-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Fieldnote · Query assistant</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Independent questions. AI can make mistakes; check important details. This
                  exercise uses a one-hour test JWT, not a personal account.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close details"
                onClick={() => setInfo(false)}
              >
                <X />
              </Button>
            </div>
          )}
          {!activeEntry && !pending && (
            <section className="intro">
              <img
                src={loopImage}
                alt="A sculptural loop of brushed metal and forest green"
                width={1024}
                height={1024}
                className="loop-image"
              />
              <span className="eyebrow mt-2">A space to think things through</span>
              <h1>What’s on your mind?</h1>
              <p>
                A question, a half-formed idea, a tricky problem.
                <br />
                Let’s find a little clarity.
              </p>
            </section>
          )}
          {(activeEntry || pending) && (
            <div className="mb-5">
              <span className="eyebrow">Your workspace</span>
              <h1 className="text-2xl font-medium mt-3">One question. A clearer perspective.</h1>
              <Button onClick={clearQuery} variant="link" className="p-0 h-8 mt-2">
                <Plus />
                New query
              </Button>
            </div>
          )}
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              void sendQuery();
            }}
          >
            <textarea
              ref={textarea}
              aria-label="Your question"
              placeholder="Ask anything. Start with a question…"
              value={input}
              maxLength={QUERY_LIMIT}
              onChange={(event) => {
                setInput(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void sendQuery();
                }
              }}
              disabled={pending}
            />
            <div className="composer-footer">
              <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <LockKeyhole className="size-3" />
                {input.length > 0
                  ? `${input.length.toLocaleString()} / 4,000`
                  : "Just you and your ideas"}
              </span>
              {pending ? (
                <Button
                  type="button"
                  size="icon"
                  aria-label="Stop request"
                  title="Stop request"
                  onClick={stopQuery}
                >
                  <Square className="size-3.5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="h-9 gap-3"
                  disabled={!token}
                  aria-label="Send query"
                >
                  Ask Fieldnote
                  <ArrowUp />
                </Button>
              )}
            </div>
          </form>
          {sessionError && (
            <div role="alert" className="mt-4 flex items-center gap-3 text-destructive text-sm">
              {sessionError}
              <Button variant="outline" size="sm" onClick={renewSession}>
                Start session
              </Button>
            </div>
          )}
          {error && (
            <div role="alert" className="mt-4 text-sm text-destructive flex items-center gap-2">
              {error}
            </div>
          )}
          {!activeEntry && !pending && (
            <>
              <div className="mt-8 flex items-center justify-between">
                <span className="eyebrow">A few starting points</span>
                <span className="text-[10px] text-muted-foreground">Or follow your curiosity</span>
              </div>
              <div className="prompt-grid">
                {prompts.map(({ icon: Icon, title, text }) => (
                  <Button
                    key={title}
                    variant="ghost"
                    className="prompt-item"
                    onClick={() => {
                      setInput(text);
                      textarea.current?.focus();
                    }}
                  >
                    <div className="flex justify-between w-full items-center">
                      <Icon className="size-4" />
                      <ArrowUpRight className="size-3 text-muted-foreground" />
                    </div>
                    <span>
                      <span className="block font-medium text-xs mb-1">{title}</span>
                      <span className="text-xs text-muted-foreground">{text}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </>
          )}
          {pending && (
            <div
              role="status"
              aria-live="polite"
              className="response flex gap-3 items-center text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" />
              <span className="pulse">Thinking it through…</span>
            </div>
          )}
          {activeEntry && (
            <section className="response" aria-label="AI response">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="brand-mark scale-75" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="text-sm font-medium">Fieldnote</span>
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {(activeEntry.result.elapsedMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy answer"
                    title="Copy answer"
                    onClick={copyAnswer}
                  >
                    {copied ? <Check /> : <Copy />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Regenerate answer"
                    title="Regenerate answer"
                    onClick={sendQuery}
                  >
                    <RotateCcw />
                  </Button>
                </div>
              </div>
              <article className="answer">
                <ReactMarkdown>{activeEntry.result.answer}</ReactMarkdown>
              </article>
            </section>
          )}
          <div className="empty-note">
            <ShieldCheck className="size-3" />
            AI can be helpful. Your judgment still matters.
          </div>
          <footer className="mt-12 pt-5 border-t border-border flex justify-between text-[10px] text-muted-foreground">
            <span>FIELDNOTE · QUERY WORKSPACE</span>
            <span>Made for thoughtful questions.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
