import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// ── Import your songs here ──────────────────────────────────────────────────
import song1 from "@/data/song/Avicii - The Nights.mp3";
import song2 from "@/data/song/Coldplay - Viva la Vida.mp3";
import song3 from "@/data/song/Shakira - Waka Waka.mp3";
import song4 from "@/data/song/The Script - Hall Of Fame.mp3";

const PLAYLIST: { name: string; src: string }[] = [
  { name: "The Nights — Avicii", src: song1 },
  { name: "Viva la Vida — Coldplay", src: song2 },
  { name: "Waka Waka — Shakira", src: song3 },
  { name: "Hall of Fame — The Script", src: song4 },
];
// ────────────────────────────────────────────────────────────────────────────

interface AudioContextValue {
  isPlaying: boolean;
  currentTrackName: string;
  nowPlayingToast: string | null;
  toggle: () => void;
  startMusic: () => void;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackIndexRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(() => localStorage.getItem("musicEnabled") !== "false");
  const [currentTrackName, setCurrentTrackName] = useState("");
  const [nowPlayingToast, setNowPlayingToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);

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
    audioRef.current.volume = 0.4;
    audioRef.current.play().catch(() => {}); // browser may block until user gesture
    setCurrentTrackName(track.name);
    showToast(track.name);
    trackIndexRef.current = index % PLAYLIST.length;
  };

  const handleEnded = () => {
    playTrack(trackIndexRef.current + 1);
  };

  // Attach ended listener once
  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.addEventListener("ended", handleEnded);
    return () => {
      audioRef.current?.removeEventListener("ended", handleEnded);
      audioRef.current?.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync play/pause state
  useEffect(() => {
    localStorage.setItem("musicEnabled", String(isPlaying));
    if (!audioRef.current || PLAYLIST.length === 0) return;
    if (isPlaying && startedRef.current) {
      audioRef.current.play().catch(() => {});
    } else if (!isPlaying) {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const startMusic = () => {
    if (PLAYLIST.length === 0 || startedRef.current) return;
    startedRef.current = true;
    if (isPlaying) playTrack(0);
  };

  const toggle = () => setIsPlaying((v) => !v);

  return (
    <AudioCtx.Provider value={{ isPlaying, currentTrackName, nowPlayingToast, toggle, startMusic }}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}
