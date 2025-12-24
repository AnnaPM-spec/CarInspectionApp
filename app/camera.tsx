// app/camera.tsx - ИСПРАВЛЕННЫЙ
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, Images, FlipHorizontal, Video as VideoIcon } from 'lucide-react-native';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInspections } from '../context/InspectionContext';
import { Photo, Video } from '../types/inspections';
import * as FileSystem from 'expo-file-system';

export default function CameraScreen() {
  const router = useRouter();
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();
  const { inspections, addPhoto, addVideo } = useInspections();
  
  // Для фото (expo-camera)
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  
  // Общие состояния
  const [isCapturing, setIsCapturing] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  
  // Ref для expo-camera (только для фото)
  const cameraRef = useRef<CameraView>(null);

  const inspection = inspections.find(i => i.id === inspectionId);

  // Проверка разрешений
  useEffect(() => {
    if (!cameraPermission?.granted) {
      requestCameraPermission();
    }
  }, []);

  // =================== ФОТО (EXPO-CAMERA) ===================
  const handleTakePhoto = async () => {
    console.log('=== PHOTO WITH EXPO-CAMERA ===');
    
    if (!cameraRef.current) {
      Alert.alert('Ошибка', 'Камера не готова');
      return;
    }

    if (isCapturing) return;
    if (!inspection) return;

    try {
      setIsCapturing(true);
      
      // ВАЖНО: Это expo-camera, а не ImagePicker!
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        exif: false,
      });
      
      console.log('Photo URI from expo-camera:', photo?.uri ? 'YES' : 'NO');

      if (photo?.uri) {
        const newPhoto: Photo = {
          id: Date.now().toString(),
          uri: photo.uri,
          timestamp: Date.now(),
        };
        
        addPhoto(inspectionId as string, newPhoto);
        console.log('✅ Photo added via expo-camera');
      }
    } catch (error) {
      console.error('Photo error:', error);
      Alert.alert('Ошибка', 'Не удалось сделать фото');
    } finally {
      setIsCapturing(false);
    }
  };

  // =================== ВИДЕО (СИСТЕМНАЯ КАМЕРА) ===================
  const handleRecordVideo = async () => {
  console.log('=== VIDEO WITH SYSTEM CAMERA ===');
  
  if (!inspection) {
    Alert.alert('Ошибка', 'Инспекция не найдена');
    return;
  }

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'videos',
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
      videoMaxDuration: 300,
    });

    if (!result.canceled && result.assets[0]) {
      const videoAsset = result.assets[0];
      
      // САМЫЙ ПРОСТОЙ ВАРИАНТ: используем оригинальный путь
      const newVideo: Video = {
        id: Date.now().toString(),
        uri: videoAsset.uri, // Оригинальный путь
        timestamp: Date.now(),
        duration: videoAsset.duration || 0,
      };
      
      console.log('✅ Видео сохранено (временный путь):', videoAsset.uri);
      addVideo(inspectionId as string, newVideo);
      
      Alert.alert(
        '✅ Видео сохранено!', 
        `Длительность: ${Math.round((videoAsset.duration || 0) / 1000)} сек.\n` +
        `Готово к отправке на Яндекс.Диск.`
      );
    }
  } catch (error) {
    console.error('❌ Ошибка видео:', error);
    Alert.alert('Ошибка', 'Не удалось записать видео');
  }
};

  // =================== ОБРАБОТКА НАЖАТИЯ ===================
  const handleCapture = async () => {
    console.log('Capture pressed, mode:', mode);
    
    if (mode === 'video') {
      await handleRecordVideo();
    } else {
      await handleTakePhoto(); // Должен использовать expo-camera!
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleMode = () => {
    setMode(current => (current === 'photo' ? 'video' : 'photo'));
  };

  const handleClose = () => router.back();
  const handleViewPhotos = () => router.push(`/inspection/${inspectionId}`);

  // =================== РЕНДЕРИНГ ===================
  if (!cameraPermission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Camera size={64} color="#007AFF" strokeWidth={1.5} />
        <Text style={styles.permissionTitle}>Доступ к камере</Text>
        <Text style={styles.permissionText}>
          Разрешите доступ к камере для съемки фото автомобиля
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.permissionButtonText}>Разрешить</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* КАМЕРА EXPO-CAMERA (только для фото) */}
      {mode === 'photo' && (
        <CameraView 
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
        />
      )}
      
      {/* ПЛЕЙСХОЛДЕР ДЛЯ ВИДЕО */}
      {mode === 'video' && (
        <View style={styles.videoPlaceholder}>
          <VideoIcon size={80} color="#8E8E93" strokeWidth={1.5} />
          <Text style={styles.placeholderText}>Нажмите для записи видео</Text>
          <Text style={styles.placeholderSubtext}>
            Откроется камера вашего телефона
          </Text>
        </View>
      )}

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        {/* Верхняя панель */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topButton} onPress={handleClose}>
            <X size={28} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
          
          <View style={styles.infoContainer}>
            <Text style={styles.carInfo}>
              {inspection?.carBrand || inspection?.carModel || 'Автомобиль'}
            </Text>
            <Text style={styles.photoCount}>
              📸 {inspection?.photos.length || 0} · 🎬 {inspection?.videos.length || 0}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.topButton} onPress={toggleCameraFacing}>
            <FlipHorizontal size={28} color="#FFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Нижняя панель */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.galleryButton} onPress={handleViewPhotos}>
            <Images size={28} color="#FFF" strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={mode === 'photo' ? styles.captureButton : styles.recordButton}
            onPress={handleCapture}
            disabled={isCapturing && mode === 'photo'}
          >
            {mode === 'photo' ? (
              <View style={styles.captureButtonInner} />
            ) : (
              <View style={styles.recordButtonInner} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.galleryButton} onPress={toggleMode}>
            {mode === 'photo' ? (
              <VideoIcon size={28} color="#FFF" strokeWidth={2} />
            ) : (
              <Camera size={28} color="#FFF" strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>

        {/* Индикатор загрузки для фото */}
        {isCapturing && mode === 'photo' && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Сохранение фото...</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#000',
    paddingHorizontal: 32,
  },
  camera: { 
    flex: 1 
  },
  videoPlaceholder: { 
    flex: 1, 
    backgroundColor: '#1C1C1E', 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  placeholderText: { 
    fontSize: 20, 
    fontWeight: '600',
    color: '#FFF', 
    marginTop: 16,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  overlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    justifyContent: 'space-between' 
  },
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 10 : 20, 
    paddingBottom: 16, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)' 
  },
  topButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(60, 60, 67, 0.6)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  infoContainer: { 
    alignItems: 'center', 
    flex: 1, 
    marginHorizontal: 12 
  },
  carInfo: { 
    fontSize: 17, 
    fontWeight: '600', 
    color: '#FFF' 
  },
  photoCount: { 
    fontSize: 14, 
    color: 'rgba(255, 255, 255, 0.8)', 
    marginTop: 2 
  },
  bottomBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingBottom: Platform.OS === 'ios' ? 30 : 40, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)' 
  },
  galleryButton: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: 'rgba(60, 60, 67, 0.6)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  captureButton: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#FFF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 4, 
    borderColor: 'rgba(255, 255, 255, 0.3)' 
  },
  recordButton: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: 'rgba(255, 59, 48, 0.8)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 4, 
    borderColor: '#FFF' 
  },
  captureButtonInner: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#FFF', 
    borderWidth: 2, 
    borderColor: '#000' 
  },
  recordButtonInner: { 
    width: 32, 
    height: 32, 
    borderRadius: 6, 
    backgroundColor: '#FFF' 
  },
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 12,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 17,
    color: '#C7C7CC',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
  },
  permissionButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
});