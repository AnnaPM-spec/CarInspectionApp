import { YandexDiskAuth } from '../types/inspections';
import * as FileSystem from 'expo-file-system';

const YANDEX_API_BASE = 'https://cloud-api.yandex.net/v1/disk';

export interface YandexDiskFile {
  name: string;
  path: string;
  type: 'dir' | 'file';
  public_url?: string;
}

// Функция для рекурсивного создания папок (если не существует)
export const ensureFolderExists = async (
  accessToken: string,
  folderPath: string
): Promise<void> => {
  try {
    // Проверяем существует ли папка
    await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(folderPath)}`,
      {
        headers: { Authorization: `OAuth ${accessToken}` },
      }
    );
    // Папка существует, ничего не делаем
    console.log(`Папка ${folderPath} уже существует`);
  } catch (error: any) {
    if (error?.status === 404) {
      // Папка не существует, создаём её
      await fetch(
        `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(folderPath)}`,
        {
          method: 'PUT',
          headers: { Authorization: `OAuth ${accessToken}` },
        }
      );
      console.log(`Папка ${folderPath} создана`);
    } else {
      throw error;
    }
  }
};

export const createFolder = async (
  accessToken: string,
  folderPath: string
): Promise<void> => {
  // Разбиваем путь на части
  const parts = folderPath.split('/').filter(Boolean);
  let currentPath = '';
  
  // Рекурсивно создаём все папки в пути
  for (const part of parts) {
    currentPath += `/${part}`;
    await ensureFolderExists(accessToken, currentPath);
  }
  
  console.log(`Все папки в пути ${folderPath} готовы`);
};
export const uploadFile = async (
  accessToken: string,
  filePath: string,
  localUri: string
): Promise<void> => {
  try {
    // Сначала проверяем, существует ли файл
    const checkResponse = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(filePath)}`,
      {
        headers: { Authorization: `OAuth ${accessToken}` },
      }
    );
    
    if (checkResponse.ok) {
      console.log(`Файл ${filePath} уже существует, пропускаем`);
      return;
    }
  } catch (error: any) {
    if (error?.status !== 404) {
      throw error;
    }
  }
  
  const uploadResponse = await fetch(
    `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=false`,
    {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(`Failed to get upload link: ${JSON.stringify(error)}`);
  }

  const { href } = await uploadResponse.json();

  // Альтернативный способ чтения файла
  const fileBlob = await (await fetch(localUri)).blob();
  
  // Загружаем файл на Яндекс.Диск
  const uploadResult = await fetch(href, {
    method: 'PUT',
    body: fileBlob,
    headers: {
      'Content-Type': fileBlob.type || 'application/octet-stream',
    },
  });

  if (!uploadResult.ok) {
    throw new Error('Failed to upload file');
  }
  
  console.log(`Файл ${filePath} успешно загружен`);
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
