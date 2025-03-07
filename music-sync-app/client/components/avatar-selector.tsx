"use client"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage } from "@/components/ui/avatar"

// Define available avatars
const AVATARS = [
  "/assets/images/avatars/default.jpg",
  "/assets/images/avatars/alex.jpg",
  "/assets/images/avatars/taylor.jpg",
  "/assets/images/avatars/jordan.jpg",
  "/assets/images/avatars/casey.jpg",
  "/assets/images/avatars/avatar1.jpg",
  "/assets/images/avatars/avatar2.jpg",
  "/assets/images/avatars/avatar3.jpg",
]

interface AvatarSelectorProps {
  selectedAvatar: string
  onSelect: (avatar: string) => void
}

export function AvatarSelector({ selectedAvatar, onSelect }: AvatarSelectorProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center py-2">
      {AVATARS.map((avatar) => (
        <div
          key={avatar}
          className={cn(
            "cursor-pointer relative rounded-full overflow-hidden border-2 transition-all",
            selectedAvatar === avatar ? "border-primary scale-110" : "border-transparent hover:border-primary/50",
          )}
          onClick={() => onSelect(avatar)}
        >
          <Avatar className="h-14 w-14">
            <AvatarImage src={avatar} alt="Avatar option" />
          </Avatar>
        </div>
      ))}
    </div>
  )
}

