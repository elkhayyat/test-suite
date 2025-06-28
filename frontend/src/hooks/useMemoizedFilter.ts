import { useMemo } from 'react';

/**
 * Custom hook for memoizing expensive filtering operations
 * @param items The array of items to filter
 * @param filterFn The filter function to apply
 * @param deps Additional dependencies that should trigger re-computation
 * @returns The filtered array
 */
export function useMemoizedFilter<T>(
  items: T[],
  filterFn: (item: T) => boolean,
  deps: React.DependencyList = []
): T[] {
  return useMemo(() => {
    return items.filter(filterFn);
  }, [items, filterFn, ...deps]);
}

/**
 * Custom hook for memoizing expensive mapping operations
 * @param items The array of items to map
 * @param mapFn The mapping function to apply
 * @param deps Additional dependencies that should trigger re-computation
 * @returns The mapped array
 */
export function useMemoizedMap<T, U>(
  items: T[],
  mapFn: (item: T, index: number) => U,
  deps: React.DependencyList = []
): U[] {
  return useMemo(() => {
    return items.map(mapFn);
  }, [items, mapFn, ...deps]);
}

/**
 * Custom hook for memoizing expensive grouping operations
 * @param items The array of items to group
 * @param keyFn Function that returns the key for grouping
 * @param deps Additional dependencies that should trigger re-computation
 * @returns Object with grouped items
 */
export function useMemoizedGroupBy<T, K extends string | number | symbol>(
  items: T[],
  keyFn: (item: T) => K,
  deps: React.DependencyList = []
): Record<K, T[]> {
  return useMemo(() => {
    const groups = {} as Record<K, T[]>;
    items.forEach(item => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    return groups;
  }, [items, keyFn, ...deps]);
}

/**
 * Custom hook for memoizing expensive search operations
 * @param items The array of items to search
 * @param searchTerm The search term
 * @param searchFn Function that returns true if item matches search
 * @param deps Additional dependencies that should trigger re-computation
 * @returns The filtered array matching the search
 */
export function useMemoizedSearch<T>(
  items: T[],
  searchTerm: string,
  searchFn: (item: T, searchTerm: string) => boolean,
  deps: React.DependencyList = []
): T[] {
  return useMemo(() => {
    if (!searchTerm.trim()) {
      return items;
    }
    return items.filter(item => searchFn(item, searchTerm.toLowerCase()));
  }, [items, searchTerm, searchFn, ...deps]);
}

export default useMemoizedFilter;