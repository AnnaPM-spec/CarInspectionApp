import * as FileSystem from 'expo-file-system';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { X, Camera, Images, FlipHorizontal, Video as VideoIcon } from 'lucide-react-native';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInspections } from '../context/InspectionContext';
import { Photo, Video } from '../types/inspections';

export default function CameraScreen() {
  const router = useRouter();
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();
  const { inspections, addPhoto, addVideo } = useInspections();
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const cameraRef = useRef<CameraView>(null);
  const recordingStartTime = useRef<number | null>(null);
  const recordingPromise = useRef<Promise<any> | null>(null);

  const inspection = inspections.find(i => i.id === inspectionId);

  useEffect(() => {
    console.log('Camera screen mounted', {
      inspectionId,
      hasInspection: !!inspection,
      inspectionPhotos: inspection?.photos.length,
      inspectionVideos: inspection?.videos.length,
      mode,
    });
  }, [inspectionId, inspection, mode]);

  if (!cameraPermission || !microphonePermission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const requestPermissions = async () => {
    await requestCameraPermission();
    await requestMicrophonePermission();
  };

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Camera size={64} color="#007AFF" strokeWidth={1.5} />
        <Text style={styles.permissionTitle}>Доступ к камере</Text>
        <Text style={styles.permissionText}>
          Разрешите доступ к камере и микрофону для съемки фото и видео автомобиля
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermissions}
        >
          <Text style={styles.permissionButtonText}>Разрешить</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (mode === 'video') {
      if (isRecording) {
        await handleStopRecording();
      } else {
        await handleStartRecording();
      }
    } else {
      await handleTakePhoto();
    }
  };

  const handleTakePhoto = async () => {
    console.log('=== CAPTURE BUTTON PRESSED ===');
    console.log('Platform:', Platform.OS);
    console.log('Has camera ref:', !!cameraRef.current);
    console.log('Is capturing:', isCapturing);
    console.log('Has inspection:', !!inspection);
    console.log('Inspection ID:', inspectionId);

    if (!cameraRef.current) {
      console.error('Camera ref is null!');
      return;
    }

    if (isCapturing) {
      console.log('Already capturing, skipping');
      return;
    }

    if (!inspection) {
      console.error('No inspection found!');
      return;
    }

    try {
      setIsCapturing(true);
      console.log('Starting photo capture for inspection:', inspectionId);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
        base64: false,
        exif: false,
      });
      
      console.log('Photo captured successfully:', { 
        uri: photo?.uri, 
        width: photo?.width, 
        height: photo?.height,
        hasUri: !!photo?.uri 
      });

      if (photo && photo.uri) {
        const newPhoto: Photo = {
          id: Date.now().toString(),
          uri: photo.uri,
          timestamp: Date.now(),
        };
        
        console.log('Adding photo to inspection:', inspectionId);
        console.log('Photo data:', newPhoto);
        addPhoto(inspectionId as string, newPhoto);
        console.log('Photo added successfully, total photos now:', (inspection.photos.length + 1));
      } else {
        console.error('No photo URI received from camera');
        console.error('Photo object:', photo);
      }
    } catch (error) {
      console.error('=== CAPTURE ERROR ===');
      console.error('Error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    } finally {
      setIsCapturing(false);
      console.log('Capture finished, isCapturing set to false');
      console.log('=== END CAPTURE ===');
    }
  };

  const handleStartRecording = async () => {
  console.log('=== START RECORDING (NEW APPROACH) ===');
  
  if (!cameraRef.current || isRecording) {
    console.log('Cannot start recording');
    return;
  }

  try {
    setIsRecording(true);
    recordingStartTime.current = Date.now();
    
    // Вариант 1: Без параметров вообще
    recordingPromise.current = cameraRef.current.recordAsync();
    
    console.log('Recording STARTED with simple recordAsync()');
  } catch (error) {
    console.error('=== RECORDING START ERROR ===');
    console.error('Error:', error);
    setIsRecording(false);
    recordingStartTime.current = null;
    recordingPromise.current = null;
  }
};

