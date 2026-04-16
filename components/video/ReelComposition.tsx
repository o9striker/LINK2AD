import React from 'react';
import { AbsoluteFill, Sequence, Img, Audio, useCurrentFrame, interpolate } from 'remotion';

export interface ReelScene {
  textOverlay: string;
  audioUrl: string;
  durationInFrames: number;
}

export interface ReelCompositionProps {
  scenes: ReelScene[];
  imageUrl: string;
}

export const ReelComposition: React.FC<ReelCompositionProps> = ({ scenes, imageUrl }) => {
  let currentTime = 0;

  return (
    <AbsoluteFill className="bg-black">
      {scenes.map((scene, index) => {
        const startFrame = currentTime;
        currentTime += scene.durationInFrames;

        return (
          <Sequence
            key={index}
            from={startFrame}
            durationInFrames={scene.durationInFrames}
          >
            <SceneContent scene={scene} imageUrl={imageUrl} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const SceneContent: React.FC<{ scene: ReelScene; imageUrl: string }> = ({ scene, imageUrl }) => {
  const frame = useCurrentFrame();

  // Ken Burns effect: scale from 1 to 1.1 incrementally via interpolate
  const scale = interpolate(
    frame,
    [0, scene.durationInFrames],
    [1, 1.1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Simple opacity fade-in
  const opacity = interpolate(
    frame,
    [0, 15], // Fade in over 15 frames
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill className="bg-black">
      <AbsoluteFill style={{ 
        transform: `scale(${scale})`, 
        transformOrigin: 'center center',
        background: 'linear-gradient(to bottom, #000000, #333333)'
      }}>
        {imageUrl && (
          <Img
            src={imageUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </AbsoluteFill>
      
      {/* Dimmed overlay for better text readability */}
      <AbsoluteFill className="flex items-center justify-center bg-black/40">
         <h1 
           style={{ opacity }}
           className="text-white text-5xl md:text-7xl font-bold text-center px-8 uppercase drop-shadow-2xl leading-tight"
         >
           {scene.textOverlay}
         </h1>
      </AbsoluteFill>
      
      {/* Audio playback */}
      {scene.audioUrl && <Audio src={scene.audioUrl} />}
    </AbsoluteFill>
  );
};
