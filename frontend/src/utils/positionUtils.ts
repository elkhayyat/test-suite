/**
 * Position utilities for handling node positioning in the flow editor
 * Consolidates duplicate position handling logic across the application
 */

import React from 'react';

export interface Position {
  x: number;
  y: number;
}

// Standard position constants
export const DEFAULT_NODE_POSITION: Position = { x: 250, y: 250 };
export const INITIAL_NODE_POSITION: Position = { x: 100, y: 100 };
export const COPY_OFFSET: Position = { x: 50, y: 50 };
export const GRID_SPACING: Position = { x: 300, y: 150 };
export const GRID_COLUMNS = 3;

/**
 * Ensures a position exists, falling back to default if undefined
 */
export const ensurePosition = (position?: Position): Position => {
  return position || DEFAULT_NODE_POSITION;
};

/**
 * Ensures a position exists, falling back to initial position for new nodes
 */
export const ensureInitialPosition = (position?: Position): Position => {
  return position || INITIAL_NODE_POSITION;
};

/**
 * Calculates an offset position for copy/paste/duplicate operations
 */
export const calculateOffsetPosition = (
  basePosition?: Position, 
  offset: Position = COPY_OFFSET
): Position => ({
  x: (basePosition?.x || 0) + offset.x,
  y: (basePosition?.y || 0) + offset.y,
});

/**
 * Calculates grid-based position for mass import operations
 * Arranges nodes in a grid layout starting from base position
 */
export const calculateGridPosition = (
  index: number, 
  basePosition: Position = DEFAULT_NODE_POSITION,
  columns: number = GRID_COLUMNS,
  spacing: Position = GRID_SPACING
): Position => ({
  x: basePosition.x + (index % columns) * spacing.x,
  y: basePosition.y + Math.floor(index / columns) * spacing.y,
});

/**
 * Calculates position from drop event coordinates
 * Converts screen coordinates to flow editor coordinates
 */
export const calculateDropPosition = (
  event: React.DragEvent | DragEvent, 
  containerBounds: DOMRect
): Position => ({
  x: event.clientX - containerBounds.left,
  y: event.clientY - containerBounds.top,
});

/**
 * Calculates position from mouse event coordinates  
 * Converts screen coordinates to flow editor coordinates
 */
export const calculateMousePosition = (
  event: MouseEvent, 
  containerBounds: DOMRect
): Position => ({
  x: event.clientX - containerBounds.left,
  y: event.clientY - containerBounds.top,
});

/**
 * Creates a staggered layout for multiple nodes
 * Useful for creating multiple nodes at once with automatic spacing
 */
export const calculateStaggeredPosition = (
  index: number,
  basePosition: Position = DEFAULT_NODE_POSITION,
  staggerOffset: Position = COPY_OFFSET
): Position => ({
  x: basePosition.x + (index * staggerOffset.x),
  y: basePosition.y + (index * staggerOffset.y),
});

/**
 * Validates that a position has valid numeric coordinates
 */
export const isValidPosition = (position: any): position is Position => {
  return (
    position &&
    typeof position.x === 'number' &&
    typeof position.y === 'number' &&
    !isNaN(position.x) &&
    !isNaN(position.y)
  );
};

/**
 * Clamps position coordinates to stay within bounds
 */
export const clampPosition = (
  position: Position,
  minBounds: Position = { x: 0, y: 0 },
  maxBounds?: Position
): Position => {
  let clamped = {
    x: Math.max(minBounds.x, position.x),
    y: Math.max(minBounds.y, position.y),
  };

  if (maxBounds) {
    clamped.x = Math.min(maxBounds.x, clamped.x);
    clamped.y = Math.min(maxBounds.y, clamped.y);
  }

  return clamped;
};