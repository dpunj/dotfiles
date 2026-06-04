/**
 * Public Web Fetch Extension
 *
 * Registers a `web_fetch` tool for fetching public URLs as markdown, text,
 * html/source, or inline raster images.
 */

import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	keyHint,
	truncateHead,
	type ExtensionAPI,
	type TruncationResult,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { lookup } from "node:dns/promises";
import { mkdtemp, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type, type Static } from "typebox";

const DEFAULT_TIMEOUT_SECONDS = 30;
const MAX_TIMEOUT_SECONDS = 120;
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const TEXT_MIME_TYPES = new Set([
	"application/json",
	"application/ld+json",
	"application/rss+xml",
	"application/xml",
	"image/svg+xml",
]);
const DEFAULT_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
	"(KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
const FALLBACK_USER_AGENT = "opencode";

const FetchParams = Type.Object({
	url: Type.String({ description: "Public http:// or https:// URL to fetch" }),
	format: Type.Optional(
		Type.String({ description: "Return format: markdown (default), text, or html/source" }),
	),
	timeout: Type.Optional(
		Type.Number({ description: "Timeout in seconds (default: 30, max: 120)", minimum: 1 }),
	),
});

type FetchParams = Static<typeof FetchParams>;
type FetchFormat = "markdown" | "text" | "html";
type ContentKind = "html" | "text" | "image" | "binary";

interface ParsedContentType {
	contentType: string;
	mime: string;
	charset?: string;
	kind: ContentKind;
}

interface FetchDetails {
	requestedUrl: string;
	finalUrl: string;
	format: FetchFormat;
	status: number;
	mime: string;
	contentType: string;
	bytes: number;
	charset?: string;
	decoder?: string;
	image?: boolean;
	truncation?: TruncationResult;
	fullOutputPath?: string;
}

interface FetchResult {
	response: Response;
	finalUrl: URL;
}

function normalizeUrl(rawUrl: string): URL {
	const trimmed = rawUrl.trim();
	if (!trimmed) throw new Error("URL cannot be empty");
	if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
		throw new Error("URL must start with http:// or https://");
	}
	try {
		const url = new URL(trimmed);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			throw new Error("Only http:// and https:// URLs are supported");
		}
		return url;
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Only ")) throw error;
		throw new Error(`Invalid URL: ${trimmed}`);
	}
}

function normalizeFormat(format: string | undefined): FetchFormat {
	if (!format) return "markdown";
	const value = format.trim().toLowerCase();
	if (value === "markdown" || value === "text" || value === "html") return value;
	throw new Error(`Invalid format: ${format}. Expected markdown, text, or html.`);
}

function clampTimeoutSeconds(timeout: number | undefined): number {
	if (timeout === undefined || !Number.isFinite(timeout)) return DEFAULT_TIMEOUT_SECONDS;
	return Math.min(Math.max(Math.trunc(timeout), 1), MAX_TIMEOUT_SECONDS);
}

function createOperationSignal(timeoutSeconds: number, outerSignal?: AbortSignal) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
	const signal = outerSignal ? AbortSignal.any([outerSignal, controller.signal]) : controller.signal;
	return { signal, cleanup: () => clearTimeout(timeoutId) };
}

function requestHeaders(
	format: FetchFormat,
	userAgent = DEFAULT_USER_AGENT,
): Record<string, string> {
	const accepts = {
		markdown: "text/markdown, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1",
		text: "text/plain, text/markdown;q=0.8, text/html;q=0.7, */*;q=0.1",
		html: "text/html, application/xhtml+xml;q=0.9, text/plain;q=0.5, */*;q=0.1",
	};
	return { "user-agent": userAgent, accept: accepts[format], "accept-language": "en-US,en;q=0.9" };
}

async function fetchWithRedirects(
	initialUrl: URL,
	headers: Record<string, string>,
	signal: AbortSignal,
): Promise<FetchResult> {
	let currentUrl = initialUrl;
	for (let redirects = 0; ; redirects += 1) {
		await assertPublicUrl(currentUrl);
		const response = await fetch(currentUrl, { headers, redirect: "manual", signal });
		if (!isRedirect(response.status)) return { response, finalUrl: currentUrl };
		await response.body?.cancel().catch(() => undefined);
		if (redirects >= MAX_REDIRECTS) {
			throw new Error(`Too many redirects while fetching ${initialUrl}`);
		}
		const location = response.headers.get("location");
		if (!location) throw new Error(`Redirect from ${currentUrl} did not include a Location header`);
		currentUrl = normalizeRedirectUrl(location, currentUrl);
	}
}

