"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Smile } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type Message = {
  id: string
  userId: string
  userName: string
  text: string
  timestamp: string
  avatar?: string
  reactions?: string[]
}

type ChatPanelProps = {
  messages: Message[]
  roomId: string
  isAuthenticated: boolean
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "👏", "🔥", "🎵"]

export function ChatPanel({ messages: initialMessages, roomId, isAuthenticated }: ChatPanelProps) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You need to sign in to send messages.",
        variant: "destructive",
      })
      return
    }

    if (newMessage.trim() === "") return

    // Add new message to the list
    const newMsg: Message = {
      id: Date.now().toString(),
      userId: "current-user", // In a real app, this would be the actual user ID
      userName: "You",
      text: newMessage,
      timestamp: "Just now",
      avatar: "/assets/images/avatars/default.jpg",
    }

    setMessages([...messages, newMsg])
    setNewMessage("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const addReaction = (messageId: string, emoji: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You need to sign in to react to messages.",
        variant: "destructive",
      })
      return
    }

    setMessages(
      messages.map((message) => {
        if (message.id === messageId) {
          const reactions = message.reactions || []
          if (reactions.includes(emoji)) {
            return {
              ...message,
              reactions: reactions.filter((r) => r !== emoji),
            }
          } else {
            return {
              ...message,
              reactions: [...reactions, emoji],
            }
          }
        }
        return message
      }),
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="font-medium">Room Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${message.userName === "You" ? "justify-end" : "justify-start"}`}
          >
            {message.userName !== "You" && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={message.avatar || `/placeholder.svg?height=32&width=32`} />
                <AvatarFallback>{message.userName[0]}</AvatarFallback>
              </Avatar>
            )}

            <div className="flex flex-col max-w-[80%]">
              <div
                className={`${
                  message.userName === "You" ? "bg-primary text-primary-foreground" : "bg-secondary"
                } rounded-lg p-3`}
              >
                <div className="flex justify-between items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{message.userName}</span>
                  <span className="text-xs opacity-70">{message.timestamp}</span>
                </div>
                <p className="text-sm break-words">{message.text}</p>
              </div>

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {message.reactions.map((emoji, index) => (
                    <span
                      key={index}
                      className="reaction bg-background/80 backdrop-blur-sm"
                      onClick={() => addReaction(message.id, emoji)}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}

              {/* Reaction button */}
              {isAuthenticated && (
                <div className="flex justify-start mt-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                        <Smile className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <div className="flex gap-2">
                        {EMOJI_LIST.map((emoji) => (
                          <button
                            key={emoji}
                            className="text-lg hover:scale-125 transition-transform"
                            onClick={() => addReaction(message.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {message.userName === "You" && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={message.avatar || `/placeholder.svg?height=32&width=32`} />
                <AvatarFallback>Y</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="flex gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAuthenticated ? "Type a message..." : "Sign in to chat"}
            className="flex-1"
            disabled={!isAuthenticated}
          />
          <Button type="submit" size="icon" disabled={!isAuthenticated}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

