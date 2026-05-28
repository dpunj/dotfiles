/**
 * SearXNG Search Extension
 *
 * Registers a `web_search` tool backed by a local/private SearXNG instance.
 */

import {
	formatSize,
	truncateHead,
	type ExtensionAPI,
	type TruncationResult,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";

const DEFAULT_BASE_URL = "http://127.0.0.1:8080";
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 10;
const MAX_OUTPUT_BYTES = 24 * 1024;
const MAX_OUTPUT_LINES = 200;
const MAX_SNIPPET_LENGTH = 700;

const SearchParams = Type.Object({
	query: Type.String({ description: "Search query to send to SearXNG" }),
	limit: Type.Optional(
		Type.Number({
			description: "Maximum results to return (default: 6, max: 10)",
			minimum: 1,
			maximum: 10,
		}),
	),
	categories: Type.Optional(Type.String({ description: "Comma-separated SearXNG categories" })),
	engines: Type.Optional(Type.String({ description: "Comma-separated SearXNG engines" })),
	language: Type.Optional(Type.String({ description: "SearXNG language code, e.g. en-US" })),
	page: Type.Optional(Type.Number({ description: "Search result page number", minimum: 1 })),
	timeRange: Type.Optional(
		Type.String({ description: "Optional SearXNG time range: day, month, or year" }),
	),
});

type SearchParams = Static<typeof SearchParams>;

interface SearxngResult {
	title?: unknown;
	url?: unknown;
	content?: unknown;
	engine?: unknown;
	engines?: unknown;
	category?: unknown;
	publishedDate?: unknown;
	score?: unknown;
}

interface SearxngResponse {
	results?: unknown;
	query?: unknown;
	answers?: unknown;
	corrections?: unknown;
}

interface ResultSummary {
	title: string;
	url: string;
	engine?: string;
	category?: string;
}

interface SearchDetails {
	query: string;
	baseUrl: string;
	resultCount: number;
	results: ResultSummary[];
	truncation?: TruncationResult;
}

function getBaseUrl(): URL {
	const rawUrl = process.env.SEARXNG_URL ?? DEFAULT_BASE_URL;
	try {
		return new URL(rawUrl);
	} catch {
		throw new Error(`Invalid SEARXNG_URL: ${rawUrl}`);
	}
}

function clampLimit(limit: number | undefined): number {
	if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT;
	return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
}

function validateTimeRange(timeRange: string | undefined): string | undefined {
	if (!timeRange) return undefined;
	if (["day", "month", "year"].includes(timeRange)) return timeRange;
	throw new Error(`Invalid timeRange: ${timeRange}. Expected day, month, or year.`);
}

function cleanText(value: unknown, maxLength = Number.POSITIVE_INFINITY): string {
	if (typeof value !== "string") return "";
	const text = value.replace(/\s+/g, " ").trim();
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength).trimEnd()}…`;
}

function engineText(result: SearxngResult): string | undefined {
	if (Array.isArray(result.engines)) {
		return result.engines.filter((engine) => typeof engine === "string").join(", ") || undefined;
	}
	return cleanText(result.engine) || undefined;
}

function getResults(payload: SearxngResponse): SearxngResult[] {
	if (!Array.isArray(payload.results)) return [];
	return payload.results.filter((result): result is SearxngResult => {
		return result !== null && typeof result === "object";
	});
}

function buildLocalHeaders(baseUrl: URL): Record<string, string> {
	const headers: Record<string, string> = { accept: "application/json" };
	if (["127.0.0.1", "localhost", "::1"].includes(baseUrl.hostname)) {
		headers["x-forwarded-for"] = "127.0.0.1";
		headers["x-real-ip"] = "127.0.0.1";
	}
	return headers;
}

function buildSearchUrl(params: SearchParams, baseUrl: URL): URL {
	const url = new URL("./search", baseUrl);
	url.searchParams.set("q", params.query);
	url.searchParams.set("format", "json");
	if (params.categories) url.searchParams.set("categories", params.categories);
	if (params.engines) url.searchParams.set("engines", params.engines);
	if (params.language) url.searchParams.set("language", params.language);
	const timeRange = validateTimeRange(params.timeRange);
	if (timeRange) url.searchParams.set("time_range", timeRange);
	if (params.page) url.searchParams.set("pageno", String(Math.max(1, Math.trunc(params.page))));
	return url;
}

function formatResult(result: SearxngResult, index: number): string {
	const title = cleanText(result.title) || "(untitled)";
	const url = cleanText(result.url);
	const snippet = cleanText(result.content, MAX_SNIPPET_LENGTH);
	const source = [engineText(result), cleanText(result.category)].filter(Boolean).join(" · ");
	const published = cleanText(result.publishedDate);
	const meta = [source, published].filter(Boolean).join(" · ");

	return [
		`${index + 1}. ${title}`,
		url ? `   ${url}` : undefined,
		meta ? `   ${meta}` : undefined,
		snippet ? `   ${snippet}` : undefined,
	].filter(Boolean).join("\n");
}

function summarizeResult(result: SearxngResult): ResultSummary {
	const summary: ResultSummary = {
		title: cleanText(result.title) || "(untitled)",
		url: cleanText(result.url),
	};
	const engine = engineText(result);
	const category = cleanText(result.category);
	if (engine) summary.engine = engine;
	if (category) summary.category = category;
	return summary;
}

function applyOutputLimit(output: string): { text: string; truncation?: TruncationResult } {
	const truncation = truncateHead(output, {
		maxBytes: MAX_OUTPUT_BYTES,
		maxLines: MAX_OUTPUT_LINES,
	});
	if (!truncation.truncated) return { text: output };

	const notice = [
		`[Search output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines`,
		`(${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}).]`,
	].join(" ");
	return { text: `${truncation.content}\n\n${notice}`, truncation };
}

async function parseResponse(response: Response): Promise<SearxngResponse> {
	const text = await response.text();
	if (!response.ok) {
		const hint = response.status === 403 ? " Is JSON enabled in search.formats?" : "";
		const body = cleanText(text, 500);
		throw new Error(
			`SearXNG request failed: ${response.status} ${response.statusText}.${hint} ${body}`,
		);
	}

	try {
		return JSON.parse(text) as SearxngResponse;
	} catch {
		throw new Error("SearXNG returned invalid JSON");
	}
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_search",
		label: "Web Search",
		description:
			"Search the web through local SearXNG. Output is capped to 10 results and " +
			`${formatSize(MAX_OUTPUT_BYTES)} so it stays safe for context.`,
		promptSnippet: "Search the web through local/private SearXNG",
		promptGuidelines: [
			"Use web_search for current web information, external docs, and references outside the repo.",
			"Prefer web_search over raw curl when the user asks to look something up online.",
		],
		parameters: SearchParams,

		async execute(_toolCallId, params, signal) {
			const baseUrl = getBaseUrl();
			const searchUrl = buildSearchUrl(params, baseUrl);
			const response = await fetch(searchUrl, {
				headers: buildLocalHeaders(baseUrl),
				signal,
			});
			const payload = await parseResponse(response);
			const limit = clampLimit(params.limit);
			const results = getResults(payload).slice(0, limit);

			if (results.length === 0) {
				return {
					content: [{ type: "text", text: `No SearXNG results found for: ${params.query}` }],
					details: { query: params.query, baseUrl: baseUrl.origin, resultCount: 0, results: [] },
				};
			}

			const output = results.map(formatResult).join("\n\n");
			const limited = applyOutputLimit(output);
			const details: SearchDetails = {
				query: params.query,
				baseUrl: baseUrl.origin,
				resultCount: results.length,
				results: results.map(summarizeResult),
			};
			if (limited.truncation) details.truncation = limited.truncation;

			return {
				content: [{ type: "text", text: limited.text }],
				details,
			};
		},

		renderCall(args, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(`${theme.fg("toolTitle", theme.bold("web_search"))} ${args.query ?? ""}`);
			return text;
		},

		renderResult(result, { isPartial }, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			if (isPartial) {
				text.setText(theme.fg("warning", "Searching SearXNG…"));
				return text;
			}
			const details = result.details as SearchDetails | undefined;
			if (!details || details.resultCount === 0) {
				text.setText(theme.fg("dim", "No results"));
				return text;
			}
			const suffix = details.truncation?.truncated ? theme.fg("warning", " (truncated)") : "";
			text.setText(theme.fg("success", `${details.resultCount} results`) + suffix);
			return text;
		},
	});
}
