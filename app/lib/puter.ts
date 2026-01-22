import { create } from "zustand";

/* -------------------------------------------------------
   Global Puter typings
------------------------------------------------------- */
declare global {
  interface Window {
    puter: {
      auth: {
        getUser: () => Promise<PuterUser>;
        isSignedIn: () => Promise<boolean>;
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
      };
      fs: {
        write: (
          path: string,
          data: string | File | Blob
        ) => Promise<File | undefined>;
        read: (path: string) => Promise<Blob>;
        upload: (file: File[] | Blob[]) => Promise<FSItem>;
        delete: (path: string) => Promise<void>;
        readdir: (path: string) => Promise<FSItem[] | undefined>;
      };
      ai: {
        chat: (
          prompt: string | ChatMessage[],
          imageURL?: string | PuterChatOptions,
          testMode?: boolean,
          options?: PuterChatOptions
        ) => Promise<object>;
        img2txt: (
          image: string | File | Blob,
          testMode?: boolean
        ) => Promise<string>;
      };
      kv: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
        list: (
          pattern: string,
          returnValues?: boolean
        ) => Promise<string[]>;
        flush: () => Promise<boolean>;
      };
    };
  }
}

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */
const getPuter = (): typeof window.puter | null => {
  if (typeof window === "undefined") return null;
  return window.puter ?? null;
};

/* -------------------------------------------------------
   Store Types
------------------------------------------------------- */
interface PuterStore {
  isLoading: boolean;
  error: string | null;
  puterReady: boolean;

  auth: {
    user: PuterUser | null;
    isAuthenticated: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    checkAuthStatus: () => Promise<boolean>;
    getUser: () => PuterUser | null;
  };

  fs: {
    write: (path: string, data: string | File | Blob) => Promise<File | undefined>;
    read: (path: string) => Promise<Blob | undefined>;
    upload: (files: File[] | Blob[]) => Promise<FSItem | undefined>;
    delete: (path: string) => Promise<void>;
    readDir: (path: string) => Promise<FSItem[] | undefined>;
  };

  ai: {
    chat: (
      prompt: string | ChatMessage[],
      imageURL?: string | PuterChatOptions,
      testMode?: boolean,
      options?: PuterChatOptions
    ) => Promise<AIResponse | undefined>;
    img2txt: (
      image: string | File | Blob,
      testMode?: boolean
    ) => Promise<string | undefined>;
  };

  kv: {
    get: (key: string) => Promise<string | null | undefined>;
    set: (key: string, value: string) => Promise<boolean | undefined>;
    delete: (key: string) => Promise<boolean | undefined>;
    list: (
      pattern: string,
      returnValues?: boolean
    ) => Promise<string[] | undefined>;
    flush: () => Promise<boolean | undefined>;
  };

  init: () => void;
  clearError: () => void;
}

/* -------------------------------------------------------
   Zustand Store
------------------------------------------------------- */
export const usePuterStore = create<PuterStore>((set, get) => {
  let initStarted = false;

  /* ------------------ AUTH ------------------ */
  const checkAuthStatus = async (): Promise<boolean> => {
    const puter = getPuter();
    if (!puter || !get().puterReady) return false;

    set({ isLoading: true, error: null });

    try {
      const signedIn = await puter.auth.isSignedIn();

      if (signedIn) {
        const user = await puter.auth.getUser();
        set({
          auth: {
            ...get().auth,
            user,
            isAuthenticated: true,
          },
          isLoading: false,
        });
        return true;
      }

      set({
        auth: {
          ...get().auth,
          user: null,
          isAuthenticated: false,
        },
        isLoading: false,
      });
      return false;
    } catch {
      set({ error: "Auth check failed", isLoading: false });
      return false;
    }
  };

  const signIn = async () => {
    const puter = getPuter();
    if (!puter || !get().puterReady) return;

    set({ isLoading: true, error: null });

    try {
      await puter.auth.signIn();
      await checkAuthStatus();
    } catch {
      set({ error: "Sign in failed", isLoading: false });
    }
  };

  const signOut = async () => {
    const puter = getPuter();
    if (!puter || !get().puterReady) return;

    set({ isLoading: true, error: null });

    try {
      await puter.auth.signOut();
      set({
        auth: {
          ...get().auth,
          user: null,
          isAuthenticated: false,
        },
        isLoading: false,
      });
    } catch {
      set({ error: "Sign out failed", isLoading: false });
    }
  };

  const refreshUser = async () => {
    const puter = getPuter();
    if (!puter || !get().puterReady) return;

    try {
      const user = await puter.auth.getUser();
      set({
        auth: {
          ...get().auth,
          user,
          isAuthenticated: true,
        },
      });
    } catch {
      set({ error: "Failed to refresh user" });
    }
  };

  /* ------------------ INIT ------------------ */
  const init = () => {
    if (initStarted || typeof window === "undefined") return;
    initStarted = true;

    const tryInit = () => {
      const puter = getPuter();
      if (!puter) return false;

      set({ puterReady: true });
      checkAuthStatus();
      return true;
    };

    if (tryInit()) return;

    const interval = setInterval(() => {
      if (tryInit()) clearInterval(interval);
    }, 50);

    setTimeout(() => {
      clearInterval(interval);
      if (!getPuter()) {
        set({ error: "Puter.js failed to load", isLoading: false });
      }
    }, 10000);
  };

  /* ------------------ FS / AI / KV ------------------ */
  const safe = <T,>(fn: () => Promise<T>) => {
    if (!getPuter() || !get().puterReady) return Promise.resolve(undefined);
    return fn();
  };

  return {
    isLoading: true,
    error: null,
    puterReady: false,

    auth: {
      user: null,
      isAuthenticated: false,
      signIn,
      signOut,
      refreshUser,
      checkAuthStatus,
      getUser: () => get().auth.user,
    },

    fs: {
      write: (p, d) => safe(() => window.puter.fs.write(p, d)),
      read: (p) => safe(() => window.puter.fs.read(p)),
      upload: (f) => safe(() => window.puter.fs.upload(f)),
      delete: (p) => safe(() => window.puter.fs.delete(p)),
      readDir: (p) => safe(() => window.puter.fs.readdir(p)),
    },

    ai: {
      chat: (p, i, t, o) =>
        safe(() => window.puter.ai.chat(p, i, t, o) as Promise<AIResponse>),
      img2txt: (img, t) => safe(() => window.puter.ai.img2txt(img, t)),
    },

    kv: {
      get: (k) => safe(() => window.puter.kv.get(k)),
      set: (k, v) => safe(() => window.puter.kv.set(k, v)),
      delete: (k) => safe(() => window.puter.kv.delete(k)),
      list: (p, rv) => safe(() => window.puter.kv.list(p, rv)),
      flush: () => safe(() => window.puter.kv.flush()),
    },

    init,
    clearError: () => set({ error: null }),
  };
});
