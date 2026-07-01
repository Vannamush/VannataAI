import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm md:prose-base prose-slate max-w-none prose-pre:p-0 prose-pre:bg-transparent">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && match) {
              return (
                <div className="relative group rounded-md overflow-hidden bg-[#1E1E1E] my-4 border border-border/10 shadow-sm">
                  <div className="flex items-center justify-between px-4 py-2 bg-black/40 text-xs text-gray-400 font-mono border-b border-white/10">
                    <span>{language}</span>
                    <CopyButton content={codeString} />
                  </div>
                  <div className="p-4 overflow-x-auto text-[13px] leading-relaxed">
                    <SyntaxHighlighter
                      {...props}
                      style={vscDarkPlus}
                      language={language}
                      PreTag="div"
                      customStyle={{ margin: 0, padding: 0, background: 'transparent' }}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                </div>
              );
            }
            return (
              <code {...props} className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-[0.85em]">
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-gray-400 hover:text-white hover:bg-white/10"
      onClick={onCopy}
      title="Copy code"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}
