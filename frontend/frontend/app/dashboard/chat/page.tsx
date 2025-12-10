'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { PaperAirplaneIcon, DocumentIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{
    content: string
    metadata: any
  }>
}

interface Hub {
  hub_name: string
  status: string
  file_count: number
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const hubName = searchParams.get('hub') || ''
  const [hubs, setHubs] = useState<Hub[]>([])
  const [selectedHub, setSelectedHub] = useState(hubName)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHubs, setIsLoadingHubs] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchHubs()
  }, [])

  useEffect(() => {
    if (selectedHub) {
      loadHub()
    }
  }, [selectedHub])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      setIsLoadingHubs(false)
    }
  }

  const loadHub = async () => {
    if (!selectedHub) return

    try {
      const response = await fetch(`/api/hubs/${selectedHub}/load`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success(`Hub "${selectedHub}" loaded successfully`)
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to load hub')
      }
    } catch (error) {
      console.error('Failed to load hub:', error)
      toast.error('Failed to load hub')
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !selectedHub || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          hub_name: selectedHub,
          include_sources: true,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.answer,
          timestamp: new Date(),
          sources: data.sources,
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to get response')
        // Add error message to chat
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request.',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to send message')
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-200">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">AI Chat Assistant</h1>
          <p className="text-sm text-secondary-600">
            Ask questions about your documents
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedHub}
            onChange={(e) => setSelectedHub(e.target.value)}
            className="input-field max-w-xs"
            disabled={isLoadingHubs}
          >
            <option value="">Select a hub...</option>
            {hubs.map((hub) => (
              <option key={hub.hub_name} value={hub.hub_name}>
                {hub.hub_name} ({hub.file_count} files)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <DocumentIcon className="mx-auto h-12 w-12 text-secondary-400" />
            <h3 className="mt-2 text-sm font-medium text-secondary-900">Start a conversation</h3>
            <p className="mt-1 text-sm text-secondary-500">
              Select a hub and ask questions about your documents
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-secondary-200 text-secondary-900'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <DocumentIcon className="w-5 h-5 text-primary-600" />
                      </div>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-secondary-200">
                        <p className="text-xs text-secondary-500 mb-2">Sources:</p>
                        <div className="space-y-2">
                          {message.sources.slice(0, 3).map((source, index) => (
                            <div key={index} className="text-xs bg-secondary-50 rounded p-2">
                              <p className="text-secondary-700 line-clamp-2">{source.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <UserCircleIcon className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-secondary-200 rounded-lg px-4 py-3 max-w-3xl">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <DocumentIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-secondary-200 p-4">
        <div className="flex space-x-4">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={selectedHub ? "Ask a question about your documents..." : "Select a hub first"}
              className="w-full input-field resize-none"
              rows={3}
              disabled={!selectedHub || isLoading}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !selectedHub || isLoading}
            className="btn-primary self-end disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-secondary-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}