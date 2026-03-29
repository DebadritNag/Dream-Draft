import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";

import song1 from "@/data/song/Avicii - The Nights.mp3";
import song2 from "@/data/song/Coldplay - Viva la Vida.mp3";
import song3 from "@/data/song/Shakira - Waka Waka.mp3";
import song4 from "@/data/song/The Script - Hall Of Fame.mp3";

const PLAYLIST = [
  { name: "The Nights — Avicii",       src: song1 },
  { name: "Viva la Vida — Coldplay",   src: song2 },
  { name: "Waka Waka — Shakira",       src: song3 },
  { name: "Hall of Fame — The Script", src: song4 },
];

interface AudioContextValue {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTrackName: string;
  nowPlayingToast: string | null;
  toggle: () => void;
  toggleMute: () => void;
  setVolume: (v: number) => void;
  startMusic: () => void;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const trackIndexRef = useRef(0);
  const startedRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(() => localStorage.getItem("musicEnabled") !== "false");
  const [isMuted,   setIsMuted]   = useState(() => localStorage.getItem("isMuted") === "true");
  const [volume,    setVolumeState] = useState(() => Number(localStorage.getItem("volumeLevel") ?? "40"));
  const [currentTrackName, setCurrentTrackName] = useState("");
  const [nowPlayingToast,  setNowPlayingToast]  = useState<string | null>(null);

  // Keep refs in sync so callbacks always see latest values
  const isPlayingRef = useRef(isPlaying);
  const isMutedRef   = useRef(isMuted);
  const volumeRef    = useRef(volume);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isMutedRef.current   = isMuted;   }, [isMuted]);
  useEffect(() => { volumeRef.current    = volume;    }, [volume]);

  const showToast = useCallback((name: string) => {
    setNowPlayingToast(name);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setNowPlayingToast(null), 2500);
  }, []);

  const playTrack = useCallback((index: number) => {
    const track = PLAYLIST[index % PLAYLIST.length];
    const audio = audioRef.current;
    audio.src = track.src;
    audio.volume = isMutedRef.current ? 0 : volumeRef.current / 100;
    audio.play().catch((e) => console.warn("[audio] play blocked:", e));
    trackIndexRef.current = index % PLAYLIST.length;
    setCurrentTrackName(track.name);
    showToast(track.name);
  }, [showToast]);

  // Wire up ended → next track
  useEffect(() => {
    const audio = audioRef.current;
    const onEnded = () => playTrack(trackIndexRef.current + 1);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
  }, [playTrack]);

  // Sync volume/mute to audio element
  useEffect(() => {
    audioRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  // Sync play/pause
  useEffect(() => {
    localStorage.setItem("musicEnabled", String(isPlaying));
    if (!startedRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying]);

  // Start music on first user interaction (browser autoplay policy)
  const startMusic = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (isPlayingRef.current) playTrack(0);
  }, [playTrack]);

  const toggle = useCallback(() => setIsPlaying((v) => !v), []);

  const toggleMute = useCallback(() => {
    setIsMuted((v) => {
      localStorage.setItem("isMuted", String(!v));
      return !v;
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    localStorage.setItem("volumeLevel", String(v));
  }, []);

  return (
    <AudioCtx.Provider value={{ isPlaying, isMuted, volume, currentTrackName, nowPlayingToast, toggle, toggleMute, setVolume, startMusic }}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}