function normalizeRedirectUrl(location: string, currentUrl: URL): URL {
	const nextUrl = new URL(location, currentUrl);
	if (nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:") {
		throw new Error(`Redirected to unsupported protocol: ${nextUrl.protocol}`);
	}
	return nextUrl;
}

function isRedirect(status: number): boolean {
	return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function assertPublicUrl(url: URL): Promise<void> {
	const hostname = stripIpv6Brackets(url.hostname).toLowerCase();
	if (hostname === "localhost" || hostname.endsWith(".localhost") || isPrivateOrLocalIp(hostname)) {
		throw new Error(`Blocked private or local host: ${url}`);
	}
	try {
		const records = await lookup(hostname, { all: true, verbatim: true });
		for (const record of records) {
			if (isPrivateOrLocalIp(record.address)) throw new Error(`Blocked private or local host: ${url}`);
		}
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Blocked ")) throw error;
	}
}

function isPrivateOrLocalIp(input: string): boolean {
	const ip = stripIpv6Brackets(input).toLowerCase();
	if (ip.startsWith("::ffff:")) return isPrivateOrLocalIp(ip.slice(7));
	const version = isIP(ip);
	if (version === 4) return isPrivateIpv4(ip);
	if (version === 6) {
		return (
			ip === "::" || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") ||
			/^fe[89ab]/.test(ip)
		);
	}
	return false;
}

function isPrivateIpv4(ip: string): boolean {
	const [a = 0, b = 0] = ip.split(".").map((part) => Number.parseInt(part, 10));
	return (
		a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
		(a === 100 && b >= 64 && b <= 127)
	);
}

function stripIpv6Brackets(hostname: string): string {
	return hostname.replace(/^\[/, "").replace(/\]$/, "");
}

function parseContentType(header: string | null): ParsedContentType {
	const contentType = header?.trim() ?? "";
	const mime = (contentType.split(";")[0] ?? "").trim().toLowerCase();
	const charset = contentType.match(/charset\s*=\s*['\"]?([^;'\"]+)/i)?.[1]?.trim().toLowerCase();
	return { contentType, mime, charset, kind: classifyMime(mime) };
}

function classifyMime(mime: string): ContentKind {
	if (mime === "text/html" || mime === "application/xhtml+xml") return "html";
	if (IMAGE_MIME_TYPES.has(mime)) return "image";
	if (mime.startsWith("text/") || TEXT_MIME_TYPES.has(mime)) return "text";
	if (mime.endsWith("+json") || mime.endsWith("+xml")) return "text";
	return "binary";
}

async function readBody(
	response: Response,
	signal: AbortSignal,
): Promise<{ buffer: Buffer; bytes: number }> {
	const contentLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);
	if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
		throw new Error(`Response too large (exceeds ${formatSize(MAX_RESPONSE_BYTES)})`);
	}
	const reader = response.body?.getReader();
	if (!reader) return { buffer: Buffer.alloc(0), bytes: 0 };
	return readChunks(reader, signal);
}

async function readChunks(reader: ReadableStreamDefaultReader<Uint8Array>, signal: AbortSignal) {
	const chunks: Buffer[] = [];
	let bytes = 0;
	try {
		while (true) {
			if (signal.aborted) throw new Error("Operation cancelled");
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;
			bytes += value.byteLength;
			if (bytes > MAX_RESPONSE_BYTES) {
				throw new Error(`Response too large (exceeds ${formatSize(MAX_RESPONSE_BYTES)})`);
			}
			chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
		}
	} finally {
		reader.releaseLock();
	}
	return { buffer: Buffer.concat(chunks), bytes };
}

function decodeBuffer(buffer: Buffer, charset?: string): { text: string; decoder: string } {
	const decoder = charset === "utf8" ? "utf-8" : charset;
	if (decoder) {
		try {
			return { text: new TextDecoder(decoder).decode(buffer), decoder };
		} catch {
			// Fall through to UTF-8.
		}
	}
	return { text: new TextDecoder("utf-8").decode(buffer), decoder: "utf-8" };
}

function renderBody(
	text: string,
	finalUrl: string,
	contentType: ParsedContentType,
	format: FetchFormat,
): string {
	if (contentType.kind !== "html") return cleanupText(text);
	if (format === "html") return text.trim();
	const readableHtml = extractReadableHtml(text);
	if (format === "text") return htmlToText(readableHtml);
	return htmlToMarkdown(readableHtml, finalUrl);
}

function extractReadableHtml(html: string): string {
	const withoutNoise = html
		.replace(/<head\b[\s\S]*?<\/head>/gi, "")
		.replace(/<script\b[\s\S]*?<\/script>/gi, "")
		.replace(/<style\b[\s\S]*?<\/style>/gi, "")
		.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
		.replace(/<!--[\s\S]*?-->/g, "");
	return pickFirstTag(withoutNoise, "article") ?? pickFirstTag(withoutNoise, "main") ?? withoutNoise;
}

function pickFirstTag(html: string, tag: string): string | undefined {
	const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(html);
	return match?.[1];
}

function htmlToText(html: string): string {
	const withBreaks = html
		.replace(/<\s*br\s*\/?\s*>/gi, "\n")
		.replace(/<\/(p|div|section|article|main|li|h[1-6]|tr)>/gi, "\n")
		.replace(/<[^>]+>/g, " ");
	return cleanupText(decodeHtmlEntities(withBreaks));
}

function htmlToMarkdown(html: string, baseUrl: string): string {
	let markdown = html.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_match, code) => {
		return `\n\n\`\`\`\n${decodeHtmlEntities(stripTags(code)).trim()}\n\`\`\`\n\n`;
	});
	markdown = markdown.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, headingToMarkdown);
	markdown = markdown.replace(
		/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
		(_m, href, label) => linkToMarkdown(href, label, baseUrl),
	);
	markdown = markdown.replace(
		/<li\b[^>]*>([\s\S]*?)<\/li>/gi,
		(_m, item) => `\n- ${htmlToText(item)}`,
	);
	markdown = markdown
		.replace(/<\s*br\s*\/?\s*>/gi, "\n")
		.replace(/<\/(p|div|section|article|main)>/gi, "\n\n");
	return cleanupMarkdown(decodeHtmlEntities(stripTags(markdown)));
}

