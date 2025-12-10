'use client'

import { useState } from 'react'
import {
  DocumentIcon,
  CloudIcon,
  ClockIcon,
  ArrowPathIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Hub {
  hub_name: string
  status: string
  file_count: number
  created_at: string
  last_synced: string
  sharepoint_linked: boolean
  auto_sync_enabled: boolean
}

interface HubCardProps {
  hub: Hub
  onUpdate: () => void
}

export default function HubCard({ hub, onUpdate }: HubCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSync = async () => {
    if (!hub.sharepoint_linked) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/hubs/${hub.hub_name}/sync`, {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        onUpdate()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Sync failed')
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Sync failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete hub "${hub.hub_name}"?`)) return

    try {
      const response = await fetch(`/api/hubs/${hub.hub_name}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Hub deleted successfully')
        onUpdate()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Delete failed')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Delete failed')
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div className="p-2 bg-primary-100 rounded-lg">
            <DocumentIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-secondary-900">{hub.hub_name}</h3>
            <p className="text-sm text-secondary-600">
              {hub.file_count} files • {hub.status}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hub.sharepoint_linked && (
            <CloudIcon className="h-5 w-5 text-blue-500" title="SharePoint linked" />
          )}
          {hub.auto_sync_enabled && (
            <ArrowPathIcon className="h-5 w-5 text-green-500" title="Auto sync enabled" />
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center text-sm text-secondary-600">
          <ClockIcon className="h-4 w-4 mr-2" />
          Created: {formatDate(hub.created_at)}
        </div>
        {hub.last_synced && (
          <div className="flex items-center text-sm text-secondary-600">
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Synced: {formatDate(hub.last_synced)}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex space-x-2">
          <Link
            href={`/dashboard/chat?hub=${hub.hub_name}`}
            className="btn-secondary text-xs px-3 py-1"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1 inline" />
            Chat
          </Link>
          {hub.sharepoint_linked && (
            <button
              onClick={handleSync}
              disabled={isLoading}
              className="btn-secondary text-xs px-3 py-1 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-1 inline ${isLoading ? 'animate-spin' : ''}`} />
              Sync
            </button>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="text-red-600 hover:text-red-800 p-1"
          title="Delete hub"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}