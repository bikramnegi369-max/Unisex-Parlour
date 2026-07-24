import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Branch, Organization } from "@/types/branch";

interface BranchState {
  /**
   * The ID of the currently selected branch.
   * null means "All Branches" — the user is viewing org-wide data.
   */
  currentBranchId: string | null;

  /** All branches the authenticated user is authorized to access. */
  availableBranches: Branch[];

  /** The organization this user belongs to. */
  currentOrganization: Organization | null;
}

const initialState: BranchState = {
  currentBranchId: null,
  availableBranches: [],
  currentOrganization: null,
};

export const branchSlice = createSlice({
  name: "branch",
  initialState,
  reducers: {
    /**
     * Set the active branch.
     * Pass null to switch to "All Branches" scope.
     */
    setCurrentBranch: (state, action: PayloadAction<string | null>) => {
      state.currentBranchId = action.payload;
    },

    /** Populate the list of branches the user can access (called after login). */
    setAvailableBranches: (state, action: PayloadAction<Branch[]>) => {
      state.availableBranches = action.payload;
    },

    /** Set the current organization context (called after login). */
    setOrganization: (state, action: PayloadAction<Organization | null>) => {
      state.currentOrganization = action.payload;
    },

    /** Clear all branch state on logout. */
    clearBranchState: (state) => {
      state.currentBranchId = null;
      state.availableBranches = [];
      state.currentOrganization = null;
    },
  },
});

export const {
  setCurrentBranch,
  setAvailableBranches,
  setOrganization,
  clearBranchState,
} = branchSlice.actions;

export default branchSlice.reducer;
