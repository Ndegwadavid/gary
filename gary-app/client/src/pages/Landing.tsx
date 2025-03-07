"use client"

import type React from "react"

import { useEffect, useState } from "react"
import type { User } from "firebase/auth"
import { Music, Headphones, ArrowRight } from "lucide-react"
import Player from "../components/Player"
import AuthComponent from "../components/Auth"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"

interface Track {
  id: string
  title: string
  audioUrl?: string
}

interface LandingProps {
  user: User | null
}

const Landing: React.FC<LandingProps> = ({ user }) => {
  const [tracks, setTracks] = useState<Track[]>([])
  const [showAuth, setShowAuth] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    fetch(
      `https://api.jamendo.com/v3.0/tracks/?client_id=${process.env.REACT_APP_JAMENDO_CLIENT_ID}&format=json&limit=5&order=downloads_total`,
    )
      .then((res) => res.json())
      .then((jamendoData) => {
        const jamendoTracks = jamendoData.results.map((track: any) => ({
          id: track.id,
          title: track.name,
          audioUrl: track.audio,
        }))
        setTracks(jamendoTracks)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Jamendo fetch failed:", err)
        setIsLoading(false)
      })
  }, [])

  const handleLoginClick = () => {
    setShowAuth(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16 animate-fade-in">
          <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Share the Beat, <span className="text-primary">Feel the Moment</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience music together in real-time. Create rooms, invite friends, and enjoy synchronized listening.
          </p>

          {!user ? (
            <Button size="lg" onClick={handleLoginClick} className="mt-8 px-8 rounded-full">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button size="lg" onClick={() => (window.location.href = "/me")} className="mt-8 px-8 rounded-full">
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Featured Tracks Section */}
        <div className="mt-16">
          <div className="flex items-center mb-8">
            <Headphones className="mr-2 h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Featured Tracks</h2>
          </div>

          <div className="grid gap-4">
            {isLoading
              ? // Loading skeleton
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="bg-card/50 backdrop-blur-sm">
                      <CardContent className="p-4 flex items-center">
                        <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
                        <div className="ml-4 h-4 w-48 bg-muted animate-pulse rounded"></div>
                      </CardContent>
                    </Card>
                  ))
              : tracks.map((track) => (
                  <Card
                    key={track.id}
                    className="bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 border-primary/10"
                  >
                    <CardContent className="p-4 flex items-center">
                      <div className="bg-primary/10 rounded-full p-2 mr-4">
                        <Player audioUrl={track.audioUrl} />
                      </div>
                      <span className="font-medium">{track.title}</span>
                    </CardContent>
                  </Card>
                ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground mb-4">Want to listen together with friends?</p>
            {!user && (
              <Button variant="outline" onClick={handleLoginClick} className="rounded-full">
                Login / Sign Up
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-24 py-6 border-t border-border/40 text-center text-sm text-muted-foreground">
        <div className="container mx-auto">
          <p>© {new Date().getFullYear()} Gary App. All rights reserved.</p>
        </div>
      </footer>

      {showAuth && <AuthComponent onClose={() => setShowAuth(false)} />}
    </div>
  )
}

export default Landing

