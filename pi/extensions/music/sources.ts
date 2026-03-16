import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type {
  MusicItem,
  MusicSection,
  MusicSource,
  NtsNowPlaying,
} from "./types";

const execFileAsync = promisify(execFile);
let ytDlpCheck: Promise<void> | undefined;

export const NTS_STREAMS: Record<"1" | "2", string> = {
  "1": "https://stream-relay-geo.ntslive.net/stream",
  "2": "https://stream-relay-geo.ntslive.net/stream2",
};

interface YtDlpEntry {
  id?: string;
  title?: string;
  webpage_url?: string;
  url?: string;
  uploader?: string;
  channel?: string;
  artist?: string;
  album?: string;
  duration?: number;
  thumbnail?: string;
  tags?: string[];
  entries?: YtDlpEntry[];
}

// ── Helpers ──────────────────────────────────────────────

function makeId(source: MusicSource, url: string): string {
  return `${source}:${url}`.replace(/[^a-zA-Z0-9:_/-]/g, "_");
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function isSpotifyUrl(value: string): boolean {
  const v = value.toLowerCase();
  return v.includes("open.spotify.com") || v.includes("spotify.link");
}

function detectSource(input: string): MusicSource {
  const v = input.trim().toLowerCase();
  if (v === "nts" || v === "nts1" || v === "nts2") return "nts";
  if (isSpotifyUrl(v)) return "spotify";
  return "youtube";
}

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "application/json",
    },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} for ${url}`);
  }
  return (await resp.json()) as T;
}

async function ensureYtDlp(): Promise<void> {
  ytDlpCheck ??= execFileAsync("yt-dlp", ["--version"], {
    timeout: 5_000,
  })
    .then(() => undefined)
    .catch(() => {
      throw new Error(
        "yt-dlp is required. Install with: brew install yt-dlp",
      );
    });
  return await ytDlpCheck;
}

async function ytDlpJson(input: string): Promise<YtDlpEntry> {
  await ensureYtDlp();
  try {
    const { stdout } = await execFileAsync(
      "yt-dlp",
      ["-J", "--no-playlist", "--no-warnings", input],
      { timeout: 30_000, maxBuffer: 8 * 1024 * 1024 },
    );
    return JSON.parse(stdout) as YtDlpEntry;
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : String(error);
    throw new Error(`yt-dlp could not resolve "${input}": ${msg}`);
  }
}

function mapYtDlpEntry(
  entry: YtDlpEntry,
  source: MusicSource,
): MusicItem | undefined {
  const inputUrl = entry.webpage_url || entry.url;
  if (!inputUrl || !entry.title) return undefined;
  return {
    id: makeId(source, inputUrl),
    source,
    title: entry.title,
    artist: entry.artist || entry.uploader || entry.channel,
    album: entry.album,
    genres: [],
    inputUrl,
    streamUrl: source === "youtube" ? undefined : undefined,
    durationSeconds: entry.duration,
    imageUrl: entry.thumbnail,
    addedAt: Date.now(),
  };
}

// ── YouTube ──────────────────────────────────────────────

export async function searchYouTube(
  query: string,
  limit = 8,
): Promise<MusicItem[]> {
  const result = await ytDlpJson(`ytsearch${limit}:${query}`);
  return (result.entries || [])
    .map((e) => mapYtDlpEntry(e, "youtube"))
    .filter((e): e is MusicItem => Boolean(e));
}

async function resolveYouTubeUrl(
  url: string,
): Promise<MusicItem> {
  const entry = await ytDlpJson(url);
  const item = mapYtDlpEntry(entry, "youtube");
  if (!item) throw new Error(`Could not resolve: ${url}`);
  return { ...item, streamUrl: url };
}

// ── Spotify ──────────────────────────────────────────────

interface SpotifyMeta {
  name: string;
  artist?: string;
  imageUrl?: string;
}

async function getSpotifyMetadata(
  url: string,
): Promise<SpotifyMeta> {
  // HTML scrape: <title> tag has "Track - song and lyrics by Artist | Spotify"
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });
    const html = await resp.text();
    const titleTag =
      html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() || "";
    const cleaned = titleTag.replace(/\s*\|\s*Spotify\s*$/, "");

    // "Track - song and lyrics by Artist"
    // "Album - Album by Artist"
    // "Playlist - playlist by User"
    const byMatch = cleaned.match(
      /^(.+)\s+-\s+(?:song and lyrics|Album|playlist)\s+by\s+(.+)$/i,
    );

    const imageUrl =
      html.match(
        /<meta\s+property="og:image"\s+content="([^"]+)"/,
      )?.[1] || undefined;

    if (byMatch) {
      return {
        name: byMatch[1].trim(),
        artist: byMatch[2].trim(),
        imageUrl,
      };
    }

    if (cleaned) return { name: cleaned, imageUrl };
  } catch {
    // fall through to oEmbed
  }

  // Fallback: oEmbed (reliable but no artist info)
  try {
    const oembed = await fetchJson<{
      title?: string;
      thumbnail_url?: string;
    }>(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
    );
    return {
      name: oembed.title || "Unknown track",
      imageUrl: oembed.thumbnail_url,
    };
  } catch {
    return { name: "Unknown track" };
  }
}

async function resolveSpotifyUrl(
  spotifyUrl: string,
): Promise<MusicItem> {
  const meta = await getSpotifyMetadata(spotifyUrl);
  const query = [meta.name, meta.artist]
    .filter(Boolean)
    .join(" ");
  if (!query) {
    throw new Error(
      "Could not extract metadata from Spotify URL",
    );
  }

  const results = await searchYouTube(query, 1);
  if (results.length === 0) {
    throw new Error(`No YouTube match found for "${query}"`);
  }

  const match = results[0];
  return {
    ...match,
    source: "spotify",
    title: meta.name || match.title,
    artist: meta.artist || match.artist,
    imageUrl: meta.imageUrl || match.imageUrl,
    inputUrl: spotifyUrl,
    streamUrl: match.inputUrl,
  };
}

// ── NTS Radio ────────────────────────────────────────────

interface NtsTracklistEntry {
  artist?: string;
  title?: string;
  offset?: number;
  offset_estimate?: number;
}

function mapNtsEntry(
  entry: NtsTracklistEntry,
): MusicSection | undefined {
  const title = String(entry.title ?? "").trim();
  if (!title) return undefined;
  const artist = String(entry.artist ?? "").trim() || undefined;
  const startSeconds = Number(
    entry.offset ?? entry.offset_estimate ?? 0,
  );
  return {
    startSeconds: Number.isFinite(startSeconds)
      ? startSeconds
      : 0,
    title,
    artist,
  };
}

function getCurrentSection(
  sections: MusicSection[],
  startTimestamp: string | undefined,
): MusicSection | undefined {
  if (sections.length === 0) return undefined;
  if (!startTimestamp) return sections.at(-1);
  const startedAt = Date.parse(startTimestamp);
  if (Number.isNaN(startedAt)) return sections.at(-1);
  const elapsed = Math.max(0, (Date.now() - startedAt) / 1000);
  let current = sections[0];
  for (const s of sections) {
    if (s.startSeconds <= elapsed) current = s;
    else break;
  }
  return current;
}

export async function getNtsNowPlaying(
  channel: "1" | "2",
): Promise<NtsNowPlaying> {
  const result = await fetchJson<{
    results?: Array<{
      channel_name?: string;
      now?: {
        broadcast_title?: string;
        start_timestamp?: string;
        end_timestamp?: string;
        embeds?: {
          details?: {
            name?: string;
            links?: Array<{ rel?: string; href?: string }>;
          };
        };
      };
    }>;
  }>("https://www.nts.live/api/v2/live");

  const ch = (result.results || []).find(
    (e) => e.channel_name === channel,
  );
  const now = ch?.now;
  const showTitle =
    now?.embeds?.details?.name || now?.broadcast_title;

  let sections: MusicSection[] | undefined;
  let trackTitle: string | undefined;
  let trackArtist: string | undefined;

  const tracklistLink = now?.embeds?.details?.links?.find(
    (l) => l.rel === "tracklist",
  )?.href;

  if (tracklistLink) {
    try {
      const tracklist = await fetchJson<{
        results?: NtsTracklistEntry[];
      }>(tracklistLink);
      sections = (tracklist.results || [])
        .map(mapNtsEntry)
        .filter((e): e is MusicSection => Boolean(e))
        .sort((a, b) => a.startSeconds - b.startSeconds);
      const current = getCurrentSection(
        sections,
        now?.start_timestamp,
      );
      trackTitle = current?.title;
      trackArtist = current?.artist;
    } catch {
      // best-effort
    }
  }

  return {
    channel,
    showTitle,
    trackTitle,
    trackArtist,
    startTimestamp: now?.start_timestamp,
    endTimestamp: now?.end_timestamp,
    sections,
  };
}

// ── Unified Resolver ─────────────────────────────────────

export async function resolvePlayable(
  input: string,
): Promise<MusicItem> {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Missing search query or URL");

  const source = detectSource(trimmed);

  // NTS live radio
  if (source === "nts") {
    const channel = trimmed.endsWith("2") ? "2" : "1";
    const now = await getNtsNowPlaying(channel);
    return {
      id: makeId("nts", NTS_STREAMS[channel]),
      source: "nts",
      title: now.showTitle || `NTS ${channel}`,
      artist: now.trackArtist,
      genres: [],
      inputUrl: NTS_STREAMS[channel],
      streamUrl: NTS_STREAMS[channel],
      ntsChannel: channel as "1" | "2",
      ntsShowTitle: now.showTitle,
      sections: now.sections,
      addedAt: Date.now(),
    };
  }

  // Spotify URL → resolve via YouTube
  if (source === "spotify") {
    return resolveSpotifyUrl(trimmed);
  }

  // Direct URL → resolve with yt-dlp
  if (isUrl(trimmed)) {
    return resolveYouTubeUrl(trimmed);
  }

  // Bare text → YouTube search, play first result
  const results = await searchYouTube(trimmed, 1);
  if (results.length === 0) {
    throw new Error(`No results for "${trimmed}"`);
  }
  return { ...results[0], streamUrl: results[0].inputUrl };
}
