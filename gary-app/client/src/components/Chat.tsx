"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Clock, MessageSquare } from "lucide-react"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Separator } from "../components/ui/separator"

interface Message {
  userId: string
  userName: string
  text: string
  timestamp: number
}

interface ChatProps {
  roomId: string
  userId: string
  messages: Message[]
  sendMessage: (text: string) => void
}

const Chat: React.FC<ChatProps> = ({ roomId, userId, messages, sendMessage }) => {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input)
      setInput("")
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Generate a consistent color based on username
  const getUserColor = (name: string) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
    ]

    // Simple hash function to get a consistent index
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }

    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  // Get initials from username
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <Card className="shadow-lg border-primary/10 backdrop-blur-sm bg-card/80 overflow-hidden">
      <CardHeader className="bg-primary/5 pb-3">
        <div className="flex items-center">
          <MessageSquare className="h-5 w-5 text-primary mr-2" />
          <CardTitle className="text-lg font-medium">Chat Room</CardTitle>
        </div>
        <div className="text-xs text-muted-foreground flex items-center mt-1">
          <Clock className="h-3 w-3 mr-1" />
          <span>Room ID: {roomId}</span>
        </div>
      </CardHeader>

      <div
        ref={chatContainerRef}
        className="h-[300px] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 ${msg.userId === userId ? "justify-end" : "justify-start"}`}
            >
              {msg.userId !== userId && (
                <Avatar className={`h-8 w-8 ${getUserColor(msg.userName)}`}>
                  <AvatarFallback>{getInitials(msg.userName)}</AvatarFallback>
                </Avatar>
              )}

              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.userId === userId
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted rounded-tl-none"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-xs font-medium ${msg.userId === userId ? "text-primary-foreground/80" : "text-foreground/80"}`}
                  >
                    {msg.userId === userId ? "You" : msg.userName}
                  </span>
                  <span
                    className={`text-xs ml-2 ${msg.userId === userId ? "text-primary-foreground/60" : "text-foreground/60"}`}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="text-sm break-words">{msg.text}</p>
              </div>

              {msg.userId === userId && (
                <Avatar className={`h-8 w-8 ${getUserColor(msg.userName)}`}>
                  <AvatarFallback>{getInitials(msg.userName)}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <Separator />

      <CardFooter className="p-3">
        <div className="flex w-full items-center gap-2">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
            placeholder="Type a message..."
          />
          <Button onClick={handleSend} size="icon" className="rounded-full" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export default Chat

