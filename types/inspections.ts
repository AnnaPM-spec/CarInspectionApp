export interface Photo {
  id: string;
  uri: string;
  timestamp: number;
}

export interface Inspection {
  id: string;
  carBrand: string;
  carModel: string;
  startTime: number;
  endTime?: number;
  photos: Photo[];
  yandexDiskFolderUrl?: string;
  status: 'active' | 'uploading' | 'completed';
}

export interface YandexDiskAuth {
  accessToken: string;
  expiresAt: number;
}
