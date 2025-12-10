'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, DocumentIcon, CloudIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import HubCard from '@/components/HubCard'
import CreateHubModal from '@/components/CreateHubModal'
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

export default function DashboardPage() {
  const [hubs, setHubs] = useState<Hub[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchHubs()
  }, [])

  const fetchHubs = async () => {
    try {
      const response = await fetch('/api/hubs')
      if (response.ok) {
        const data = await response.json()
        setHubs(data.hubs)
      }
    } catch (error) {
      console.error('Failed to fetch hubs:', error)
      toast.error('Failed to load hubs')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateHub = async (hubData: any) => {
    try {
      const response = await fetch('/api/hubs/from-sharepoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hubData),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Hub created successfully!')
        setShowCreateModal(false)
        fetchHubs()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to create hub')
      }
    } catch (error) {
      console.error('Failed to create hub:', error)
      toast.error('Failed to create hub')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
          <p className="mt-1 text-sm text-secondary-600">
            Manage your document hubs and start chatting with your AI assistant
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Hub
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <DocumentIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Total Hubs</p>
              <p className="text-2xl font-bold text-secondary-900">{hubs.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CloudIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">SharePoint Linked</p>
              <p className="text-2xl font-bold text-secondary-900">
                {hubs.filter(h => h.sharepoint_linked).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Total Files</p>
              <p className="text-2xl font-bold text-secondary-900">
                {hubs.reduce((sum, hub) => sum + hub.file_count, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DocumentIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Active Hubs</p>
              <p className="text-2xl font-bold text-secondary-900">
                {hubs.filter(h => h.status === 'ready').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hubs Grid */}
      <div>
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">Your Hubs</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-secondary-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-secondary-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : hubs.length === 0 ? (
          <div className="text-center py-12">
            <DocumentIcon className="mx-auto h-12 w-12 text-secondary-400" />
            <h3 className="mt-2 text-sm font-medium text-secondary-900">No hubs</h3>
            <p className="mt-1 text-sm text-secondary-500">
              Get started by creating your first document hub.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                Create your first hub
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hubs.map((hub) => (
              <HubCard key={hub.hub_name} hub={hub} onUpdate={fetchHubs} />
            ))}
          </div>
        )}
      </div>

      {/* Create Hub Modal */}
      {showCreateModal && (
        <CreateHubModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateHub}
        />
      )}
    </div>
  )
}