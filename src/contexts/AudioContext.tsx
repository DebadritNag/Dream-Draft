import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import song1 from "@/data/song/Hall Of Fame.mp3";
import song2 from "@/data/song/The Nights.mp3";
import song3 from "@/data/song/Viva la Vida.mp3";
import song4 from "@/data/song/Waka Waka.mp3";

const PLAYLIST = [
  { src: song1, name: "Hall Of Fame" },
  { src: song2, name: "The Nights" },
  { src: song3, name: "Viva la Vida" },
  { src: song4, name: "Waka Waka" },
];

interface AudioContextValue {
  isMusicOn: boolean;
  isMuted: boolean;
  volume: number;
  currentTrackName: string;
  nowPlayingToast: string | null;
  setMusicOn: (v: boolean) => void;
  setMuted: (v: boolean) => void;
  setVolume: (v: number) => void;
  nextTrack: () => void;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackIndexRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isMusicOn, setMusicOnState] = useState(() => localStorage.getItem("musicEnabled") !== "false");
  const [isMuted, setMutedState] = useState(() => localStorage.getItem("isMuted") === "true");
  const [volume, setVolumeState] = useState(() => Number(localStorage.getItem("volumeLevel") ?? 70));
  const [currentTrackName, setCurrentTrackName] = useState(PLAYLIST[0].name);
  const [nowPlayingToast, setNowPlayingToast] = useState<string | null>(null);

  // Stable toast function via ref
  const showToastRef = useRef((name: string) => {
    setNowPlayingToast(name);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setNowPlayingToast(null), 2000);
  });

  // Init audio element once
  useEffect(() => {
    const audio = new Audio(PLAYLIST[0].src);
    audio.volume = isMuted ? 0 : volume / 100;
    audio.loop = false;
    audioRef.current = audio;

    // Auto-advance to next song when current ends
    const handleEnded = () => {
      trackIndexRef.current = (trackIndexRef.current + 1) % PLAYLIST.length;
      const next = PLAYLIST[trackIndexRef.current];
      audio.src = next.src;
      audio.load();
      setCurrentTrackName(next.name);
      showToastRef.current(next.name);
      audio.play().catch(() => {});
    };

    audio.addEventListener("ended", handleEnded);

    // Start on first user interaction (browser autoplay policy)
    const startOnInteraction = () => {
      audio.play()
        .then(() => showToastRef.current(PLAYLIST[trackIndexRef.current].name))
        .catch(() => {});
      document.removeEventListener("click", startOnInteraction);
      document.removeEventListener("keydown", startOnInteraction);
    };
    document.addEventListener("click", startOnInteraction);
    document.addEventListener("keydown", startOnInteraction);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      document.removeEventListener("click", startOnInteraction);
      document.removeEventListener("keydown", startOnInteraction);
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play/pause when isMusicOn or isMuted changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMusicOn && !isMuted) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    localStorage.setItem("musicEnabled", String(isMusicOn));
  }, [isMusicOn, isMuted]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume / 100;
    localStorage.setItem("volumeLevel", String(volume));
    localStorage.setItem("isMuted", String(isMuted));
  }, [volume, isMuted]);

  const nextTrack = () => {
    const audio = audioRef.current;
    if (!audio) return;
    trackIndexRef.current = (trackIndexRef.current + 1) % PLAYLIST.length;
    const next = PLAYLIST[trackIndexRef.current];
    audio.src = next.src;
    audio.load();
    setCurrentTrackName(next.name);
    showToastRef.current(next.name);
    if (isMusicOn && !isMuted) audio.play().catch(() => {});
  };

  return (
    <AudioCtx.Provider value={{
      isMusicOn, isMuted, volume, currentTrackName, nowPlayingToast,
      setMusicOn: setMusicOnState,
      setMuted: setMutedState,
      setVolume: setVolumeState,
      nextTrack,
    }}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}
