export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "rider" | "driver" | "admin";
          phone: string | null;
          created_at: string;
          updated_at: string | null;
          date_of_birth: string | null;
          gender: string | null;
          referral_code: string | null;
          address: string | null;
          account_status: string | null;
          firebase_uid: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "rider" | "driver" | "admin";
          phone?: string | null;
          created_at?: string;
          updated_at?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          referral_code?: string | null;
          address?: string | null;
          account_status?: string | null;
          firebase_uid?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "rider" | "driver" | "admin";
          phone?: string | null;
          created_at?: string;
          updated_at?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          referral_code?: string | null;
          address?: string | null;
          account_status?: string | null;
          firebase_uid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      driver_profiles: {
        Row: {
          id: string;
          status: "offline" | "online" | "busy";
          rating: number;
          verification_status: "pending" | "approved" | "rejected";
          current_latitude: number | null;
          current_longitude: number | null;
          last_active_at: string | null;
          created_at: string;
          email: string | null;
          license_number: string | null;
          license_expiry: string | null;
          license_image_url: string | null;
          rc_book_url: string | null;
          insurance_url: string | null;
          profile_photo_url: string | null;
          selfie_url: string | null;
          vehicle_images: string[] | null;
        };
        Insert: {
          id: string;
          status?: "offline" | "online" | "busy";
          rating?: number;
          verification_status?: "pending" | "approved" | "rejected";
          current_latitude?: number | null;
          current_longitude?: number | null;
          last_active_at?: string | null;
          created_at?: string;
          email?: string | null;
          license_number?: string | null;
          license_expiry?: string | null;
          license_image_url?: string | null;
          rc_book_url?: string | null;
          insurance_url?: string | null;
          profile_photo_url?: string | null;
          selfie_url?: string | null;
          vehicle_images?: string[] | null;
        };
        Update: {
          id?: string;
          status?: "offline" | "online" | "busy";
          rating?: number;
          verification_status?: "pending" | "approved" | "rejected";
          current_latitude?: number | null;
          current_longitude?: number | null;
          last_active_at?: string | null;
          created_at?: string;
          email?: string | null;
          license_number?: string | null;
          license_expiry?: string | null;
          license_image_url?: string | null;
          rc_book_url?: string | null;
          insurance_url?: string | null;
          profile_photo_url?: string | null;
          selfie_url?: string | null;
          vehicle_images?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "driver_profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          id: string;
          driver_id: string;
          make: string;
          model: string;
          year: number;
          color: string | null;
          license_plate: string;
          vehicle_type: string;
          is_active: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          driver_id: string;
          make: string;
          model: string;
          year: number;
          color?: string | null;
          license_plate: string;
          vehicle_type: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          driver_id?: string;
          make?: string;
          model?: string;
          year?: number;
          color?: string | null;
          license_plate?: string;
          vehicle_type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey";
            columns: ["driver_id"];
            referencedRelation: "driver_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rides: {
        Row: {
          id: string;
          rider_id: string;
          driver_id: string | null;
          status: "searching" | "accepted" | "arriving" | "in_progress" | "completed" | "cancelled";
          pickup_address: string;
          pickup_latitude: number;
          pickup_longitude: number;
          dropoff_address: string;
          dropoff_latitude: number;
          dropoff_longitude: number;
          fare: number;
          distance: number;
          duration: number;
          payment_method: string;
          payment_status: "pending" | "completed" | "failed";
          otp: string | null;
          created_at: string;
          accepted_at: string | null;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          rider_id: string;
          driver_id?: string | null;
          status?:
            | "searching"
            | "accepted"
            | "arriving"
            | "in_progress"
            | "completed"
            | "cancelled";
          pickup_address: string;
          pickup_latitude: number;
          pickup_longitude: number;
          dropoff_address: string;
          dropoff_latitude: number;
          dropoff_longitude: number;
          fare: number;
          distance: number;
          duration: number;
          payment_method?: string;
          payment_status?: "pending" | "completed" | "failed";
          otp?: string | null;
          created_at?: string;
          accepted_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          rider_id?: string;
          driver_id?: string | null;
          status?:
            | "searching"
            | "accepted"
            | "arriving"
            | "in_progress"
            | "completed"
            | "cancelled";
          pickup_address?: string;
          pickup_latitude?: number;
          pickup_longitude?: number;
          dropoff_address?: string;
          dropoff_latitude?: number;
          dropoff_longitude?: number;
          fare?: number;
          distance?: number;
          duration?: number;
          payment_method?: string;
          payment_status?: "pending" | "completed" | "failed";
          otp?: string | null;
          created_at?: string;
          accepted_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey";
            columns: ["driver_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rides_rider_id_fkey";
            columns: ["rider_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          ride_id: string;
          amount: number;
          status: "pending" | "completed" | "failed" | "refunded";
          payment_method: string;
          transaction_reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          amount: number;
          status?: "pending" | "completed" | "failed" | "refunded";
          payment_method: string;
          transaction_reference?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          amount?: number;
          status?: "pending" | "completed" | "failed" | "refunded";
          payment_method?: string;
          transaction_reference?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_ride_id_fkey";
            columns: ["ride_id"];
            referencedRelation: "rides";
            referencedColumns: ["id"];
          },
        ];
      };
      wallets: {
        Row: {
          id: string;
          balance: number;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          balance?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          balance?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wallets_id_fkey";
            columns: ["id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_transactions: {
        Row: {
          id: string;
          wallet_id: string;
          amount: number;
          type: "deposit" | "withdrawal" | "ride_payment" | "ride_earnings" | "refund";
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          amount: number;
          type: "deposit" | "withdrawal" | "ride_payment" | "ride_earnings" | "refund";
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          wallet_id?: string;
          amount?: number;
          type?: "deposit" | "withdrawal" | "ride_payment" | "ride_earnings" | "refund";
          description?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey";
            columns: ["wallet_id"];
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      ratings: {
        Row: {
          id: string;
          ride_id: string;
          rater_id: string;
          ratee_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          rater_id: string;
          ratee_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          rater_id?: string;
          ratee_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_ride_id_fkey";
            columns: ["ride_id"];
            referencedRelation: "rides";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
