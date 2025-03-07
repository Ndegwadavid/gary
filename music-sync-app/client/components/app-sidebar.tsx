"use client"

import { Home, Music, Plus, Search, Settings, LogIn, LogOut, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { CreateRoomDialog } from "@/components/create-room-dialog"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"

// Mock data for rooms
const recentRooms = [
  { id: "1", name: "Chill Vibes" },
  { id: "2", name: "Rock Classics" },
  { id: "3", name: "Jazz Club" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, signIn, signOut } = useAuth()
  const { toast } = useToast()
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false)

  const handleCreateRoom = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to sign in to create rooms.",
        variant: "destructive",
      })
      return
    }

    setIsCreateRoomOpen(true)
  }

  return (
    <>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="flex items-center justify-between p-4">
          <Link href="/" className="flex items-center gap-2">
            <Music className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Sync</span>
          </Link>
          <SidebarTrigger />
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Home">
                    <Link href="/">
                      <Home />
                      <span>Home</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/rooms" || pathname.startsWith("/rooms/")}
                    tooltip="Rooms"
                  >
                    <Link href="/rooms">
                      <Music />
                      <span>Rooms</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/search"} tooltip="Search">
                    <Link href="/search">
                      <Search />
                      <span>Search</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Recent Rooms</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recentRooms.map((room) => (
                  <SidebarMenuItem key={room.id}>
                    <SidebarMenuButton asChild isActive={pathname === `/rooms/${room.id}`} tooltip={room.name}>
                      <Link href={`/rooms/${room.id}`}>
                        <Music />
                        <span>{room.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Create Room" onClick={handleCreateRoom}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Plus />
                      <span>Create Room</span>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full flex items-center justify-start gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.photoURL || "/assets/images/avatars/default.jpg"} />
                    <AvatarFallback>{user.displayName?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <span>{user.displayName || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/profile" className="w-full flex">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings" className="w-full flex">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" className="w-full gap-2" onClick={signIn}>
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          )}
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <CreateRoomDialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen} />
    </>
  )
}

