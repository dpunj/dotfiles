import { execFile, spawn, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import { promisify } from "node:util";

import type { MusicItem, PlayerSnapshot } from "./types";

const MUSIC_DIR = join(homedir(), ".pi", "agent", "music");
const SOCKET_PATH = join(MUSIC_DIR, "mpv.sock");
const VERSION_PATH = join(MUSIC_DIR, "mpv.version");
const CONFIG_VERSION = "3";
const execFileAsync = promisify(execFile);
let mpvCheck: Promise<void> | undefined;

interface MpvResponse {
  request_id?: number;
  error?: string;
  data?: unknown;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

class MusicPlayer {
  private process?: ChildProcess;
  private requestId = 1;
  private socket?: net.Socket;
  private socketConnected = false;
  private pending = new Map<number, PendingRequest>();
  private buffer = "";

  private ensureDir(): void {
    mkdirSync(MUSIC_DIR, { recursive: true });
  }

  private isAlive(): boolean {
    const pid = this.process?.pid;
    if (!pid) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private async waitForSocket(timeoutMs = 4000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (existsSync(SOCKET_PATH)) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("mpv IPC socket did not appear");
  }

  private hasExpectedConfig(): boolean {
    try {
      return (
        existsSync(VERSION_PATH) &&
        readFileSync(VERSION_PATH, "utf8").trim() === CONFIG_VERSION
      );
    } catch {
      return false;
    }
  }

  private async ensureMpvAvailable(): Promise<void> {
    mpvCheck ??= execFileAsync("mpv", ["--version"], {
      timeout: 5_000,
    })
      .then(() => undefined)
      .catch(() => {
        throw new Error(
          "mpv is required for music playback. " +
            "Install with: brew install mpv",
        );
      });
    return await mpvCheck;
  }

  private async isSocketResponsive(): Promise<boolean> {
    if (!existsSync(SOCKET_PATH)) return false;
    return new Promise((resolve) => {
      const sock = net.createConnection(SOCKET_PATH);
      const done = (result: boolean) => {
        sock.removeAllListeners();
        if (!sock.destroyed) sock.destroy();
        resolve(result);
      };
      sock.setTimeout(1000, () => done(false));
      sock.on("error", () => done(false));
      sock.on("connect", () => {
        const cmd = JSON.stringify({
          command: ["get_property", "idle-active"],
          request_id: -1,
        });
        sock.write(`${cmd}\n`);
      });
      sock.on("data", () => done(true));
    });
  }

  async ensureStarted(): Promise<void> {
    this.ensureDir();
    await this.ensureMpvAvailable();

    if (
      this.isAlive() &&
      existsSync(SOCKET_PATH) &&
      this.hasExpectedConfig()
    ) {
      return;
    }

    if (
      !this.isAlive() &&
      existsSync(SOCKET_PATH) &&
      this.hasExpectedConfig()
    ) {
      if (await this.isSocketResponsive()) return;
    }

    if (this.isAlive()) await this.shutdown();
    if (existsSync(SOCKET_PATH)) rmSync(SOCKET_PATH, { force: true });

    const child = spawn(
      "mpv",
      [
        "--idle=yes",
        "--no-terminal",
        "--audio-display=no",
        "--force-window=no",
        "--vid=no",
        "--ytdl=yes",
        "--ytdl-format=bestaudio/best",
        "--script-opts=ytdl_hook-ytdl_path=yt-dlp",
        `--input-ipc-server=${SOCKET_PATH}`,
      ],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
    this.process = child;
    await this.waitForSocket();
    writeFileSync(VERSION_PATH, CONFIG_VERSION);
  }

  private disconnectSocket(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      if (!this.socket.destroyed) this.socket.destroy();
      this.socket = undefined;
      this.socketConnected = false;
      this.buffer = "";
    }
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error("Socket disconnected"));
      this.pending.delete(id);
    }
  }

  private ensureConnected(): Promise<void> {
    if (this.socket && this.socketConnected) {
      return Promise.resolve();
    }
    this.disconnectSocket();

    return new Promise((resolve, reject) => {
      const socket = net.createConnection(SOCKET_PATH);
      this.socket = socket;

      socket.on("connect", () => {
        this.socketConnected = true;
        resolve();
      });

      socket.on("data", (chunk) => {
        this.buffer += chunk.toString("utf8");
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let resp: MpvResponse;
          try {
            resp = JSON.parse(line) as MpvResponse;
          } catch {
            continue;
          }
          if (resp.request_id === undefined) continue;
          const p = this.pending.get(resp.request_id);
          if (!p) continue;
          this.pending.delete(resp.request_id);
          clearTimeout(p.timer);
          if (resp.error && resp.error !== "success") {
            p.reject(new Error(`mpv: ${resp.error}`));
          } else {
            p.resolve(resp.data);
          }
        }
      });

      socket.on("error", (err) => {
        this.disconnectSocket();
        reject(err);
      });
      socket.on("close", () => this.disconnectSocket());
    });
  }

  private async request(command: unknown[]): Promise<unknown> {
    await this.ensureStarted();
    await this.ensureConnected();
    const id = this.requestId++;
    const socket = this.socket;
    if (!socket || !this.socketConnected) {
      throw new Error("Socket not connected");
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("mpv IPC request timed out"));
      }, 2500);
      this.pending.set(id, { resolve, reject, timer });
      socket.write(
        `${JSON.stringify({ command, request_id: id })}\n`,
      );
    });
  }

  private async prop<T>(name: string): Promise<T | undefined> {
    try {
      return (await this.request(["get_property", name])) as T;
    } catch {
      return undefined;
    }
  }

  async play(item: MusicItem): Promise<void> {
    const target = item.streamUrl || item.inputUrl;
    if (!target) throw new Error("Missing playback target");
    await this.request(["loadfile", target, "replace"]);
  }

  async togglePause(): Promise<boolean> {
    const paused = Boolean(
      await this.request(["get_property", "pause"]),
    );
    await this.request(["set_property", "pause", !paused]);
    return !paused;
  }

  async stop(): Promise<void> {
    await this.request(["stop"]);
  }

  async seek(positionSeconds: number): Promise<void> {
    try {
      await this.request([
        "set_property",
        "time-pos",
        positionSeconds,
      ]);
    } catch {
      await this.request(["seek", positionSeconds, "absolute"]);
    }
  }

  async getSnapshot(): Promise<PlayerSnapshot> {
    return {
      idle: Boolean(await this.prop<boolean>("idle-active")),
      paused: Boolean(await this.prop<boolean>("pause")),
      timePosSeconds:
        (await this.prop<number>("time-pos")) ?? undefined,
      durationSeconds:
        (await this.prop<number>("duration")) ?? undefined,
    };
  }

  async shutdown(): Promise<void> {
    this.disconnectSocket();
    try {
      await new Promise<void>((resolve) => {
        if (!existsSync(SOCKET_PATH)) {
          resolve();
          return;
        }
        const sock = net.createConnection(SOCKET_PATH);
        sock.on("connect", () => {
          const cmd = JSON.stringify({
            command: ["quit"],
            request_id: 0,
          });
          sock.write(`${cmd}\n`);
          sock.destroy();
          resolve();
        });
        sock.on("error", () => {
          sock.destroy();
          resolve();
        });
        sock.setTimeout(1000, () => {
          sock.destroy();
          resolve();
        });
      });
    } catch {
      // ignore
    }
    const pid = this.process?.pid;
    if (pid) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // ignore
      }
    }
    this.process = undefined;
    if (existsSync(SOCKET_PATH)) {
      rmSync(SOCKET_PATH, { force: true });
    }
    if (existsSync(VERSION_PATH)) {
      rmSync(VERSION_PATH, { force: true });
    }
  }
}

declare global {
  var __piMusicPlayer: MusicPlayer | undefined;
}

export function getMusicPlayer(): MusicPlayer {
  globalThis.__piMusicPlayer ??= new MusicPlayer();
  return globalThis.__piMusicPlayer;
}
