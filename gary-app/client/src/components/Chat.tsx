"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send, Clock, MessageSquare, Smile } from "lucide-react"
import io from "socket.io-client"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Separator } from "../components/ui/separator"
import Picker, { Theme } from "emoji-picker-react" // Import Theme type

const getSocketUrl = () => {
  return process.env.NODE_ENV === "production"
    ? "https://gary-server.onrender.com"
    : "http://localhost:5000"
}

const socket = io(getSocketUrl(), { transports: ["websocket", "polling"] })

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Socket.IO typing indicator
  useEffect(() => {
    socket.on("typing", ({ userId: typingUserId }: { userId: string }) => {
      if (typingUserId !== userId) {
        setTypingUsers(prev => prev.includes(typingUserId) ? prev : [...prev, typingUserId])
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== typingUserId))
        }, 2000) // Clear after 2 seconds
      }
    })

    return () => {
      socket.off("typing")
    }
  }, [userId])

  // Emit typing event
  useEffect(() => {
    if (input.trim()) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      socket.emit("typing", { roomId, userId })
      typingTimeoutRef.current = setTimeout(() => {
        // No need to clear typing here; server handles timeout
      }, 2000)
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [input, roomId, userId])

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input)
      setInput("")
      setShowEmojiPicker(false)
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatFullTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getUserColor = (name: string) => {
    const colors = [
      "bg-gradient-to-r from-red-500 to-pink-500",
      "bg-gradient-to-r from-blue-500 to-indigo-500",
      "bg-gradient-to-r from-green-500 to-teal-500",
      "bg-gradient-to-r from-yellow-500 to-orange-500",
      "bg-gradient-to-r from-purple-500 to-violet-500",
      "bg-gradient-to-r from-pink-500 to-rose-500",
      "bg-gradient-to-r from-indigo-500 to-blue-500",
      "bg-gradient-to-r from-teal-500 to-cyan-500",
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const onEmojiClick = (emojiObject: any) => {
    setInput(prev => prev + emojiObject.emoji)
    inputRef.current?.focus()
  }

  return (
    <Card className="shadow-xl border-primary/20 backdrop-blur-md bg-card/90 overflow-hidden rounded-xl">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary animate-pulse" />
          <CardTitle className="text-xl font-semibold text-white tracking-tight">Chat Room</CardTitle>
        </div>
        <div className="text-xs text-muted-foreground flex items-center mt-1">
          <Clock className="h-4 w-4 mr-1" />
          <span>Room ID: {roomId}</span>
        </div>
      </CardHeader>

      <div
        ref={chatContainerRef}
        className="h-[400px] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent bg-gradient-to-b from-background/80 to-secondary/20"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-fade-in">
            <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No messages yet. Be the first to chat!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwnMessage = msg.userId === userId
            const prevMsg = index > 0 ? messages[index - 1] : null
            const isGrouped = prevMsg && prevMsg.userId === msg.userId && (msg.timestamp - prevMsg.timestamp) < 60000

            return (
              <div
                key={index}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} items-start gap-2 transition-all duration-200 hover:bg-primary/5 rounded-lg p-1`}
              >
                {!isOwnMessage && !isGrouped && (
                  <Avatar className={`h-9 w-9 ${getUserColor(msg.userName)} shadow-md`}>
                    <AvatarFallback className="text-white font-semibold">{getInitials(msg.userName)}</AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-[70%] rounded-xl p-3 shadow-sm ${
                    isOwnMessage
                      ? "bg-gradient-to-r from-primary to-primary/80 text-white rounded-tr-none"
                      : "bg-muted/80 text-foreground rounded-tl-none"
                  } ${isGrouped ? (isOwnMessage ? "rounded-tr-xl" : "rounded-tl-xl") : ""}`}
                >
                  {!isGrouped && (
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-medium ${isOwnMessage ? "text-white/90" : "text-foreground/80"}`}>
                        {isOwnMessage ? "You" : msg.userName}
                      </span>
                      <span
                        className={`text-xs ml-2 ${isOwnMessage ? "text-white/70" : "text-foreground/60"}`}
                        title={formatFullTime(msg.timestamp)}
                      >
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  )}
                  <p className="text-sm break-words">{msg.text}</p>
                </div>

                {isOwnMessage && !isGrouped && (
                  <Avatar className={`h-9 w-9 ${getUserColor(msg.userName)} shadow-md`}>
                    <AvatarFallback className="text-white font-semibold">{getInitials(msg.userName)}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {typingUsers.length > 0 && typingUsers.some(id => id !== userId) && (
        <div className="px-4 py-1 text-xs text-muted-foreground animate-fade-in">
          {typingUsers.filter(id => id !== userId).length === 1
            ? "Someone is typing..."
            : `${typingUsers.filter(id => id !== userId).length} people are typing...`}
        </div>
      )}

      <Separator className="bg-primary/20" />

      <CardFooter className="p-4 bg-gradient-to-t from-background/80 to-secondary/10">
        <div className="flex w-full items-center gap-2 relative">
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 bg-white/10 border-primary/20 text-white placeholder-muted-foreground rounded-full py-6 shadow-inner"
            placeholder="Type a message or add an emoji..."
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(prev => !prev)}
            className="rounded-full text-primary hover:bg-primary/10"
          >
            <Smile className="h-5 w-5" />
            <span className="sr-only">Toggle emoji picker</span>
          </Button>
          <Button
            onClick={handleSend}
            size="icon"
            className="rounded-full bg-primary hover:bg-primary/90 transition-all duration-200"
            disabled={!input.trim()}
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>

          {showEmojiPicker && (
            <div className="absolute bottom-16 right-0 z-10 shadow-lg">
              <Picker onEmojiClick={onEmojiClick} theme={Theme.DARK} />
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

export default Chat