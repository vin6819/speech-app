"use client"
import Link from "next/link"

import { notFound } from "next/navigation"
import { ArrowLeft, FileAudio } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import axios from "axios"

export default  function UserDetailsPage({ params }: { params: { userId: string } }) {
    const[user,setUser]=useState({})
  useEffect(()=>{
    const fetchUser=async ()=>{
        const response=await axios.get("/api/getUser",{
            params:{
                id:params.userId
            }
        })
        
        setUser(response.data)
    }
fetchUser()
  },[])
  const tests = user?.recordedAudios || []

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tests</CardTitle>
            <CardDescription>All tests completed by this user</CardDescription>
          </CardHeader>
          <CardContent>
            {tests.length > 0 ? (
              <div className="grid gap-4">
                {tests.map((test, index) => (
                  <Link href={`/dashboard/users/${user.id}/tests/${index}`} key={index}>
                    <div className="flex items-center p-4 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <FileAudio className="h-5 w-5 mr-3 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">Test #{index + 1}</p>
                        {/* <p className="text-sm text-muted-foreground">{new Date(user.updatedAt).toLocaleDateString()}</p> */}
                      </div>
                      <Badge>{<audio src={test} controls/>}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No tests completed yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
