'use client';

import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const inter = Inter({ subsets: ['latin'] });

const metadata: Metadata = {
  title: 'TierList App',
  description: 'Créez et partagez vos tier lists',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsLoading(false);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} h-full bg-gray-900 text-white antialiased`}>
        <div className="min-h-screen flex flex-col">
          <header className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 shadow-xl sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <Link href="/" className="flex items-center">
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                      TierList
                    </span>
                    <span className="ml-1 text-xs px-2 py-0.5 rounded bg-indigo-500 text-white font-medium">
                      App
                    </span>
                  </Link>
                </div>

                {/* Desktop navigation */}
                <nav className="hidden md:flex space-x-4">
                  {!isLoading && (
                    <>
                      {isAuthenticated ? (
                        <>
                          <Link
                            href="/dashboard"
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              pathname === '/dashboard'
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                          >
                            Dashboard
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          >
                            Déconnexion
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/auth/login"
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              pathname === '/auth/login'
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                          >
                            Connexion
                          </Link>
                          <Link
                            href="/auth/register"
                            className="px-3 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-colors"
                          >
                            S'inscrire
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </nav>

                {/* Mobile menu button */}
                <div className="md:hidden flex items-center">
                  <button
                    type="button"
                    className="text-gray-300 hover:text-white p-2"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    <span className="sr-only">Ouvrir le menu</span>
                    {isMobileMenuOpen ? (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden border-t border-gray-700">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                  {!isLoading && (
                    <>
                      {isAuthenticated ? (
                        <>
                          <Link
                            href="/dashboard"
                            className={`block px-3 py-2 rounded-md text-base font-medium ${
                              pathname === '/dashboard'
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Dashboard
                          </Link>
                          <button
                            onClick={() => {
                              handleLogout();
                              setIsMobileMenuOpen(false);
                            }}
                            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                          >
                            Déconnexion
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/auth/login"
                            className={`block px-3 py-2 rounded-md text-base font-medium ${
                              pathname === '/auth/login'
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            Connexion
                          </Link>
                          <Link
                            href="/auth/register"
                            className="block px-3 py-2 rounded-md text-base font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            S'inscrire
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </header>

          <main className="flex-grow">{children}</main>

          <footer className="bg-gray-800 border-t border-gray-700 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:justify-between items-center">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <p className="text-sm text-gray-400">
                    &copy; {new Date().getFullYear()} TierList App. Tous droits réservés.
                  </p>
                </div>
                <div className="flex space-x-6">
                  <a href="#" className="text-gray-400 hover:text-gray-300">
                    <span className="sr-only">Twitter</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-gray-300">
                    <span className="sr-only">GitHub</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
