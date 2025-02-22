'use client'

import { useState } from 'react'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserIcon, BuildingIcon } from 'lucide-react'
import { toast } from 'sonner'

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

export default function NewContactPage() {
  const [formData, setFormData] = useState<FormData>({
    type: 'person',
    full_name: '',
    person_status: 'on_duty',
    building_status: 'operational',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.full_name.trim()) {
        throw new Error('Name is required')
      }

      // Insert into contacts table
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          type: formData.type,
          full_name: formData.full_name.trim(),
          department_id: formData.department_id,
          institute_id: formData.institute_id,
          subdivision_id: formData.subdivision_id,
          unit_id: formData.unit_id,
          office_no_1: formData.office_no_1?.trim(),
          office_no_2: formData.office_no_2?.trim(),
          whatsapp_no: formData.whatsapp_no?.trim(),
          fax_no_1: formData.fax_no_1?.trim(),
          fax_no_2: formData.fax_no_2?.trim(),
          official_email: formData.official_email?.trim(),
          office_address: formData.office_address?.trim(),
          description: formData.description?.trim(),
          profile_picture_url: formData.profile_picture_url,
        })
        .select()
        .single()

      if (contactError) throw contactError
      if (!contact) throw new Error('Failed to create contact')

      // Insert type-specific details
      if (formData.type === 'person') {
        const { error: personError } = await supabase
          .from('person_details')
          .insert({
            contact_id: contact.id,
            title: formData.title,
            designation_id: formData.designation_id,
            mobile_no_1: formData.mobile_no_1?.trim(),
            mobile_no_2: formData.mobile_no_2?.trim(),
            personal_email: formData.personal_email?.trim(),
            status: formData.person_status,
          })

        if (personError) throw personError
      } else {
        const { error: buildingError } = await supabase
          .from('building_details')
          .insert({
            contact_id: contact.id,
            status: formData.building_status,
          })

        if (buildingError) throw buildingError
      }

      // Show success message
      toast.success('Contact created successfully')

      // Navigate to the contact details page
      router.push(`/dashboard/contacts/${contact.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error creating contact:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create contact'
      setError(errorMessage)
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/contacts')
  }

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="container max-w-4xl space-y-6 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Contact</h1>
            <p className="text-muted-foreground">
              Add a new person or building to your directory
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>

        <Tabs 
          value={formData.type} 
          onValueChange={(value) => setFormData({ ...formData, type: value as ContactType })}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Contact Type</CardTitle>
              <CardDescription>
                Select the type of contact you want to create
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabsList className="grid w-full grid-cols-2 gap-4">
                <TabsTrigger value="person" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Person
                </TabsTrigger>
                <TabsTrigger value="building" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <BuildingIcon className="mr-2 h-4 w-4" />
                  Building
                </TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Add the main details for this contact
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-center">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>
                  Specify the organizational hierarchy for this contact
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            <TabsContent value="person">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Details</CardTitle>
                  <CardDescription>
                    Additional information specific to person contacts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="building">
              <Card>
                <CardHeader>
                  <CardTitle>Building Details</CardTitle>
                  <CardDescription>
                    Additional information specific to building contacts
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </TabsContent>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Office contact details and additional information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    placeholder="Add any additional notes or information about this contact..."
                  />
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={loading} size="lg">
                {loading ? 'Creating...' : 'Create Contact'}
              </Button>
            </div>
          </form>
        </Tabs>
      </div>
    </ScrollArea>
  )
} 