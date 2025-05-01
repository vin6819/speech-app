"use client"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import axios from "axios"


export default  function TherapistDashboard() {
  const [users,setUsers]=useState([])
  useEffect(()=>{
const fetchUser=async ()=>{
const response=await axios.get("/api/fetchUsers")
console.log(response.data);

setUsers(response.data)
}
fetchUser()
  },[])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Therapist Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user:any) => (
          <Link href={`/users/${user.id}`} key={user.id}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Tests completed: {user.recordedAudios ? user.recordedAudios.length : 0}</p>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">Click to view details</p>
              </CardFooter>
            </Card>
          </Link>
        ))}

        {users.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No users found</p>
          </div>
        )}
      </div>
    </div>
  )
}
