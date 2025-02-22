export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      designations: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          level: number
          order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          level?: number
          order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          level?: number
          order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "designations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          }
        ]
      }
      // ... other tables
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      contact_type: "person" | "building"
      person_title: "Mr" | "Mrs" | "Miss" | "Ms" | "Dr" | "Prof" | "Eng"
      person_status: "on_duty" | "off_duty" | "retired"
      building_status: "operational" | "non_operational"
    }
  }
}

export type ContactType = Database["public"]["Enums"]["contact_type"]
export type PersonTitle = Database["public"]["Enums"]["person_title"]
export type PersonStatus = Database["public"]["Enums"]["person_status"]
export type BuildingStatus = Database["public"]["Enums"]["building_status"]

export type Designation = Database["public"]["Tables"]["designations"]["Row"] & {
  parent?: {
    id: string
    name: string
  }
}

export interface Department {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Institute {
  id: string
  name: string
  department_id: string
  created_at: string
  updated_at: string
}

export interface Subdivision {
  id: string
  name: string
  institute_id: string
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  name: string
  subdivision_id: string
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  type: ContactType
  full_name: string
  department_id?: string
  institute_id?: string
  subdivision_id?: string
  unit_id?: string
  office_no_1?: string
  office_no_2?: string
  whatsapp_no?: string
  fax_no_1?: string
  fax_no_2?: string
  official_email?: string
  office_address?: string
  description?: string
  profile_picture_url?: string | null
  created_at: string
  updated_at: string
}

export interface PersonDetails {
  id: string
  contact_id: string
  title: PersonTitle
  designation_id?: string
  mobile_no_1?: string
  mobile_no_2?: string
  personal_email?: string
  status: PersonStatus
  created_at: string
  updated_at: string
}

export interface BuildingDetails {
  id: string
  contact_id: string
  status: BuildingStatus
  created_at: string
  updated_at: string
} 