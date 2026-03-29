import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import song1 from "@/data/song/The Nights.mp3";
import song2 from "@/data/song/Viva la Vida.mp3";
import song3 from "@/data/song/Waka Waka.mp3";
import song4 from "@/data/song/Hall Of Fame.mp3";

const PLAYLIST: { name: string; src: string }[] = [
  { name: "The Nights — Avicii", src: song1 },
  { name: "Viva la Vida — Coldplay", src: song2 },
  { name: "Waka Waka — Shakira", src: song3 },
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackIndexRef = useRef(0);
  const startedRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(() => localStorage.getItem("musicEnabled") !== "false");
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem("isMuted") === "true");
  const [volume, setVolumeState] = useState(() => Number(localStorage.getItem("volumeLevel") ?? 40));
  const [currentTrackName, setCurrentTrackName] = useState("");
  const [nowPlayingToast, setNowPlayingToast] = useState<string | null>(null);

  const getEffectiveVolume = (vol: number, muted: boolean) => muted ? 0 : vol / 100;

  const showToast = (name: string) => {
    setNowPlayingToast(name);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setNowPlayingToast(null), 2500);
  };

  const playTrack = (index: number) => {
    if (PLAYLIST.length === 0) return;
    const track = PLAYLIST[index % PLAYLIST.length];
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = track.src;
    audioRef.current.volume = getEffectiveVolume(volume, isMuted);
    audioRef.current.play().catch(() => {});
    setCurrentTrackName(track.name);
    showToast(track.name);
    trackIndexRef.current = index % PLAYLIST.length;
  };

  const handleEnded = () => playTrack(trackIndexRef.current + 1);

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.addEventListener("ended", handleEnded);
    return () => {
      audioRef.current?.removeEventListener("ended", handleEnded);
      audioRef.current?.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync play/pause
  useEffect(() => {
    localStorage.setItem("musicEnabled", String(isPlaying));
    if (!audioRef.current || PLAYLIST.length === 0) return;
    if (isPlaying && startedRef.current) audioRef.current.play().catch(() => {});
    else if (!isPlaying) audioRef.current.pause();
  }, [isPlaying]);

  // Sync volume + mute
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = getEffectiveVolume(volume, isMuted);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, isMuted]);

  const startMusic = () => {
    if (PLAYLIST.length === 0 || startedRef.current) return;
    startedRef.current = true;
    if (isPlaying) playTrack(0);
  };

  const toggle = () => setIsPlaying((v) => !v);

  const toggleMute = () => {
    setIsMuted((v) => {
      localStorage.setItem("isMuted", String(!v));
      return !v;
    });
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
    localStorage.setItem("volumeLevel", String(v));
  };

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
