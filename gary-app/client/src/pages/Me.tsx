"use client"

import type React from "react"
import { useNavigate } from 'react-router-dom'
import { User } from 'firebase/auth'
import { auth, db } from '../firebase'
import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore'
import { Music, PlusCircle, LogOut, ArrowRight, Sparkles, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Separator } from '../components/ui/separator'
import { Avatar, AvatarFallback } from '../components/ui/avatar'

interface MeProps {
  user: User | null
}

const Me: React.FC<MeProps> = ({ user }) => {
  const navigate = useNavigate()
  const [roomIdInput, setRoomIdInput] = useState('')
  const [raveIdInput, setRaveIdInput] = useState('')
  const [myRaves, setMyRaves] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!user) return

    setIsLoading(true)
    const q = query(collection(db, 'raves'), where('creator', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const raves = snapshot.docs.map((doc) => doc.id)
      setMyRaves(raves)
      setIsLoading(false)
    }, (error) => {
      console.error('Error fetching my raves:', error)
    })

    return () => unsubscribe()
  }, [user])

  if (!user) {
    navigate('/')
    return null
  }

  const createRoom = () => {
    setIsLoading(true)
    const roomId = Math.random().toString(36).substring(7) // Random 6-char ID
    toast.success(
      <div className="flex items-center gap-2 bg-green-500/10 backdrop-blur-md border border-green-500/20 rounded-lg p-4 shadow-lg text-green-100">
        <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
        <span className="font-semibold">Room "{roomId}" created!</span>
      </div>,
      { duration: 3000 }
    )
    navigate(`/room/${roomId}`)
  }

  const joinRoom = () => {
    if (roomIdInput.trim()) {
      setIsLoading(true)
      navigate(`/room/${roomIdInput.trim()}`)
    }
  }

  const createRave = async () => {
    if (!raveIdInput.trim() || !/^[a-zA-Z0-9]+$/.test(raveIdInput.trim())) {
      toast.error("Rave ID must contain only letters and numbers.")
      return
    }

    setIsLoading(true)
    const raveId = raveIdInput.trim()

    try {
      console.log('Creating rave:', raveId)
      await setDoc(doc(db, 'raves', raveId), {
        creator: user.uid,
        createdAt: Date.now(),
        userCount: 1,
      }, { merge: true })
      console.log('Rave created successfully:', raveId)
      toast.success(
        <div className="flex items-center gap-2 bg-green-500/10 backdrop-blur-md border border-green-500/20 rounded-lg p-4 shadow-lg text-green-100">
          <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold">Rave "{raveId}" created!</span>
        </div>,
        { duration: 3000 }
      )
      navigate(`/rave/${raveId}`)
    } catch (error) {
      console.error('Error creating rave:', error)
      toast.error('Failed to create rave')
      setIsLoading(false)
    }
  }

  const joinRave = () => {
    if (raveIdInput.trim() && /^[a-zA-Z0-9]+$/.test(raveIdInput.trim())) {
      setIsLoading(true)
      navigate(`/rave/${raveIdInput.trim()}`)
    } else {
      toast.error("Rave ID must contain only letters and numbers.")
    }
  }

  const getUserInitials = () => {
    if (!user) return '?'
    if (user.displayName) return user.displayName.split(' ').map(part => part.charAt(0)).join('').toUpperCase().substring(0, 2)
    if (user.email) return user.email.split('@')[0].substring(0, 2).toUpperCase()
    return user.uid.substring(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col items-center mb-12">
          <Avatar className="h-20 w-20 mb-4 bg-primary text-primary-foreground">
            <AvatarFallback className="text-xl font-semibold">{getUserInitials()}</AvatarFallback>
          </Avatar>
          <h1 className="text-3xl md:text-4xl font-bold text-center">
            Welcome, {user.displayName || user.email?.split('@')[0] || 'Music Lover'}!
          </h1>
          <p className="text-muted-foreground mt-2 text-center max-w-md">
            Create or join music rooms to listen together with friends in real-time
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg border-primary/10 backdrop-blur-sm bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Music className="h-5 w-5 text-primary mr-2" />
                Music Rooms
              </CardTitle>
              <CardDescription>Create a new room or join an existing one</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-4">
              <Button
                onClick={createRoom}
                className="w-full flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                <PlusCircle className="h-4 w-4" />
                Create a New Room
              </Button>

              <div className="relative">
                <Separator className="absolute left-0 right-0 top-1/2" />
                <div className="relative flex justify-center">
                  <span className="bg-card px-2 text-xs text-muted-foreground">OR JOIN EXISTING</span>
                </div>
              </div>

              <div className="space-y-2">
                <Input
                  type="text"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  placeholder="Enter Room ID"
                  className="w-full"
                />
                <Button
                  onClick={joinRoom}
                  variant="secondary"
                  className="w-full"
                  disabled={!roomIdInput.trim() || isLoading}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Join Room
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-primary/10 backdrop-blur-sm bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="h-5 w-5 text-primary mr-2" />
                Rave Experience
              </CardTitle>
              <CardDescription>Create or join a rave with video chat</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-4">
                <Input
                  type="text"
                  value={raveIdInput}
                  onChange={(e) => setRaveIdInput(e.target.value)}
                  placeholder="Enter Rave ID (letters/numbers only)"
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={createRave}
                    variant="default"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    disabled={!raveIdInput.trim() || !/^[a-zA-Z0-9]+$/.test(raveIdInput.trim()) || isLoading}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Rave
                  </Button>
                  <Button
                    onClick={joinRave}
                    variant="secondary"
                    className="w-full"
                    disabled={!raveIdInput.trim() || !/^[a-zA-Z0-9]+$/.test(raveIdInput.trim()) || isLoading}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Join Rave
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3 flex items-center">
                  <Sparkles className="h-4 w-4 text-primary mr-2" />
                  My Raves
                </h3>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => (
                      <div key={i} className="h-10 bg-muted animate-pulse rounded-md"></div>
                    ))}
                  </div>
                ) : myRaves.length > 0 ? (
                  <div className="space-y-2">
                    {myRaves.map((raveId) => (
                      <Button
                        key={raveId}
                        onClick={() => navigate(`/rave/${raveId}`)}
                        variant="outline"
                        className="w-full justify-between group"
                      >
                        <span className="truncate">{raveId}</span>
                        <ArrowRight className="h-4 w-4 ml-2 opacity-70 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No raves created yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate('/rooms')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            View Public Rooms
          </Button>
          <Button
            onClick={() => auth.signOut()}
            variant="ghost"
            className="flex items-center gap-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Me