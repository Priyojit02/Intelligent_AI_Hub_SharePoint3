'use client'

import { useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, CloudIcon, DocumentIcon } from '@heroicons/react/24/outline'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

interface CreateHubModalProps {
  onClose: () => void
  onCreate: (data: any) => void
}

export default function CreateHubModal({ onClose, onCreate }: CreateHubModalProps) {
  const [activeTab, setActiveTab] = useState<'sharepoint' | 'upload'>('sharepoint')
  const [formData, setFormData] = useState({
    hub_name: '',
    sharepoint_link: '',
    auto_sync: false,
  })
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setUploadedFiles(prev => [...prev, ...acceptedFiles])
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls', '.xlsx'],
      'application/zip': ['.zip'],
    },
    multiple: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (activeTab === 'sharepoint') {
        if (!formData.hub_name || !formData.sharepoint_link) {
          toast.error('Please fill in all required fields')
          return
        }

        await onCreate({
          hub_name: formData.hub_name,
          sharepoint_link: formData.sharepoint_link,
          auto_sync: formData.auto_sync,
        })
      } else {
        if (!formData.hub_name || uploadedFiles.length === 0) {
          toast.error('Please provide a hub name and upload files')
          return
        }

        // Create FormData for file upload
        const uploadData = new FormData()
        uploadData.append('hub_name', formData.hub_name)
        uploadedFiles.forEach(file => {
          uploadData.append('files', file)
        })

        const response = await fetch('/api/hubs/from-upload', {
          method: 'POST',
          body: uploadData,
        })

        if (response.ok) {
          const result = await response.json()
          toast.success('Hub created successfully!')
          onClose()
        } else {
          const error = await response.json()
          toast.error(error.detail || 'Failed to create hub')
        }
      }
    } catch (error) {
      console.error('Create hub error:', error)
      toast.error('Failed to create hub')
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-secondary-900/75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-secondary-400 hover:text-secondary-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-secondary-900">
                      Create New Hub
                    </Dialog.Title>

                    {/* Tab Navigation */}
                    <div className="mt-4 border-b border-secondary-200">
                      <nav className="-mb-px flex space-x-8">
                        <button
                          onClick={() => setActiveTab('sharepoint')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'sharepoint'
                              ? 'border-primary-500 text-primary-600'
                              : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                          }`}
                        >
                          <CloudIcon className="h-5 w-5 mr-2 inline" />
                          SharePoint
                        </button>
                        <button
                          onClick={() => setActiveTab('upload')}
                          className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'upload'
                              ? 'border-primary-500 text-primary-600'
                              : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                          }`}
                        >
                          <DocumentIcon className="h-5 w-5 mr-2 inline" />
                          Upload Files
                        </button>
                      </nav>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      {/* Hub Name - Common */}
                      <div>
                        <label htmlFor="hub_name" className="block text-sm font-medium text-secondary-700">
                          Hub Name *
                        </label>
                        <input
                          type="text"
                          id="hub_name"
                          required
                          className="mt-1 input-field"
                          placeholder="Enter a unique name for your hub"
                          value={formData.hub_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, hub_name: e.target.value }))}
                        />
                      </div>

                      {activeTab === 'sharepoint' ? (
                        <>
                          {/* SharePoint Link */}
                          <div>
                            <label htmlFor="sharepoint_link" className="block text-sm font-medium text-secondary-700">
                              SharePoint Link *
                            </label>
                            <input
                              type="url"
                              id="sharepoint_link"
                              required
                              className="mt-1 input-field"
                              placeholder="https://yourorg.sharepoint.com/sites/.../folder"
                              value={formData.sharepoint_link}
                              onChange={(e) => setFormData(prev => ({ ...prev, sharepoint_link: e.target.value }))}
                            />
                            <p className="mt-1 text-xs text-secondary-500">
                              Paste the SharePoint folder or file link you want to index
                            </p>
                          </div>

                          {/* Auto Sync */}
                          <div className="flex items-center">
                            <input
                              id="auto_sync"
                              type="checkbox"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                              checked={formData.auto_sync}
                              onChange={(e) => setFormData(prev => ({ ...prev, auto_sync: e.target.checked }))}
                            />
                            <label htmlFor="auto_sync" className="ml-2 block text-sm text-secondary-900">
                              Enable automatic sync
                            </label>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* File Upload */}
                          <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-2">
                              Upload Files *
                            </label>
                            <div
                              {...getRootProps()}
                              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                                isDragActive
                                  ? 'border-primary-400 bg-primary-50'
                                  : 'border-secondary-300 hover:border-primary-400'
                              }`}
                            >
                              <input {...getInputProps()} />
                              <DocumentIcon className="mx-auto h-12 w-12 text-secondary-400" />
                              <p className="mt-2 text-sm text-secondary-600">
                                {isDragActive
                                  ? 'Drop the files here...'
                                  : 'Drag & drop files here, or click to select files'
                                }
                              </p>
                              <p className="mt-1 text-xs text-secondary-500">
                                Supports PDF, DOCX, Excel, and ZIP files
                              </p>
                            </div>

                            {/* Uploaded Files List */}
                            {uploadedFiles.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <p className="text-sm font-medium text-secondary-700">
                                  Uploaded Files ({uploadedFiles.length})
                                </p>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                  {uploadedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-secondary-50 rounded px-3 py-2">
                                      <span className="text-sm text-secondary-700 truncate">{file.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="text-red-600 hover:text-red-800 ml-2"
                                      >
                                        <XMarkIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="btn-secondary"
                          disabled={isSubmitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Creating...
                            </div>
                          ) : (
                            'Create Hub'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}