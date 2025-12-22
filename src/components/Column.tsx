"use client";

import React from 'react';

// Column stub: original implementation used react-beautiful-dnd.
// Kept as a simple presentational stub to avoid depending on that library.
type Props = { column?: any; cards?: any[] };

export default function Column(_props: Props): React.ReactElement {
  return (
    <div className="w-80 p-4 text-sm text-gray-500">Column (stub) — replaced by integrated KanbanTest</div>
  );
}
