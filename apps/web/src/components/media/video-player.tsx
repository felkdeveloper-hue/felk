import * as React from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  loop?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
}

export function VideoPlayer({
  src,
  poster,
  className,
  loop = false,
  autoPlay = false,
  muted = true,
}: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(autoPlay);
  const [isMuted, setIsMuted] = React.useState(muted);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <div className={cn('bg-foreground group relative overflow-hidden rounded-lg', className)}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        loop={loop}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        className="size-full object-cover"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={togglePlay}
          className="bg-background/90 text-foreground flex size-14 items-center justify-center rounded-full shadow-[var(--shadow-elevated)]"
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
      </div>

      <button
        type="button"
        onClick={toggleMute}
        className="bg-background/90 text-foreground absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full opacity-0 shadow-[var(--shadow-soft)] transition-opacity group-hover:opacity-100"
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
      >
        {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
    </div>
  );
}
