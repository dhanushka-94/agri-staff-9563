'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ContactType, PersonTitle, PersonStatus, BuildingStatus } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Textarea } from '@/components/ui/textarea'
import { OrganizationFields } from '@/components/forms/organization-fields'
import { DesignationField } from '@/components/forms/designation-field'
import { ImageUpload } from '@/components/ui/image-upload'

interface FormData {
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
  // Person specific fields
  title?: PersonTitle
  designation_id?: string
  mobile_no_1?: string
  mobile_no_2?: string
  personal_email?: string
  person_status?: PersonStatus
  // Building specific fields
  building_status?: BuildingStatus
  profile_picture_url?: string | null
}

interface EditContactPageProps {
  params: {
    id: string
  }
}

export default function EditContactPage({ params }: EditContactPageProps) {
  const [formData, setFormData] = useState<FormData>({
    type: 'person',
    full_name: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadContact()
  }, [])

  const loadContact = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', params.id)
        .single()

      if (contactError) throw contactError
      if (!contact) throw new Error('Contact not found')

      const initialData: FormData = {
        type: contact.type,
        full_name: contact.full_name,
        department_id: contact.department_id,
        institute_id: contact.institute_id,
        subdivision_id: contact.subdivision_id,
        unit_id: contact.unit_id,
        office_no_1: contact.office_no_1,
        office_no_2: contact.office_no_2,
        whatsapp_no: contact.whatsapp_no,
        fax_no_1: contact.fax_no_1,
        fax_no_2: contact.fax_no_2,
        official_email: contact.official_email,
        office_address: contact.office_address,
        description: contact.description,
        profile_picture_url: contact.profile_picture_url,
      }

      if (contact.type === 'person') {
        const { data: personDetails } = await supabase
          .from('person_details')
          .select('*')
          .eq('contact_id', params.id)
          .single()

        if (personDetails) {
          initialData.title = personDetails.title as PersonTitle
          initialData.designation_id = personDetails.designation_id
          initialData.mobile_no_1 = personDetails.mobile_no_1
          initialData.mobile_no_2 = personDetails.mobile_no_2
          initialData.personal_email = personDetails.personal_email
          initialData.person_status = personDetails.status as PersonStatus
        }
      } else if (contact.type === 'building') {
        const { data: buildingDetails } = await supabase
          .from('building_details')
          .select('*')
          .eq('contact_id', params.id)
          .single()

        if (buildingDetails) {
          initialData.building_status = buildingDetails.status as BuildingStatus
        }
      }

      setFormData(initialData)
    } catch (error) {
      console.error('Error loading contact:', error)
      setError(error instanceof Error ? error.message : 'Failed to load contact')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Update contacts table
      const { error: contactError } = await supabase
        .from('contacts')
        .update({
          full_name: formData.full_name,
          department_id: formData.department_id,
          institute_id: formData.institute_id,
          subdivision_id: formData.subdivision_id,
          unit_id: formData.unit_id,
          office_no_1: formData.office_no_1,
          office_no_2: formData.office_no_2,
          whatsapp_no: formData.whatsapp_no,
          fax_no_1: formData.fax_no_1,
          fax_no_2: formData.fax_no_2,
          official_email: formData.official_email,
          office_address: formData.office_address,
          description: formData.description,
          profile_picture_url: formData.profile_picture_url,
        })
        .eq('id', params.id)

      if (contactError) throw contactError

      // Update type-specific details
      if (formData.type === 'person') {
        const { error: personError } = await supabase
          .from('person_details')
          .update({
            title: formData.title,
            designation_id: formData.designation_id,
            mobile_no_1: formData.mobile_no_1,
            mobile_no_2: formData.mobile_no_2,
            personal_email: formData.personal_email,
            status: formData.person_status,
          })
          .eq('contact_id', params.id)

        if (personError) throw personError
      } else if (formData.type === 'building') {
        const { error: buildingError } = await supabase
          .from('building_details')
          .update({
            status: formData.building_status,
          })
          .eq('contact_id', params.id)

        if (buildingError) throw buildingError
      }

      router.push(`/dashboard/contacts/${params.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error updating contact:', error)
      setError(error instanceof Error ? error.message : 'Failed to update contact')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-lg font-medium">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Edit Contact</h2>
      </div>

      <Tabs value={formData.type} defaultValue={formData.type}>
        <TabsList>
          <TabsTrigger value="person" disabled>Person</TabsTrigger>
          <TabsTrigger value="building" disabled>Building</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4 pt-4">
            <div className="flex justify-center mb-8">
              <ImageUpload
                value={formData.profile_picture_url}
                onChange={(value) => setFormData({ ...formData, profile_picture_url: value })}
                onUploadStart={() => setLoading(true)}
                onUploadEnd={() => setLoading(false)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="official_email">Official Email</Label>
                <Input
                  id="official_email"
                  type="email"
                  value={formData.official_email || ''}
                  onChange={(e) => setFormData({ ...formData, official_email: e.target.value })}
                />
              </div>
            </div>

            <OrganizationFields
              departmentId={formData.department_id}
              instituteId={formData.institute_id}
              subdivisionId={formData.subdivision_id}
              unitId={formData.unit_id}
              onDepartmentChange={(value) => setFormData({ ...formData, department_id: value, institute_id: undefined, subdivision_id: undefined, unit_id: undefined })}
              onInstituteChange={(value) => setFormData({ ...formData, institute_id: value, subdivision_id: undefined, unit_id: undefined })}
              onSubdivisionChange={(value) => setFormData({ ...formData, subdivision_id: value, unit_id: undefined })}
              onUnitChange={(value) => setFormData({ ...formData, unit_id: value })}
            />

            <TabsContent value="person" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Select
                    value={formData.title}
                    onValueChange={(value: PersonTitle) => setFormData({ ...formData, title: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select title" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mr">Mr</SelectItem>
                      <SelectItem value="Mrs">Mrs</SelectItem>
                      <SelectItem value="Miss">Miss</SelectItem>
                      <SelectItem value="Ms">Ms</SelectItem>
                      <SelectItem value="Dr">Dr</SelectItem>
                      <SelectItem value="Prof">Prof</SelectItem>
                      <SelectItem value="Eng">Eng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DesignationField
                  value={formData.designation_id}
                  onChange={(value) => setFormData({ ...formData, designation_id: value })}
                />

                <div className="space-y-2">
                  <Label htmlFor="personal_email">Personal Email</Label>
                  <Input
                    id="personal_email"
                    type="email"
                    value={formData.personal_email || ''}
                    onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile_no_1">Mobile Number 1</Label>
                  <Input
                    id="mobile_no_1"
                    value={formData.mobile_no_1 || ''}
                    onChange={(e) => setFormData({ ...formData, mobile_no_1: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile_no_2">Mobile Number 2</Label>
                  <Input
                    id="mobile_no_2"
                    value={formData.mobile_no_2 || ''}
                    onChange={(e) => setFormData({ ...formData, mobile_no_2: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="person_status">Status</Label>
                  <Select
                    value={formData.person_status}
                    onValueChange={(value: PersonStatus) => setFormData({ ...formData, person_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_duty">On Duty</SelectItem>
                      <SelectItem value="off_duty">Off Duty</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="building" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="building_status">Status</Label>
                  <Select
                    value={formData.building_status}
                    onValueChange={(value: BuildingStatus) => setFormData({ ...formData, building_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="non_operational">Non-operational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="office_no_1">Office Number 1</Label>
                <Input
                  id="office_no_1"
                  value={formData.office_no_1 || ''}
                  onChange={(e) => setFormData({ ...formData, office_no_1: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="office_no_2">Office Number 2</Label>
                <Input
                  id="office_no_2"
                  value={formData.office_no_2 || ''}
                  onChange={(e) => setFormData({ ...formData, office_no_2: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_no">WhatsApp Number</Label>
                <Input
                  id="whatsapp_no"
                  value={formData.whatsapp_no || ''}
                  onChange={(e) => setFormData({ ...formData, whatsapp_no: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fax_no_1">Fax Number 1</Label>
                <Input
                  id="fax_no_1"
                  value={formData.fax_no_1 || ''}
                  onChange={(e) => setFormData({ ...formData, fax_no_1: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fax_no_2">Fax Number 2</Label>
                <Input
                  id="fax_no_2"
                  value={formData.fax_no_2 || ''}
                  onChange={(e) => setFormData({ ...formData, fax_no_2: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="office_address">Office Address</Label>
              <Textarea
                id="office_address"
                value={formData.office_address || ''}
                onChange={(e) => setFormData({ ...formData, office_address: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  )
} 