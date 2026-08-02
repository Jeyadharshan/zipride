import { useContext } from "react";
import { AuthContext } from "@/auth/context/AuthContext";
import { authService } from "@/auth/services/auth";
import type { ProfileUpdate } from "@/shared/types";

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const { user: firebaseUser, session, profile, driverProfile, loading, role, isAuthenticated, refreshProfile, signOut } = context;

  // Return firebaseUser directly since it already contains the mapped Supabase UUID as id
  const user = firebaseUser;

  const signUp = async (...args: Parameters<typeof authService.signUp>) => {
    const result = await authService.signUp(...args);
    await refreshProfile();
    return result;
  };

  const signIn = async (...args: Parameters<typeof authService.signIn>) => {
    const result = await authService.signIn(...args);
    await refreshProfile();
    return result;
  };

  const signInWithOtp = async (...args: Parameters<typeof authService.signInWithOtp>) => {
    return authService.signInWithOtp(...args);
  };

  const verifyOtp = async (...args: Parameters<typeof authService.verifyOtp>) => {
    const result = await authService.verifyOtp(...args);
    await refreshProfile();
    return result;
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    const targetUserId = profile?.id || user?.id;
    if (!targetUserId) throw new Error("User must be logged in to update profile");
    const updated = await authService.updateProfile(targetUserId, updates);
    await refreshProfile();
    return updated;
  };

  return {
    user,
    session,
    profile,
    driverProfile,
    loading,
    role,
    isAuthenticated,
    refreshProfile,
    signUp,
    signIn,
    signInWithOtp,
    verifyOtp,
    signOut,
    updateProfile,
  };
};
