"use client"

import { signIn, useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, CircleArrowOutUpLeftIcon, Eye, EyeOff, Loader2 } from "lucide-react"
// import { useToast } from "@/hooks/use-toast"

export default function Login() {
    
    //   const { toast } = useToast()
    const { data: session, status } = useSession()
    console.log(session);
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrlParam = searchParams.get("callbackUrl")

  const [hasTriedSignIn, setHasTriedSignIn] = useState(false)

useEffect(()=>{
    if(status==="authenticated"){
if(session?.user?.role==="patient")router.push("/")
        else router.push("/therapist")
    }
    
    
    
},[status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setHasTriedSignIn(true)
    try {
      const res = await signIn("user-login", {
       redirect:false,
        email,
        password,
      })
  
      if (res?.error) {
        setHasTriedSignIn(false) 
      } else {
       router.push("/")
       
      }
    } catch (error) {
      setHasTriedSignIn(false)
    } finally {
      setIsLoading(false)
    }
  }
  

  return (
    
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
       
        <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-primary ">
        <ArrowLeft className="h-8 w-8 rounded-full p-1 border-2 border-primary relative left-[46%]" />
        
      </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
          <p className="text-sm text-muted-foreground">Enter your credentials to access your account</p>
        </div>
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
              
            </form>
            <div className="mt-6 text-center text-sm flex justify-center">
            <span className="text-muted-foreground">
              Dont&apos; have an account?{' '}
            </span>
            <Link href='/register' className='ml-2'>
              <CircleArrowOutUpLeftIcon
              ></CircleArrowOutUpLeftIcon>
            </Link>  </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}