
"use client"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import axios from "axios"

export default async function TestDetailsPage({
  params,
}: {
  params: { userId: string; testIndex: string }
}) {
    const [user,setUser]=useState(null)
  const testIndex = Number.parseInt(params.testIndex)

  if (isNaN(testIndex)) {
    notFound()
  }
useEffect(()=>{
    const fetchUser=async()=>{
        const response=await axios.get("/api/getUser")
        setUser(response.data)
    }
})

  if (!user || !user.tests || testIndex >= user.tests.length) {
    notFound()
  }

  const audioFiles = user.recordedAudios
  // console.log("Audio files:", audioFiles)
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-8">
        <Link href={`/dashboard/users/${params.userId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to User
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Test #{testIndex + 1}</h1>
          <p className="text-muted-foreground">
            {user.name} - {user.tests[testIndex]}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {audioFiles.map((audio, index) => (
            <Card key={audio.id}>
              <CardHeader>
                <CardTitle>Audio {index + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full">
                  <audio controls src={audio} className="w-full">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </CardContent>
            </Card>
          ))}

          {audioFiles.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No audio files found for this test</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
