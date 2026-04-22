import { useState, useEffect } from 'react';
import { getCurrentUser, setCurrentUser, getUsers } from '../lib/storage';
import type { User } from '../types';

export function useAuth() {
  const [currentUser, setUser] = useState<User | null>(() => getCurrentUser());

  const login = (username: string, password: string): boolean => {
    const users = getUsers();
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
      setCurrentUser(found);
      setUser(found);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setUser(null);
  };

  return { currentUser, login, logout };
}
