"use client";

import React from 'react';
import { Player as RemotionPlayer } from '@remotion/player';
import { ReelComposition, ReelCompositionProps } from './ReelComposition';

export interface PlayerProps {
  scriptData: ReelCompositionProps['scenes'];
  imageUrl?: string;
  autoPlay?: boolean;
}

export const Player: React.FC<PlayerProps> = ({ scriptData, imageUrl = "", autoPlay = true }) => {
  const inputProps = React.useMemo<ReelCompositionProps>(() => ({
    scenes: scriptData,
    imageUrl: imageUrl
  }), [scriptData, imageUrl]);

  // Calculate total duration across all sequential scenes
  const totalFrames = React.useMemo(() => {
    if (!inputProps.scenes) return 0;
    return inputProps.scenes.reduce((acc, scene) => acc + scene.durationInFrames, 0);
  }, [inputProps.scenes]);

  // Ensure there's a valid frame duration (fallback 30 to avoid crash)
  const durationInFrames = totalFrames > 0 ? totalFrames : 30;

  return (
    <div className="flex justify-center items-center w-full max-w-sm mx-auto bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl p-2 border border-neutral-700/50">
      <RemotionPlayer
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        component={ReelComposition as React.FC<any>}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        fps={30}
        compositionWidth={1080}
        compositionHeight={1920}
        style={{
          width: '100%',
          aspectRatio: '9 / 16',
          borderRadius: '16px',
        }}
        controls
        autoPlay={autoPlay}
        loop
      />
    </div>
  );
};
