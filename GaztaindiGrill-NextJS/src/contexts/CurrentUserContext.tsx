"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiBaseUrl } from "@/utils";
import type { User } from "@/types";

const STORAGE_KEY = "gaztaindigrill.user";

interface CurrentUserContextValue {
  currentUser: User | undefined;
  users: User[];
  isUserModalOpen: boolean;
  setCurrentUser: (user: User) => void;
  createUser: (name: string) => Promise<User | undefined>;
  openUserModal: () => void;
  closeUserModal: () => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {

  const [currentUser, setCurrentUserState] = useState<User | undefined>(undefined);
  const [users, setUsers] = useState<User[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const fetchUsers = useCallback(async (): Promise<User[]> => {
    const res = await fetch(`${apiBaseUrl()}/users`);
    if (!res.ok) throw new Error("No se pudieron cargar los usuarios");
    const data = await res.json();
    return Array.isArray(data) ? data.map((u) => ({ id: u.id, name: u.name })) : [];
  }, []);

  // localStorage is read here and never during render: the export is static, so a stored
  // value would not match the prerendered HTML.
  useEffect(() => {
    const load = async () => {
      try {
        const list = await fetchUsers();
        setUsers(list);

        const raw = window.localStorage.getItem(STORAGE_KEY);
        const stored = raw ? (JSON.parse(raw) as User) : undefined;
        // The stored id can point at a user deactivated since it was written.
        const match = stored ? list.find((u) => u.id === stored.id) : undefined;

        if (match) {
          setCurrentUserState(match);
          return;
        }

        window.localStorage.removeItem(STORAGE_KEY);
        setIsUserModalOpen(true);
      } catch (error) {
        console.error("[CurrentUserContext] Error loading the users:", error);
        toast.error("No se pudieron cargar los usuarios");
      }
    };

    load();
  }, [fetchUsers]);

  const setCurrentUser = useCallback((user: User) => {
    setCurrentUserState(user);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setIsUserModalOpen(false);
  }, []);

  const createUser = useCallback(async (name: string): Promise<User | undefined> => {
    try {
      const res = await fetch(`${apiBaseUrl()}/users/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data?.message || "No se pudo crear el usuario");
        return undefined;
      }

      const created: User = { id: data.id, name };
      setUsers((prev) => [...prev, created]);
      return created;
    } catch (error) {
      console.error("[CurrentUserContext] Error creating the user:", error);
      toast.error("Error de conexión al crear el usuario");
      return undefined;
    }
  }, []);

  const openUserModal = useCallback(() => setIsUserModalOpen(true), []);
  const closeUserModal = useCallback(() => setIsUserModalOpen(false), []);

  const value = useMemo(() => ({
    currentUser,
    users,
    isUserModalOpen,
    setCurrentUser,
    createUser,
    openUserModal,
    closeUserModal,
  }), [currentUser, users, isUserModalOpen, setCurrentUser, createUser, openUserModal, closeUserModal]);

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider');
  }
  return context;
}
