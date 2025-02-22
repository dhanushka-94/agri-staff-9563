'use client'

import { useEffect, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  PencilIcon, 
  PhoneIcon, 
  MailIcon, 
  MapPinIcon,
  BuildingIcon,
  UserIcon,
  Users2Icon,
  GitBranchIcon,
  Grid3x3Icon,
  MessageSquare,
  Printer,
  CalendarIcon
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Contact, PersonDetails, BuildingDetails } from '@/types/database'

interface ContactWithDetails extends Contact {
  person_details?: PersonDetails & {
    designation?: {
      id: string
      name: string
      level: number
      order: number
      parent_id: string | null
    }
    title: string
    mobile_no_1: string | null
    mobile_no_2: string | null
    personal_email: string | null
    status: string
    created_at: string
    updated_at: string
  }
  building_details?: BuildingDetails & {
    status: string
    created_at: string
    updated_at: string
  }
  department?: {
    id: string
    name: string
  }
  institute?: {
    id: string
    name: string
  }
  subdivision?: {
    id: string
    name: string
  }
  unit?: {
    id: string
    name: string
  }
}

interface PageProps {
  params: {
    id: string
  }
}

export default function ContactViewPage({ params }: PageProps) {
  const { id } = params
  const [contact, setContact] = useState<ContactWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (id) {
      loadContact()
    }
  }, [id])

  const loadContact = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: contactError } = await supabase
        .from('contacts')
        .select(`
          *,
          person_details(
            *,
            designation:designations(
              id,
              name,
              level,
              order,
              parent_id
            )
          ),
          building_details(*),
          department:departments(id, name),
          institute:institutes(id, name),
          subdivision:subdivisions(id, name),
          unit:units(id, name)
        `)
        .eq('id', id)
        .single()

      if (contactError) throw contactError
      if (!data) {
        notFound()
        return
      }

      setContact(data)
    } catch (error) {
      console.error('Error loading contact:', error)
      setError(error instanceof Error ? error.message : 'Failed to load contact')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString()
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid date'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-lg font-medium">Loading...</div>
      </div>
    )
  }

  if (error || !contact) {
    return (
      <div className="p-4">
        <div className="bg-destructive/10 text-destructive rounded-lg p-4">
          {error || 'Contact not found'}
        </div>
      </div>
    )
  }

  const isPerson = contact.type === 'person'
  const status = isPerson 
    ? contact.person_details?.status 
    : contact.building_details?.status

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contact Details</h1>
            <p className="text-muted-foreground">
              View detailed information about this contact
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/contacts')}>
            View All Contacts
          </Button>
          <Button onClick={() => router.push(`/dashboard/contacts/${contact.id}/edit`)}>
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit Contact
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={contact.profile_picture_url || ''} />
                <AvatarFallback className="text-lg">
                  {contact.full_name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={contact.type === 'person' ? 'default' : 'secondary'}>
                    {contact.type === 'person' ? 'Person' : 'Building'}
                  </Badge>
                  {status && (
                    <Badge variant={
                      isPerson
                        ? (status === 'on_duty' ? 'default' : 'secondary')
                        : (status === 'operational' ? 'default' : 'secondary')
                    }>
                      {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-semibold">{contact.full_name}</h2>
                {isPerson && contact.person_details?.designation && (
                  <p className="text-muted-foreground">
                    {contact.person_details.title} {contact.person_details.designation.name}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {contact.description && (
                <>
                  <h3 className="font-medium">Description</h3>
                  <p className="text-sm text-muted-foreground">{contact.description}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact.department && (
              <div className="flex items-center gap-2">
                <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Department</div>
                  <div className="text-sm text-muted-foreground">{contact.department.name}</div>
                </div>
              </div>
            )}
            {contact.institute && (
              <div className="flex items-center gap-2">
                <Users2Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Institute</div>
                  <div className="text-sm text-muted-foreground">{contact.institute.name}</div>
                </div>
              </div>
            )}
            {contact.subdivision && (
              <div className="flex items-center gap-2">
                <GitBranchIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Subdivision</div>
                  <div className="text-sm text-muted-foreground">{contact.subdivision.name}</div>
                </div>
              </div>
            )}
            {contact.unit && (
              <div className="flex items-center gap-2">
                <Grid3x3Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Unit</div>
                  <div className="text-sm text-muted-foreground">{contact.unit.name}</div>
                </div>
              </div>
            )}
            {isPerson && contact.person_details?.designation && (
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Designation Level</div>
                  <div className="text-sm text-muted-foreground">
                    Level {contact.person_details.designation.level} 
                    (Order: {contact.person_details.designation.order})
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Office Phones */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Office Phones</div>
                {contact.office_no_1 ? (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Primary</div>
                      <a href={`tel:${contact.office_no_1}`} className="text-sm text-muted-foreground hover:underline">
                        {contact.office_no_1}
                      </a>
                    </div>
                  </div>
                ) : null}
                {contact.office_no_2 ? (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Alternative</div>
                      <a href={`tel:${contact.office_no_2}`} className="text-sm text-muted-foreground hover:underline">
                        {contact.office_no_2}
                      </a>
                    </div>
                  </div>
                ) : null}
                {!contact.office_no_1 && !contact.office_no_2 && (
                  <div className="text-sm text-muted-foreground">No office phones provided</div>
                )}
              </div>

              {/* Fax Numbers */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Fax Numbers</div>
                {contact.fax_no_1 ? (
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Primary</div>
                      <div className="text-sm text-muted-foreground">{contact.fax_no_1}</div>
                    </div>
                  </div>
                ) : null}
                {contact.fax_no_2 ? (
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Alternative</div>
                      <div className="text-sm text-muted-foreground">{contact.fax_no_2}</div>
                    </div>
                  </div>
                ) : null}
                {!contact.fax_no_1 && !contact.fax_no_2 && (
                  <div className="text-sm text-muted-foreground">No fax numbers provided</div>
                )}
              </div>

              {/* WhatsApp */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">WhatsApp</div>
                {contact.whatsapp_no ? (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <a href={`https://wa.me/${contact.whatsapp_no.replace(/\D/g, '')}`} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-sm text-muted-foreground hover:underline">
                        {contact.whatsapp_no}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No WhatsApp number provided</div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                {contact.official_email ? (
                  <div className="flex items-center gap-2">
                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Official</div>
                      <a href={`mailto:${contact.official_email}`} className="text-sm text-muted-foreground hover:underline">
                        {contact.official_email}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No official email provided</div>
                )}
              </div>

              {/* Office Address */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Office Address</div>
                {contact.office_address ? (
                  <div className="flex items-start gap-2">
                    <MapPinIcon className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {contact.office_address}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No office address provided</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Person-specific Details */}
        {isPerson && contact.person_details && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Title */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Title</div>
                  {contact.person_details.title ? (
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        {contact.person_details.title}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No title provided</div>
                  )}
                </div>

                {/* Mobile Numbers */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Mobile Numbers</div>
                  {contact.person_details.mobile_no_1 ? (
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">Primary</div>
                        <a href={`tel:${contact.person_details.mobile_no_1}`} className="text-sm text-muted-foreground hover:underline">
                          {contact.person_details.mobile_no_1}
                        </a>
                      </div>
                    </div>
                  ) : null}
                  {contact.person_details.mobile_no_2 ? (
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">Alternative</div>
                        <a href={`tel:${contact.person_details.mobile_no_2}`} className="text-sm text-muted-foreground hover:underline">
                          {contact.person_details.mobile_no_2}
                        </a>
                      </div>
                    </div>
                  ) : null}
                  {!contact.person_details.mobile_no_1 && !contact.person_details.mobile_no_2 && (
                    <div className="text-sm text-muted-foreground">No mobile numbers provided</div>
                  )}
                </div>

                {/* Personal Email */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Personal Email</div>
                  {contact.person_details.personal_email ? (
                    <div className="flex items-center gap-2">
                      <MailIcon className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${contact.person_details.personal_email}`} className="text-sm text-muted-foreground hover:underline">
                        {contact.person_details.personal_email}
                      </a>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No personal email provided</div>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={contact.person_details.status === 'on_duty' ? 'default' : 'secondary'}>
                      {contact.person_details.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Created</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(contact.created_at)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Last Updated</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(contact.updated_at)}
                </div>
              </div>
            </div>
            {isPerson && contact.person_details && (
              <>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Person Details Created</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(contact.person_details.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Person Details Updated</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(contact.person_details.updated_at)}
                    </div>
                  </div>
                </div>
              </>
            )}
            {!isPerson && contact.building_details && (
              <>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Building Details Created</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(contact.building_details.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Building Details Updated</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(contact.building_details.updated_at)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 