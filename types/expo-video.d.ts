// types/expo-video.d.ts
declare module 'expo-video' {
  import React from 'react';
  import { StyleProp, ViewStyle } from 'react-native';

  export interface VideoPlayer {
    uri?: string;
    play(): void;
    pause(): void;
    stop(): void;
    seekBy(seconds: number): void;
    seekTo(position: number): void;
    replace(source: string): void;
    replay(): void;
    // Свойства
    playing: boolean;
    loop: boolean;
    volume: number;
    muted: boolean;
    playbackRate: number;
    currentTime: number;
    duration: number;
    // События
    addEventListener(event: string, listener: Function): void;
    removeEventListener(event: string, listener: Function): void;
  }

  export interface VideoViewProps {
    player: VideoPlayer;
    style?: StyleProp<ViewStyle>;
    nativeControls?: boolean;
     fullscreenOptions?: FullscreenOptions;
    allowsPictureInPicture?: boolean;
    contentFit?: 'contain' | 'cover' | 'fill';
    contentPosition?: { dx?: number; dy?: number };
    showsTimecodes?: boolean;
  }

  export const VideoView: React.ComponentType<VideoViewProps>;
  
  export function useVideoPlayer(
    source: string | { uri: string },
    setup?: (player: VideoPlayer) => void
  ): VideoPlayer;

  export function createVideoPlayer(source?: string | { uri: string }): VideoPlayer;

  export const VideoAirPlayButton: React.ComponentType<any>;
  
  // Утилиты
  export function isPictureInPictureSupported(): Promise<boolean>;
  export function clearVideoCacheAsync(): Promise<void>;
  export function setVideoCacheSizeAsync(size: number): Promise<void>;
  export function getCurrentVideoCacheSize(): number;
}