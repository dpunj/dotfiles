import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { Key } from "@mariozechner/pi-tui";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { getMusicPlayer } from "./player";
import {
  resolvePlayable,
  searchYouTube,
  getNtsNowPlaying,
  NTS_STREAMS,
} from "./sources";
import {
  loadLibrary,
  saveLibrary,
  loadRuntime,
  saveRuntime,
  addToHistory,
  isFavorite,
  toggleFavorite,
} from "./store";
import type {
  MusicItem,
  MusicLibrary,
  MusicRuntimeState,
  PlayerSnapshot,
  NtsNowPlaying as NtsInfo,
} from "./types";

// ── Ocean Drift Palette ──────────────────────────────────

const C = {
  r: "\x1b[0m",
  b: "\x1b[1m",
  d: "\x1b[2m",
  wave: "\x1b[38;2;86;156;214m",
  deep: "\x1b[38;2;42;82;120m",
  foam: "\x1b[38;2;150;210;230m",
  sand: "\x1b[38;2;210;195;170m",
  shell: "\x1b[38;2;235;225;210m",
  coral: "\x1b[38;2;230;120;100m",
  kelp: "\x1b[38;2;110;170;130m",
  pearl: "\x1b[38;2;190;180;210m",
  drift: "\x1b[38;2;130;145;160m",
  moon: "\x1b[38;2;180;195;210m",
};

const I = {
  youtube: "▶",
  spotify: "●",
  nts: "◈",
  music: "♪",
  play: "▸",
  pause: "‖",
  stop: "■",
  next: "»",
  queue: "≡",
  fav: "★",
  unfav: "☆",
  search: "○",
  history: "↺",
  back: "‹",
  close: "×",
  loading: "◌",
  current: "›",
  time: "◷",
};

function sourceIcon(source: string): string {
  return (I as Record<string, string>)[source] || I.music;
}

// ── Extension ────────────────────────────────────────────

