import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { llmApi, datasetsApi } from '@/services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hello! How can I help you analyze your data today?', timestamp: new Date() },
  ])
  const [input, setInput] = useState('')
  const [selectedDataset, setSelectedDataset] = useState('')

  const queryClient = useQueryClient()

  const { data: datasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => datasetsApi.list(1, 30),
  })

  const sendMutation = useMutation({
    mutationFn: (prompt: string) => 
      llmApi.query({ prompt, dataset_id: selectedDataset || undefined }),
    onSuccess: (data) => {
      const assistantMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
      queryClient.invalidateQueries({ queryKey: ['llm-history'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to get response')
    },
  })

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    const prompt = input.trim()
    setInput('')

    sendMutation.mutate(prompt)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Assistant</h1>
          <p className="text-[#6B7280]">Ask questions in plain English about your data</p>
        </div>
        <select 
          value={selectedDataset} 
          onChange={e => setSelectedDataset(e.target.value)} 
          className="input w-72"
        >
          <option value="">All datasets</option>
          {datasets?.items.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Chat Window */}
      <div className="flex-1 card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAF9F5]">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#3A4B41] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm ${msg.role === 'user' 
                  ? 'bg-[#3A4B41] text-white' 
                  : 'bg-white border'}`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[#E6CFA7] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#3A4B41]" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {sendMutation.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#3A4B41] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border px-5 py-3 rounded-2xl text-sm">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-[#3A4B41] rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-[#3A4B41] rounded-full animate-bounce delay-75" />
                  <div className="w-1.5 h-1.5 bg-[#3A4B41] rounded-full animate-bounce delay-150" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t p-4 flex gap-3 bg-white">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your data..."
            className="flex-1 h-12"
            disabled={sendMutation.isPending}
          />
          <Button type="submit" disabled={!input.trim() || sendMutation.isPending} className="h-12 px-6">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
