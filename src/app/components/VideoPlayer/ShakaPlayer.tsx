"use client";
import { useEffect, useRef, useState } from "react";
import shaka from "shaka-player";

// Define the type for Shaka error event
interface ShakaErrorEvent extends Event {
  detail: {
    code: number;
    severity: shaka.util.Error.Severity;
    category: shaka.util.Error.Category;
    message: string;
    data?: any[];
  };
}

export default function ShakaPlayer({ playbackId }: { playbackId: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<shaka.Player | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (!shaka.Player.isBrowserSupported()) {
      setError("Browser not supported for video playback");
      return;
    }

    const player = new shaka.Player(videoRef.current);
    playerRef.current = player;

    // Properly typed error handler
    player.addEventListener('error', (event: Event) => {
      const shakaError = event as ShakaErrorEvent;
      console.error('Shaka Player Error:', shakaError.detail);
      setError(`Playback error: ${shakaError.detail.message}`);
    });

    player.addEventListener('loading', () => {
      setReady(false);
      setError(null);
    });

    const src = `https://stream.mux.com/${playbackId}.m3u8`;
    
    player.load(src)
      .then(() => {
        setReady(true);
        setError(null);
        console.log('Shaka Player loaded successfully');
      })
      .catch((error: Error) => {
        console.error('Error loading Shaka Player:', error);
        setError(`Failed to load video: ${error.message}`);
      });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [playbackId]);

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative">
      <video 
        ref={videoRef} 
        className="w-full h-full" 
        controls 
        autoPlay 
        playsInline 
        muted
      />
      
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-4 text-white bg-black bg-opacity-50 rounded">
            Loading…
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-4 text-white bg-red-600 rounded text-center">
            {error}
            <br />
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-4 py-2 bg-white text-black rounded"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}