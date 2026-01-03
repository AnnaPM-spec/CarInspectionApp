import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';
import { Inspection, Photo, Video, YandexDiskAuth } from '@/types/inspections';

const INSPECTIONS_STORAGE_KEY = 'inspections';
const YANDEX_AUTH_STORAGE_KEY = 'yandex_auth';

export const [InspectionProvider, useInspections] = createContextHook(() => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [yandexAuth, setYandexAuth] = useState<YandexDiskAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingInspections, setUploadingInspections] = useState<string[]>([]); // ← НОВОЕ

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [inspectionsData, authData] = await Promise.all([
        AsyncStorage.getItem(INSPECTIONS_STORAGE_KEY),
        AsyncStorage.getItem(YANDEX_AUTH_STORAGE_KEY),
      ]);

      if (inspectionsData) {
        setInspections(JSON.parse(inspectionsData));
      }

      if (authData) {
        const auth = JSON.parse(authData);
        if (auth.expiresAt > Date.now()) {
          setYandexAuth(auth);
        } else {
          await AsyncStorage.removeItem(YANDEX_AUTH_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveInspections = async (newInspections: Inspection[]) => {
    try {
      await AsyncStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(newInspections));
      setInspections(newInspections);
    } catch (error) {
      console.error('Failed to save inspections:', error);
    }
  };

  const createInspection = useCallback((carBrand: string, carModel: string): Inspection => {
    const newInspection: Inspection = {
      id: Date.now().toString(),
      carBrand,
      carModel,
      startTime: Date.now(),
      photos: [],
      videos: [],
      status: 'active',
    };

    const updated = [newInspection, ...inspections];
    saveInspections(updated);
    return newInspection;
  }, [inspections]);

  const addPhoto = useCallback((inspectionId: string, photo: Photo) => {
    const updated = inspections.map(inspection => {
      if (inspection.id === inspectionId) {
        return {
          ...inspection,
          photos: [...inspection.photos, photo],
        };
      }
      return inspection;
    });
    saveInspections(updated);
  }, [inspections]);

  const addVideo = useCallback((inspectionId: string, video: Video) => {
    const updated = inspections.map(inspection => {
      if (inspection.id === inspectionId) {
        return {
          ...inspection,
          videos: [...inspection.videos, video],
        };
      }
      return inspection;
    });
    saveInspections(updated);
  }, [inspections]);

  const completeInspection = useCallback((inspectionId: string, yandexDiskUrl: string) => {
    const updated = inspections.map(inspection => {
      if (inspection.id === inspectionId) {
        return {
          ...inspection,
          endTime: Date.now(),
          status: 'completed' as const,
          yandexDiskFolderUrl: yandexDiskUrl,
        };
      }
      return inspection;
    });
    saveInspections(updated);
  }, [inspections]);

  const updateInspectionStatus = useCallback((inspectionId: string, status: Inspection['status']) => {
    const updated = inspections.map(inspection => {
      if (inspection.id === inspectionId) {
        return { ...inspection, status };
      }
      return inspection;
    });
    saveInspections(updated);
  }, [inspections]);

  const deleteInspection = useCallback((inspectionId: string) => {
    const updated = inspections.filter(i => i.id !== inspectionId);
    saveInspections(updated);
  }, [inspections]);

  const saveYandexAuth = useCallback(async (auth: YandexDiskAuth) => {
    try {
      await AsyncStorage.setItem(YANDEX_AUTH_STORAGE_KEY, JSON.stringify(auth));
      setYandexAuth(auth);
    } catch (error) {
      console.error('Failed to save auth:', error);
    }
  }, []);

  const clearYandexAuth = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(YANDEX_AUTH_STORAGE_KEY);
      setYandexAuth(null);
    } catch (error) {
      console.error('Failed to clear auth:', error);
    }
  }, []);

  // НОВЫЕ ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ ЗАГРУЗКОЙ
  const startUpload = useCallback((inspectionId: string) => {
    if (!uploadingInspections.includes(inspectionId)) {
      setUploadingInspections(prev => [...prev, inspectionId]);
    }
  }, [uploadingInspections]);

  const finishUpload = useCallback((inspectionId: string) => {
    setUploadingInspections(prev => prev.filter(id => id !== inspectionId));
  }, []);

  const cancelUpload = useCallback((inspectionId: string) => {
    setUploadingInspections(prev => prev.filter(id => id !== inspectionId));
    updateInspectionStatus(inspectionId, 'active');
  }, [updateInspectionStatus]);

  return {
    inspections,
    yandexAuth,
    isLoading,
    uploadingInspections, // ← НОВОЕ
    createInspection,
    addPhoto,
    addVideo,
    completeInspection,
    updateInspectionStatus,
    deleteInspection,
    saveYandexAuth,
    clearYandexAuth,
    startUpload,    // ← НОВОЕ
    finishUpload,   // ← НОВОЕ
    cancelUpload,   // ← НОВОЕ
  };
});