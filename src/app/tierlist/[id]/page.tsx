'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { supabase } from '@/lib/supabase';
import TierListItem from '@/components/TierListItem';
import FormInput from '@/components/FormInput';
import FormButton from '@/components/FormButton';

interface TierListItem {
  id: string;
  title: string;
  image_url: string | null;
  position: number;
  tier: string;
}

interface TierColor {
  from: string;
  to: string;
}

interface TierData {
  id: string;
  name: string;
  position: number;
  color_from: string;
  color_to: string;
}

const DEFAULT_TIER_COLORS: Record<string, TierColor> = {};

const getTailwindColor = (colorName: string) => {
  const colorMap: Record<string, string> = {
    'rose-500': '244 63 94',
    'pink-600': '219 39 119',
    'orange-500': '249 115 22',
    'amber-600': '217 119 6',
    'yellow-400': '250 204 21',
    'yellow-600': '202 138 4',
    'lime-400': '163 230 53',
    'green-600': '22 163 74',
    'cyan-400': '34 211 238',
    'blue-600': '37 99 235',
    'purple-400': '192 132 252',
    'violet-600': '124 58 237',
    'gray-500': '107 114 128',
    'gray-600': '75 85 99',
  };
  return colorMap[colorName] || '107 114 128';
};

export default function TierListPage({ params }: { params: { id: string } }) {
  const { id } = useParams();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<TierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemImageUrl, setNewItemImageUrl] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<TierListItem | null>(null);
  
  // Nouvelles états pour les fonctionnalités
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [editingItem, setEditingItem] = useState<TierListItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState('');
  const [editedTier, setEditedTier] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Utiliser useRef pour suivre l'état des opérations de drag and drop
  const isDraggingRef = useRef(false);
  const lastOperationRef = useRef<{itemId: string, tier: string, position: number, timestamp: number} | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [tiers, setTiers] = useState<TierData[]>([]);
  const [newTierName, setNewTierName] = useState('');
  const [showTierForm, setShowTierForm] = useState(false);
  const [draggedTier, setDraggedTier] = useState<string | null>(null);

  const [tierColors, setTierColors] = useState<Record<string, TierColor>>(DEFAULT_TIER_COLORS);
  const [newTierColor, setNewTierColor] = useState<TierColor>({ from: 'gray-500', to: 'gray-600' });

  const loadTierList = async () => {
    try {
      const { data: tierList, error: tierListError } = await supabase
        .from('tier_lists')
        .select('*')
        .eq('id', id)
        .single();

      if (tierListError) throw tierListError;

      const { data: items, error: itemsError } = await supabase
        .from('tier_list_items')
        .select('*')
        .eq('tier_list_id', id)
        .order('position');

      if (itemsError) throw itemsError;

      setTitle(tierList.title);
      setItems(items || []);
      setIsCompleted(tierList.is_completed || false);
      await loadTiers();
      setLoading(false);
      setError(null);
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  };

  const loadTiers = async () => {
    try {
      const { data: tiersData, error: tiersError } = await supabase
        .from('tiers')
        .select('*')
        .eq('tier_list_id', id)
        .order('position');

      if (tiersError) throw tiersError;

      setTiers(tiersData || []);
      
      // Mettre à jour les couleurs des tiers
      const newTierColors: Record<string, TierColor> = {};
      tiersData?.forEach(tier => {
        newTierColors[tier.name] = {
          from: tier.color_from,
          to: tier.color_to
        };
      });
      setTierColors(newTierColors);
    } catch (error: any) {
      setError(error.message);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      
      // Vérifier et créer le champ is_completed si nécessaire
      await checkAndCreateIsCompletedField();
      
      loadTierList();
    };

    checkUser();
  }, [router]);
  
  // Fonction pour vérifier et créer le champ is_completed si nécessaire
  const checkAndCreateIsCompletedField = async () => {
    try {
      // Tenter de récupérer une tier list avec le champ is_completed
      const { data, error } = await supabase
        .from('tier_lists')
        .select('is_completed')
        .limit(1);
      
      // Si aucune erreur, le champ existe déjà
      if (!error) return;
      
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log("Le champ is_completed n'existe pas, tentative de création...");
        
        // Vous auriez besoin d'autorisations admin pour cela,
        // donc cette opération échouerait probablement côté client.
        // C'est juste un exemple de comment ça pourrait être fait.
        const { error: alterError } = await supabase.rpc('alter_table_tier_lists', {
          sql: "ALTER TABLE tier_lists ADD COLUMN is_completed BOOLEAN DEFAULT false"
        });
        
        if (alterError) {
          console.error("Impossible de créer le champ is_completed:", alterError);
          alert("Veuillez ajouter le champ 'is_completed' (BOOLEAN) à la table tier_lists dans votre base de données Supabase.");
        } else {
          console.log("Champ is_completed créé avec succès!");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du champ is_completed:", error);
    }
  };

  // Modifions le système de sortable context pour une approche plus fiable
  // Au lieu d'une seule zone pour tous les items, nous allons créer une zone par tier
  const handleDragStart = useCallback((event: any) => {
    // Empêcher le drag & drop si la tier list est terminée
    if (isCompleted) return;
    
    isDraggingRef.current = true;
    setActiveId(event.active.id);
    const item = items.find(item => item.id === event.active.id);
    if (item) {
      setDraggedItem(item);
      lastOperationRef.current = {
        itemId: item.id,
        tier: item.tier,
        position: item.position,
        timestamp: Date.now()
      };
    }
  }, [items, isCompleted]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Récupérer l'ID de l'élément actuellement survolé
    const { over, active } = event;
    
    if (!over) {
      if (activeTier !== null) {
        setActiveTier(null);
      }
      return;
    }

    // Si on survole une zone de tier (identifiée par "tier-")
    if (over.id.toString().startsWith('tier-')) {
      const newTier = over.id.toString().replace('tier-', '');
      
      // Ne mettre à jour que si le tier actif a changé
      if (activeTier !== newTier) {
        setActiveTier(newTier);
      }
    } else {
      // L'élément survolé est un item, déterminer son tier
      const overItemId = over.id;
      
      // Récupérer le tier de l'élément survolé
      const overItem = items.find(item => item.id === overItemId);
      if (overItem && activeTier !== overItem.tier) {
        setActiveTier(overItem.tier);
      }
    }
  }, [activeTier, items]);

  const handleDragEnd = useCallback(async (event: any) => {
    // Réinitialiser l'état visuel immédiatement
    setActiveId(null);
    setDraggedItem(null);
    setActiveTier(null);
    
    // Si on n'est pas en train de glisser, ne rien faire
    if (!isDraggingRef.current) return;

    // Débounce pour éviter les appels multiples
    if (Date.now() - (lastOperationRef.current?.timestamp || 0) < 300) {
      isDraggingRef.current = false;
      return;
    }
    
    const { active, over } = event;

    if (!over) {
      isDraggingRef.current = false;
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        isDraggingRef.current = false;
        throw new Error('Vous devez être connecté pour modifier la tier list');
      }

      const draggedItem = items.find(item => item.id === active.id);
      if (!draggedItem) {
        isDraggingRef.current = false;
        return;
      }

      // Si on dépose sur une zone de tier (identifiée par "tier-")
      if (over.id.toString().startsWith('tier-')) {
        const newTier = over.id.toString().replace('tier-', '');
        
        // Vérifier si le tier a changé pour éviter les mises à jour inutiles
        if (draggedItem.tier === newTier) {
          isDraggingRef.current = false;
          return;
        }
        
        // Vérifier si cette opération a déjà été effectuée récemment
        if (
          lastOperationRef.current && 
          lastOperationRef.current.itemId === draggedItem.id && 
          lastOperationRef.current.tier === newTier
        ) {
          isDraggingRef.current = false;
          return;
        }
        
        // Mettre à jour lastOperationRef
        lastOperationRef.current = {
          itemId: draggedItem.id,
          tier: newTier,
          position: draggedItem.position,
          timestamp: Date.now()
        };
        
        // Créer un nouvel array au lieu de mapper l'existant
        const updatedItems = [...items];
        const itemIndex = updatedItems.findIndex(item => item.id === active.id);
        
        if (itemIndex !== -1) {
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            tier: newTier
          };
          
          // Utiliser une seule mise à jour d'état
          setItems(updatedItems);
          
          // Mettre à jour dans la base de données
          await supabase
            .from('tier_list_items')
            .update({ 
              tier: newTier,
              tier_list_id: id,
              title: draggedItem.title,
              position: draggedItem.position
            })
            .eq('id', active.id);
        }
      } 
      // Si on dépose sur un autre élément (réorganisation dans le même tier)
      else if (active.id !== over.id) {
        const overItem = items.find(item => item.id === over.id);
        if (!overItem) {
          isDraggingRef.current = false;
          return;
        }
        
        // Vérifier si les éléments sont dans le même tier
        if (draggedItem.tier !== overItem.tier) {
          isDraggingRef.current = false;
          return;
        }

        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        // Éviter les mises à jour inutiles si la position ne change pas
        if (oldIndex === newIndex) {
          isDraggingRef.current = false;
          return;
        }
        
        // Recalculer les positions
        const newItems = arrayMove([...items], oldIndex, newIndex);
        
        // Vérifier si cette opération a déjà été effectuée récemment
        if (
          lastOperationRef.current && 
          lastOperationRef.current.itemId === draggedItem.id && 
          lastOperationRef.current.position === newIndex
        ) {
          isDraggingRef.current = false;
          return;
        }
        
        // Mettre à jour lastOperationRef
        lastOperationRef.current = {
          itemId: draggedItem.id,
          tier: draggedItem.tier,
          position: newIndex,
          timestamp: Date.now()
        };
        
        // Mettre à jour les positions
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          position: index
        }));

        // Une seule mise à jour d'état
        setItems(updatedItems);

        // Mettre à jour uniquement les positions modifiées
        const itemsToUpdate = updatedItems
          .filter(item => item.tier === draggedItem.tier)
          .map(item => ({
            id: item.id,
            position: item.position,
            tier_list_id: id,
            title: item.title,
            tier: item.tier
          }));

        if (itemsToUpdate.length > 0) {
          await supabase
            .from('tier_list_items')
            .upsert(itemsToUpdate);
        }
      }
    } catch (error: any) {
      setError(error.message);
      // En cas d'erreur, recharger la liste pour assurer la cohérence
      loadTierList();
    } finally {
      // S'assurer que isDragging est remis à false dans tous les cas
      isDraggingRef.current = false;
    }
  }, [items, id, loadTierList, activeTier]);

  // Mémoiser les items IDs pour SortableContext
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const validateForm = () => {
    if (!newItemTitle || newItemTitle.trim() === '') {
      setFormError('Le titre est requis');
      return false;
    }
    
    if (newItemImageUrl && !isValidUrl(newItemImageUrl)) {
      setFormError('L\'URL de l\'image n\'est pas valide');
      return false;
    }
    
    setFormError(undefined);
    return true;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Empêcher l'ajout d'éléments si la tier list est terminée
    if (isCompleted) {
      setError("Impossible de modifier une tier list terminée");
      return;
    }
    
    if (!validateForm()) return;
    
    setIsAddingItem(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté pour ajouter un élément');

      // Vérifier si nous avons un tier sélectionné ou prendre le premier disponible
      const tierToUse = selectedTier || (tiers.length > 0 ? tiers[0].name : null);
      
      if (!tierToUse) {
        throw new Error('Veuillez d\'abord créer un tier avant d\'ajouter des éléments');
      }

      const { data, error } = await supabase
        .from('tier_list_items')
        .insert([
          {
            tier_list_id: id,
            title: newItemTitle,
            image_url: newItemImageUrl || null,
            position: items.length,
            tier: tierToUse
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setItems([...items, data]);
      setNewItemTitle('');
      setNewItemImageUrl('');
      setIsFormOpen(false);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsAddingItem(false);
    }
  };

  const renderAddItemForm = () => {
    if (tiers.length === 0) {
      return (
        <div className="mb-10 bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-xl shadow-purple-900/10 border border-gray-700">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-white mb-2">Aucun tier disponible</h2>
            <p className="text-gray-400 mb-6">Veuillez d'abord créer un tier avant d'ajouter des éléments.</p>
            <FormButton
              onClick={() => {
                setIsFormOpen(false);
                setShowTierForm(true);
              }}
              variant="primary"
            >
              Créer un tier
            </FormButton>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-10 bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-xl shadow-purple-900/10 border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-indigo-300">Ajouter un nouvel élément</h2>
        <form onSubmit={handleAddItem} className="space-y-6">
          <FormInput
            id="item-title"
            label="Titre de l'élément"
            placeholder="Saisissez un titre"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            error={formError}
            required
            leftIcon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />

          <FormInput
            id="item-image-url"
            label="URL de l'image (optionnel)"
            placeholder="https://exemple.com/image.jpg"
            value={newItemImageUrl}
            onChange={(e) => setNewItemImageUrl(e.target.value)}
            type="url"
            leftIcon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          <div className={`w-full`}>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="tier" className="block text-sm font-medium text-gray-300">
                Tier
              </label>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-gray-700 to-gray-700 opacity-0 blur-sm transition-all duration-300 group-hover:from-indigo-500 group-hover:to-purple-600 group-hover:opacity-30"></div>
              <div className="relative">
                <select
                  id="tier"
                  value={selectedTier || (tiers.length > 0 ? tiers[0].name : '')}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 text-white py-2.5 px-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none hover:border-gray-500 transition-all duration-200 shadow-sm appearance-none backdrop-blur-sm"
                >
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.name}>
                      Tier {tier.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-4 pt-2">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setIsFormOpen(false)}
              fullWidth
            >
              Annuler
            </FormButton>
            <FormButton
              type="submit"
              variant="primary"
              isLoading={isAddingItem}
              fullWidth
            >
              Ajouter
            </FormButton>
          </div>
        </form>
      </div>
    );
  };

  const TierDroppable = ({ tier, children }: { tier: string; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `tier-${tier}`,
      data: { tier }
    });

    const isActive = activeTier === tier || isOver;
    const tierItems = items.filter(item => item.tier === tier);
    const isFullTier = tierItems.length > 8;
    const isSpecificCount = tierItems.length >= 3 && tierItems.length <= 5;

    return (
      <div 
        ref={setNodeRef} 
        className={`w-full overflow-hidden relative transition-all duration-200 rounded-xl ${
          isActive ? 'ring-2 ring-indigo-500 ring-opacity-80 scale-[1.01] drop-zone-active' : ''
        } ${
          isFullTier ? 'min-h-[300px]' : ''
        } ${
          isSpecificCount ? 'tier-problematic' : ''
        }`}
        data-tier={tier}
      >
        {/* Overlay transparent pour augmenter la zone droppable */}
        <div className="absolute inset-0 z-10" data-dropzone-overlay="true"></div>
        
        {/* Contenu visible */}
        <div className="relative z-20">
          {children}
        </div>
      </div>
    );
  };

  // Modifions également la structure pour stocker le timestamp
  useEffect(() => {
    // Initialiser le lastOperationRef
    lastOperationRef.current = {
      itemId: '',
      tier: '',
      position: -1,
      timestamp: 0
    };
  }, []);

  // Fonction pour supprimer un élément
  const deleteItem = async (itemId: string) => {
    // Empêcher la suppression d'éléments si la tier list est terminée
    if (isCompleted) {
      setError("Impossible de modifier une tier list terminée");
      setShowDeleteConfirm(false);
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté pour supprimer un élément');
      
      const { error } = await supabase
        .from('tier_list_items')
        .delete()
        .eq('id', itemId);
        
      if (error) throw error;
      
      // Mettre à jour l'état local
      setItems(prevItems => prevItems.filter(item => item.id !== itemId));
      setItemToDelete(null);
      setShowDeleteConfirm(false);
      
    } catch (error: any) {
      setError(error.message);
    }
  };
  
  // Fonction pour ouvrir le modal d'édition
  const openEditModal = (item: TierListItem) => {
    setEditingItem(item);
    setEditedTitle(item.title);
    setEditedImageUrl(item.image_url || '');
    setEditedTier(item.tier);
    setShowEditModal(true);
  };
  
  // Fonction pour sauvegarder les modifications d'un élément
  const saveItemEdits = async () => {
    if (!editingItem) return;
    
    // Empêcher la modification d'éléments si la tier list est terminée
    if (isCompleted) {
      setError("Impossible de modifier une tier list terminée");
      setShowEditModal(false);
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté pour modifier un élément');
      
      // Valider l'URL de l'image
      if (editedImageUrl && !isValidUrl(editedImageUrl)) {
        setFormError("L'URL de l'image n'est pas valide");
        return;
      }
      
      // Mettre à jour dans la base de données
      const { error } = await supabase
        .from('tier_list_items')
        .update({
          title: editedTitle,
          image_url: editedImageUrl || null,
          tier: editedTier
        })
        .eq('id', editingItem.id);
        
      if (error) throw error;
      
      // Mettre à jour l'état local
      setItems(prevItems => prevItems.map(item => 
        item.id === editingItem.id 
          ? { ...item, title: editedTitle, image_url: editedImageUrl || null, tier: editedTier }
          : item
      ));
      
      // Fermer le modal
      setShowEditModal(false);
      setEditingItem(null);
      setFormError(undefined);
      
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Ajouter en props à TierListItem les fonctions d'édition et de suppression
  const handleEditItem = (item: TierListItem) => {
    openEditModal(item);
  };
  
  const handleDeleteItem = (itemId: string) => {
    setItemToDelete(itemId);
    setShowDeleteConfirm(true);
  };

  // Modifions la fonction completeTierList pour aussi mettre à jour l'état local 
  const completeTierList = async () => {
    setIsCompleting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté pour finaliser cette tier list');

      // Marquer la tier list comme terminée dans la base de données
      const { error } = await supabase
        .from('tier_lists')
        .update({ 
          is_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Ajouter un délai pour permettre à l'animation de transition de se lancer
      setTimeout(() => {
        // Mettre à jour l'état local
        setIsCompleted(true);
        // Ajout d'un scrollTo pour assurer que l'utilisateur voit le haut de la tier list
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      
    } catch (error: any) {
      setError(error.message);
      setIsCompleting(false);
    }
  };
  
  const handleCompleteTierList = async () => {
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from('tier_lists')
        .update({ is_completed: true })
        .eq('id', id);
      
      if (error) throw error;
      
      setIsCompleted(true);
      setError(null);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsCompleting(false);
    }
  };
  
  const handleReopenTierList = async () => {
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from('tier_lists')
        .update({ is_completed: false })
        .eq('id', id);
      
      if (error) throw error;
      
      setIsCompleted(false);
      setError(null);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsCompleting(false);
    }
  };

  // Fonction pour ajouter un nouveau tier
  const addNewTier = async () => {
    // Empêcher l'ajout de tiers si la tier list est terminée
    if (isCompleted) {
      setError("Impossible de modifier une tier list terminée");
      return;
    }
    
    if (newTierName && !tiers.some(t => t.name === newTierName)) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Vous devez être connecté pour ajouter un tier');

        const { data, error } = await supabase
          .from('tiers')
          .insert([
            {
              tier_list_id: id,
              name: newTierName,
              position: tiers.length,
              color_from: newTierColor.from,
              color_to: newTierColor.to
            }
          ])
          .select()
          .single();

        if (error) throw error;

        setTiers([...tiers, data]);
        setTierColors({
          ...tierColors,
          [newTierName]: newTierColor
        });
        setNewTierName('');
        setNewTierColor({ from: 'gray-500', to: 'gray-600' });
        setShowTierForm(false);
      } catch (error: any) {
        setError(error.message);
      }
    }
  };

  // Fonction pour mettre à jour la couleur d'un tier
  const updateTierColor = (tier: string, color: TierColor) => {
    setTierColors({
      ...tierColors,
      [tier]: color
    });
  };

  // Modifier la fonction deleteTier
  const deleteTier = async (tierToDelete: string) => {
    // Empêcher la suppression de tiers si la tier list est terminée
    if (isCompleted) {
      setError("Impossible de modifier une tier list terminée");
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté pour supprimer un tier');

      // Vérifier si le tier contient des items
      const itemsInTier = items.filter(item => item.tier === tierToDelete);
      if (itemsInTier.length > 0) {
        throw new Error(`Impossible de supprimer ce tier car il contient ${itemsInTier.length} élément${itemsInTier.length > 1 ? 's' : ''}. Déplacez d'abord tous les éléments vers un autre tier.`);
      }

      // Vérifier qu'il reste au moins un autre tier
      if (tiers.length <= 1) {
        throw new Error('Impossible de supprimer le dernier tier. Vous devez avoir au moins un tier.');
      }

      // Supprimer le tier
      const { error: tierError } = await supabase
        .from('tiers')
        .delete()
        .eq('tier_list_id', id)
        .eq('name', tierToDelete);

      if (tierError) throw tierError;

      setTiers(tiers.filter(t => t.name !== tierToDelete));
      const { [tierToDelete]: _, ...remainingColors } = tierColors;
      setTierColors(remainingColors);
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Ajouter un composant pour le bouton de suppression de tier avec tooltip
  const DeleteTierButton = ({ tier, onDelete }: { tier: TierData, onDelete: () => void }) => {
    const itemsInTier = items.filter(item => item.tier === tier.name);
    const canDelete = itemsInTier.length === 0 && tiers.length > 1;

    return (
      <div className="relative group">
        <button
          onClick={() => canDelete && onDelete()}
          className={`${
            canDelete 
              ? 'text-red-400 hover:text-red-300 cursor-pointer' 
              : 'text-gray-600 cursor-not-allowed'
          }`}
          disabled={!canDelete}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        {!canDelete && (
          <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 hidden group-hover:block">
            <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
              {itemsInTier.length > 0 ? (
                <>Ce tier contient {itemsInTier.length} élément{itemsInTier.length > 1 ? 's' : ''}</>
              ) : (
                <>Vous devez avoir au moins un tier</>
              )}
            </div>
            <div className="absolute left-1/2 top-full -mt-2 -translate-x-1/2">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Fonction pour réorganiser les tiers
  const moveTier = async (fromIndex: number, toIndex: number) => {
    // Empêcher la réorganisation des tiers si la tier list est terminée
    if (isCompleted) {
      setError("Impossible de modifier une tier list terminée");
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté pour réorganiser les tiers');

      const newTiers = [...tiers];
      const [movedTier] = newTiers.splice(fromIndex, 1);
      newTiers.splice(toIndex, 0, movedTier);

      // Mettre à jour les positions
      const updatedTiers = newTiers.map((tier, index) => ({
        ...tier,
        position: index
      }));

      const { error } = await supabase
        .from('tiers')
        .upsert(updatedTiers);

      if (error) throw error;

      setTiers(updatedTiers);
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Fonction pour gérer le début du drag d'un tier
  const handleTierDragStart = (tier: string) => {
    setDraggedTier(tier);
  };

  // Fonction pour gérer le drop d'un tier
  const handleTierDrop = (targetTier: string) => {
    if (!draggedTier) return;
    
    const fromIndex = tiers.findIndex(t => t.name === draggedTier);
    const toIndex = tiers.findIndex(t => t.name === targetTier);
    
    if (fromIndex !== toIndex) {
      moveTier(fromIndex, toIndex);
    }
    
    setDraggedTier(null);
  };

  // Modifions le rendu des éléments avec gradient pour utiliser les valeurs RGB
  const renderGradient = (fromColor: string, toColor: string) => ({
    background: `linear-gradient(to right, rgb(${getTailwindColor(fromColor)}), rgb(${getTailwindColor(toColor)}))`,
  });

  // Ajouter la fonction pour déverrouiller la tier list
  const unlockTierList = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté pour déverrouiller cette tier list');

      const { error } = await supabase
        .from('tier_lists')
        .update({ 
          is_completed: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setIsCompleted(false);
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-2xl font-bold flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Chargement...
        </div>
      </div>
    );
  }

  const renderTierContent = (tier: TierData) => {
    const tierItems = items.filter(item => item.tier === tier.name);
    const isTierFull = tierItems.length > 8;
    const isSpecificCount = tierItems.length >= 3 && tierItems.length <= 5;

    return (
      <div 
        key={tier.id} 
        className={`rounded-xl shadow-lg shadow-black/50 bg-gray-800 backdrop-blur-sm border border-gray-700 tier-container ${
          isTierFull ? 'tier-full' : ''
        } ${
          isSpecificCount ? 'tier-specific-count' : ''
        }`}
      >
        <TierDroppable tier={tier.name}>
          <div 
            className="py-3 px-6 rounded-t-xl"
            style={renderGradient(tierColors[tier.name]?.from || 'gray-500', tierColors[tier.name]?.to || 'gray-600')}
          >
            <h2 className="text-2xl font-extrabold text-white tracking-wide flex items-center">
              <span className="min-w-[2.5rem] h-10 flex items-center justify-center mr-3 text-white font-bold bg-white/20 backdrop-blur rounded-lg overflow-hidden">
                <span className="px-2 truncate">{tier.name}</span>
              </span>
              <span>TIER {tier.name}</span>
              <span className="ml-3 text-sm font-normal opacity-70">({tierItems.length} éléments)</span>
            </h2>
          </div>
          
          <div 
            className={`py-8 px-8 min-h-[180px] transition-all duration-300 ${
              tierItems.length === 0 
                ? 'border-2 border-dashed border-gray-700/50 hover:border-gray-500 rounded-lg m-4' 
                : ''
            } ${
              activeTier === tier.name 
                ? 'bg-indigo-500/10 border-indigo-500/50' 
                : ''
            } ${
              isTierFull ? 'tier-content-full pb-8' : ''
            } ${
              isSpecificCount ? 'tier-content-specific-count' : ''
            }`}
          >
            {tierItems.length > 0 ? (
              <SortableContext 
                items={tierItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 ${
                  isTierFull ? 'auto-rows-auto' : ''
                } ${
                  isSpecificCount ? 'grid-with-extra-space' : ''
                }`}>
                  {tierItems
                    .sort((a, b) => a.position - b.position)
                    .map((item) => (
                      <TierListItem 
                        key={item.id} 
                        item={item} 
                        onEdit={() => handleEditItem(item)}
                        onDelete={() => handleDeleteItem(item.id)}
                        isCompleted={isCompleted}
                      />
                    ))}
                </div>
              </SortableContext>
            ) : (
              !isCompleted ? (
                <div className={`h-full w-full flex items-center justify-center text-gray-500 transition-all duration-300 ${
                  activeTier === tier.name ? 'text-indigo-300' : ''
                }`}>
                  <p className="text-center text-sm">
                    {activeTier === tier.name ? (
                      <>
                        Déposer ici pour ajouter au Tier {tier.name}<br />
                        <span className="text-xs opacity-75">L'élément sera ajouté à ce tier</span>
                      </>
                    ) : (
                      <>
                        Aucun élément dans ce tier.<br />
                        Glissez-déposez des éléments ici.
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <div className="h-full w-full"></div>
              )
            )}
          </div>
        </TierDroppable>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white pb-20 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header avec titre et boutons d'action */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
              {title}
              {isCompleted && (
                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Terminée
                </span>
              )}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isCompleted && (
              <>
                <FormButton
                  onClick={() => setIsFormOpen(!isFormOpen)}
                  variant="secondary"
                  disabled={isCompleted}
                  icon={
                    isFormOpen ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )
                  }
                >
                  {isFormOpen ? 'Fermer' : 'Ajouter un élément'}
                </FormButton>
                
                <FormButton
                  onClick={() => setShowTierForm(!showTierForm)}
                  variant="secondary"
                  disabled={isCompleted}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  {showTierForm ? 'Annuler' : 'Gérer les tiers'}
                </FormButton>
              </>
            )}
            
            {!isCompleted ? (
              <FormButton
                onClick={completeTierList}
                variant="primary"
                isLoading={isCompleting}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                }
              >
                Terminer la tier list
              </FormButton>
            ) : (
              <FormButton
                onClick={unlockTierList}
                variant="danger"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              >
                Rouvrir la tier list
              </FormButton>
            )}
          </div>
        </div>

        {/* Formulaire de gestion des tiers */}
        {showTierForm && !isCompleted && (
          <div className="mb-8 bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-xl shadow-purple-900/10 border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-indigo-300">Gérer les tiers</h2>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <FormInput
                    id="new-tier-name"
                    label="Nom du nouveau tier"
                    placeholder="Saisissez un nom"
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Couleur du tier</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Couleur de départ</label>
                      <select
                        value={newTierColor.from}
                        onChange={(e) => setNewTierColor({ ...newTierColor, from: e.target.value })}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white p-2"
                      >
                        <option value="rose-500">Rose</option>
                        <option value="orange-500">Orange</option>
                        <option value="yellow-400">Jaune</option>
                        <option value="lime-400">Vert clair</option>
                        <option value="cyan-400">Cyan</option>
                        <option value="blue-400">Bleu</option>
                        <option value="purple-400">Violet</option>
                        <option value="gray-500">Gris</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Couleur de fin</label>
                      <select
                        value={newTierColor.to}
                        onChange={(e) => setNewTierColor({ ...newTierColor, to: e.target.value })}
                        className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white p-2"
                      >
                        <option value="pink-600">Rose foncé</option>
                        <option value="amber-600">Orange foncé</option>
                        <option value="yellow-600">Jaune foncé</option>
                        <option value="green-600">Vert foncé</option>
                        <option value="blue-600">Bleu foncé</option>
                        <option value="indigo-600">Indigo</option>
                        <option value="violet-600">Violet foncé</option>
                        <option value="gray-600">Gris foncé</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2 h-4 rounded-lg bg-gradient-to-r" 
                       style={renderGradient(newTierColor.from, newTierColor.to)}
                  />
                </div>
                
                <FormButton
                  onClick={addNewTier}
                  variant="primary"
                  className="w-full"
                >
                  Ajouter le tier
                </FormButton>
              </div>
              
              <div className="space-y-2">
                {tiers.map((tier) => (
                  <div
                    key={tier.id}
                    draggable
                    onDragStart={() => handleTierDragStart(tier.name)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedTier !== tier.name) {
                        handleTierDrop(tier.name);
                      }
                    }}
                    className={`bg-gray-700/50 rounded-lg p-4 flex justify-between items-center cursor-move ${
                      draggedTier === tier.name ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Tier {tier.name}</span>
                        <div className="w-4 h-4 rounded-full" 
                          style={renderGradient(tierColors[tier.name]?.from || 'gray-500', tierColors[tier.name]?.to || 'gray-600')}
                        />
                      </div>
                    </div>
                    <DeleteTierButton tier={tier} onDelete={() => deleteTier(tier.name)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="mb-8 bg-red-900/60 border border-red-500 text-red-200 px-6 py-4 rounded-lg flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
            <button 
              className="ml-auto text-red-300 hover:text-red-100"
              onClick={() => setError(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Formulaire d'ajout */}
        {isFormOpen && renderAddItemForm()}

        {/* Tier List */}
        {!loading && items && (
          <div>
            {isCompleted ? (
              <div className={`space-y-8 tier-list-container completed-tier-list ${isCompleting ? 'completed-appear' : ''}`}>
                {tiers.map(renderTierContent)}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-8">
                    {tiers.map(renderTierContent)}
                  </div>
                </SortableContext>

                <DragOverlay adjustScale={false} zIndex={1000}>
                  {draggedItem && (
                    <div className="w-48 bg-gray-700 rounded-lg shadow-xl border border-indigo-500 overflow-hidden transition-all duration-300">
                      {draggedItem.image_url ? (
                        <div className="w-full aspect-video relative overflow-hidden">
                          <img
                            src={draggedItem.image_url}
                            alt={draggedItem.title}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-video bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="text-sm font-semibold text-white truncate">{draggedItem.title}</h3>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <span className="inline-flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            Tier {draggedItem.tier}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        )}

        {/* Modal d'édition */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Modifier l'élément</h3>
                <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                    setFormError(undefined);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <FormInput
                  id="edit-item-title"
                  label="Titre"
                  placeholder="Titre de l'élément"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  error={formError}
                  required
                />
                
                <FormInput
                  id="edit-item-image-url"
                  label="URL de l'image (optionnel)"
                  placeholder="https://exemple.com/image.jpg"
                  value={editedImageUrl}
                  onChange={(e) => setEditedImageUrl(e.target.value)}
                  type="url"
                />
                
                <div>
                  <label htmlFor="edit-tier" className="block text-sm font-medium text-gray-300 mb-2">
                    Tier
                  </label>
                  <select
                    id="edit-tier"
                    value={editedTier}
                    onChange={(e) => setEditedTier(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 text-white py-2.5 px-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none hover:border-gray-500 transition-all duration-200 shadow-sm appearance-none backdrop-blur-sm"
                  >
                    {tiers.map((tier) => (
                      <option key={tier.id} value={tier.name}>
                        Tier {tier.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex space-x-4 mt-6">
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingItem(null);
                      setFormError(undefined);
                    }}
                    fullWidth
                  >
                    Annuler
                  </FormButton>
                  <FormButton
                    type="button"
                    variant="primary"
                    onClick={saveItemEdits}
                    fullWidth
                  >
                    Enregistrer
                  </FormButton>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-700">
              <div className="text-center mb-6">
                <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-900/30 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Confirmer la suppression</h3>
                <p className="text-gray-300 mt-2">
                  Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
                </p>
              </div>
              
              <div className="flex space-x-4">
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setItemToDelete(null);
                  }}
                  fullWidth
                >
                  Annuler
                </FormButton>
                <FormButton
                  type="button"
                  variant="danger"
                  onClick={() => itemToDelete && deleteItem(itemToDelete)}
                  fullWidth
                >
                  Supprimer
                </FormButton>
              </div>
            </div>
          </div>
        )}

        {/* Ajout de styles CSS internes pour gérer les tiers complets */}
        <style jsx global>{`
          .tier-container {
            position: relative;
            margin-bottom: 2rem;
            overflow: visible;
            border-radius: 0.75rem;
          }
          
          .tier-full {
            position: relative;
            overflow: visible;
          }
          
          .tier-content-full {
            overflow-y: auto;
            padding-bottom: 1.5rem;
          }
          
          .tier-problematic,
          .tier-specific-count {
            position: relative;
            z-index: 1;
          }
          
          .tier-content-specific-count {
            min-height: 200px;
            position: relative;
            z-index: 1;
          }
          
          .grid-with-extra-space {
            position: relative;
            min-height: 180px;
            padding-bottom: 3rem;
          }
          
          /* Style amélioré pour les zones de drop */
          [data-dropzone-overlay="true"] {
            cursor: pointer;
            border-radius: 0.75rem;
          }
          
          .drop-zone-active {
            background-color: rgba(99, 102, 241, 0.05);
            border-radius: 0.75rem;
          }
          
          /* Style personnalisé pour la barre de défilement */
          .tier-content-full::-webkit-scrollbar {
            width: 8px;
          }
          
          .tier-content-full::-webkit-scrollbar-track {
            background: rgba(75, 85, 99, 0.2);
            border-radius: 4px;
          }
          
          .tier-content-full::-webkit-scrollbar-thumb {
            background: rgba(99, 102, 241, 0.5);
            border-radius: 4px;
          }
          
          .tier-content-full::-webkit-scrollbar-thumb:hover {
            background: rgba(99, 102, 241, 0.8);
          }

          /* Styles pour les tier lists complétées */
          .completed-tier-list .tier-header {
            position: relative;
            overflow: hidden;
          }
          
          .completed-tier-list .tier-header::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
            transform: translateX(-100%);
            animation: shimmer 2s infinite;
          }
          
          .completed-tier-list .item-card {
            transform-origin: center;
            transition: all 0.3s ease;
            animation: fadeInUp 0.5s ease-out forwards;
            opacity: 0;
          }
          
          .completed-tier-list .item-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
          }
          
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          
          /* Animation pour la transition entre édition et complété */
          .tier-list-container {
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .tier-list-container.completed-appear {
            animation: completedAppear 0.8s ease-out forwards;
          }
          
          @keyframes completedAppear {
            0% {
              opacity: 0.7;
              transform: scale(0.98);
            }
            70% {
              opacity: 1;
              transform: scale(1.01);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          @keyframes fadeInUp {
            0% {
              opacity: 0;
              transform: translateY(20px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          /* Styles pour les badges de tier */
          .completed-tier-list .tier-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            font-weight: bold;
            padding: 4px 8px;
            border-radius: 9999px;
            font-size: 0.75rem;
            color: white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            z-index: 10;
            backdrop-filter: blur(4px);
          }
          
          /* Amélioration des animations par tier */
          .completed-tier-list [data-tier="S"] .item-card {
            animation-delay: calc(0.05s * var(--item-index));
          }
          
          .completed-tier-list [data-tier="A"] .item-card {
            animation-delay: calc(0.05s * var(--item-index) + 0.1s);
          }
          
          .completed-tier-list [data-tier="B"] .item-card {
            animation-delay: calc(0.05s * var(--item-index) + 0.2s);
          }
          
          .completed-tier-list [data-tier="C"] .item-card {
            animation-delay: calc(0.05s * var(--item-index) + 0.3s);
          }
          
          .completed-tier-list [data-tier="D"] .item-card {
            animation-delay: calc(0.05s * var(--item-index) + 0.4s);
          }
          
          .completed-tier-list [data-tier="E"] .item-card {
            animation-delay: calc(0.05s * var(--item-index) + 0.5s);
          }
          
          .completed-tier-list [data-tier="F"] .item-card {
            animation-delay: calc(0.05s * var(--item-index) + 0.6s);
          }
          
          /* Améliorer l'apparence des cartes dans la tier list complétée */
          .completed-tier-list .grid {
            padding: 1rem 0;
          }
          
          .completed-tier-list .item-card {
            background-color: rgba(55, 65, 81, 0.7);
            backdrop-filter: blur(4px);
            border: 1px solid rgba(75, 85, 99, 0.5);
          }
          
          .completed-tier-list .item-card:hover {
            border-color: rgba(99, 102, 241, 0.5);
            background-color: rgba(55, 65, 81, 0.9);
          }
        `}</style>
      </div>
    </div>
  );
}