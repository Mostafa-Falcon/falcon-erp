import { create } from'zustand';
import type { User, CashierShift } from'@/types';
import { AuthRepository } from'@/modules/auth/auth_repository';

interface SessionState {
 currentUser: User | null;
 activeBranchId: string | null;
 activeShift: CashierShift | null;
 setCurrentUser: (user: User | null) => void;
 setActiveBranchId: (branchId: string | null) => void;
 setActiveShift: (shift: CashierShift | null) => void;
 logout: () => Promise<void>;
}

const getInitialUser = (): User | null => {
 if (typeof window ==='undefined') return null;
 return AuthRepository.getCurrentUser();
};

const getInitialBranchId = (user: User | null): string | null => {
 if (typeof window ==='undefined') return null;
 return user?.branch_id || localStorage.getItem('falcon_active_branch_id') || null;
};

export const useSessionStore = create<SessionState>((set) => {
 const initialUser = getInitialUser();
 const initialBranch = getInitialBranchId(initialUser);

 return {
 currentUser: initialUser,
 activeBranchId: initialBranch,
 activeShift: null,

 setCurrentUser: (user) => {
 if (user) {
 AuthRepository.saveSession(user);
 }
 const bId = user?.branch_id || (typeof window !=='undefined'? localStorage.getItem('falcon_active_branch_id') : null) || null;
 set({ currentUser: user, activeBranchId: bId });
 },

 setActiveBranchId: (branchId) => {
 if (typeof window !=='undefined') {
 if (branchId) {
 localStorage.setItem('falcon_active_branch_id', branchId);
 } else {
 localStorage.removeItem('falcon_active_branch_id');
 }
 }
 set({ activeBranchId: branchId });
 },

 setActiveShift: (shift) => set({ activeShift: shift }),

 logout: async () => {
 await AuthRepository.logout();
 if (typeof window !=='undefined') {
 localStorage.removeItem('falcon_active_branch_id');
 }
 set({ currentUser: null, activeBranchId: null, activeShift: null });
 },
 };
});