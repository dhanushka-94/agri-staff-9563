'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Contact, PersonDetails, BuildingDetails } from '@/types/database'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { 
  MoreHorizontal, 
  PhoneIcon, 
  MailIcon, 
  MapPinIcon,
  BuildingIcon,
  UserIcon
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'

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

export const columns: ColumnDef<ContactWithDetails>[] = [
  {
    id: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const contact = row.original
      return (
        <div className="flex items-center gap-2">
          {contact.type === 'person' ? (
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <BuildingIcon className="h-4 w-4 text-muted-foreground" />
          )}
          <Badge variant={contact.type === 'person' ? 'default' : 'secondary'}>
            {contact.type === 'person' ? 'Person' : 'Building'}
          </Badge>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value === 'all' ? true : row.original.type === value
    },
  },
  {
    accessorKey: 'profile_picture_url',
    header: '',
    cell: ({ row }) => {
      const contact = row.original
      return (
        <Avatar className="cursor-pointer" onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}>
          <AvatarImage src={contact.profile_picture_url || ''} />
          <AvatarFallback>
            {contact.full_name.split(' ').map((n: string) => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
      )
    },
  },
  {
    accessorKey: 'full_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const router = useRouter()
      const contact = row.original
      return (
        <div className="flex flex-col">
          <div
            className="font-medium cursor-pointer hover:underline"
            onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}
          >
            {contact.full_name}
          </div>
          {contact.type === 'person' && contact.person_details?.designation?.name && (
            <div className="text-sm text-muted-foreground">
              {contact.person_details.designation.name}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'department',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Department" />
    ),
    cell: ({ row }) => {
      const contact = row.original
      return (
        <div className="flex flex-col">
          <div className="font-medium">{contact.department?.name}</div>
          {contact.type === 'person' && contact.person_details?.status && (
            <Badge variant={contact.person_details.status === 'on_duty' ? 'default' : 'secondary'}>
              {contact.person_details.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          )}
          {contact.type === 'building' && contact.building_details?.status && (
            <Badge variant={contact.building_details.status === 'operational' ? 'default' : 'secondary'}>
              {contact.building_details.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    id: 'contact',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contact Info" />
    ),
    cell: ({ row }) => {
      const contact = row.original
      return (
        <div className="flex flex-col gap-1">
          {contact.office_no_1 && (
            <div className="flex items-center gap-2 text-sm">
              <PhoneIcon className="h-3 w-3 text-muted-foreground" />
              {contact.office_no_1}
            </div>
          )}
          {contact.official_email && (
            <div className="flex items-center gap-2 text-sm">
              <MailIcon className="h-3 w-3 text-muted-foreground" />
              {contact.official_email}
            </div>
          )}
          {contact.office_address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPinIcon className="h-3 w-3 text-muted-foreground" />
              {contact.office_address}
            </div>
          )}
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const router = useRouter()
      const contact = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}
            >
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/dashboard/contacts/${contact.id}/edit`)}
            >
              Edit Contact
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                // Get the deleteContactId setter from the parent component
                const setDeleteContactId = (window as any).__setDeleteContactId
                if (setDeleteContactId) {
                  setDeleteContactId(contact.id)
                }
              }}
              className="text-destructive focus:text-destructive"
            >
              Delete Contact
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
] 