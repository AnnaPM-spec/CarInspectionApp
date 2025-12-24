// @ts-nocheck
// utils/videoStorage.ts - ИСПРАВЛЕННЫЙ С ПРЯМЫМИ ПУТЯМИ
import * as FileSystem from 'expo-file-system';

export class VideoStorage {
  /**
   * Получаем приватную директорию для видео инспекции
   */
  static async getPrivateVideoDir(inspectionId: string): Promise<string> {
    try {
      // Для Android используем прямой путь к кэшу приложения
      let baseDir = '';
      
      if (Platform.OS === 'android') {
        // Android: путь к приватной папке приложения
        baseDir = `file:///data/data/host.exp.exponent/files/`;
      } else {
        // iOS: используем documentDirectory
        baseDir = FileSystem.documentDirectory || '';
      }
      
      if (!baseDir) {
        // Fallback: используем известный путь ImagePicker
        baseDir = 'file:///data/user/0/host.exp.exponent/cache/';
      }
      
      const privateDir = `${baseDir}inspections/${inspectionId}/videos/`;
      console.log('📁 [VideoStorage] Базовая директория:', baseDir);
      console.log('📁 [VideoStorage] Полная директория:', privateDir);
      
      return privateDir;
    } catch (error) {
      console.error('❌ [VideoStorage] Ошибка получения директории:', error);
      throw error;
    }
  }

  /**
   * Копируем видео в приватное хранилище приложения
   */
  static async saveVideoToPrivateStorage(
    systemUri: string,
    inspectionId: string
  ): Promise<{ privateUri: string; fileName: string; fileSize: number }> {
    console.log('📁 [VideoStorage] Сохраняем видео в приватное хранилище...');

    try {
      // УПРОЩЁННЫЙ ПОДХОД: используем тот же каталог ImagePicker, но свою структуру
      const baseDir = 'file:///data/user/0/host.exp.exponent/cache/private_videos/';
      const privateDir = `${baseDir}${inspectionId}/`;
      const fileName = `video_${Date.now()}.mp4`;
      const privateUri = privateDir + fileName;
      
      console.log('📁 [VideoStorage] Приватный URI:', privateUri);

      // 1. Создаём директорию
      await FileSystem.makeDirectoryAsync(privateDir, { intermediates: true });
      
      // 2. Копируем файл
      await FileSystem.copyAsync({
        from: systemUri,
        to: privateUri,
      });
      
      console.log('✅ [VideoStorage] Видео скопировано!');

      return { 
        privateUri, 
        fileName, 
        fileSize: 0 // Пока пропускаем размер файла
      };

    } catch (error) {
      console.error('❌ [VideoStorage] Ошибка:', error);
      throw new Error(`Не удалось сохранить видео: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}