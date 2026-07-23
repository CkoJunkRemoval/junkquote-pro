"use client";

import { Banknote, BriefcaseBusiness, Building2, FileText, HardHat, LoaderCircle, MessageSquare, Receipt, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { globalSearchAction } from "@/app/actions/search/globalSearch";
import { searchCategories, type GlobalSearchResponse, type GlobalSearchResult, type SearchCategory } from "@/lib/globalSearch/types";
import { historyKey, isLatestSearchRequest, readSearchHistory, writeSearchHistory } from "./globalSearchHistory";
const icons: Record<SearchCategory, typeof Search> = { Customers: Users, Properties: Building2, Estimates: FileText, Jobs: BriefcaseBusiness, Invoices: Receipt, Payments: Banknote, Crew: HardHat, Messages: MessageSquare };
export default function GlobalSearch({ dashboard = false }: { dashboard?: boolean }) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(""), [response, setResponse] = useState<GlobalSearchResponse | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState(false), [recentTerms, setRecentTerms] = useState<string[]>([]);
  const sequence = useRef(0), input = useRef<HTMLInputElement>(null), mobileState = useRef(false);
  useEffect(() => {
    if (!open) return;
    const request = ++sequence.current;
    const timer = window.setTimeout(() => {
      setLoading(true); setError(false);
      void globalSearchAction(query.trim().length >= 2 ? query : "").then((result) => {
        if (!isLatestSearchRequest(request, sequence.current)) return;
        setResponse(result); setRecentTerms(readSearchHistory(localStorage, result.historyScope));
      }).catch(() => { if (isLatestSearchRequest(request, sequence.current)) setError(true); }).finally(() => { if (isLatestSearchRequest(request, sequence.current)) setLoading(false); });
    }, query.trim().length >= 2 ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [open, query]);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (mobile) { history.pushState({ globalSearch: true }, ""); mobileState.current = true; }
    const closeOnBack = () => { mobileState.current = false; setOpen(false); };
    window.addEventListener("popstate", closeOnBack);
    return () => window.removeEventListener("popstate", closeOnBack);
  }, [open]);
  function close() {
    sequence.current += 1; setOpen(false);
    if (mobileState.current) { mobileState.current = false; history.back(); }
  }
  function opened() {
    if (response && query.trim().length >= 2) { writeSearchHistory(localStorage, response.historyScope, query); setRecentTerms(readSearchHistory(localStorage, response.historyScope)); }
    close();
  }
  const field = <div className="relative w-full"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input ref={input} type="search" role="combobox" aria-autocomplete="list" aria-label="Search company workspace" aria-controls="global-search-results" aria-expanded={open} value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder="Search customers, properties, estimates, jobs…" className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2" /></div>;
  return <div role="search" className={`relative ${dashboard ? "w-full" : "max-w-lg flex-1"}`}>
    <div className={dashboard ? "block" : "hidden md:block"}>{field}</div>
    {!dashboard && <button type="button" aria-label="Open company search" onClick={() => setOpen(true)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-600 md:hidden"><Search size={21} /></button>}
    {open && <div className="fixed inset-0 z-50 bg-white text-slate-950 md:absolute md:inset-auto md:left-0 md:right-0 md:top-[calc(100%+0.5rem)] md:max-h-[min(70vh,40rem)] md:overflow-y-auto md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl" role="dialog" aria-label="Company search results">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white p-3 md:hidden">{field}<button type="button" aria-label="Close search" onClick={close} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg focus-visible:ring-2"><X /></button></div>
      <div id="global-search-results" className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain p-3 md:max-h-none md:overflow-visible" aria-live="polite">
        {loading && <p role="status" className="flex min-h-16 items-center justify-center gap-2 text-sm text-slate-600"><LoaderCircle className="animate-spin motion-reduce:animate-none" size={18} />Searching…</p>}
        {error && !loading && <div role="alert" className="p-5 text-center"><p>Search is temporarily unavailable.</p><button type="button" className="mt-3 min-h-11 rounded-lg border px-4 font-semibold" onClick={() => { setError(false); setQuery((value) => `${value} `); }}>Retry</button></div>}
        {!loading && !error && response && response.total === 0 && query.trim().length >= 2 && <div className="p-6 text-center"><p className="font-semibold">No results found for ‘{query.trim()}’</p><p className="mt-2 text-sm text-slate-600">Check the spelling or try a customer name, address, estimate number, job number, or invoice number.</p></div>}
        {!loading && !error && response && response.total > 0 && <><p className="sr-only">{response.total} search results</p>{searchCategories.map((category) => {
          const results = response.groups[category]; if (!results?.length) return null;
          return <section key={category} aria-labelledby={`search-${category}`} className="mb-3 last:mb-0"><h2 id={`search-${category}`} className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">{category}</h2>{results.map((result) => <Result key={`${category}-${result.id}`} result={result} onOpen={opened} />)}{results.length >= 5 && ["Customers", "Properties", "Estimates"].includes(category) && <Link onClick={close} href={`/${category.toLowerCase()}?q=${encodeURIComponent(query)}`} className="flex min-h-11 items-center px-3 text-sm font-semibold text-blue-700">View all {category.toLowerCase()}</Link>}</section>;
        })}</>}
        {!loading && !error && response?.recent && recentTerms.length > 0 && <section className="border-t pt-3"><div className="flex items-center justify-between px-2"><h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Recent searches</h2><button type="button" className="min-h-11 text-sm font-semibold text-blue-700" onClick={() => { localStorage.removeItem(historyKey(response.historyScope)); setRecentTerms([]); }}>Clear history</button></div>{recentTerms.map((term) => <button type="button" key={term} onClick={() => setQuery(term)} className="flex min-h-11 w-full items-center rounded-lg px-3 text-left hover:bg-slate-100 focus-visible:ring-2">{term}</button>)}</section>}
      </div>
    </div>}
    {open && <button type="button" aria-label="Close search results" onClick={close} className="fixed inset-0 z-40 hidden bg-slate-950/20 md:block" />}
  </div>;
}
function Result({ result, onOpen }: { result: GlobalSearchResult; onOpen: () => void }) {
  const Icon = icons[result.category];
  return <Link href={result.href} onClick={onOpen} className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 motion-safe:transition-colors"><Icon aria-hidden="true" className="shrink-0 text-slate-500" size={20} /><span className="min-w-0"><strong className="block truncate text-sm">{result.title}</strong><span className="block truncate text-sm text-slate-600">{result.context}</span></span></Link>;
}