export default function music(pi: ExtensionAPI) {
  const player = getMusicPlayer();
  const PAGE = 12;

  let library: MusicLibrary = loadLibrary();
  let runtime: MusicRuntimeState = loadRuntime();
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let lastSnap: PlayerSnapshot = { idle: true, paused: false };
  let lastNts: NtsInfo | undefined;
  let activeCtx: ExtensionContext | undefined;
  const sessions = new Set<ExtensionContext>();
  let pollBusy = false;
  let consecutiveIdle = 0;
  let removeTerminalListener: (() => void) | undefined;

  // ── State helpers ────────────────────────────────────

  function syncFromDisk(): void {
    library = loadLibrary();
    runtime = loadRuntime();
  }

  function getCtx(): ExtensionContext | undefined {
    return activeCtx || sessions.values().next().value;
  }

  function persistAndRefresh(ctx?: ExtensionContext): void {
    saveRuntime(runtime);
    if (ctx) activeCtx = ctx;
    for (const s of sessions) {
      if (s.hasUI) updateStatus(s);
    }
  }

  function clearRuntime(clearQueue = false): void {
    runtime.current = undefined;
    runtime.paused = false;
    runtime.lastPositionSeconds = undefined;
    consecutiveIdle = 0;
    if (clearQueue) runtime.queue = [];
  }

  // ── Status footer ────────────────────────────────────

  function updateStatus(ctx: ExtensionContext): void {
    if (!ctx.hasUI) return;
    if (!runtime.current) {
      ctx.ui.setStatus("music", undefined);
      return;
    }

    const icon = sourceIcon(runtime.current.source);
    const title = shortTitle(runtime.current);
    const artist = runtime.current.artist;
    const state = runtime.paused
      ? `${C.coral}${I.pause}${C.r}`
      : `${C.kelp}${I.play}${C.r}`;

    const pos = runtime.lastPositionSeconds || 0;
    const dur = runtime.current.durationSeconds || 0;
    const time = dur > 0
      ? `${fmtTime(pos)}/${fmtTime(dur)}`
      : `${fmtTime(pos)}`;
    const bar = dur > 0 ? ` ${miniBar(pos, dur)}` : "";

    let line = `${C.foam}${icon}${C.r} ${C.shell}${title}${C.r}`;
    if (artist) line += ` ${C.drift}·${C.r} ${C.sand}${artist}${C.r}`;
    line += `  ${state} ${C.drift}${time}${C.r}${bar}`;

    const liveTrack = getLiveTrackText();
    if (liveTrack) {
      line += `  ${C.pearl}${I.current} ${liveTrack}${C.r}`;
    }

    ctx.ui.setStatus("music", line);
  }

  // ── Formatting ───────────────────────────────────────

  function shortTitle(item: MusicItem): string {
    let t = item.title;
    const a = item.artist;
    if (a && t.toLowerCase().startsWith(a.toLowerCase())) {
      t = t.slice(a.length).replace(/^\s*[-–—:]\s*/, "").trim() || t;
    }
    return t;
  }

  function fmtTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function miniBar(pos: number, dur: number, w = 8): string {
    if (dur <= 0) return "";
    const ratio = Math.min(1, Math.max(0, pos / dur));
    const filled = Math.round(ratio * w);
    return (
      `${C.wave}${"█".repeat(filled)}${C.r}` +
      `${C.deep}${"░".repeat(w - filled)}${C.r}`
    );
  }

  function progressBar(pos: number, dur: number, w = 20): string {
    const ratio = Math.min(1, Math.max(0, pos / dur));
    const filled = Math.round(ratio * w);
    return "█".repeat(filled) + "░".repeat(w - filled);
  }

  function getLiveTrackText(): string | undefined {
    if (!runtime.current) return undefined;
    if (runtime.current.source === "nts") {
      return (
        [lastNts?.trackArtist, lastNts?.trackTitle]
          .filter(Boolean)
          .join(" — ") || undefined
      );
    }
    return undefined;
  }

  function formatItemLabels(
    items: MusicItem[],
    start: number,
  ): string[] {
    const rows = items.map((item) => {
      let title = item.title;
      const artist = item.artist;
      if (artist && title.toLowerCase().startsWith(artist.toLowerCase())) {
        title = title.slice(artist.length).replace(/^\s*[-–—:]\s*/, "").trim() || title;
      }
      const showArtist =
        artist && !title.toLowerCase().includes(artist.toLowerCase())
          ? artist
          : "";
      let dur = "";
      if (item.durationSeconds && item.durationSeconds > 0) {
        dur = fmtTime(item.durationSeconds);
      }
      return {
        icon: sourceIcon(item.source),
        title,
        artist: showArtist,
        dur,
      };
    });

    const maxT = Math.min(50, Math.max(10, ...rows.map((r) => r.title.length)));
    const maxA = Math.min(24, Math.max(0, ...rows.map((r) => r.artist.length)));
    const maxD = Math.max(0, ...rows.map((r) => r.dur.length));

    return rows.map((r, i) => {
      const num = String(start + i + 1).padStart(2, " ");
      const t =
        r.title.length > maxT
          ? r.title.slice(0, maxT - 1) + "…"
          : r.title.padEnd(maxT);
      const a =
        maxA > 0
          ? r.artist.length > maxA
            ? r.artist.slice(0, maxA - 1) + "…"
            : r.artist.padEnd(maxA)
          : "";
      const d = maxD > 0 ? r.dur.padStart(maxD) : "";

      let line = `${C.deep}${num}.${C.r} ${r.icon} ${C.shell}${t}${C.r}`;
      if (maxA > 0) line += `  ${C.sand}${a}${C.r}`;
      if (maxD > 0) line += `  ${C.drift}${d}${C.r}`;
      return line;
    });
  }

  function describeError(error: unknown): string {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("yt-dlp is required")) return msg;
    if (msg.includes("mpv is required")) return msg;
    if (msg.includes("timed out")) return "Request timed out.";
    return msg;
  }

  // ── Player controls ──────────────────────────────────

  async function playItem(
    item: MusicItem,
    ctx: ExtensionContext,
  ): Promise<boolean> {
    const icon = sourceIcon(item.source);
    ctx.ui.notify(`${icon} Loading...`, "info");
    try {
      const playable =
        item.streamUrl && item.source !== "spotify"
          ? item
          : await resolvePlayable(item.inputUrl);
      await player.play(playable);
      runtime.current = playable;
      runtime.paused = false;
      runtime.lastPositionSeconds = 0;
      consecutiveIdle = 0;
      library = addToHistory(library, playable);
      saveLibrary(library);
      persistAndRefresh(ctx);
      ctx.ui.notify(
        `${I.play} ${shortTitle(playable)}`,
        "success",
      );
      return true;
    } catch (error) {
      ctx.ui.notify(`${icon} ${describeError(error)}`, "error");
      return false;
    }
  }

  async function playInput(
    input: string,
    ctx: ExtensionContext,
  ): Promise<boolean> {
    try {
      const playable = await resolvePlayable(input);
      return await playItem(playable, ctx);
    } catch (error) {
      ctx.ui.notify(
        `${I.music} ${describeError(error)}`,
        "error",
      );
      return false;
    }
  }

  async function skipToNext(ctx: ExtensionContext): Promise<void> {
    const [next, ...rest] = runtime.queue;
    runtime.queue = rest;
    if (!next) {
      await player.stop();
      clearRuntime();
      persistAndRefresh(ctx);
      ctx.ui.notify(`${I.stop} Queue empty`, "info");
      return;
    }
    const started = await playItem(next, ctx);
    if (!started) {
      clearRuntime();
      persistAndRefresh(ctx);
    }
  }

  async function stopPlayback(
    ctx: ExtensionContext,
  ): Promise<void> {
    await player.stop();
    clearRuntime(true);
    persistAndRefresh(ctx);
    ctx.ui.notify(`${I.stop} Stopped`, "info");
  }

  async function togglePause(
    ctx: ExtensionContext,
  ): Promise<void> {
    runtime.paused = await player.togglePause();
    persistAndRefresh(ctx);
  }

  async function seekRelative(
    ctx: ExtensionContext,
    seconds: number,
  ): Promise<void> {
    if (!runtime.current) return;
    const pos = runtime.lastPositionSeconds || 0;
    const dur = runtime.current.durationSeconds;
    const target =
      seconds < 0
        ? Math.max(0, pos + seconds)
        : dur
          ? Math.min(dur, pos + seconds)
          : pos + seconds;
    await player.seek(target);
    runtime.lastPositionSeconds = target;
    persistAndRefresh(ctx);
    ctx.ui.notify(
      `${seconds < 0 ? I.back : I.next} ${seconds > 0 ? "+" : ""}${seconds}s`,
      "info",
    );
  }

  // ── Item actions ─────────────────────────────────────

  async function chooseAction(
    item: MusicItem,
    ctx: ExtensionContext,
  ): Promise<"played" | "done"> {
    const fav = isFavorite(library, item);
    const icon = sourceIcon(item.source);
    const title = shortTitle(item);

    const info: string[] = [];
    info.push(`${C.foam}${C.b}${icon} ${title}${C.r}`);
    if (item.artist) {
      info.push(`${C.sand}${item.artist}${C.r}`);
    }
    if (item.genres?.length) {
      info.push(
        `${C.pearl}${item.genres.slice(0, 3).join(", ")}${C.r}`,
      );
    }

    const opts = [
      `${I.play} Play now`,
      `${I.queue} Add to queue`,
      `${fav ? I.fav : I.unfav} ${fav ? "Remove from favorites" : "Add to favorites"}`,
      `${I.back} Back`,
    ];

    const choice = await ctx.ui.select(info.join("\n"), opts);
    if (choice?.includes("Play now")) {
      if (await playItem(item, ctx)) return "played";
      return "done";
    }
    if (choice?.includes("queue")) {
      runtime.queue = [...runtime.queue, item];
      persistAndRefresh(ctx);
      ctx.ui.notify(`${I.queue} Queued: ${title}`, "info");
      return "done";
    }
    if (choice?.includes("favorites")) {
      library = toggleFavorite(library, item);
      saveLibrary(library);
      const now = isFavorite(library, item);
      ctx.ui.notify(
        `${now ? I.fav : I.unfav} ${now ? "Added to" : "Removed from"} favorites`,
        "info",
      );
    }
    return "done";
  }

  async function browseItems(
    title: string,
    items: MusicItem[],
    ctx: ExtensionContext,
  ): Promise<boolean> {
    if (items.length === 0) {
      ctx.ui.notify(`${I.music} Nothing here`, "info");
      return false;
    }
    let page = 0;
    const pages = Math.max(1, Math.ceil(items.length / PAGE));
    while (true) {
      const start = page * PAGE;
      const slice = items.slice(start, start + PAGE);
      const labels = formatItemLabels(slice, start);
      const opts = [
        ...labels,
        ...(page > 0 ? ["Previous page"] : []),
        ...(page < pages - 1 ? ["Next page"] : []),
        "Back",
      ];
      const sel = await ctx.ui.select(
        `${title} (${page + 1}/${pages})`,
        opts,
      );
      if (!sel || sel === "Back") return false;
      if (sel === "Previous page") { page--; continue; }
      if (sel === "Next page") { page++; continue; }
      const idx = labels.indexOf(sel);
      const item = slice[idx];
      if (item) {
        const result = await chooseAction(item, ctx);
        if (result === "played") return true;
      }
    }
  }

  // ── Menu: Search ─────────────────────────────────────

  async function openSearch(
    ctx: ExtensionContext,
  ): Promise<boolean> {
    const query = await ctx.ui.input(
      `${C.wave}${I.search}${C.r} Search YouTube:`,
      "",
    );
    if (!query?.trim()) return false;
    ctx.ui.notify(`${I.loading} Searching...`, "info");
    const results = await searchYouTube(query.trim(), 8);
    if (results.length === 0) {
      ctx.ui.notify("No results found", "warning");
      return false;
    }
    return await browseItems(
      `${I.search} ${results.length} results`,
      results,
      ctx,
    );
  }

  // ── Menu: NTS Radio ──────────────────────────────────

  async function openNts(
    ctx: ExtensionContext,
  ): Promise<boolean> {
    ctx.ui.notify(`${I.loading} Loading NTS...`, "info");
    const [ch1, ch2] = await Promise.all([
      getNtsNowPlaying("1"),
      getNtsNowPlaying("2"),
    ]);
    const opts = [
      `${C.wave}${I.nts}${C.r} ${C.shell}Channel 1${C.r} ${C.drift}— ${ch1.showTitle || "Live"}${C.r}`,
      `${C.wave}${I.nts}${C.r} ${C.shell}Channel 2${C.r} ${C.drift}— ${ch2.showTitle || "Live"}${C.r}`,
      `${I.back} Back`,
    ];
    const sel = await ctx.ui.select(
      `${C.wave}${I.nts}${C.r} NTS Radio`,
      opts,
    );
    if (!sel || sel.includes("Back")) return false;
    const channel: "1" | "2" = sel.includes("Channel 1") ? "1" : "2";
    const now = channel === "1" ? ch1 : ch2;
    const item: MusicItem = {
      id: `nts:${channel}`,
      source: "nts",
      title: now.showTitle || `NTS ${channel}`,
      artist: now.trackArtist,
      genres: [],
      inputUrl: NTS_STREAMS[channel],
      streamUrl: NTS_STREAMS[channel],
      ntsChannel: channel,
      ntsShowTitle: now.showTitle,
      sections: now.sections,
      addedAt: Date.now(),
    };
    return await playItem(item, ctx);
  }

  // ── Menu: Now Playing ────────────────────────────────

  async function openNowPlaying(
    ctx: ExtensionContext,
  ): Promise<void> {
    if (!runtime.current) {
      ctx.ui.notify(`${I.music} Nothing playing`, "info");
      return;
    }

    const snap = await player.getSnapshot();
    const pos = snap.timePosSeconds || runtime.lastPositionSeconds || 0;
    const dur = snap.durationSeconds || runtime.current.durationSeconds || 0;
    const icon = sourceIcon(runtime.current.source);
    const title = shortTitle(runtime.current);
    const fav = isFavorite(library, runtime.current);

    const info: string[] = [];
    info.push(`${C.foam}${C.b}${icon} ${title}${C.r}`);
    if (runtime.current.artist) {
      info.push(`${C.sand}${runtime.current.artist}${C.r}`);
    }
    if (runtime.current.genres?.length) {
      info.push(
        `${C.pearl}${runtime.current.genres.slice(0, 3).join(", ")}${C.r}`,
      );
    }
    if (dur > 0) {
      info.push(
        `${C.wave}${progressBar(pos, dur)}${C.r} ${C.drift}${fmtTime(pos)} / ${fmtTime(dur)}${C.r}`,
      );
    } else {
      info.push(`${C.drift}${I.time} ${fmtTime(pos)} elapsed${C.r}`);
    }

    const liveTrack = getLiveTrackText();
    if (liveTrack) {
      info.push(`${C.pearl}${I.current} ${liveTrack}${C.r}`);
    }

    const parts: string[] = [];
    parts.push(
      runtime.paused
        ? `${C.coral}${I.pause} Paused${C.r}`
        : `${C.kelp}${I.play} Playing${C.r}`,
    );
    if (runtime.queue.length > 0) {
      parts.push(
        `${C.moon}${I.queue} ${runtime.queue.length}${C.r}`,
      );
    }
    if (fav) parts.push(`${C.coral}${I.fav}${C.r}`);
    info.push(parts.join(" · "));

    const hasSections =
      runtime.current.sections &&
      runtime.current.sections.length > 0;

    const controls = [
      runtime.paused ? `${I.play} Resume` : `${I.pause} Pause`,
      `${I.back} -10s`,
      `${I.next} +10s`,
      ...(hasSections
        ? [`# Tracklist (${runtime.current.sections!.length})`]
        : []),
      `${I.next} Next`,
      `${I.stop} Stop`,
      `${fav ? I.fav : I.unfav} ${fav ? "Remove favorite" : "Add favorite"}`,
      `${I.back} Back`,
    ];

    const choice = await ctx.ui.select(info.join("\n"), controls);
    if (!choice || choice.includes("Back")) return;

    if (choice.includes("-10s")) {
      await seekRelative(ctx, -10);
      return openNowPlaying(ctx);
    }
    if (choice.includes("+10s")) {
      await seekRelative(ctx, 10);
      return openNowPlaying(ctx);
    }
    if (choice.includes("Pause") || choice.includes("Resume")) {
      await togglePause(ctx);
      return openNowPlaying(ctx);
    }
    if (choice.includes("Tracklist")) {
      return openTracklist(ctx);
    }
    if (choice.includes("Next")) {
      return skipToNext(ctx);
    }
    if (choice.includes("Stop")) {
      return stopPlayback(ctx);
    }
    if (choice.includes("favorite")) {
      library = toggleFavorite(library, runtime.current);
      saveLibrary(library);
      const now = isFavorite(library, runtime.current);
      ctx.ui.notify(
        `${now ? I.fav : I.unfav} ${now ? "Added" : "Removed"}`,
        "info",
      );
      return openNowPlaying(ctx);
    }
  }

  // ── Menu: Tracklist ──────────────────────────────────

  async function openTracklist(
    ctx: ExtensionContext,
  ): Promise<void> {
    const current = runtime.current;
    if (!current?.sections?.length) {
      ctx.ui.notify("No tracklist available", "info");
      return;
    }
    const sections = current.sections;
    const snap = await player.getSnapshot();
    const currentPos = snap.timePosSeconds || runtime.lastPositionSeconds || 0;
    let page = 0;

    while (true) {
      const pages = Math.max(1, Math.ceil(sections.length / PAGE));
      const start = page * PAGE;
      const slice = sections.slice(start, start + PAGE);

      const labels = slice.map((s, i) => {
        const absIdx = start + i;
        const nextS = sections[absIdx + 1];
        const isCurrent =
          s.startSeconds <= currentPos &&
          (!nextS || nextS.startSeconds > currentPos);
        const time = fmtTime(s.startSeconds);
        const label = s.artist
          ? `${s.artist} — ${s.title}`
          : s.title;
        return isCurrent
          ? `${C.foam}${I.current} ${time}  ${label}${C.r}`
          : `${C.drift}  ${time}  ${label}${C.r}`;
      });

      const opts = [
        ...labels,
        ...(page > 0 ? ["Previous page"] : []),
        ...(page < pages - 1 ? ["Next page"] : []),
        "Back",
      ];

      const sel = await ctx.ui.select(
        `${C.wave}#${C.r} ${shortTitle(current)} · ${sections.length} tracks (${page + 1}/${pages})`,
        opts,
      );
      if (!sel || sel === "Back") return;
      if (sel === "Previous page") { page--; continue; }
      if (sel === "Next page") { page++; continue; }
    }
  }

  // ── Menu: Queue ──────────────────────────────────────

  async function openQueue(
    ctx: ExtensionContext,
  ): Promise<boolean> {
    if (runtime.queue.length === 0) {
      ctx.ui.notify(`${I.queue} Queue is empty`, "info");
      return false;
    }
    let page = 0;
    while (true) {
      const pages = Math.max(
        1,
        Math.ceil(runtime.queue.length / PAGE),
      );
      const start = page * PAGE;
      const slice = runtime.queue.slice(start, start + PAGE);
      const labels = formatItemLabels(slice, start);
      const opts = [
        ...labels,
        ...(page > 0 ? ["Previous page"] : []),
        ...(page < pages - 1 ? ["Next page"] : []),
        "Back",
      ];

      const sel = await ctx.ui.select(
        `${I.queue} Queue (${runtime.queue.length}) — ${page + 1}/${pages}`,
        opts,
      );
      if (!sel || sel === "Back") return false;
      if (sel === "Previous page") { page--; continue; }
      if (sel === "Next page") { page++; continue; }

      const idx = labels.indexOf(sel);
      const item = slice[idx];
      if (!item) continue;
      const globalIdx = start + idx;

      const action = await ctx.ui.select(
        `${C.foam}${I.queue} ${shortTitle(item)}${C.r}`,
        [
          `${I.play} Play now`,
          `${I.close} Remove`,
          `${I.back} Back`,
        ],
      );
      if (action?.includes("Play now")) {
        runtime.queue = runtime.queue.filter(
          (_, i) => i !== globalIdx,
        );
        persistAndRefresh(ctx);
        if (await playItem(item, ctx)) return true;
      }
      if (action?.includes("Remove")) {
        runtime.queue = runtime.queue.filter(
          (_, i) => i !== globalIdx,
        );
        persistAndRefresh(ctx);
        ctx.ui.notify(
          `${I.close} Removed: ${shortTitle(item)}`,
          "info",
        );
        if (page > 0 && page * PAGE >= runtime.queue.length) page--;
      }
    }
  }

  // ── Menu: Main ───────────────────────────────────────

  async function openMenu(ctx: ExtensionContext): Promise<void> {
    while (true) {
      syncFromDisk();
      const nowLine = runtime.current
        ? `${C.kelp}${I.play}${C.r} ${C.shell}${shortTitle(runtime.current)}${C.r}${runtime.paused ? ` ${C.coral}${I.pause}${C.r}` : ""}`
        : `${C.drift}${I.music} Nothing playing${C.r}`;

      const queueCount =
        runtime.queue.length > 0
          ? ` ${C.drift}(${runtime.queue.length})${C.r}`
          : "";

      const favCount =
        library.favorites.length > 0
          ? ` ${C.drift}(${library.favorites.length})${C.r}`
          : "";

      const opts = [
        nowLine,
        `${C.wave}${I.queue}${C.r} Queue${queueCount}`,
        `${C.wave}${I.search}${C.r} Search`,
        `${C.wave}${I.nts}${C.r} NTS Radio`,
        `${C.wave}${I.fav}${C.r} Favorites${favCount}`,
        `${C.wave}${I.history}${C.r} History`,
        `${C.drift}${I.close} Close${C.r}`,
      ];

      const sel = await ctx.ui.select(
        `${C.foam}${I.music}${C.r} Music`,
        opts,
      );
      if (!sel || sel.includes("Close")) return;

      if (sel === nowLine) {
        await openNowPlaying(ctx);
        continue;
      }
      if (sel.includes("Queue")) {
        if (await openQueue(ctx)) return;
        continue;
      }
      if (sel.includes("Search")) {
        if (await openSearch(ctx)) return;
        continue;
      }
      if (sel.includes("NTS")) {
        if (await openNts(ctx)) return;
        continue;
      }
      if (sel.includes("Favorites")) {
        if (
          await browseItems(
            `${I.fav} Favorites`,
            library.favorites,
            ctx,
          )
        ) return;
        continue;
      }
      if (sel.includes("History")) {
        if (
          await browseItems(
            `${I.history} History`,
            library.history,
            ctx,
          )
        ) return;
        continue;
      }
    }
  }

  // ── Polling ──────────────────────────────────────────

  async function poll(): Promise<void> {
    const ctx = getCtx();
    if (pollBusy || !ctx) return;
    const sock = join(homedir(), ".pi", "agent", "music", "mpv.sock");
    if (!existsSync(sock)) return;
    syncFromDisk();
    if (!runtime.current) return;

    pollBusy = true;
    try {
      const snap = await player.getSnapshot();
      lastSnap = snap;
      runtime.paused = snap.paused;
      runtime.lastPositionSeconds = snap.timePosSeconds;
      consecutiveIdle = snap.idle ? consecutiveIdle + 1 : 0;

      // Refresh NTS metadata
      if (
        runtime.current.source === "nts" &&
        runtime.current.ntsChannel
      ) {
        lastNts = await getNtsNowPlaying(
          runtime.current.ntsChannel,
        );
        runtime.current = {
          ...runtime.current,
          artist: lastNts.trackArtist || runtime.current.artist,
          ntsShowTitle:
            lastNts.showTitle || runtime.current.ntsShowTitle,
          sections: lastNts.sections?.length
            ? lastNts.sections
            : runtime.current.sections,
        };
      } else {
        lastNts = undefined;
      }

      // Handle idle (track ended)
      if (lastSnap.idle && runtime.current) {
        const isLive =
          runtime.current.source === "nts" ||
          (!runtime.current.durationSeconds &&
            runtime.current.source === "youtube");
        if (!isLive && consecutiveIdle >= 2) {
          if (runtime.queue.length > 0) {
            await skipToNext(ctx);
          } else {
            clearRuntime();
          }
        }
      }

      saveRuntime(runtime);
    } catch {
      // best-effort
    } finally {
      for (const s of sessions) {
        if (s.hasUI) updateStatus(s);
      }
      pollBusy = false;
    }
  }

  function startPoller(): void {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => void poll(), 3000);
  }

  // ── Terminal shortcut fallbacks (macOS Alt key) ──────

  const RAW = {
    togglePause: "\x1bp",
    seekBack: "\x1b[",
    seekFwd: "\x1b]",
  } as const;

  function installTerminalFallbacks(
    ctx: ExtensionContext,
  ): void {
    removeTerminalListener?.();
    removeTerminalListener = undefined;
    if (!ctx.hasUI) return;

    removeTerminalListener = ctx.ui.onTerminalInput((data) => {
      syncFromDisk();
      if (!runtime.current) return undefined;
      if (data === RAW.togglePause) {
        void togglePause(ctx).catch(() => undefined);
        return { consume: true };
      }
      if (data === RAW.seekBack) {
        void seekRelative(ctx, -10).catch(() => undefined);
        return { consume: true };
      }
      if (data === RAW.seekFwd) {
        void seekRelative(ctx, 10).catch(() => undefined);
        return { consume: true };
      }
      return undefined;
    });
  }

  // ── Quick commands ───────────────────────────────────

  const quick: Record<
    string,
    (ctx: ExtensionContext) => Promise<void>
  > = {
    p: async (ctx) => {
      if (!runtime.current) {
        ctx.ui.notify(`${I.music} Nothing playing`, "info");
        return;
      }
      await togglePause(ctx);
      ctx.ui.notify(
        `${runtime.paused ? I.pause : I.play} ${runtime.paused ? "Paused" : "Resumed"}`,
        "info",
      );
    },
    n: async (ctx) => {
      if (runtime.queue.length > 0) await skipToNext(ctx);
      else ctx.ui.notify(`${I.queue} Queue empty`, "info");
    },
    s: async (ctx) => {
      if (!runtime.current) {
        ctx.ui.notify(`${I.music} Nothing playing`, "info");
        return;
      }
      await stopPlayback(ctx);
    },
    t: async (ctx) => {
      if (runtime.current?.sections?.length) {
        await openTracklist(ctx);
      } else {
        ctx.ui.notify("No tracklist available", "info");
      }
    },
    l: async (ctx) => seekRelative(ctx, -10),
    r: async (ctx) => seekRelative(ctx, 10),
    ll: async (ctx) => seekRelative(ctx, -30),
    rr: async (ctx) => seekRelative(ctx, 30),
  };

  // ── Commands ─────────────────────────────────────────

  pi.registerCommand("music", {
    description: "Open music player or play a URL/search",
    handler: async (args, ctx) => {
      const input = (args || "").trim();
      activeCtx = ctx;
      sessions.add(ctx);
      if (!input) return openMenu(ctx);
      if (input === "tracklist") return openTracklist(ctx);
      if (quick[input]) return quick[input](ctx);
      ctx.ui.notify(`${I.loading} Resolving...`, "info");
      await playInput(input, ctx);
    },
  });

  pi.registerCommand("m", {
    description: "Quick music control (alias for /music)",
    handler: async (args, ctx) => {
      const input = (args || "").trim();
      activeCtx = ctx;
      sessions.add(ctx);
      if (!input) return openMenu(ctx);
      if (quick[input]) return quick[input](ctx);
      if (input.startsWith("http")) {
        ctx.ui.notify(`${I.loading} Resolving...`, "info");
        return void (await playInput(input, ctx));
      }
      return openMenu(ctx);
    },
  });

  // ── Shortcuts ────────────────────────────────────────

  pi.registerShortcut(Key.alt("p"), {
    description: "Toggle music pause",
    handler: async (ctx) => {
      syncFromDisk();
      if (!runtime.current) return;
      await togglePause(ctx);
    },
  });

  pi.registerShortcut(Key.alt("["), {
    description: "Seek music back 10s",
    handler: async (ctx) => {
      syncFromDisk();
      if (!runtime.current) return;
      await seekRelative(ctx, -10);
    },
  });

  pi.registerShortcut(Key.alt("]"), {
    description: "Seek music forward 10s",
    handler: async (ctx) => {
      syncFromDisk();
      if (!runtime.current) return;
      await seekRelative(ctx, 10);
    },
  });

  // ── Events ───────────────────────────────────────────

  function registerSession(ctx: ExtensionContext): void {
    sessions.add(ctx);
    activeCtx = ctx;
    installTerminalFallbacks(ctx);
    updateStatus(ctx);
    startPoller();
    void poll();
  }

  pi.on("session_start", async (_event, ctx) => {
    syncFromDisk();
    registerSession(ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    syncFromDisk();
    registerSession(ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    sessions.delete(ctx);
    if (activeCtx === ctx) {
      activeCtx = sessions.values().next().value;
    }
    if (ctx.hasUI && sessions.size === 0) {
      ctx.ui.setStatus("music", undefined);
    }
    removeTerminalListener?.();
    removeTerminalListener = undefined;
  });
}
