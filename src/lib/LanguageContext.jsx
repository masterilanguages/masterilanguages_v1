import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export function LanguageProvider({ children }) {
  const [selectedLanguage, setSelectedLanguage] = useState('hebrew');
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Initialize language from user profile
  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        const profiles = await base44.entities.UserProfile.list();
        if (profiles[0]?.language) {
          setSelectedLanguage(profiles[0].language);
        }
      } catch (e) {
        console.error('Failed to initialize language:', e);
      } finally {
        setIsLoading(false);
      }
    };
    initializeLanguage();
  }, []);

  const changeLanguage = async (newLanguage) => {
    if (newLanguage === selectedLanguage) return;

    setSelectedLanguage(newLanguage);

    // Clear session state and invalidate all queries
    await queryClient.resetQueries();
    queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    queryClient.invalidateQueries({ queryKey: ['days'] });
    queryClient.invalidateQueries({ queryKey: ['wordRatings'] });
    queryClient.invalidateQueries({ queryKey: ['mediaLibrary'] });
    queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
    queryClient.invalidateQueries({ queryKey: ['dayProgress'] });
  };

  return (
    <LanguageContext.Provider value={{ selectedLanguage, changeLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}