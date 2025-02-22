export type ContactType = 'person' | 'building'
export type PersonTitle = 'Mr' | 'Mrs' | 'Miss' | 'Ms' | 'Dr' | 'Prof' | 'Eng'
export type PersonStatus = 'on_duty' | 'off_duty' | 'retired'
export type BuildingStatus = 'operational' | 'non_operational'

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

export interface Designation {
  id: string
  name: string
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
  profile_picture_url?: string
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