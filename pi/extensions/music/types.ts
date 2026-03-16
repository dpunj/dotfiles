export type MusicSource = "youtube" | "spotify" | "nts";

export interface MusicSection {
  startSeconds: number;
  title: string;
  artist?: string;
}

export interface MusicItem {
  id: string;
  source: MusicSource;
  title: string;
  artist?: string;
  album?: string;
  genres?: string[];
  inputUrl: string;
  streamUrl?: string;
  durationSeconds?: number;
  imageUrl?: string;
  ntsChannel?: "1" | "2";
  ntsShowTitle?: string;
  sections?: MusicSection[];
  addedAt: number;
}

export interface MusicLibrary {
  version: 1;
  favorites: MusicItem[];
  history: MusicItem[];
}

export interface MusicRuntimeState {
  version: 1;
  current?: MusicItem;
  queue: MusicItem[];
  paused: boolean;
  lastPositionSeconds?: number;
}

export interface PlayerSnapshot {
  idle: boolean;
  paused: boolean;
  timePosSeconds?: number;
  durationSeconds?: number;
}

export interface NtsNowPlaying {
  channel: "1" | "2";
  showTitle?: string;
  trackTitle?: string;
  trackArtist?: string;
  startTimestamp?: string;
  endTimestamp?: string;
  sections?: MusicSection[];
}
