/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'react-beautiful-dnd' {
  import * as React from 'react';

  export const DragDropContext: React.ComponentType<any>;
  export const Droppable: React.ComponentType<any>;
  export const Draggable: React.ComponentType<any>;

  export type DropResult = any;
  export type DroppableProvided = any;
  export type DroppableStateSnapshot = any;
  export type DraggableProvided = any;
  export type DraggableStateSnapshot = any;

  const _default: any;
  export default _default;
}
