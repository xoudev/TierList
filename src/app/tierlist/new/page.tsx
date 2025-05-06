'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import FormInput from '@/components/FormInput';
import FormButton from '@/components/FormButton';

export default function NewTierListPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
      }
    };

    checkUser();
  }, [router]);

  const validateForm = () => {
    if (!title || title.trim() === '') {
      setFormError('Le titre est requis');
      return false;
    }
    
    setFormError(undefined);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('tier_lists')
        .insert([
          {
            title,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      router.push(`/tierlist/${data.id}`);
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue lors de la création de la tier list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
            Créer une nouvelle tier list
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Donnez un titre à votre tier list pour commencer à la personnaliser
          </p>
        </div>

        {error && (
          <div className="mb-8 bg-red-900/60 border border-red-500 text-red-200 px-6 py-4 rounded-lg flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-xl shadow-purple-900/10 border border-gray-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <FormInput
              id="title"
              label="Titre de la tier list"
              placeholder="Ex: Mes animes préférés"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={formError}
              required
              leftIcon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              }
            />

            <div className="flex items-center justify-between pt-4">
              <FormButton
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                }
              >
                Retour
              </FormButton>
              
              <FormButton
                type="submit"
                variant="primary"
                isLoading={loading}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              >
                Créer la tier list
              </FormButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 