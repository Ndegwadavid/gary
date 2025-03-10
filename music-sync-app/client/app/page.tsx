import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Music, Users, MessageSquare, Video, Sparkles } from "lucide-react"
import Image from "next/image"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center relative">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl"></div>
        </div>

        <div className="mb-8">
          <Image src="/assets/images/logo.svg" alt="Sync Logo" width={120} height={120} className="mx-auto" priority />
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          Listen Together, In Perfect Sync
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mb-8">
          Create rooms, invite friends, and enjoy your favorite tracks together with real-time chat and video calls.
        </p>

        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <Button asChild size="lg" className="gap-2 rounded-full px-6">
            <Link href="/rooms">
              <Music className="h-5 w-5" />
              Get Started
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="gap-2 rounded-full px-6">
            <Link href="/about">
              <Sparkles className="h-5 w-5" />
              Learn More
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
          <Card className="glass-card">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Music className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Synchronized Playback</h3>
              <p className="text-muted-foreground">
                Listen to the same song at the exact same time, with perfect synchronization.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Private Rooms</h3>
              <p className="text-muted-foreground">
                Create private listening rooms and invite only the people you want.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <MessageSquare className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Live Chat</h3>
              <p className="text-muted-foreground">
                Chat in real-time with everyone in your room while enjoying music.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Video className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Video Calls</h3>
              <p className="text-muted-foreground">See your friends' reactions with integrated video calling.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

