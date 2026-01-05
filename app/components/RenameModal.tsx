import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';

interface RenameModalProps {
  visible: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  visible,
  currentName,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите название осмотра');
      return;
    }

    if (name.trim() === currentName) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(name.trim());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Переименовать осмотр</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Введите название осмотра"
            autoFocus
            maxLength={50}
            editable={!isSaving}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, (!name.trim() || isSaving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!name.trim() || isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#F2F2F7',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default RenameModal;