function headingToMarkdown(_match: string, level: string, content: string): string {
	return `\n\n${"#".repeat(Number.parseInt(level, 10))} ${htmlToText(content)}\n\n`;
}

function linkToMarkdown(href: string, label: string, baseUrl: string): string {
	const text = htmlToText(label);
	if (!text) return "";
	try {
		return `[${text}](${new URL(decodeHtmlEntities(href), baseUrl).toString()})`;
	} catch {
		return text;
	}
}

function stripTags(html: string): string {
	return html.replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(text: string): string {
	return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_match, entity: string) => {
		if (entity[0] === "#") return decodeNumericEntity(entity);
		const named: Record<string, string> = {
			amp: "&",
			lt: "<",
			gt: ">",
			quot: '"',
			apos: "'",
			nbsp: " ",
		};
		return named[entity.toLowerCase()] ?? `&${entity};`;
	});
}

function decodeNumericEntity(entity: string): string {
	const radix = entity.toLowerCase().startsWith("#x") ? 16 : 10;
	const value = Number.parseInt(entity.replace(/^#x?/i, ""), radix);
	return Number.isFinite(value) ? String.fromCodePoint(value) : `&${entity};`;
}

function cleanupText(text: string): string {
	return text
		.replace(/\r\n/g, "\n")
		.replace(/[ \t]+/g, " ")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n[ \t]+/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function cleanupMarkdown(markdown: string): string {
	return cleanupText(markdown)
		.replace(/\n ?- /g, "\n- ")
		.replace(/\n(#{1,6}) /g, "\n\n$1 ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

async function limitOutput(output: string): Promise<{
	text: string;
	truncation?: TruncationResult;
	fullOutputPath?: string;
}> {
	const truncation = truncateHead(output, {
		maxBytes: DEFAULT_MAX_BYTES,
		maxLines: DEFAULT_MAX_LINES,
	});
	if (!truncation.truncated) return { text: truncation.content };
	const fullOutputPath = await writeTempOutput(output);
	const notice =
		`\n\n[Output truncated: showing ${truncation.outputLines} of ` +
		`${truncation.totalLines} lines ` +
		`(${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). ` +
		`Full output saved to: ${fullOutputPath}]`;
	return { text: `${truncation.content}${notice}`, truncation, fullOutputPath };
}

async function writeTempOutput(output: string): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "pi-web-fetch-"));
	const outputPath = join(dir, "output.txt");
	await writeFile(outputPath, output, "utf8");
	return outputPath;
}

function shouldRetryWithFallbackUserAgent(response: Response): boolean {
	return response.status === 403 && response.headers.get("cf-mitigated") === "challenge";
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === "AbortError";
}

function textContent(text: string) {
	return { type: "text" as const, text };
}

function imageContent(data: string, mimeType: string) {
	return { type: "image" as const, data, mimeType };
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "web_fetch",
		label: "Web Fetch",
		description:
			"Fetch one public URL as markdown, text, html/source, or an inline raster image. " +
			`Text output is truncated at ${formatSize(DEFAULT_MAX_BYTES)} or ${DEFAULT_MAX_LINES} lines; ` +
			`responses over ${formatSize(MAX_RESPONSE_BYTES)} are rejected.`,
		promptSnippet: "Fetch one public URL as markdown, text, html/source, or an inline raster image",
		promptGuidelines: [
			"Use web_fetch when the user provides a URL or after web_search finds a page to inspect.",
			"Prefer web_fetch format=markdown unless the user asks for plain text or raw HTML/source.",
		],
		parameters: FetchParams,

		async execute(_toolCallId, params: FetchParams, signal, onUpdate) {
			const requestedUrl = normalizeUrl(params.url);
			const format = normalizeFormat(params.format);
			const timeoutSeconds = clampTimeoutSeconds(params.timeout);
			const operation = createOperationSignal(timeoutSeconds, signal);
			onUpdate?.({
				content: [textContent(`Fetching ${requestedUrl.toString()}…`)],
				details: { requestedUrl: requestedUrl.toString(), finalUrl: requestedUrl.toString(), format },
			});

			try {
				let result = await fetchWithRedirects(requestedUrl, requestHeaders(format), operation.signal);
				if (shouldRetryWithFallbackUserAgent(result.response)) {
					await result.response.body?.cancel().catch(() => undefined);
					result = await fetchWithRedirects(
						requestedUrl,
						requestHeaders(format, FALLBACK_USER_AGENT),
						operation.signal,
					);
				}
				return await handleResponse(requestedUrl, format, result, operation.signal);
			} catch (error) {
				if (signal?.aborted) throw new Error("Web fetch cancelled");
				if (isAbortError(error) || operation.signal.aborted) {
					throw new Error(`Web fetch timed out after ${timeoutSeconds}s`);
				}
				throw error instanceof Error ? error : new Error(String(error));
			} finally {
				operation.cleanup();
			}
		},

		renderCall(args, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			const format =
				args.format && args.format !== "markdown" ? theme.fg("muted", ` (${args.format})`) : "";
			text.setText(`${theme.fg("toolTitle", theme.bold("web_fetch"))} ${args.url ?? ""}${format}`);
			return text;
		},

		renderResult(result, { expanded, isPartial }, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			if (isPartial) {
				text.setText(theme.fg("warning", "Fetching…"));
				return text;
			}
			const details = result.details as FetchDetails | undefined;
			const status = details?.image ? "Fetched image" : "Fetched";
			const meta = [details?.mime, details?.bytes ? formatSize(details.bytes) : undefined]
				.filter(Boolean)
				.join(" · ");
			const suffix = details?.truncation?.truncated ? theme.fg("warning", " (truncated)") : "";
			const hint = expanded ? "" : ` ${keyHint("app.tools.expand", "for details")}`;
			text.setText(
				theme.fg("success", `✓ ${status}`) +
					(meta ? theme.fg("dim", ` ${meta}`) : "") +
					suffix +
					hint,
			);
			return text;
		},
	});
}

async function handleResponse(
	requestedUrl: URL,
	format: FetchFormat,
	result: FetchResult,
	signal: AbortSignal,
) {
	if (!result.response.ok) {
		throw new Error(`Request failed: ${result.response.status} ${result.response.statusText}`);
	}
	const contentType = parseContentType(result.response.headers.get("content-type"));
	const { buffer, bytes } = await readBody(result.response, signal);
	const details = buildDetails(
		requestedUrl,
		result.finalUrl,
		format,
		result.response,
		contentType,
		bytes,
	);
	if (contentType.kind === "image") {
		return {
			content: [
				textContent(`Fetched ${contentType.mime} from ${result.finalUrl}`),
				imageContent(buffer.toString("base64"), contentType.mime),
			],
			details: { ...details, image: true },
		};
	}
	if (contentType.kind === "binary") {
		throw new Error(
			`Unsupported binary content${contentType.mime ? ` (${contentType.mime})` : ""}`,
		);
	}
	const decoded = decodeBuffer(buffer, contentType.charset);
	const body = renderBody(decoded.text, result.finalUrl.toString(), contentType, format);
	const limited = await limitOutput(body);
	return {
		content: [textContent(limited.text)],
		details: {
			...details,
			decoder: decoded.decoder,
			truncation: limited.truncation,
			fullOutputPath: limited.fullOutputPath,
		},
	};
}

function buildDetails(
	requestedUrl: URL,
	finalUrl: URL,
	format: FetchFormat,
	response: Response,
	contentType: ParsedContentType,
	bytes: number,
): FetchDetails {
	return {
		requestedUrl: requestedUrl.toString(),
		finalUrl: finalUrl.toString(),
		format,
		status: response.status,
		mime: contentType.mime,
		contentType: contentType.contentType,
		charset: contentType.charset,
		bytes,
	};
}
