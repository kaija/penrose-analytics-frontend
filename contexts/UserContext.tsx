'use client';

/**
 * User Context
 * Provides user data to all components without multiple API calls
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Project {
  id: string;
  name: string;
}

interface UserData {
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
  };
  projects: Project[];
  activeProjectId: string | null;
  isSuperAdmin: boolean;
}

interface UserContextType {
  userData: UserData | null;
  isLoading: boolean;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user/me');
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const refreshUserData = async () => {
    setIsLoading(true);
    await fetchUserData();
  };

  return (
    <UserContext.Provider value={{ userData, isLoading, refreshUserData }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
