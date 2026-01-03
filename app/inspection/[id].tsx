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
import React, { useState } from 'react';
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
  Clipboard,
  Platform,
} from 'react-native';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { Photo, Video } from '../../types/inspections';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInspections } from '../../context/InspectionContext';
import {
  createFolder,
  uploadFile,
  publishFolder,
  formatFolderName,
} from '../../utils/yandex-disk';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 60) / 3;

export default function InspectionDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { 
        inspections, 
        yandexAuth, 
        completeInspection, 
        updateInspectionStatus, 
        deleteInspection,
        uploadingInspections,
        startUpload,
        finishUpload
      } = useInspections(); 
  const inspection = inspections.find(i => i.id === id);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({
  current: 0,
  total: 0,
});
  const isUploading = uploadingInspections.includes(inspection?.id || '');
  
  if (!inspection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
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

  const handleUploadToYandex = async () => {
    if (!yandexAuth) {
      Alert.alert(
        'Яндекс Диск не подключен',
        'Подключите Яндекс Диск для загрузки файлов',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Подключить', onPress: () => router.push('/auth') },
        ]
      );
      return;
    }

    const totalMedia = inspection.photos.length + inspection.videos.length;
    if (totalMedia === 0) {
      Alert.alert('Ошибка', 'Нет фото или видео для загрузки');
      return;
    }

    let mediaText = '';
    if (inspection.photos.length > 0 && inspection.videos.length > 0) {
      mediaText = `${inspection.photos.length} фото и ${inspection.videos.length} видео`;
    } else if (inspection.photos.length > 0) {
      mediaText = `${inspection.photos.length} фото`;
    } else {
      mediaText = `${inspection.videos.length} видео`;
    }

    Alert.alert(
      'Завершить осмотр?',
      `Будет загружено ${mediaText} на Яндекс Диск. После завершения нельзя будет добавить новые файлы.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Завершить',
          onPress: () => uploadToYandexDisk(),
        },
      ]
    );
  };

  const uploadToYandexDisk = async () => {
  if (!yandexAuth) return;

  try {
    startUpload(inspection.id);
    const totalMedia = inspection.photos.length + inspection.videos.length;
    setUploadProgress({ current: 0, total: totalMedia }); // ← Начальное состояние
    updateInspectionStatus(inspection.id, 'uploading');

    const folderName = formatFolderName(
      inspection.carBrand,
      inspection.carModel,
      inspection.startTime
    );
    const folderPath = `/Осмотры/${folderName}`;

    if (Platform.OS === 'web') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const demoUrl = `https://disk.yandex.ru/d/demo_${inspection.id}`;
        completeInspection(inspection.id, demoUrl);
        Alert.alert(
          'Готово!',
          'В демо-режиме загрузка имитируется. В реальном приложении файлы загрузятся на Яндекс Диск.',
          [{ text: 'OK' }]
        );
       } else {
      await createFolder(yandexAuth, folderPath);

      // ЗАГРУЗКА ФОТО
      for (let i = 0; i < inspection.photos.length; i++) {
        const photo = inspection.photos[i];
        const fileName = `photo_${String(i + 1).padStart(3, '0')}.jpg`;
        const filePath = `${folderPath}/${fileName}`;
        await uploadFile(yandexAuth, filePath, photo.uri);
        
        // ОБНОВЛЯЕМ ПРОГРЕСС
        setUploadProgress(prev => {
        const newCurrent = prev.current + 1;
        console.log(`Прогресс: ${newCurrent}/${prev.total}`);
        return { ...prev, current: newCurrent };
      });
      }

      // ЗАГРУЗКА ВИДЕО
      for (let i = 0; i < inspection.videos.length; i++) {
        const video = inspection.videos[i];
        const fileName = `video_${String(i + 1).padStart(3, '0')}.mp4`;
        const filePath = `${folderPath}/${fileName}`;
        await uploadFile(yandexAuth, filePath, video.uri);
        
        // ОБНОВЛЯЕМ ПРОГРЕСС
        setUploadProgress(prev => {
          const newCurrent = prev.current + 1;
          console.log(`Прогресс: ${newCurrent}/${prev.total}`);
          return { ...prev, current: newCurrent };
        });
      }

      const publicUrl = await publishFolder(yandexAuth, folderPath);
      completeInspection(inspection.id, publicUrl);
      Alert.alert('Успешно!', 'Осмотр завершен и загружен на Яндекс Диск');
    }

    router.back();
  } catch (error) {
    console.error('Upload error:', error);
    updateInspectionStatus(inspection.id, 'active');
    Alert.alert('Ошибка', 'Не удалось загрузить файлы на Яндекс Диск');
  } finally {
    finishUpload(inspection.id);
    setUploadProgress({ current: 0, total: 0 }); // Сброс
  }
};

  const handleShareLink = () => {
    if (!inspection.yandexDiskFolderUrl) return;

    Clipboard.setString(inspection.yandexDiskFolderUrl);
    Alert.alert('Скопировано', 'Ссылка скопирована в буфер обмена');
  };

  const handleOpenLink = () => {
    if (!inspection.yandexDiskFolderUrl) return;
    const url = inspection.yandexDiskFolderUrl;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Удалить осмотр?',
      'Это действие нельзя отменить. Фото останутся на Яндекс Диске, если осмотр был загружен.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            deleteInspection(inspection.id);
            router.back();
          },
        },
      ]
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
                  {inspection.videos.map((video: Video) => (
                    <View key={video.id} style={styles.videoContainer}>
                      <ExpoVideo
                        source={{ uri: video.uri }}
                        style={styles.video}
                        useNativeControls
                        resizeMode={ResizeMode.COVER}
                      />
                      <View style={styles.videoOverlay}>
                        <PlayCircle size={48} color="#FFF" strokeWidth={2} />
                      </View>
                    </View>
                  ))}
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
    {isUploading && (
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
          (isUploading || (inspection.photos.length === 0 && inspection.videos.length === 0)) &&
            styles.uploadButtonDisabled,
        ]}
        onPress={handleUploadToYandex}
        disabled={isUploading || (inspection.photos.length === 0 && inspection.videos.length === 0)}
      >
        {isUploading ? (
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
            >
              <ExternalLink size={20} color="#FFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        {inspection.status !== 'uploading' && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Trash2 size={18} color="#FF3B30" strokeWidth={2} />
            <Text style={styles.deleteButtonText}>Удалить осмотр</Text>
          </TouchableOpacity>
        )}
      </View>
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
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FF3B30',
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
});
