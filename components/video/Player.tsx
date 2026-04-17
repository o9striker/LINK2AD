"use client";

import React from 'react';
import { Player as RemotionPlayer } from '@remotion/player';
import { ReelComposition, ReelCompositionProps } from './ReelComposition';

export interface PlayerProps {
  scriptData: ReelCompositionProps['scenes'];
  imageUrl?: string;
  backgroundAudioUrl?: string;
  audioStartOffset?: number;
  autoPlay?: boolean;
  aspectRatio?: string;
}

export const Player: React.FC<PlayerProps> = ({
  scriptData,
  imageUrl = "",
  backgroundAudioUrl = "",
  audioStartOffset = 0,
  autoPlay = true,
  aspectRatio = "9:16",
}) => {
  const inputProps = React.useMemo<ReelCompositionProps>(() => ({
    scenes: scriptData,
    imageUrl,
    backgroundAudioUrl: backgroundAudioUrl || undefined,
    audioStartOffset,
  }), [scriptData, imageUrl, backgroundAudioUrl, audioStartOffset]);

  // Calculate total duration across all sequential scenes
  const totalFrames = React.useMemo(() => {
    if (!inputProps.scenes) return 0;
    return inputProps.scenes.reduce((acc, scene) => acc + scene.durationInFrames, 0);
  }, [inputProps.scenes]);

  // Ensure there's a valid frame duration (fallback 30 to avoid crash)
  const durationInFrames = totalFrames > 0 ? totalFrames : 30;

  let compWidth = 1080;
  let compHeight = 1920;
  
  if (aspectRatio === "1:1") {
    compWidth = 1080;
    compHeight = 1080;
  } else if (aspectRatio === "16:9") {
    compWidth = 1920;
    compHeight = 1080;
  }

  return (
    <div className="flex justify-center items-center w-full max-w-sm mx-auto bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl p-2 border border-neutral-700/50">
      <RemotionPlayer
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        component={ReelComposition as React.FC<any>}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        fps={30}
        compositionWidth={compWidth}
        compositionHeight={compHeight}
        style={{
          width: '100%',
          aspectRatio: aspectRatio.replace(':', ' / '),
          borderRadius: '16px',
        }}
        controls
        autoPlay={autoPlay}
        loop
      />
    </div>
  );
};
