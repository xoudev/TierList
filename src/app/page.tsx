'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error("Erreur lors de la vérification de l'authentification:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <div className="min-h-[calc(100vh-16rem)] flex flex-col items-center justify-center px-4 pt-10 pb-20">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-600 pb-2">
          Créez vos Tier Lists
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Classez, organisez et partagez vos tier lists personnalisées avec vos amis
        </p>
        
        {!loading && (
          <div className="relative mt-20 w-full max-w-3xl mx-auto">
            {!isAuthenticated ? (
              // Afficher les options de connexion uniquement si non authentifié
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur-lg opacity-50"></div>
            ) : null}
            <div className={`relative ${!isAuthenticated ? 'bg-gray-800/90 backdrop-blur-sm p-8 rounded-lg shadow-xl border border-gray-700' : ''}`}>
              {!isAuthenticated ? (
                // Options de connexion et inscription
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col items-center justify-center space-y-6 md:items-start md:text-left">
                    <div className="h-16 w-16 rounded-full bg-indigo-900/50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Commencez maintenant</h2>
                    <p className="text-gray-400">
                      Créez un compte gratuit pour commencer à organiser vos tier lists personnalisées
                    </p>
                    <div className="flex gap-4 mt-4 w-full">
                      <Link
                        href="/auth/register"
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center"
                      >
                        S'inscrire
                      </Link>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center space-y-6 md:items-start md:text-left">
                    <div className="h-16 w-16 rounded-full bg-purple-900/50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Déjà membre?</h2>
                    <p className="text-gray-400">
                      Connectez-vous pour accéder à vos tier lists et continuer votre classement
                    </p>
                    <div className="flex gap-4 mt-4 w-full">
                      <Link
                        href="/auth/login"
                        className="w-full py-3 px-4 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700 transition-colors flex items-center justify-center"
                      >
                        Se connecter
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                // Message et bouton pour l'utilisateur déjà connecté
                <div className="py-10">
                  <div className="flex flex-col items-center justify-center space-y-6">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Vous êtes connecté!</h2>
                    <p className="text-xl text-gray-300 max-w-md">
                      Vous pouvez maintenant créer et gérer vos tier lists
                    </p>
                    <div className="flex gap-4 mt-4">
                      <Link
                        href="/dashboard"
                        className="py-4 px-8 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center"
                      >
                        Accéder à mon tableau de bord
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700 shadow-lg">
          <div className="h-12 w-12 rounded-lg bg-emerald-900/30 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Organisez</h3>
          <p className="text-gray-400">Créez et organisez vos listes dans différentes catégories personnalisées</p>
        </div>
        
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700 shadow-lg">
          <div className="h-12 w-12 rounded-lg bg-sky-900/30 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Classez</h3>
          <p className="text-gray-400">Glissez et déposez pour classer vos éléments facilement dans différents tiers</p>
        </div>
        
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-700 shadow-lg">
          <div className="h-12 w-12 rounded-lg bg-rose-900/30 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Partagez</h3>
          <p className="text-gray-400">Partagez vos tier lists avec vos amis et voyez leurs réactions</p>
        </div>
      </div>
    </div>
  );
}