const handleStopRecording = async () => {
  console.log('=== STOP RECORDING (NEW APPROACH) ===');
  
  if (!cameraRef.current || !isRecording || !recordingPromise.current) {
    console.log('Cannot stop recording');
    return;
  }

  try {
    // 1. Останавливаем запись
    cameraRef.current.stopRecording();
    console.log('stopRecording() called');
    
    // 2. Ждём промис с коротким таймаутом (1 секунда)
    console.log('Waiting for recording promise...');
    
    const video = await Promise.race([
      recordingPromise.current,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Таймаут 1 сек')), 1000)
      )
    ]);
    
    console.log('✅ Video received:', video);
    console.log('URI:', video?.uri);
    
    if (video?.uri) {
      const newVideo: Video = {
        id: Date.now().toString(),
        uri: video.uri,
        timestamp: Date.now(),
      };
      
      console.log('Adding video to inspection');
      addVideo(inspectionId as string, newVideo);
      console.log('✅ Video added successfully');
    }
  } catch (error) {
    console.error('=== RECORDING STOP ERROR (NEW) ===');
    console.error('Error message:', (error as Error).message || String(error));
    
    // 3. Проверяем, есть ли видео файлы в разных директориях
    try {
      console.log('=== CHECKING FOR VIDEO FILES ===');
      
      // Проверяем временную директорию
      // @ts-ignore
      const tempDir = FileSystem.cacheDirectory || FileSystem.cacheDir;
      if (tempDir) {
        const files = await FileSystem.readDirectoryAsync(tempDir);
        const videoFiles = files.filter((f: string) => f.includes('.mp4') || f.includes('.mov'));
        console.log('Video files in temp dir:', videoFiles);
      }
      
      // Проверяем документы
      // @ts-ignore
      const docDir = FileSystem.documentDirectory;
      if (docDir) {
        const files = await FileSystem.readDirectoryAsync(docDir);
        const videoFiles = files.filter((f: string) => f.includes('.mp4') || f.includes('.mov'));
        console.log('Video files in documents:', videoFiles);
      }
    } catch (fsError) {
      console.log('File system check error:', fsError);
    }
  } finally {
    console.log('Cleaning up recording state');
    setIsRecording(false);
    recordingStartTime.current = null;
    recordingPromise.current = null;
  }
};

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleMode = () => {
    if (isRecording) {
      return;
    }
    setMode(current => (current === 'photo' ? 'video' : 'photo'));
  };

  const handleClose = () => {
    router.back();
  };

  const handleViewPhotos = () => {
    router.push(`/inspection/${inspectionId}`);
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.topButton}
              onPress={handleClose}
            >
              <X size={28} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={styles.infoContainer}>
              <Text style={styles.carInfo}>
                {inspection?.carBrand || inspection?.carModel}
              </Text>
              <Text style={styles.photoCount}>
                {inspection?.photos.length || 0} фото · {inspection?.videos.length || 0} видео
              </Text>
            </View>
            <TouchableOpacity
              style={styles.topButton}
              onPress={toggleCameraFacing}
            >
              <FlipHorizontal size={28} color="#FFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={handleViewPhotos}
            >
              <Images size={28} color="#FFF" strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                mode === 'photo' ? styles.captureButton : styles.recordButton,
                (isCapturing || (isRecording && mode === 'photo')) && styles.captureButtonDisabled,
                isRecording && styles.recordingButton,
              ]}
              onPress={handleCapture}
              disabled={isCapturing && mode === 'photo'}
            >
              {mode === 'photo' ? (
                <View style={styles.captureButtonInner} />
              ) : (
                <View style={[styles.recordButtonInner, isRecording && styles.recordingButtonInner]} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.galleryButton}
              onPress={toggleMode}
              disabled={isRecording}
            >
              {mode === 'photo' ? (
                <VideoIcon size={28} color="#FFF" strokeWidth={2} />
              ) : (
                <Camera size={28} color="#FFF" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Запись...</Text>
            </View>
          )}
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 32,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  carInfo: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  photoCount: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    borderColor: '#FF3B30',
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
  },
  recordingButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  recordingText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
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
    fontWeight: '600' as const,
    color: '#FFF',
  },
});
