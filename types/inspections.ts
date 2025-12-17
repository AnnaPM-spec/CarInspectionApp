export interface Photo {
  id: string;
  uri: string;
  timestamp: number;
}

export interface Video {
  id: string;
  uri: string;
  timestamp: number;
  duration?: number;
}

export type Media = Photo | Video;

export function isVideo(media: Media): media is Video {
  return 'duration' in media || media.uri.includes('.mp4') || media.uri.includes('.mov');
}

export interface Inspection {
  id: string;
  carBrand: string;
  carModel: string;
  startTime: number;
  endTime?: number;
  photos: Photo[];
  videos: Video[];
  yandexDiskFolderUrl?: string;
  status: 'active' | 'uploading' | 'completed';
}

export interface YandexDiskAuth {
  accessToken: string;
  expiresAt: number;
}
