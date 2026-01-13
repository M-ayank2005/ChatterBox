"use client";

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';

interface ResizablePanelProps {
  children: ReactNode;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
}

export default function ResizablePanel({ 
  children, 
  minWidth = 280, 
  maxWidth = 600, 
  defaultWidth = 400 
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (panelRef.current) {
      const newWidth = e.clientX - panelRef.current.getBoundingClientRect().left;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    }
  }, [minWidth, maxWidth]);

  // Add event listeners for mouse move and mouse up
  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => resize(e);
      const handleMouseUp = () => stopResizing();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, resize, stopResizing]);

  return (
    <div 
      ref={panelRef}
      className="relative flex-shrink-0 h-full"
      style={{ width: `${width}px` }}
    >
      {/* Main content */}
      <div className="w-full h-full overflow-hidden">
        {children}
      </div>
      
      {/* Resize handle */}
      <div
        className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-50 transition-colors group ${
          isResizing ? 'bg-[#00a884]' : 'bg-transparent hover:bg-[#00a884]/50'
        }`}
        onMouseDown={startResizing}
      >
        {/* Visual indicator on hover */}
        <div className={`absolute top-1/2 -translate-y-1/2 right-0 w-1 h-20 rounded-full transition-opacity ${
          isResizing ? 'bg-[#00a884] opacity-100' : 'bg-[#8696a0] opacity-0 group-hover:opacity-100'
        }`} />
      </div>
      
      {/* Overlay to prevent text selection while resizing */}
      {isResizing && (
        <div className="fixed inset-0 z-40 cursor-col-resize" />
      )}
    </div>
  );
}
