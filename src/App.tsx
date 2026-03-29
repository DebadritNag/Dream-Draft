import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioProvider } from "@/contexts/AudioContext";
import NowPlayingToast from "@/components/NowPlayingToast";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Lobby from "./pages/Lobby.tsx";
import Trivia from "./pages/Trivia.tsx";
import TriviaResults from "./pages/TriviaResults.tsx";
import Draft from "./pages/Draft.tsx";
import Results from "./pages/Results.tsx";
import Profile from "./pages/Profile.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AudioProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <NowPlayingToast />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/lobby" element={<Lobby />} />
              <Route path="/trivia" element={<Trivia />} />
              <Route path="/trivia-results" element={<TriviaResults />} />
              <Route path="/draft" element={<Draft />} />
              <Route path="/results" element={<Results />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </AudioProvider>
  </QueryClientProvider>
);

export default App;
