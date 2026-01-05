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
): Promise<boolean> => {
  console.log(`🔄 Создаем/проверяем папку: "${folderPath}"`);
  
  // Разбиваем путь на части и создаем рекурсивно
  const parts = folderPath.split('/').filter(Boolean);
  let currentPath = '';
  
  for (const part of parts) {
    currentPath += `/${part}`;
    
    try {
      // 1. Пытаемся создать папку
      const createResponse = await fetch(
        `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(currentPath)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `OAuth ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        }
      );
      
      if (createResponse.ok) {
        console.log(`✅ Папка "${currentPath}" создана`);
      } else if (createResponse.status === 409) {
        console.log(`⚠️ Папка "${currentPath}" уже существует`);
      } else {
        const error = await createResponse.json();
        console.error(`❌ Ошибка создания папки "${currentPath}":`, error);
        throw new Error(`Failed to create folder: ${JSON.stringify(error)}`);
      }
      
      // 2. Сразу проверяем, что папка доступна
      await new Promise(resolve => setTimeout(resolve, 300)); // Небольшая задержка
      
      const checkResponse = await fetch(
        `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(currentPath)}&fields=name,path,type`,
        {
          headers: {
            Authorization: `OAuth ${accessToken}`,
            'Accept': 'application/json'
          },
        }
      );
      
      if (!checkResponse.ok) {
        console.warn(`⚠️ Папка "${currentPath}" создана, но недоступна для чтения`);
      } else {
        const data = await checkResponse.json();
        console.log(`✅ Папка "${currentPath}" доступна:`, data);
      }
      
    } catch (error) {
      console.error(`❌ Критическая ошибка для папки "${currentPath}":`, error);
      throw error;
    }
  }
  
  return true;
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
    console.log(`🔄 Начинаем загрузку файла: ${filePath}`);
    console.log(`🔄 Локальный URI: ${localUri}`);
    
    // 1. Получаем ссылку для загрузки
    const uploadResponse = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=false`,
      {
        headers: {
          Authorization: `OAuth ${accessToken}`,
          'Accept': 'application/json'
        },
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      console.error(`❌ Ошибка получения ссылки для ${filePath}:`, error);
      throw new Error(`Failed to get upload link: ${JSON.stringify(error)}`);
    }

    const { href } = await uploadResponse.json();
    console.log(`✅ Получена ссылка для загрузки: ${href.substring(0, 50)}...`);

    // 2. Читаем файл через expo-file-system (ПРАВИЛЬНЫЙ СПОСОБ)
    console.log(`📥 Читаем локальный файл...`);

    // СПОСОБ 1: Если EncodingType доступен
    let fileContent: string;
    try {
      // Пробуем прочитать как base64 (используем строку 'base64' вместо EncodingType.Base64)
      fileContent = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64' as any, // Используем строку вместо enum
      });
    } catch (readError) {
      console.error('❌ Ошибка чтения файла:', readError);
      throw new Error('Не удалось прочитать файл');
    }
    
    // 3. Конвертируем base64 в ArrayBuffer
    const base64Data = fileContent;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    // 4. Загружаем файл на Яндекс.Диск
    console.log(`🔼 Загружаем файл на Яндекс.Диск...`);
    const uploadResult = await fetch(href, {
      method: 'PUT',
      body: byteArray,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': byteArray.length.toString(),
      },
    });

    if (!uploadResult.ok) {
      console.error(`❌ Ошибка загрузки файла ${filePath}:`, uploadResult.status, uploadResult.statusText);
      const errorText = await uploadResult.text();
      console.error(`❌ Детали ошибки:`, errorText.substring(0, 200));
      throw new Error(`Failed to upload file: ${uploadResult.status} ${uploadResult.statusText}`);
    }
    
    console.log(`✅ Файл ${filePath} успешно загружен`);
  } catch (error) {
    console.error(`❌ Критическая ошибка загрузки файла ${filePath}:`, error);
    throw error;
  }
};

// Альтернативная версия uploadFile с определением типа файла
export const uploadFileWithMimeType = async (
  accessToken: string,
  filePath: string,
  localUri: string,
  mimeType: string = 'application/octet-stream'
): Promise<void> => {
  try {
    console.log(`🔄 Начинаем загрузку файла: ${filePath}`);
    
    // 1. Получаем ссылку для загрузки
    const uploadResponse = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${encodeURIComponent(filePath)}&overwrite=false`,
      {
        headers: {
          Authorization: `OAuth ${accessToken}`,
          'Accept': 'application/json'
        },
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(`Failed to get upload link: ${JSON.stringify(error)}`);
    }

    const { href } = await uploadResponse.json();

    // 2. Читаем файл через expo-file-system
    const fileContent = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64' as any,
    });
    
    // 3. Конвертируем base64 в ArrayBuffer
    const byteCharacters = atob(fileContent);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }
    
    // 4. Загружаем файл
    const uploadResult = await fetch(href, {
      method: 'PUT',
      body: byteArray,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': byteArray.length.toString(),
      },
    });

    if (!uploadResult.ok) {
      const errorText = await uploadResult.text();
      throw new Error(`Upload failed: ${uploadResult.status} - ${errorText}`);
    }
    
    console.log(`✅ Файл успешно загружен`);
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
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

export const formatFolderName = (inspectionName: string, timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  // Оставляем русские буквы, убираем только спецсимволы
  const safeName = inspectionName
    .trim()
    .replace(/[^a-zA-Zа-яА-Я0-9\s_-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30);

  const finalName = safeName || 'Осмотр';

  return `${year}-${month}-${day}_${hours}-${minutes}_${finalName}`;
};

// Функция для проверки пути
export const checkPathExists = async (
  accessToken: string,
  path: string
): Promise<boolean> => {
  try {
    console.log(`🔍 Проверяем путь: ${path}`);
    console.log(`🔍 Закодированный путь: ${encodeURIComponent(path)}`);
    
    const response = await fetch(
      `https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(path)}`,
      {
        headers: { 
          Authorization: `OAuth ${accessToken}`,
          'Accept': 'application/json'
        },
      }
    );
    
    console.log(`🔍 Статус ответа: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Путь существует:`, data);
      return true;
    } else {
      const error = await response.json();
      console.log(`❌ Путь не существует:`, error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Ошибка проверки пути:`, error);
    return false;
  }
};