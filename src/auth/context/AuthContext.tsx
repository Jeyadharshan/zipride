import React, { createContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { onAuthStateChanged, signOut as firebaseSignOut, type User as FirebaseUser } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase/config";
import type { Profile } from "@/shared/types";
import { registerSocketAuth } from "@/shared/lib/socket";

interface AuthContextType {
  user: (FirebaseUser & { id: string }) | null;
  session: any | null;
  profile: Profile | null;
  driverProfile: any | null;
  loading: boolean;
  role: Profile["role"] | null;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [driverProfile, setDriverProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  // For username/password rider sessions (no Firebase)
  const [riderSession, setRiderSession] = useState<any | null>(null);

  const fetchProfile = async (firebaseUser: FirebaseUser) => {
    const firebaseUid = firebaseUser.uid;
    const verifiedPhone = firebaseUser.phoneNumber;
    
    console.log("[Supabase Auth Query] Firebase UID:", firebaseUid, "Verified Phone Number:", verifiedPhone);

    try {
      // 1. Search profile by firebase_uid
      let { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("firebase_uid", firebaseUid)
        .maybeSingle();

      if (profileError) {
        const err = profileError as any;
        console.error("Supabase Error Code:", err?.code);
        console.error("Supabase Error Message:", err?.message);
        console.error("Supabase Error Details:", err?.details);
        console.error("Supabase Error Hint:", err?.hint);
        console.error("Full Error Object:", JSON.stringify(profileError, null, 2));
      }

      // 2. If not found, search by phone_number
      if (!userProfile && verifiedPhone) {
        console.log("[Supabase Auth Query] Profile not found by firebase_uid. Searching by phone:", verifiedPhone);
        const { data: phoneProfile, error: phoneError } = await supabase
          .from("profiles")
          .select("*")
          .eq("phone", verifiedPhone)
          .maybeSingle();

        if (phoneError) {
          const err = phoneError as any;
          console.error("Supabase Error Code:", err?.code);
          console.error("Supabase Error Message:", err?.message);
          console.error("Supabase Error Details:", err?.details);
          console.error("Supabase Error Hint:", err?.hint);
          console.error("Full Error Object:", JSON.stringify(phoneError, null, 2));
        }

        if (phoneProfile) {
          console.log("[Supabase Auth Update] Phone match found. Linking firebase_uid to profiles.id:", phoneProfile.id);
          const { data: updatedProfile, error: updateError } = await supabase
            .from("profiles")
            .update({ firebase_uid: firebaseUid })
            .eq("id", phoneProfile.id)
            .select()
            .single();

          if (updateError) {
            const err = updateError as any;
            console.error("Supabase Error Code:", err?.code);
            console.error("Supabase Error Message:", err?.message);
            console.error("Supabase Error Details:", err?.details);
            console.error("Supabase Error Hint:", err?.hint);
            console.error("Full Error Object:", JSON.stringify(updateError, null, 2));
          } else {
            userProfile = updatedProfile;
            console.log("[Supabase Auth Query Result] Profile linked successfully:", userProfile);
          }
        }
      }

      // 3. Else (still not found), create a new profile
      if (!userProfile) {
        console.log("[Supabase Auth Insert] Profile not found by uid or phone. Creating default profile...");
        const profilePayload = {
          firebase_uid: firebaseUid,
          email: firebaseUser.email || `${firebaseUid}@zipride.firebase`,
          full_name: firebaseUser.displayName || "ZipRide Rider",
          phone: verifiedPhone || "",
          role: "rider" as const,
          account_status: "active",
        };
        console.log("Profile Payload", profilePayload);

        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert(profilePayload)
          .select()
          .single();

        if (insertError) {
          const err = insertError as any;
          console.error("Supabase Error Code:", err?.code);
          console.error("Supabase Error Message:", err?.message);
          console.error("Supabase Error Details:", err?.details);
          console.error("Supabase Error Hint:", err?.hint);
          console.error("Full Error Object:", JSON.stringify(insertError, null, 2));
        } else {
          userProfile = newProfile;
          console.log("[Supabase Profile Insert Result] New profile created successfully:", userProfile);
        }
      }

      if (!userProfile) {
        setProfile(null);
        setDriverProfile(null);
        return;
      }

      setProfile(userProfile);
      registerSocketAuth(userProfile.id, userProfile.role);
      console.log("[Supabase Load Profile] Loaded user profile:", userProfile);
      console.log("[Supabase Load Profile] Generated Supabase UUID:", userProfile.id);

      // 4. Fetch driver profile if user is a driver (using generated profiles.id UUID)
      if (userProfile.role === "driver") {
        const { data: driverData, error: driverErr } = await supabase
          .from("driver_profiles")
          .select("*")
          .eq("profile_id", userProfile.id)
          .maybeSingle();

        if (driverErr) {
          const err = driverErr as any;
          console.error("Supabase Error Code:", err?.code);
          console.error("Supabase Error Message:", err?.message);
          console.error("Supabase Error Details:", err?.details);
          console.error("Supabase Error Hint:", err?.hint);
          console.error("Full Error Object:", JSON.stringify(driverErr, null, 2));
        }
        setDriverProfile(driverData || null);
      } else {
        setDriverProfile(null);
      }
    } catch (err) {
      console.error("Error fetching user profile in AuthProvider:", err);
      setProfile(null);
      setDriverProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    } else if (profile?.id) {
      const { data: updatedProfileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile.id)
        .maybeSingle();

      if (updatedProfileData) {
        setProfile(updatedProfileData as any);
        const activeRole = updatedProfileData.role || "rider";
        const sessionKey = `${activeRole}_session`;
        const backupKey = `zipride_${activeRole}_session_backup`;
        const storedStr = sessionStorage.getItem(sessionKey) || localStorage.getItem(backupKey);
        if (storedStr) {
          try {
            const parsed = JSON.parse(storedStr);
            const newSession = { ...parsed, ...updatedProfileData };
            sessionStorage.setItem(sessionKey, JSON.stringify(newSession));
            localStorage.setItem(backupKey, JSON.stringify(newSession));
          } catch (e) {}
        }
      }
    }
  };

  const signOut = async () => {
    try {
      sessionStorage.removeItem("rider_session");
      sessionStorage.removeItem("driver_session");
      sessionStorage.removeItem("admin_session");
      sessionStorage.removeItem("jwt_token");
      localStorage.removeItem("zipride_rider_session_backup");
      localStorage.removeItem("zipride_driver_session_backup");
      localStorage.removeItem("zipride_admin_session_backup");
      localStorage.removeItem("jwt_token");

      // Clear React auth states
      setUser(null);
      setProfile(null);
      setDriverProfile(null);
      setRiderSession(null);

      // Sign out from Firebase
      await firebaseSignOut(firebaseAuth);

      // Instantly navigate to the login page
      const targetPath = "/login";

      window.history.replaceState({}, "", targetPath);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  useEffect(() => {
    let storedSession =
      sessionStorage.getItem("rider_session") ||
      sessionStorage.getItem("driver_session") ||
      sessionStorage.getItem("admin_session");

    if (!storedSession) {
      // Check localStorage backup for Remember Me functionality
      const backup =
        localStorage.getItem("zipride_rider_session_backup") ||
        localStorage.getItem("zipride_driver_session_backup") ||
        localStorage.getItem("zipride_admin_session_backup");
      if (backup) {
        try {
          const parsed = JSON.parse(backup);
          sessionStorage.setItem(`${parsed.role}_session`, backup);
          storedSession = backup;
        } catch (e) {}
      }
    }

    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession);
        if (sessionData.role === "driver") {
          setDriverProfile(sessionData);
        }
        if (sessionData.role === "rider") {
          setRiderSession(sessionData);
        }

        supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionData.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setProfile(data as any);
              if (data.role === "driver") {
                supabase
                  .from("driver_profiles")
                  .select("*")
                  .eq("profile_id", data.id)
                  .maybeSingle()
                  .then(({ data: dProf }) => {
                    if (dProf) setDriverProfile(dProf);
                    setLoading(false);
                  });
              } else {
                setLoading(false);
              }
            } else {
              signOut();
            }
          });
        return;
      } catch {
        sessionStorage.removeItem("rider_session");
        sessionStorage.removeItem("driver_session");
        sessionStorage.removeItem("admin_session");
      }
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        await fetchProfile(firebaseUser);
      } else {
        if (!sessionStorage.getItem("rider_session") && !sessionStorage.getItem("driver_session")) {
          setProfile(null);
          setDriverProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle Role-Based Routing
  useEffect(() => {
    if (loading) return;

    const pathname = window.location.pathname;
    const activeProfile = profile;

    const navigateFast = (url: string) => {
      window.history.replaceState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    };

    if (activeProfile) {
      // Redirect away from auth pages if already logged in
      if (
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/forgot-password" ||
        pathname === "/otp" ||
        pathname === "/driver/login" ||
        pathname === "/admin/login"
      ) {
        if (activeProfile.role === "rider") {
          navigateFast("/dashboard");
        } else if (activeProfile.role === "driver") {
          if (driverProfile?.verification_status === "approved" || driverProfile?.verification_status === "Approved") {
            navigateFast("/driver/dashboard");
          } else {
            navigateFast("/driver/verification");
          }
        } else if (activeProfile.role === "admin") {
          navigateFast("/admin/dashboard");
        }
      }

      if (pathname.startsWith("/admin") && activeProfile.role !== "admin") {
        navigateFast("/login");
      }
      if (pathname.startsWith("/driver") && activeProfile.role !== "driver") {
        navigateFast("/login");
      }
      if ((pathname.startsWith("/rider") || pathname === "/dashboard" || pathname === "/wallet") && activeProfile.role !== "rider") {
        navigateFast("/login");
      }
      if (pathname === "/driver/verification" && (driverProfile?.verification_status === "approved" || driverProfile?.verification_status === "Approved")) {
        navigateFast("/driver/dashboard");
      }
    } else if (
      !profile &&
      !sessionStorage.getItem("rider_session") &&
      !sessionStorage.getItem("driver_session") &&
      !sessionStorage.getItem("admin_session")
    ) {
      // Not authenticated via any method
      const isProtectedRoute =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/wallet") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/rider") ||
        pathname.startsWith("/driver") ||
        pathname.startsWith("/admin");

      if (isProtectedRoute) {
        navigateFast("/login");
      }
    }
  }, [user, profile, driverProfile, loading]);

  const adaptedUser = user ? (Object.assign(user, { id: profile?.id || "" }) as (FirebaseUser & { id: string })) : null;

  const value: AuthContextType = {
    user: adaptedUser,
    session: null,
    profile,
    driverProfile,
    loading,
    role: profile?.role ?? null,
    isAuthenticated: !!profile,
    refreshProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
