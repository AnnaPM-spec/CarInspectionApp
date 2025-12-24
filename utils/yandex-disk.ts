import { YandexDiskAuth } from '../types/inspections';

const YANDEX_API_BASE = 'https://cloud-api.yandex.net/v1/disk';

export interface YandexDiskFile {
  name: string;
  path: string;
  type: 'dir' | 'file';
  public_url?: string;
}



export const createFolder = async (
  auth: YandexDiskAuth,
  folderPath: string
): Promise<void> => {
  const response = await fetch(`${YANDEX_API_BASE}/resources?path=${encodeURIComponent(folderPath)}`, {
    method: 'PUT',
    headers: {
      Authorization: `OAuth ${auth.accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create folder: ${error}`);
  }
};

export const uploadFile = async (
  auth: YandexDiskAuth,
  filePath: string,
  fileUri: string
): Promise<void> => {
  const uploadUrlResponse = await fetch(
    `${YANDEX_API_BASE}/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=true`,
    {
      headers: {
        Authorization: `OAuth ${auth.accessToken}`,
      },
    }
  );

  if (!uploadUrlResponse.ok) {
    throw new Error('Failed to get upload URL');
  }

  const { href } = await uploadUrlResponse.json();

  const fileResponse = await fetch(fileUri);
  const fileBlob = await fileResponse.blob();

  const uploadResponse = await fetch(href, {
    method: 'PUT',
    body: fileBlob,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file');
  }
};

export const publishFolder = async (
  auth: YandexDiskAuth,
  folderPath: string
): Promise<string> => {
  const response = await fetch(
    `${YANDEX_API_BASE}/resources/publish?path=${encodeURIComponent(folderPath)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `OAuth ${auth.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to publish folder');
  }

  const resourceResponse = await fetch(
    `${YANDEX_API_BASE}/resources?path=${encodeURIComponent(folderPath)}`,
    {
      headers: {
        Authorization: `OAuth ${auth.accessToken}`,
      },
    }
  );

  if (!resourceResponse.ok) {
    throw new Error('Failed to get folder info');
  }

  const data = await resourceResponse.json();
  return data.public_url;
};

export const formatFolderName = (carBrand: string, carModel: string, timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}_${carBrand}_${carModel}`;
};
