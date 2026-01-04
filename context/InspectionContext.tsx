import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Inspection, Photo, Video, YandexDiskAuth } from '@/types/inspections';

const INSPECTIONS_STORAGE_KEY = 'inspections';
const YANDEX_AUTH_STORAGE_KEY = 'yandex_auth';

interface InspectionContextType {
  inspections: Inspection[];
  yandexAuth: YandexDiskAuth | null;
  isLoading: boolean;
  uploadingInspections: string[];
  selectedInspections: string[];
  isSelectionMode: boolean;
  
  createInspection: (carBrand: string, carModel: string) => Inspection;
  addPhoto: (inspectionId: string, photo: Photo) => void;
  addVideo: (inspectionId: string, video: Video) => void;
  completeInspection: (inspectionId: string, yandexDiskUrl: string) => void;
  updateInspectionStatus: (inspectionId: string, status: Inspection['status']) => void;
  deleteInspection: (inspectionId: string) => void;
  deleteSelectedInspections: () => void;
  saveYandexAuth: (auth: YandexDiskAuth) => Promise<void>;
  clearYandexAuth: () => Promise<void>;
  startUpload: (inspectionId: string) => void;
  finishUpload: (inspectionId: string) => void;
  cancelUpload: (inspectionId: string) => void;
  cleanupStuckUploads: () => void;
  
  // Функции для мультивыбора
  toggleInspectionSelection: (inspectionId: string) => void;
  selectAllInspections: () => void;
  clearSelectedInspections: () => void;
  setSelectionMode: (mode: boolean) => void;
  isInspectionSelected: (inspectionId: string) => boolean;
}

const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

export const InspectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [yandexAuth, setYandexAuth] = useState<YandexDiskAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingInspections, setUploadingInspections] = useState<string[]>([]);
  const [selectedInspections, setSelectedInspections] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

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
        const parsedInspections: Inspection[] = JSON.parse(inspectionsData);
        
        const cleanedInspections = parsedInspections.map((inspection) => {
          if (inspection.status === 'uploading') {
            return { 
              ...inspection, 
              status: 'active' as const
            };
          }
          return inspection;
        });
        
        setInspections(cleanedInspections);
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

  // ФУНКЦИИ ДЛЯ МУЛЬТИВЫБОРА
  const toggleInspectionSelection = useCallback((inspectionId: string) => {
    setSelectedInspections(prev => {
      if (prev.includes(inspectionId)) {
        return prev.filter(id => id !== inspectionId);
      } else {
        return [...prev, inspectionId];
      }
    });
  }, []);

  const selectAllInspections = useCallback(() => {
    const allIds = inspections.map(inspection => inspection.id);
    setSelectedInspections(allIds);
  }, [inspections]);

  const clearSelectedInspections = useCallback(() => {
    setSelectedInspections([]);
    setIsSelectionMode(false);
  }, []);

  const setSelectionMode = useCallback((mode: boolean) => {
    setIsSelectionMode(mode);
    if (!mode) {
      setSelectedInspections([]);
    }
  }, []);

  const isInspectionSelected = useCallback((inspectionId: string) => {
    return selectedInspections.includes(inspectionId);
  }, [selectedInspections]);

  const deleteSelectedInspections = useCallback(() => {
    if (selectedInspections.length === 0) return;

    const updatedInspections = inspections.filter(
      inspection => !selectedInspections.includes(inspection.id)
    );
    
    const updatedUploading = uploadingInspections.filter(
      id => !selectedInspections.includes(id)
    );
    
    setUploadingInspections(updatedUploading);
    saveInspections(updatedInspections);
    
    setSelectedInspections([]);
    setIsSelectionMode(false);
    
    console.log(`Удалено ${selectedInspections.length} осмотров`);
  }, [inspections, selectedInspections, uploadingInspections]);

  // СУЩЕСТВУЮЩИЕ ФУНКЦИИ (без изменений)
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
    
    const updatedUploading = uploadingInspections.filter(id => id !== inspectionId);
    setUploadingInspections(updatedUploading);
    
    saveInspections(updated);
  }, [inspections, uploadingInspections]);

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
    
    console.log(`Загрузка отменена для осмотра ${inspectionId}`);
  }, [updateInspectionStatus]);

  const cleanupStuckUploads = useCallback(() => {
    setUploadingInspections([]);
    
    const updated = inspections.map(inspection => {
      if (inspection.status === 'uploading') {
        return { ...inspection,
                 status: 'active' as const };
      }
      return inspection;
    });
    
    saveInspections(updated);
  }, [inspections]);

  const value: InspectionContextType = {
    inspections,
    yandexAuth,
    isLoading,
    uploadingInspections,
    selectedInspections,
    isSelectionMode,
    
    createInspection,
    addPhoto,
    addVideo,
    completeInspection,
    updateInspectionStatus,
    deleteInspection,
    deleteSelectedInspections,
    saveYandexAuth,
    clearYandexAuth,
    startUpload,
    finishUpload,
    cancelUpload,
    cleanupStuckUploads,
    
    toggleInspectionSelection,
    selectAllInspections,
    clearSelectedInspections,
    setSelectionMode,
    isInspectionSelected,
  };

  return (
    <InspectionContext.Provider value={value}>
      {children}
    </InspectionContext.Provider>
  );
};

// Хук для использования контекста
export const useInspections = (): InspectionContextType => {
  const context = useContext(InspectionContext);
  if (context === undefined) {
    throw new Error('useInspections must be used within an InspectionProvider');
  }
  return context;
};