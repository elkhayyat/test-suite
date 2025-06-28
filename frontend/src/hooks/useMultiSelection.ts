import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing multi-selection state
 * @param items Array of items that can be selected
 * @param getItemId Function to get unique ID from item
 */
export function useMultiSelection<T>(
  items: T[],
  getItemId: (item: T) => string
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedItems = useMemo(() => {
    return items.filter(item => selectedIds.has(getItemId(item)));
  }, [items, selectedIds, getItemId]);

  const isSelected = useCallback((item: T) => {
    return selectedIds.has(getItemId(item));
  }, [selectedIds, getItemId]);

  const isItemSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const selectItem = useCallback((item: T) => {
    const id = getItemId(item);
    setSelectedIds(prev => new Set(prev).add(id));
  }, [getItemId]);

  const selectItemById = useCallback((id: string) => {
    setSelectedIds(prev => new Set(prev).add(id));
  }, []);

  const deselectItem = useCallback((item: T) => {
    const id = getItemId(item);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, [getItemId]);

  const deselectItemById = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const toggleItem = useCallback((item: T) => {
    const id = getItemId(item);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, [getItemId]);

  const toggleItemById = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = items.map(getItemId);
    setSelectedIds(new Set(allIds));
  }, [items, getItemId]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectRange = useCallback((startItem: T, endItem: T) => {
    const startId = getItemId(startItem);
    const endId = getItemId(endItem);
    
    const startIndex = items.findIndex(item => getItemId(item) === startId);
    const endIndex = items.findIndex(item => getItemId(item) === endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const min = Math.min(startIndex, endIndex);
    const max = Math.max(startIndex, endIndex);
    
    const rangeIds = items.slice(min, max + 1).map(getItemId);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      rangeIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [items, getItemId]);

  const hasSelection = selectedIds.size > 0;
  const selectionCount = selectedIds.size;
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;

  return {
    selectedIds,
    selectedItems,
    isSelected,
    isItemSelected,
    selectItem,
    selectItemById,
    deselectItem,
    deselectItemById,
    toggleItem,
    toggleItemById,
    selectAll,
    selectNone,
    selectRange,
    hasSelection,
    selectionCount,
    isAllSelected,
  };
}

export default useMultiSelection;