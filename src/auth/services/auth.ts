import { supabase } from "@/lib/supabase";
import type { Profile, ProfileInsert, ProfileUpdate } from "@/shared/types";

export const authService = {
  /**
   * Signs up a new user and configures their initial profile
   */
  async signUp(
    email: string,
    password: string,
    metadata: {
      fullName: string;
      phone: string;
      role: Profile["role"];
    },
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.fullName,
          phone: metadata.phone,
          role: metadata.role,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error("Sign up failed: User data not returned.");

    // Create profile manually in case DB trigger is not active
    const profileInsert: ProfileInsert = {
      id: data.user.id,
      email,
      full_name: metadata.fullName,
      phone: metadata.phone,
      role: metadata.role,
    };

    const { error: profileError } = await supabase.from("profiles").upsert(profileInsert);

    if (profileError) {
      console.error("Error creating profile record:", profileError.message);
    }

    return data;
  },

  /**
   * Logs in a user using email and password
   */
  async signIn(email: string, password: string, role?: Profile["role"]) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      role,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Request OTP code via mobile number
   */
  async signInWithOtp(phone: string) {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Verify phone OTP code
   */
  async verifyOtp(phone: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (error) throw error;
    return data;
  },

  /**
   * Signs out the current user session
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get the current active user session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Retrieves the current authenticated user's profile information
   */
  async getCurrentProfile(): Promise<Profile | null> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Failed to fetch user profile:", profileError.message);
      return null;
    }

    return profile;
  },

  /**
   * Retrieves any user profile by ID
   */
  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates user profile details
   */
  async updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
export type AuthService = typeof authService;
