import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type {
  MusicItem,
  MusicLibrary,
  MusicRuntimeState,
} from "./types";

const MUSIC_DIR = join(homedir(), ".pi", "agent", "music");
const LIBRARY_PATH = join(MUSIC_DIR, "library.json");
const RUNTIME_PATH = join(MUSIC_DIR, "runtime.json");
const MAX_HISTORY = 200;

function ensureDir(): void {
  mkdirSync(MUSIC_DIR, { recursive: true });
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir();
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  renameSync(tmp, filePath);
}

function normalize(item: MusicItem): MusicItem {
  return { ...item, addedAt: item.addedAt || Date.now() };
}

function dedupe(items: MusicItem[]): MusicItem[] {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      if (seen.has(item.inputUrl)) return false;
      seen.add(item.inputUrl);
      return true;
    })
    .map(normalize);
}

export function emptyLibrary(): MusicLibrary {
  return { version: 1, favorites: [], history: [] };
}

export function emptyRuntime(): MusicRuntimeState {
  return { version: 1, queue: [], paused: false };
}

export function loadLibrary(): MusicLibrary {
  const lib = readJson<MusicLibrary>(LIBRARY_PATH, emptyLibrary());
  return {
    version: 1,
    favorites: dedupe(lib.favorites || []),
    history: dedupe(lib.history || []).slice(0, MAX_HISTORY),
  };
}

export function saveLibrary(lib: MusicLibrary): void {
  writeJson(LIBRARY_PATH, {
    version: 1,
    favorites: dedupe(lib.favorites),
    history: dedupe(lib.history).slice(0, MAX_HISTORY),
  });
}

export function loadRuntime(): MusicRuntimeState {
  const rt = readJson<MusicRuntimeState>(
    RUNTIME_PATH,
    emptyRuntime(),
  );
  return {
    version: 1,
    current: rt.current ? normalize(rt.current) : undefined,
    queue: dedupe(rt.queue || []),
    paused: Boolean(rt.paused),
    lastPositionSeconds: rt.lastPositionSeconds,
  };
}

export function saveRuntime(rt: MusicRuntimeState): void {
  writeJson(RUNTIME_PATH, {
    version: 1,
    current: rt.current ? normalize(rt.current) : undefined,
    queue: dedupe(rt.queue),
    paused: rt.paused,
    lastPositionSeconds: rt.lastPositionSeconds,
  });
}

export function addToHistory(
  lib: MusicLibrary,
  item: MusicItem,
): MusicLibrary {
  const history = [
    normalize(item),
    ...lib.history.filter((e) => e.inputUrl !== item.inputUrl),
  ].slice(0, MAX_HISTORY);
  return { ...lib, history };
}

export function isFavorite(
  lib: MusicLibrary,
  item: MusicItem,
): boolean {
  return lib.favorites.some((e) => e.inputUrl === item.inputUrl);
}

export function toggleFavorite(
  lib: MusicLibrary,
  item: MusicItem,
): MusicLibrary {
  if (isFavorite(lib, item)) {
    return {
      ...lib,
      favorites: lib.favorites.filter(
        (e) => e.inputUrl !== item.inputUrl,
      ),
    };
  }
  return {
    ...lib,
    favorites: [
      normalize(item),
      ...lib.favorites.filter(
        (e) => e.inputUrl !== item.inputUrl,
      ),
    ],
  };
}
