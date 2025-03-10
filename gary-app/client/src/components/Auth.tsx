"use client"

import type React from "react"

import { useState } from "react"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { useNavigate } from "react-router-dom"
import { Mail, Lock, X, AlertCircle, LogIn } from "lucide-react"
import { auth, googleProvider } from "../firebase"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Separator } from "../components/ui/separator"

interface AuthProps {
  onClose: () => void
}

const Auth: React.FC<AuthProps> = ({ onClose }) => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      onClose()
      navigate("/me")
    } catch (error: any) {
      let errorMessage = error.message
      switch (error.code) {
        case "auth/network-request-failed":
          errorMessage = "Network error: Ensure Firebase emulators are running or check your internet connection."
          break
        case "auth/invalid-email":
          errorMessage = "Invalid email format."
          break
        case "auth/user-not-found":
        case "auth/wrong-password":
          errorMessage = "Invalid email or password."
          break
        case "auth/email-already-in-use":
          errorMessage = "Email is already in use."
          break
        case "auth/weak-password":
          errorMessage = "Password must be at least 6 characters long."
          break
        default:
          errorMessage = `Authentication failed: ${error.message}`
      }
      setError(errorMessage)
      console.error(`${isSignUp ? "Signup" : "Login"} failed:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await signInWithPopup(auth, googleProvider)
      onClose()
      navigate("/me")
    } catch (error: any) {
      let errorMessage = error.message
      switch (error.code) {
        case "auth/network-request-failed":
          errorMessage = "Network error: Ensure Firebase emulators are running or check your internet connection."
          break
        case "auth/popup-closed-by-user":
          errorMessage = "Google sign-in popup was closed."
          break
        case "auth/popup-blocked":
          errorMessage = "Popup was blocked by the browser. Please allow popups."
          break
        default:
          errorMessage = `Google authentication failed: ${error.message}`
      }
      setError(errorMessage)
      console.error("Google auth failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEmailAuth()
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="absolute inset-0" onClick={onClose}></div>
      <Card className="w-full max-w-md z-10 shadow-lg border-primary/10">
        <CardHeader className="relative">
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
          <CardTitle className="text-2xl">{isSignUp ? "Create an account" : "Welcome back"}</CardTitle>
          <CardDescription>
            {isSignUp ? "Sign up to start sharing music with friends" : "Login to your account to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="pl-10"
                onKeyDown={handleKeyDown}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="pl-10"
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          <Button onClick={handleEmailAuth} className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span className="flex items-center">
                <LogIn className="mr-2 h-4 w-4" />
                {isSignUp ? "Sign Up" : "Login"}
              </span>
            )}
          </Button>

          <div className="relative flex items-center justify-center">
            <Separator className="absolute" />
            <span className="bg-card px-2 text-xs text-muted-foreground relative">OR CONTINUE WITH</span>
          </div>

          <Button variant="outline" onClick={handleGoogleAuth} className="w-full" disabled={isLoading}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            {isSignUp ? "Sign up with Google" : "Login with Google"}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col">
          <p className="text-sm text-center text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
            <Button variant="link" className="p-0 h-auto font-normal" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? "Login" : "Sign Up"}
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default Auth

