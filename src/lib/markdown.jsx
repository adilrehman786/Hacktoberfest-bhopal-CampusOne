// Small, safe markdown renderer for AI answers (no HTML injection).
// Supports: paragraphs, "- " bullets, numbered lists, ### headings, **bold**, *italic*, `code`, ```code blocks```.
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { humanize } from './humanize.js';

function inline(text, keyBase) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g);
  return parts.map((p, i) => {
    const k = `${keyBase}-${i}`;
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={k} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={k} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-indigo-700">{p.slice(1, -1)}</code>;
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={k}>{p.slice(1, -1)}</em>;
    return <span key={k}>{p}</span>;
  });
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] text-slate-400">
        <span className="font-mono">{lang || 'code'}</span>
        <button
          onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10 hover:text-white"
        >
          {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[12.5px] leading-relaxed"><code className="font-mono">{code}</code></pre>
    </div>
  );
}

export function Markdown({ text, className = '' }) {
  const blocks = [];
  let list = null;
  let code = null;
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const fence = line.match(/^\s*```(\w*)/);
    if (code) {
      if (fence) { blocks.push({ type: 'code', lang: code.lang, text: code.lines.join('\n') }); code = null; }
      else code.lines.push(raw);
      continue;
    }
    if (fence) { list = null; code = { lang: fence[1], lines: [] }; continue; }
    const prose = humanize(line);
    const bullet = prose.match(/^\s*[-*•]\s+(.*)$/);
    const num = prose.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const heading = prose.match(/^\s*#{1,6}\s+(.*)$/);
    if (bullet || num) {
      const type = num ? 'ol' : 'ul';
      if (!list || list.type !== type) { list = { type, items: [], start: num ? Number(num[1]) : 1 }; blocks.push(list); }
      list.items.push(num ? num[2] : bullet[1]);
    } else if (heading) {
      list = null;
      blocks.push({ type: 'h', text: heading[1] });
    } else if (prose.trim()) {
      list = null;
      blocks.push({ type: 'p', text: prose.trim() });
    } else {
      list = null;
    }
  }
  // Unterminated code fence while streaming: still show it.
  if (code) blocks.push({ type: 'code', lang: code.lang, text: code.lines.join('\n') });

  return (
    <div className={`space-y-2.5 text-[15px] leading-relaxed text-slate-700 ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === 'code') return <CodeBlock key={i} code={b.text} lang={b.lang} />;
        if (b.type === 'h') return <p key={i} className="pt-1 font-semibold text-slate-900">{inline(b.text, i)}</p>;
        if (b.type === 'ul')
          return (
            <ul key={i} className="space-y-1.5">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <span className="min-w-0">{inline(it, `${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          );
        if (b.type === 'ol')
          return (
            <ol key={i} className="space-y-1.5">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600">{b.start + j}</span>
                  <span className="min-w-0">{inline(it, `${i}-${j}`)}</span>
                </li>
              ))}
            </ol>
          );
        return <p key={i}>{inline(b.text, i)}</p>;
      })}
    </div>
  );
}
