import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Camera,
  Upload,
  Share2,
  ExternalLink,
  Trash2,
  Clock,
  CheckCircle2,
  PlayCircle,
} from 'lucide-react-native';
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { VideoView, createVideoPlayer } from 'expo-video';
import { Photo, Video as InspectionVideo } from '../../types/inspections';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInspections } from '../../context/InspectionContext';
import {
  createFolder,
  uploadFile,
  publishFolder,
  formatFolderName,
  ensureFolderExists,
  checkPathExists
} from '../../utils/yandex-disk';
import { RenameModal } from '../components/RenameModal';
import { checkConnectionWithAlert } from '../../utils/network';
import Toast from 'react-native-toast-message';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { ApplicationError, ErrorType } from '../../utils/errorHandler';
import ErrorDisplay from '../components/ErrorDisplay';
import type { AppError } from '../../utils/errorHandler';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 60) / 3;

export default function InspectionDetailsScreen() {
  const [displayError, setDisplayError] = useState<AppError | null>(null);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { 
        inspections, 
        yandexAuth, 
        completeInspection, 
        updateInspectionStatus, 
        deleteInspection,
        renameInspection,
        uploadingInspections,
        startUpload,
        finishUpload,
        cancelUpload
      } = useInspections(); 

  const { handleOperation, isLoading: isErrorHandlerLoading } = useErrorHandler();

  // Функция для отображения ошибки
  const showError = (error: AppError) => {
    setDisplayError(error);
  };
  
  // Функция для скрытия ошибки
  const dismissError = () => {
    setDisplayError(null);
  };
  
  // Функция для повтора операции (например, загрузки)
  const retryUpload = () => {
    setDisplayError(null);
    uploadToYandexDisk();
  };

  const inspection = inspections.find(i => i.id === id);

  
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({
  current: 0,
  total: 0,
  });

  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);

  //const isUploading = uploadingInspections.includes(inspection?.id || '');

  const videoPlayers = useMemo(() => {
    console.log('Creating video players for:', inspection?.videos.length, 'videos');
    if (!inspection?.videos) return [];
    
    return inspection.videos.map(video => {
      try {
        const player = createVideoPlayer(video.uri);
        player.loop = false;
        player.volume = 1.0;
        // Не начинаем воспроизведение автоматически
        return player;
      } catch (error) {
        console.error('Failed to create video player:', error);
        return null;
      }
    }).filter(Boolean); // Убираем null
  }, [inspection?.videos]); // Зависимость только от videos

      useEffect(() => {
      return () => {
        console.log('Cleaning up', videoPlayers.length, 'video players');
        videoPlayers.forEach(player => player?.pause());
      };
    }, [videoPlayers]);

  if (!inspection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.fullScreenErrorContainer}>
          <Text style={styles.errorText}>Осмотр не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleAddPhoto = () => {
    if (inspection.status !== 'active') {
      Alert.alert('Ошибка', 'Нельзя добавить фото в завершенный осмотр');
      return;
    }
    router.push(`/camera?inspectionId=${inspection.id}`);
  };

   const uploadToYandexDisk = async () => {
    if (!yandexAuth) {
      Alert.alert('Ошибка', 'Необходима авторизация Яндекс.Диск');
      return;
    }

    // Используем handleOperation для обработки всей загрузки с автоматической обработкой ошибок
    await handleOperation(
      async () => {
        // 1. Проверка интернета
        console.log('📶 Проверяем интернет-соединение...');
        const hasInternet = await checkConnectionWithAlert();
        
        if (!hasInternet) {
          throw new ApplicationError(
            ErrorType.NETWORK,
            'Нет интернет-соединения для загрузки файлов'
          );
        }
        
        console.log('✅ Интернет-соединение есть, продолжаем загрузку...');
        
        // 2. Начинаем загрузку
        startUpload(inspection.id);
        const totalMedia = inspection.photos.length + inspection.videos.length;
        setUploadProgress({ current: 0, total: totalMedia });
        updateInspectionStatus(inspection.id, 'uploading');

        const folderName = formatFolderName(
          inspection.carBrand || inspection.carModel || 'Осмотр',
          inspection.startTime
        );
        const folderPath = `/Осмотры/${folderName}`;

        console.log('📁 ========= НАЧАЛО ЗАГРУЗКИ =========');
        console.log('📁 Имя папки:', folderName);
        console.log('📁 Полный путь:', folderPath);
        console.log('📁 Количество файлов:', totalMedia);

        if (Platform.OS === 'web') {
          // Демо-режим для веб
          await new Promise(resolve => setTimeout(resolve, 2000));
          const demoUrl = `https://disk.yandex.ru/d/demo_${inspection.id}`;
          completeInspection(inspection.id, demoUrl);
          return { success: true, url: demoUrl, isDemo: true };
        } else {
          // РЕАЛЬНАЯ ЗАГРУЗКА
          
          // 1. Создаем папки
          console.log('1️⃣ Проверяем/создаем папки...');
          await ensureFolderExists(yandexAuth.accessToken, '/Осмотры');
          await ensureFolderExists(yandexAuth.accessToken, folderPath);
          
          // 2. Ждем 1 секунду
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 3. Загружаем фото
          console.log(`2️⃣ Загружаем ${inspection.photos.length} фото...`);
          let uploadedPhotos = 0;
          let photoErrors: string[] = [];
          
          for (let i = 0; i < inspection.photos.length; i++) {
            const photo = inspection.photos[i];
            const fileName = `photo_${String(i + 1).padStart(3, '0')}.jpg`;
            const filePath = `${folderPath}/${fileName}`;
            
            try {
              await uploadFile(yandexAuth.accessToken, filePath, photo.uri);
              uploadedPhotos++;
            } catch (error: any) {
              console.warn(`❌ Ошибка загрузки фото ${i + 1}:`, error.message);
              photoErrors.push(`Фото ${i + 1}: ${error.message}`);
            }
            
            setUploadProgress(prev => ({
              ...prev,
              current: prev.current + 1
            }));
          }

          // 4. Загружаем видео
          let uploadedVideos = 0;
          let videoErrors: string[] = [];
          
          if (inspection.videos.length > 0) {
            console.log(`3️⃣ Загружаем ${inspection.videos.length} видео...`);
            for (let i = 0; i < inspection.videos.length; i++) {
              const video = inspection.videos[i];
              const fileName = `video_${String(i + 1).padStart(3, '0')}.mp4`;
              const filePath = `${folderPath}/${fileName}`;

              try {
                await uploadFile(yandexAuth.accessToken, filePath, video.uri);
                uploadedVideos++;
              } catch (error: any) {
                console.warn(`❌ Ошибка загрузки видео ${i + 1}:`, error.message);
                videoErrors.push(`Видео ${i + 1}: ${error.message}`);
              }
              
              setUploadProgress(prev => ({
                ...prev,
                current: prev.current + 1
              }));
            }
          }

          // 5. Проверяем, загружено ли что-то
          if (uploadedPhotos === 0 && uploadedVideos === 0) {
            throw new ApplicationError(
              ErrorType.UPLOAD,
              'Не удалось загрузить ни одного файла',
              { photoErrors, videoErrors }
            );
          }

          // 6. Публикуем папку
          console.log('4️⃣ Публикуем папку...');
          try {
            const publicUrl = await publishFolder(yandexAuth, folderPath);
            console.log('✅ Публичная ссылка получена:', publicUrl);
            
            // 7. Помечаем осмотр как завершённый
            completeInspection(inspection.id, publicUrl);
            
            return { 
              success: true, 
              url: publicUrl, 
              isDemo: false,
              stats: {
                totalPhotos: inspection.photos.length,
                uploadedPhotos,
                totalVideos: inspection.videos.length,
                uploadedVideos,
                photoErrors,
                videoErrors
              }
            };
          } catch (publishError: any) {
            console.error('❌ Ошибка публикации:', publishError);
            
            // Даже если публикация не удалась, осмотр все равно завершаем
            completeInspection(inspection.id, '');
            
            throw new ApplicationError(
              ErrorType.UPLOAD,
              'Файлы загружены, но не удалось получить публичную ссылку',
              publishError
            );
          }
        }
      },
      'uploadToYandexDisk', // Контекст для логов
      (result) => {
        // Успешная загрузка
        console.log('✅ Загрузка завершена успешно:', result);
        
        if (result.isDemo) {
          Alert.alert(
            'Готово!',
            'В демо-режиме загрузка имитируется. В реальном приложении файлы загрузятся на Яндекс Диск.',
            [{ text: 'OK' }]
          );
        } else {
          // Проверяем, были ли частичные ошибки
          if (result.stats && 
              (result.stats.photoErrors.length > 0 || result.stats.videoErrors.length > 0)) {
            
            const errorCount = result.stats.photoErrors.length + result.stats.videoErrors.length;
            const successCount = result.stats.uploadedPhotos + result.stats.uploadedVideos;
            
            Alert.alert(
              'Частично успешно',
              `Загружено ${successCount} из ${result.stats.totalPhotos + result.stats.totalVideos} файлов\n` +
              `(${errorCount} файлов не загружено)`,
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert('Успешно!', 'Осмотр завершен и загружен на Яндекс Диск');
          }
        }
        
        // Переходим на главный экран
        router.replace('/');
      },
      (error) => {
        // Кастомная обработка ошибки (вызывается при ошибке)
        console.error('❌ Ошибка загрузки через handler:', error);
        
        // Показываем ошибку в ErrorDisplay
        showError(error);

        // Сбрасываем статус загрузки
        updateInspectionStatus(inspection.id, 'active');
        finishUpload(inspection.id);
        setUploadProgress({ current: 0, total: 0 });
        
        // Дополнительные действия для специфических ошибок
        if (error.type === ErrorType.AUTH) {
          // Если ошибка авторизации, предлагаем переподключиться
          Alert.alert(
            'Ошибка авторизации',
            'Необходимо заново подключить Яндекс.Диск',
            [
              { text: 'Отмена', style: 'cancel' },
              { 
                text: 'Подключить', 
                onPress: () => router.push('/auth') 
              }
            ]
          );
        }
      }
    );
  };

  const handleShareLink = async () => {
  // Проверяем, что ссылка существует
  if (!inspection?.yandexDiskFolderUrl) {
    Alert.alert('Ошибка', 'Ссылка на Яндекс.Диск не найдена');
    return;
  }

  const url = inspection.yandexDiskFolderUrl;

  await handleOperation(
    async () => {
      await Clipboard.setStringAsync(url);
      return { success: true, url };
    },
    'copyToClipboard',
    (result) => {
      // Успех обрабатывается через Toast
      Toast.show({
        type: 'success',
        text1: '✅ Скопировано!',
        text2: 'Ссылка в буфере обмена',
        position: 'bottom',
        visibilityTime: 2000,
      });
      console.log('✅ Ссылка скопирована:', result.url);
    },
    (error) => {
      // Ошибка копирования
      console.error('❌ Ошибка копирования:', error);
      
      // Fallback: показываем ссылку в Alert
      Alert.alert(
        'Скопируйте ссылку',
        url,
        [{ text: 'OK', style: 'default' }]
      );
    }
  );
};

  const handleOpenLink = async () => {
  if (!inspection.yandexDiskFolderUrl) return;
  
  const url = inspection.yandexDiskFolderUrl;
  console.log('Открываем ссылку:', url);
  
  try {
    // Проверяем, поддерживает ли устройство открытие ссылок
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        // Для Android и iOS
        await Linking.openURL(url);
        console.log('Ссылка успешно открыта');
      }
    } else {
      console.log('Не удалось открыть ссылку:', url);
      Alert.alert('Ошибка', 'Не удалось открыть ссылку на этом устройстве');
    }
  } catch (error) {
    console.error('Ошибка при открытии ссылки:', error);
    Alert.alert('Ошибка', 'Не удалось открыть ссылку');
  }
};

  // Функция для отмены загрузки
  const handleCancelUpload = () => {
    Alert.alert(
      'Отменить загрузку?',
      'Загрузка на Яндекс.Диск будет прервана, но осмотр останется',
      [
        { text: 'Продолжить загрузку', style: 'cancel' },
        {
          text: 'Отменить',
          style: 'destructive',
          onPress: () => {
            cancelUpload(inspection.id);
            Alert.alert(
              'Загрузка отменена',
              'Осмотр сохранён. Вы можете загрузить его позже, нажав "Завершить осмотр"'
            );
          },
        },
      ]
    );
  };

  // Функция для удаления осмотра
  const handleDeleteInspection = () => {
    Alert.alert(
      'Удалить осмотр?',
      'Это действие нельзя отменить. Все фото и видео будут удалены из приложения.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            deleteInspection(inspection.id);
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleRenameInspection = async (newName: string) => {
  await handleOperation(
    async () => {
      console.log('Переименовываем осмотр:', inspection.id, 'в', newName);
      await renameInspection(inspection.id, newName);
      return { success: true, newName };
    },
    'renameInspection',
    (result) => {
      setIsRenameModalVisible(false);
      console.log('✅ Осмотр переименован:', result.newName);
    },
    (error) => {
      console.error('❌ Ошибка переименования:', error);
      Alert.alert('Ошибка', 'Не удалось переименовать осмотр');
    }
  );
};

  const isActive = inspection.status === 'active';
  const isCompleted = inspection.status === 'completed';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.carName}>
              {inspection.carBrand || inspection.carModel}
            </Text>
              {displayError && (
              <ErrorDisplay
                error={displayError}
                onRetry={retryUpload}
                onDismiss={dismissError}
              />
            )}
             <View style={styles.headerActions}>
                {/* Кнопка редактирования - только для активных осмотров */}
                {isActive && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsRenameModalVisible(true)}
                  >
                    <Text style={styles.editButtonText}>Редакт.</Text>
                  </TouchableOpacity>
                )}
                
                {isActive && (
                  <View style={styles.statusBadge}>
                    <View style={styles.statusIndicator} />
                    <Text style={styles.statusText}>Активный</Text>
                  </View>
                )}
                
                {isCompleted && (
                  <View style={styles.statusBadgeCompleted}>
                    <CheckCircle2 size={14} color="#34C759" strokeWidth={2.5} />
                    <Text style={styles.statusTextCompleted}>Завершен</Text>
                  </View>
                )}
              </View>
            </View>

          <View style={styles.infoRow}>
            <Clock size={16} color="#8E8E93" strokeWidth={2} />
            <Text style={styles.infoText}>
              {new Date(inspection.startTime).toLocaleString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

            <View style={styles.mediaCountRow}>
              {inspection.photos.length > 0 && (
                <Text style={styles.photoCount}>
                  {inspection.photos.length} фото
                </Text>
              )}
              {inspection.videos.length > 0 && (
                <Text style={styles.videoCount}>
                  {inspection.videos.length} видео
                </Text>
              )}
            </View>
        </View>

        {inspection.photos.length > 0 || inspection.videos.length > 0 ? (
          <View>
            {inspection.photos.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Фото ({inspection.photos.length})</Text>
                <View style={styles.photoGrid}>
                  {inspection.photos.map((photo: Photo) => (
                    <View key={photo.id} style={styles.photoContainer}>
                      <Image source={{ uri: photo.uri }} style={styles.photo} />
                    </View>
                  ))}
                </View>
              </View>
            )}
            {inspection.videos.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Видео ({inspection.videos.length})</Text>
          <View style={styles.videoGrid}>
            {inspection.videos.map((video: InspectionVideo, index: number) => {
              const player = videoPlayers[index];
              
              if (!player) {
                return (
                  <View key={video.id} style={[styles.videoContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: '#fff' }}>Ошибка загрузки видео</Text>
                  </View>
                );
              }

              return (
                <View key={video.id} style={styles.videoContainer}>
                  <VideoView
                    player={player}
                    style={styles.video}
                    nativeControls
                    contentFit="contain"
                  />
                  <View style={styles.videoOverlay}>
                    <PlayCircle size={48} color="#FFF" strokeWidth={2} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Camera size={64} color="#C7C7CC" strokeWidth={1.5} />
            <Text style={styles.emptyText}>Файлов пока нет</Text>
            <Text style={styles.emptySubtext}>
              Нажмите кнопку камеры, чтобы сделать фото или видео
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {(isActive || inspection.status === 'uploading') && (
          <View style={styles.actionsContainer}>
            
            {/* ПРОГРЕСС-БАР (занимает всю ширину) */}
            {inspection.status === 'uploading' && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${uploadProgress.total > 0 
                          ? (uploadProgress.current / uploadProgress.total) * 100 
                          : 0}%` 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {uploadProgress.current} из {uploadProgress.total} файлов
                </Text>
              </View>
            )}
            
            {/* СТРОКА С КНОПКАМИ (всегда под прогресс-баром) */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={handleAddPhoto}
              >
                <Camera size={24} color="#FFF" strokeWidth={2} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  (inspection.status === 'uploading' || (inspection.photos.length === 0 && inspection.videos.length === 0)) &&
                    styles.uploadButtonDisabled,
                ]}
                onPress={uploadToYandexDisk}
                disabled={inspection.status === 'uploading' || (inspection.photos.length === 0 && inspection.videos.length === 0)}
              >
                {inspection.status === 'uploading' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Upload size={20} color="#FFF" strokeWidth={2.5} />
                    <Text style={styles.uploadButtonText}>Завершить осмотр</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
          </View>
        )}

        {isCompleted && inspection.yandexDiskFolderUrl && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.shareLinkButton}
              onPress={handleShareLink}
            >
              <Share2 size={20} color="#007AFF" strokeWidth={2} />
              <Text style={styles.shareLinkButtonText}>Копировать ссылку</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.openLinkButton}
              onPress={handleOpenLink}
              onLongPress={() => {
                // Долгое нажатие показывает ссылку
                Alert.alert('Ссылка', inspection.yandexDiskFolderUrl);
              }}
            >
              <ExternalLink size={20} color="#FFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionButtons}>
          {/* В момент загрузки показываем ОБЕ кнопки */}
          {inspection.status === 'uploading' ? (
            <>
              {/* Кнопка отмены загрузки */}
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancelUpload}
              >
                <Trash2 size={18} color="#FF9500" strokeWidth={2} />
                <Text style={styles.cancelButtonText}>Остановить загрузку</Text>
              </TouchableOpacity>
              
              {/* Кнопка удаления осмотра (неактивная во время загрузки) */}
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton, { opacity: 0.5 }]}
                disabled={true}
              >
                <Trash2 size={18} color="#FF3B30" strokeWidth={2} />
                <Text style={styles.deleteButtonText}>Удалить осмотр</Text>
              </TouchableOpacity>
            </>
          ) : (
            //Когда НЕ загружается - только кнопка удаления 
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteInspection}
            >
              <Trash2 size={18} color="#FF3B30" strokeWidth={2} />
              <Text style={styles.deleteButtonText}>Удалить осмотр</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* Модальное окно переименования */}
          <RenameModal
            visible={isRenameModalVisible}
            currentName={inspection.carBrand || inspection.carModel || ''}
            onClose={() => setIsRenameModalVisible(false)}
            onSave={handleRenameInspection}
          />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  carName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#000',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  statusBadgeCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
    gap: 4,
  },
  statusTextCompleted: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#34C759',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  mediaCountRow: {
    flexDirection: 'row',
    gap: 16,
  },
  photoCount: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#000',
  },
  videoCount: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#000',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#000',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 6,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E5EA',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  videoGrid: {
    padding: 15,
    gap: 12,
  },
  videoContainer: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#C7C7CC',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addPhotoButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  uploadButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  shareLinkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  shareLinkButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  openLinkButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 17,
    color: '#8E8E93',
  },
  progressContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12, // Отступ между прогресс-баром и кнопками
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF9800',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  headerActions: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
editButton: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  backgroundColor: '#F2F2F7',
  borderRadius: 8,
},
editButtonText: {
  fontSize: 13,
  fontWeight: '600',
  color: '#007AFF',
},
fullScreenErrorContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  
  overlayError: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
});