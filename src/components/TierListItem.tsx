'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface TierListItemProps {
  item: {
    id: string;
    title: string;
    image_url: string | null;
    position: number;
    tier: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  isCompleted?: boolean; // Ajout de la propriété isCompleted
}

export default function TierListItem({ item, onEdit, onDelete, isCompleted = false }: TierListItemProps) {
  const [imageError, setImageError] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const renderImage = () => {
    if (!item.image_url || imageError) {
      return (
        <div className="w-full aspect-video bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }

    return (
      <div className="w-full aspect-video relative overflow-hidden">
        <img
          src={item.image_url}
          alt={item.title}
          onError={handleImageError}
          className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-in-out"
        />
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-700 rounded-lg shadow-md hover:shadow-xl border border-gray-600 hover:border-indigo-500 overflow-hidden transition-all duration-300 group relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Menu d'actions - Masqué si la tier list est terminée */}
      {showActions && !isCompleted && (onEdit || onDelete) && (
        <div className="absolute top-2 right-2 z-30 bg-gray-800/90 backdrop-blur-sm rounded-lg p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
          {onEdit && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }} 
              className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-md transition-colors"
              title="Modifier"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          
          {onDelete && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }} 
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
              title="Supprimer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}
      
      {/* Zone de drag handle - désactivée si la tier list est terminée */}
      {!isCompleted && (
        <div 
          className="absolute top-2 left-2 z-10 bg-gray-800/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      )}
      
      {renderImage()}
      
      <div className="p-4">
        <h3 className="text-sm font-semibold text-white line-clamp-2 mb-1">{item.title}</h3>
        <div className="flex items-center text-xs text-gray-400">
          <span className="inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Tier {item.tier}
          </span>
        </div>
      </div>
    </div>
  );
}