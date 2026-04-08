export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Enums: {
      user_role: "merchant" | "provider" | "admin";
      provider_tier: "emerging" | "verified" | "preferred";
      verification_status:
        | "not_submitted"
        | "pending"
        | "verified"
        | "rejected";
      print_method:
        | "dtg"
        | "dtf"
        | "screen_print"
        | "embroidery"
        | "heat_transfer";
      garment_type:
        | "t_shirt"
        | "long_sleeve"
        | "hoodie"
        | "crewneck"
        | "tank"
        | "tote";
      blank_stock_status: "in_stock" | "limited" | "out_of_stock";
      fulfillment_goal:
        | "local_first"
        | "fastest_turnaround"
        | "lowest_cost"
        | "premium_blank";
      order_status:
        | "draft"
        | "ready_for_routing"
        | "routed"
        | "accepted"
        | "in_production"
        | "ready"
        | "shipped"
        | "completed"
        | "cancelled";
      review_decision: "pending" | "approved" | "rejected" | "needs_changes";
    };
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          email?: string | null;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          profile_id: string;
          role: Database["public"]["Enums"]["user_role"];
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          role: Database["public"]["Enums"]["user_role"];
          created_at?: string;
        };
        Update: {
          role?: Database["public"]["Enums"]["user_role"];
        };
      };
      provider_profiles: {
        Row: {
          id: string;
          profile_id: string;
          business_name: string;
          contact_name: string;
          city: string;
          state: string;
          zip: string;
          service_radius_miles: number;
          supports_local_pickup: boolean;
          tier: Database["public"]["Enums"]["provider_tier"];
          verification_status: Database["public"]["Enums"]["verification_status"];
          turnaround_sla_days: number;
          daily_capacity_units: number;
          current_capacity_used: number;
          specialties: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          business_name: string;
          contact_name: string;
          city: string;
          state?: string;
          zip: string;
          service_radius_miles?: number;
          supports_local_pickup?: boolean;
          tier?: Database["public"]["Enums"]["provider_tier"];
          verification_status?: Database["public"]["Enums"]["verification_status"];
          turnaround_sla_days?: number;
          daily_capacity_units?: number;
          current_capacity_used?: number;
          specialties?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_name?: string;
          contact_name?: string;
          city?: string;
          state?: string;
          zip?: string;
          service_radius_miles?: number;
          supports_local_pickup?: boolean;
          tier?: Database["public"]["Enums"]["provider_tier"];
          verification_status?: Database["public"]["Enums"]["verification_status"];
          turnaround_sla_days?: number;
          daily_capacity_units?: number;
          current_capacity_used?: number;
          specialties?: string[];
          updated_at?: string;
        };
      };
      provider_capabilities: {
        Row: {
          id: string;
          provider_profile_id: string;
          print_methods: Database["public"]["Enums"]["print_method"][];
          garment_types: Database["public"]["Enums"]["garment_type"][];
          max_order_quantity: number;
          accepts_premium_blanks: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_profile_id: string;
          print_methods: Database["public"]["Enums"]["print_method"][];
          garment_types: Database["public"]["Enums"]["garment_type"][];
          max_order_quantity?: number;
          accepts_premium_blanks?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          print_methods?: Database["public"]["Enums"]["print_method"][];
          garment_types?: Database["public"]["Enums"]["garment_type"][];
          max_order_quantity?: number;
          accepts_premium_blanks?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
      };
      provider_quality_metrics: {
        Row: {
          id: string;
          provider_profile_id: string;
          quality_score: number;
          reliability_score: number;
          reprint_rate: number;
          on_time_delivery_rate: number;
          average_rating: number;
          completed_orders: number;
          last_reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_profile_id: string;
          quality_score?: number;
          reliability_score?: number;
          reprint_rate?: number;
          on_time_delivery_rate?: number;
          average_rating?: number;
          completed_orders?: number;
          last_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          quality_score?: number;
          reliability_score?: number;
          reprint_rate?: number;
          on_time_delivery_rate?: number;
          average_rating?: number;
          completed_orders?: number;
          last_reviewed_at?: string | null;
          updated_at?: string;
        };
      };
      provider_inventory: {
        Row: {
          id: string;
          provider_profile_id: string;
          blank_brand: string;
          style_name: string;
          garment_type: Database["public"]["Enums"]["garment_type"];
          colors: string[];
          sizes: string[];
          stock_status: Database["public"]["Enums"]["blank_stock_status"];
          quantity_on_hand: number;
          is_premium_blank: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_profile_id: string;
          blank_brand: string;
          style_name: string;
          garment_type: Database["public"]["Enums"]["garment_type"];
          colors?: string[];
          sizes?: string[];
          stock_status?: Database["public"]["Enums"]["blank_stock_status"];
          quantity_on_hand?: number;
          is_premium_blank?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          blank_brand?: string;
          style_name?: string;
          garment_type?: Database["public"]["Enums"]["garment_type"];
          colors?: string[];
          sizes?: string[];
          stock_status?: Database["public"]["Enums"]["blank_stock_status"];
          quantity_on_hand?: number;
          is_premium_blank?: boolean;
          updated_at?: string;
        };
      };
      provider_wholesale_readiness: {
        Row: {
          id: string;
          provider_profile_id: string;
          legal_business_name: string;
          dba_name: string | null;
          business_email: string;
          phone: string;
          street_address: string;
          sellers_permit_number: string | null;
          ein_placeholder: string | null;
          business_type: string | null;
          years_in_operation: number | null;
          supplier_account_readiness: string[];
          preferred_blank_distributors: string[];
          fulfillment_cutoff_time: string | null;
          reorder_lead_time_days: number | null;
          blank_sourcing_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_profile_id: string;
          legal_business_name: string;
          dba_name?: string | null;
          business_email: string;
          phone: string;
          street_address: string;
          sellers_permit_number?: string | null;
          ein_placeholder?: string | null;
          business_type?: string | null;
          years_in_operation?: number | null;
          supplier_account_readiness?: string[];
          preferred_blank_distributors?: string[];
          fulfillment_cutoff_time?: string | null;
          reorder_lead_time_days?: number | null;
          blank_sourcing_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          legal_business_name?: string;
          dba_name?: string | null;
          business_email?: string;
          phone?: string;
          street_address?: string;
          sellers_permit_number?: string | null;
          ein_placeholder?: string | null;
          business_type?: string | null;
          years_in_operation?: number | null;
          supplier_account_readiness?: string[];
          preferred_blank_distributors?: string[];
          fulfillment_cutoff_time?: string | null;
          reorder_lead_time_days?: number | null;
          blank_sourcing_notes?: string | null;
          updated_at?: string;
        };
      };
      merchant_orders: {
        Row: {
          id: string;
          profile_id: string;
          status: Database["public"]["Enums"]["order_status"];
          fulfillment_zip: string;
          fulfillment_goal: Database["public"]["Enums"]["fulfillment_goal"];
          local_pickup_preferred: boolean;
          needed_by_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          status?: Database["public"]["Enums"]["order_status"];
          fulfillment_zip: string;
          fulfillment_goal: Database["public"]["Enums"]["fulfillment_goal"];
          local_pickup_preferred?: boolean;
          needed_by_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: Database["public"]["Enums"]["order_status"];
          fulfillment_zip?: string;
          fulfillment_goal?: Database["public"]["Enums"]["fulfillment_goal"];
          local_pickup_preferred?: boolean;
          needed_by_date?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      merchant_order_items: {
        Row: {
          id: string;
          merchant_order_id: string;
          print_method: Database["public"]["Enums"]["print_method"];
          garment_type: Database["public"]["Enums"]["garment_type"];
          quantity: number;
          preferred_blank_brand: string | null;
          preferred_blank_style: string | null;
          sizes: Json;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_order_id: string;
          print_method: Database["public"]["Enums"]["print_method"];
          garment_type: Database["public"]["Enums"]["garment_type"];
          quantity: number;
          preferred_blank_brand?: string | null;
          preferred_blank_style?: string | null;
          sizes?: Json;
          color: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          print_method?: Database["public"]["Enums"]["print_method"];
          garment_type?: Database["public"]["Enums"]["garment_type"];
          quantity?: number;
          preferred_blank_brand?: string | null;
          preferred_blank_style?: string | null;
          sizes?: Json;
          color?: string;
          updated_at?: string;
        };
      };
      admin_provider_reviews: {
        Row: {
          id: string;
          provider_profile_id: string;
          reviewer_profile_id: string | null;
          decision: Database["public"]["Enums"]["review_decision"];
          tier_after_review: Database["public"]["Enums"]["provider_tier"] | null;
          verification_status_after_review:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          review_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_profile_id: string;
          reviewer_profile_id?: string | null;
          decision?: Database["public"]["Enums"]["review_decision"];
          tier_after_review?:
            | Database["public"]["Enums"]["provider_tier"]
            | null;
          verification_status_after_review?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          reviewer_profile_id?: string | null;
          decision?: Database["public"]["Enums"]["review_decision"];
          tier_after_review?:
            | Database["public"]["Enums"]["provider_tier"]
            | null;
          verification_status_after_review?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
          review_notes?: string | null;
          updated_at?: string;
        };
      };
    };
  };
};
