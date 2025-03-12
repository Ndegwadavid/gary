"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Clock, MessageSquare, Smile, Paperclip, Search, X, MoreHorizontal, Reply, Check, CheckCheck, Trash2, Heart, ThumbsUp, ImageIcon } from 'lucide-react'
import io from "socket.io-client"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Separator } from "../components/ui/separator"
import { Badge } from "../components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip"
import Picker, { Theme } from "emoji-picker-react"

const getSocketUrl = () => {
  return process.env.NODE_ENV === "production"
    ? "https://gary-server.onrender.com"
    : "http://localhost:5000"
}

const socket = io(getSocketUrl(), { transports: ["websocket", "polling"] });

interface Reaction {
  emoji: string
  userId: string
  userName: string
}

interface MessageFile {
  url: string
  type: "image" | "file"
  name: string
}

interface Message {
  id: string
  userId: string
  userName: string
  text: string
  timestamp: number
  reactions?: Reaction[]
  file?: MessageFile
  replyTo?: string
  isDeleted?: boolean
  readBy?: string[]
}

interface ChatProps {
  roomId: string
  userId: string
  messages: Message[]
  sendMessage: (text: string, file?: MessageFile, replyTo?: string) => void
}

const Chat: React.FC<ChatProps> = ({ roomId, userId, messages, sendMessage: propSendMessage }) => {
  const [input, setInput] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sendingRef = useRef<boolean>(false)

  useEffect(() => {
    const handleTyping = ({ userId: typingUserId }: { userId: string }) => {
      if (typingUserId !== userId) {
        setTypingUsers(prev => prev.includes(typingUserId) ? prev : [...prev, typingUserId]);
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== typingUserId));
        }, 2000);
      }
    };

    const handleMessageReaction = ({ messageId, reaction }: { messageId: string, reaction: Reaction }) => {
      propSendMessage('', undefined, undefined); // Trigger a re-render by calling sendMessage with no-op
    };

    const handleMessageDelete = ({ messageId }: { messageId: string }) => {
      propSendMessage('', undefined, undefined); // Trigger a re-render
    };

    const handleMessageRead = ({ messageId, userId: readerId }: { messageId: string, userId: string }) => {
      propSendMessage('', undefined, undefined); // Trigger a re-render
    };

    socket.on("typing", handleTyping);
    socket.on("message-reaction", handleMessageReaction);
    socket.on("message-delete", handleMessageDelete);
    socket.on("message-read", handleMessageRead);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("message-reaction", handleMessageReaction);
      socket.off("message-delete", handleMessageDelete);
      socket.off("message-read", handleMessageRead);
    };
  }, [userId]);

  useEffect(() => {
    if (!searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, searchQuery]);

  useEffect(() => {
    if (input.trim()) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit("typing", { roomId, userId });
      typingTimeoutRef.current = setTimeout(() => {}, 2000);
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [input, roomId, userId]);

  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  }, [selectedFile]);

  useEffect(() => {
    const unreadMessages = messages.filter(msg => 
      msg.userId !== userId && 
      (!msg.readBy || !msg.readBy.includes(userId))
    );
    
    unreadMessages.forEach(msg => {
      socket.emit("message-read", { roomId, messageId: msg.id, userId });
    });
  }, [messages, roomId, userId]);

  const sendMessageWithAttachments = useCallback(() => {
    if ((!input.trim() && !selectedFile) || !roomId || sendingRef.current) return;
    
    sendingRef.current = true;
    
    let file: MessageFile | undefined = undefined;
    if (selectedFile) {
      const isImage = selectedFile.type.startsWith('image/');
      file = {
        url: filePreview as string,
        type: isImage ? "image" : "file",
        name: selectedFile.name
      };
    }
    
    propSendMessage(input, file, replyingTo || undefined);
    
    setInput("");
    setSelectedFile(null);
    setFilePreview(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);
    
    setTimeout(() => {
      sendingRef.current = false;
    }, 300);
  }, [input, selectedFile, filePreview, replyingTo, roomId, propSendMessage]);

  const handleSend = () => {
    sendMessageWithAttachments();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    const reaction: Reaction = {
      emoji,
      userId,
      userName: "You"
    };
    socket.emit("message-reaction", { roomId, messageId, reaction });
  };

  const handleDeleteMessage = (messageId: string) => {
    socket.emit("message-delete", { roomId, messageId });
  };

  const handleReply = (messageId: string) => {
    setReplyingTo(messageId);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const getReplyingToMessage = () => {
    if (!replyingTo) return null;
    return messages.find(msg => msg.id === replyingTo);
  };

  const replyMessage = getReplyingToMessage();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatFullTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

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
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const onEmojiClick = (emojiObject: any) => {
    setInput(prev => prev + emojiObject.emoji);
    inputRef.current?.focus();
  };

  const filteredMessages = searchQuery
    ? messages.filter(msg => 
        msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.userName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <Card className="shadow-xl border-primary/20 backdrop-blur-md bg-card/90 overflow-hidden rounded-xl h-full flex flex-col">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary animate-pulse" />
            <CardTitle className="text-xl font-semibold text-white tracking-tight">Chat Room</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-white hover:bg-primary/20"
                    onClick={() => setShowSearch(!showSearch)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search messages</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Badge variant="outline" className="bg-primary/20 text-white border-primary/30">
              <Clock className="h-3 w-3 mr-1" />
              <span className="text-xs">Room ID: {roomId}</span>
            </Badge>
          </div>
        </div>
        
        {showSearch && (
          <div className="mt-3 flex items-center gap-2 animate-fade-in">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 bg-white/10 border-primary/20 text-white placeholder-muted-foreground rounded-full py-2 shadow-inner"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSearchQuery("");
                setShowSearch(false);
              }}
              className="rounded-full text-white hover:bg-primary/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent bg-gradient-to-b from-background/80 to-secondary/20"
      >
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-fade-in">
            <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">
              {searchQuery ? "No messages match your search" : "No messages yet. Be the first to chat!"}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isOwnMessage = msg.userId === userId;
            const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
            const isGrouped = prevMsg && prevMsg.userId === msg.userId && (msg.timestamp - prevMsg.timestamp) < 60000;
            
            const replyToMessage = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;

            return (
              <div key={msg.id} className="space-y-1">
                {replyToMessage && (
                  <div 
                    className={`flex items-center gap-2 ml-12 ${isOwnMessage ? 'justify-end mr-12' : 'justify-start'} mb-1`}
                  >
                    <div 
                      className={`flex items-center gap-2 max-w-[80%] rounded-lg p-2 text-xs ${
                        isOwnMessage ? 'bg-primary/20 text-white' : 'bg-muted/50 text-foreground/80'
                      }`}
                    >
                      <Reply className="h-3 w-3 flex-shrink-0" />
                      <span className="font-medium truncate">{replyToMessage.userName}:</span>
                      <span className="truncate">{replyToMessage.isDeleted ? "This message was deleted" : replyToMessage.text}</span>
                    </div>
                  </div>
                )}
                
                <div
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} items-start gap-2 transition-all duration-200 hover:bg-primary/5 rounded-lg p-1 group relative`}
                >
                  {!isOwnMessage && !isGrouped && (
                    <Avatar className={`h-9 w-9 ${getUserColor(msg.userName)} shadow-md`}>
                      <AvatarFallback className="text-white font-semibold">{getInitials(msg.userName)}</AvatarFallback>
                    </Avatar>
                  )}

                  <div className="flex flex-col max-w-[70%]">
                    <div
                      className={`rounded-xl p-3 shadow-sm ${
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
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-xs ${isOwnMessage ? "text-white/70" : "text-foreground/60"}`}
                              title={formatFullTime(msg.timestamp)}
                            >
                              {formatTime(msg.timestamp)}
                            </span>
                            
                            {isOwnMessage && msg.readBy && msg.readBy.length > 1 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`text-xs ${isOwnMessage ? "text-white/70" : "text-foreground/60"}`}>
                                      <CheckCheck className="h-3 w-3" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Read by {msg.readBy.length - 1} people</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {!msg.isDeleted && <p className="text-sm break-words">{msg.text}</p>}
                      {msg.isDeleted && (
                        <p className="text-sm italic opacity-70">This message was deleted</p>
                      )}
                      
                      {msg.file && !msg.isDeleted && (
                        <div className="mt-2">
                          {msg.file.type === "image" ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <div className="cursor-pointer rounded-md overflow-hidden">
                                  <img 
                                    src={msg.file.url || "/placeholder.svg"} 
                                    alt={msg.file.name} 
                                    className="max-h-48 object-cover rounded-md hover:opacity-90 transition-opacity"
                                  />
                                </div>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>{msg.file.name}</DialogTitle>
                                </DialogHeader>
                                <div className="mt-2">
                                  <img 
                                    src={msg.file.url || "/placeholder.svg"} 
                                    alt={msg.file.name} 
                                    className="w-full object-contain max-h-[70vh]"
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <a 
                              href={msg.file.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className={`flex items-center gap-2 p-2 rounded-md ${
                                isOwnMessage ? "bg-white/10" : "bg-primary/10"
                              } hover:opacity-90 transition-opacity`}
                            >
                              <Paperclip className="h-4 w-4" />
                              <span className="text-sm truncate">{msg.file.name}</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {msg.reactions && msg.reactions.length > 0 && !msg.isDeleted && (
                      <div 
                        className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => {
                          const count = msg.reactions!.filter(r => r.emoji === emoji).length;
                          const hasReacted = msg.reactions!.some(r => r.emoji === emoji && r.userId === userId);
                          
                          return (
                            <Badge 
                              key={emoji} 
                              variant={hasReacted ? "default" : "outline"}
                              className="cursor-pointer hover:bg-primary/20 transition-colors"
                              onClick={() => handleReaction(msg.id, emoji)}
                            >
                              {emoji} {count > 1 && count}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {isOwnMessage && !isGrouped && (
                    <Avatar className={`h-9 w-9 ${getUserColor(msg.userName)} shadow-md`}>
                      <AvatarFallback className="text-white font-semibold">{getInitials(msg.userName)}</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`absolute ${isOwnMessage ? 'right-16' : 'left-16'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/50 backdrop-blur-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isOwnMessage ? "end" : "start"} className="w-40">
                        <DropdownMenuItem onClick={() => handleReply(msg.id)}>
                          <Reply className="h-4 w-4 mr-2" />
                          Reply
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleReaction(msg.id, "❤️")}>
                          <Heart className="h-4 w-4 mr-2" />
                          React ❤️
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleReaction(msg.id, "👍")}>
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          React 👍
                        </DropdownMenuItem>
                        
                        {isOwnMessage && !msg.isDeleted && (
                          <DropdownMenuItem 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
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

      {replyMessage && (
        <div className="px-4 py-2 bg-primary/10 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2 text-sm">
            <Reply className="h-4 w-4 text-primary" />
            <span className="text-white/80">Replying to <span className="font-medium">{replyMessage.userName}</span>:</span>
            <span className="text-white/60 truncate max-w-[200px]">{replyMessage.text}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={cancelReply}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {filePreview && (
        <div className="px-4 py-2 bg-primary/10 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2 text-sm">
            {selectedFile?.type.startsWith('image/') ? (
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <div className="h-10 w-10 rounded overflow-hidden">
                  <img src={filePreview || "/placeholder.svg"} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <span className="text-white/80 truncate max-w-[200px]">{selectedFile?.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                <span className="text-white/80 truncate max-w-[200px]">{selectedFile?.name}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setSelectedFile(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <CardFooter className="p-4 bg-gradient-to-t from-background/80 to-secondary/10">
        <div className="flex w-full items-center gap-2 relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFileSelect}
            className="rounded-full text-primary hover:bg-primary/10"
          >
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
          
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
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
            disabled={!input.trim() && !selectedFile}
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