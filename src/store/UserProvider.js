import { create } from "zustand";

export const useUserStore = create((set) => ({
    user: {
        _id: null,
        name: null,
        email: null,
        phone: null,
        description: null,
        address: null,
        website: null,
        token: null,
    },
    setUser: (user) => set({ user }), 
}));
