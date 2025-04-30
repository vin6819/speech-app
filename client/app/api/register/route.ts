import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";
export async function POST(req:NextRequest){
    const prisma=new PrismaClient()
    const data=await req.json()
    const {email,password,name}=data
    if(!email || !password || !name)return NextResponse.json({message:"Credentials Not Provided",status:404})
    try{
const savedUser=await prisma.user.create({
    data:{
        email,password,name
    }
})
return NextResponse.json({message:"Created Successfully",status:201})
}
catch(err){
    return NextResponse.json({message:"Internal server error",status:500})
}
}