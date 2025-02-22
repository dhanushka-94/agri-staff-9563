'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Contact, PersonDetails, BuildingDetails } from '@/types/database'
import { DataTable } from '@/components/ui/data-table'
import { columns } from './columns'
import { Button } from '@/components/ui/button'
import { 
  PlusIcon, 
  Users2Icon, 
  BuildingIcon, 
  PhoneIcon, 
  MailIcon,
  UserIcon,
  LayoutGridIcon,
  ListIcon,
  FilterIcon,
  ArrowUpDownIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'

interface ContactWithDetails extends Contact {
  person_details?: PersonDetails & {
    designation?: {
      id: string;
      name: string;
    }
  }
  building_details?: BuildingDetails
  department?: { name: string }
  institute?: { name: string }
  subdivision?: { name: string }
  unit?: { name: string }
}

interface ContactStats {
  total: number
  people: number
  buildings: number
  departments: number
  onDuty: number
  offDuty: number
  retired: number
  operational: number
  nonOperational: number
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contactType, setContactType] = useState<'all' | 'person' | 'building'>('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [instituteFilter, setInstituteFilter] = useState('all')
  const [designationFilter, setDesignationFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [sortField, setSortField] = useState<'name' | 'department' | 'updated'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState<ContactStats>({
    total: 0,
    people: 0,
    buildings: 0,
    departments: 0,
    onDuty: 0,
    offDuty: 0,
    retired: 0,
    operational: 0,
    nonOperational: 0
  })
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([])
  const [designations, setDesignations] = useState<{ id: string; name: string }[]>([])
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    fetchContacts()
    fetchOrganizationData()
  }, [])

  useEffect(() => {
    // Expose setDeleteContactId to window for table component
    (window as any).__setDeleteContactId = setDeleteContactId;

    return () => {
      delete (window as any).__setDeleteContactId;
    };
  }, []);

  async function fetchOrganizationData() {
    try {
      const [deptResult, instResult, desigResult] = await Promise.all([
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('institutes').select('id, name').order('name'),
        supabase.from('designations').select('id, name').order('name')
      ])

      if (deptResult.error) throw deptResult.error
      if (instResult.error) throw instResult.error
      if (desigResult.error) throw desigResult.error

      setDepartments(deptResult.data || [])
      setInstitutes(instResult.data || [])
      setDesignations(desigResult.data || [])
    } catch (error) {
      console.error('Error fetching organization data:', error)
    }
  }

  async function fetchContacts() {
    try {
      setLoading(true)
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          person_details(
            id,
            title,
            mobile_no_1,
            mobile_no_2,
            personal_email,
            status,
            designation:designations(id, name)
          ),
          building_details(id, status),
          department:departments(id, name),
          institute:institutes(id, name),
          subdivision:subdivisions(id, name),
          unit:units(id, name)
        `)
        .order('created_at', { ascending: false })

      if (contactsError) throw contactsError

      const contacts = contactsData || []
      setContacts(contacts)

      // Calculate stats
      const newStats: ContactStats = {
        total: contacts.length,
        people: contacts.filter(c => c.type === 'person').length,
        buildings: contacts.filter(c => c.type === 'building').length,
        departments: new Set(contacts.map(c => c.department_id).filter(Boolean)).size,
        onDuty: contacts.filter(c => c.person_details?.status === 'on_duty').length,
        offDuty: contacts.filter(c => c.person_details?.status === 'off_duty').length,
        retired: contacts.filter(c => c.person_details?.status === 'retired').length,
        operational: contacts.filter(c => c.building_details?.status === 'operational').length,
        nonOperational: contacts.filter(c => c.building_details?.status === 'non_operational').length
      }
      setStats(newStats)
    } catch (error) {
      console.error('Error fetching contacts:', error)
      setError('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setLoading(true)

      // Check for dependencies (e.g., relationships)
      const { data: personDetails } = await supabase
        .from('person_details')
        .select('id')
        .eq('contact_id', id)
        .single()

      const { data: buildingDetails } = await supabase
        .from('building_details')
        .select('id')
        .eq('contact_id', id)
        .single()

      // Delete related records first
      if (personDetails) {
        const { error: personError } = await supabase
          .from('person_details')
          .delete()
          .eq('contact_id', id)

        if (personError) throw personError
      }

      if (buildingDetails) {
        const { error: buildingError } = await supabase
          .from('building_details')
          .delete()
          .eq('contact_id', id)

        if (buildingError) throw buildingError
      }

      // Delete the contact
      const { error: contactError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)

      if (contactError) throw contactError

      // Refresh the contacts list
      await fetchContacts()
    } catch (error) {
      console.error('Error deleting contact:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete contact')
    } finally {
      setLoading(false)
      setDeleteContactId(null)
    }
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesType = contactType === 'all' || contact.type === contactType
    const matchesDepartment = departmentFilter === 'all' || contact.department_id === departmentFilter
    const matchesInstitute = instituteFilter === 'all' || contact.institute_id === instituteFilter
    const matchesDesignation = designationFilter === 'all' || 
      contact.person_details?.designation?.id === designationFilter
    
    let matchesStatus = true
    if (statusFilter !== 'all') {
      if (contact.type === 'person') {
        matchesStatus = contact.person_details?.status === statusFilter
      } else {
        matchesStatus = contact.building_details?.status === statusFilter
      }
    }

    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = searchTerm === '' || 
      contact.full_name.toLowerCase().includes(searchLower) ||
      contact.official_email?.toLowerCase().includes(searchLower) ||
      contact.office_no_1?.toLowerCase().includes(searchLower) ||
      contact.department?.name.toLowerCase().includes(searchLower) ||
      contact.institute?.name.toLowerCase().includes(searchLower)

    return matchesType && matchesDepartment && matchesInstitute && 
           matchesDesignation && matchesStatus && matchesSearch
  }).sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case 'name':
        comparison = a.full_name.localeCompare(b.full_name)
        break
      case 'department':
        comparison = (a.department?.name || '').localeCompare(b.department?.name || '')
        break
      case 'updated':
        comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        break
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const handleSort = (field: 'name' | 'department' | 'updated') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const renderContactCard = (contact: ContactWithDetails) => {
    const isPerson = contact.type === 'person'
    const status = isPerson 
      ? contact.person_details?.status 
      : contact.building_details?.status

    return (
      <Card key={contact.id} className="group hover:shadow-md transition-shadow">
        <CardHeader className="space-y-0 pb-2">
          <div className="flex items-center justify-between">
            <Badge variant={contact.type === 'person' ? 'default' : 'secondary'}>
              {contact.type === 'person' ? 'Person' : 'Building'}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <FilterIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/dashboard/contacts/${contact.id}/edit`)}>
                  Edit Contact
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteContactId(contact.id)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete Contact
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{contact.full_name}</h3>
            <Badge variant="outline">
              {status}
            </Badge>
          </div>
          {isPerson && contact.person_details?.designation && (
            <p className="text-sm text-muted-foreground">
              {contact.person_details.designation.name}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <BuildingIcon className="h-4 w-4 text-muted-foreground" />
              <span>{contact.department?.name}</span>
            </div>
            {contact.institute && (
              <div className="flex items-center gap-2 text-sm">
                <Users2Icon className="h-4 w-4 text-muted-foreground" />
                <span>{contact.institute.name}</span>
              </div>
            )}
            {contact.office_no_1 && (
              <div className="flex items-center gap-2 text-sm">
                <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                <span>{contact.office_no_1}</span>
              </div>
            )}
            {contact.official_email && (
              <div className="flex items-center gap-2 text-sm">
                <MailIcon className="h-4 w-4 text-muted-foreground" />
                <span>{contact.official_email}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground pt-2">
              Last updated: {format(new Date(contact.updated_at), 'MMM d, yyyy')}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Directory</h1>
          <p className="text-muted-foreground">
            Manage and organize your contacts efficiently
          </p>
        </div>
        <Link href="/dashboard/contacts/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users2Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {stats.people} People
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.buildings} Buildings
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Status</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onDuty}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default" className="text-xs">
                On Duty
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.offDuty} Off Duty
              </Badge>
              <Badge variant="outline" className="text-xs">
                {stats.retired} Retired
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buildings Status</CardTitle>
            <BuildingIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.operational}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default" className="text-xs">
                Operational
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.nonOperational} Non-operational
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <LayoutGridIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.departments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active departments
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact List</CardTitle>
          <CardDescription>
            View and manage all your contacts in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1 space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="flex-1">
                    <Input
                      placeholder="Search contacts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' ? 'bg-muted' : ''}
                    >
                      <ListIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' ? 'bg-muted' : ''}
                    >
                      <LayoutGridIcon className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <ArrowUpDownIcon className="mr-2 h-4 w-4" />
                          Sort by
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleSort('name')}>
                          Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('department')}>
                          Department {sortField === 'department' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('updated')}>
                          Last Updated {sortField === 'updated' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select value={contactType} onValueChange={(value: 'all' | 'person' | 'building') => setContactType(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="person">People</SelectItem>
                      <SelectItem value="building">Buildings</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={instituteFilter} onValueChange={setInstituteFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Institute" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Institutes</SelectItem>
                      {institutes.map(inst => (
                        <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {contactType !== 'building' && (
                    <Select value={designationFilter} onValueChange={setDesignationFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Designation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Designations</SelectItem>
                        {designations.map(desig => (
                          <SelectItem key={desig.id} value={desig.id}>{desig.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {contactType !== 'building' ? (
                        <>
                          <SelectItem value="on_duty">On Duty</SelectItem>
                          <SelectItem value="off_duty">Off Duty</SelectItem>
                          <SelectItem value="retired">Retired</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="non_operational">Non-operational</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[600px] rounded-md border">
              {viewMode === 'grid' ? (
                <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredContacts.map(contact => renderContactCard(contact))}
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredContacts}
                  loading={loading}
                />
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteContactId} onOpenChange={(open: boolean) => !open && setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the contact
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteContactId && handleDelete(deleteContactId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 