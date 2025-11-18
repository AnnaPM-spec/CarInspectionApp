import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { X, Camera, Images, FlipHorizontal } from 'lucide-react-native';
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
import { Photo } from '../types/inspection';

export default function CameraScreen() {
  const router = useRouter();
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();
  const { inspections, addPhoto } = useInspections();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const inspection = inspections.find(i => i.id === inspectionId);

  useEffect(() => {
    console.log('Camera screen mounted', {
      inspectionId,
      hasInspection: !!inspection,
      inspectionPhotos: inspection?.photos.length,
    });
  }, [inspectionId, inspection]);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Camera size={64} color="#007AFF" strokeWidth={1.5} />
        <Text style={styles.permissionTitle}>Доступ к камере</Text>
        <Text style={styles.permissionText}>
          Разрешите доступ к камере для съемки фото автомобиля
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Разрешить</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
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

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
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
                {inspection?.photos.length || 0} фото
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
                styles.captureButton,
                isCapturing && styles.captureButtonDisabled,
              ]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.galleryButton} />
          </View>
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
