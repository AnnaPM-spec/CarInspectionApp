import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Trash2, X } from 'lucide-react-native';

interface SelectionActionBarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
  showSelectAll?: boolean;
  onSelectAll?: () => void;
  allSelected?: boolean;
}

export const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  selectedCount,
  onDelete,
  onCancel,
  showSelectAll = false,
  onSelectAll,
  allSelected = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <X size={20} color="#8E8E93" strokeWidth={2.5} />
        </TouchableOpacity>
        
        <View style={styles.countContainer}>
          <Text style={styles.countText}>{selectedCount}</Text>
          <Text style={styles.labelText}>
            {selectedCount === 1 ? 'осмотр выбран' : 
             selectedCount < 5 ? 'осмотра выбрано' : 
             'осмотров выбрано'}
          </Text>
        </View>

        {showSelectAll && onSelectAll && (
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={onSelectAll}
            activeOpacity={0.7}
          >
            <Text style={styles.selectAllText}>
              {allSelected ? 'Снять все' : 'Выбрать все'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.deleteButton,
            selectedCount === 0 && styles.deleteButtonDisabled,
          ]}
          onPress={onDelete}
          disabled={selectedCount === 0}
          activeOpacity={0.7}
        >
          <Trash2 size={20} color="#FFF" strokeWidth={2.5} />
          <Text style={styles.deleteButtonText}>Удалить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flex: 1,
  },
  countText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#007AFF',
  },
  labelText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
});

export default SelectionActionBar;