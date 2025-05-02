import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";
import bcryptjs from "bcryptjs";
export async function POST(req:NextRequest){
    const prisma=new PrismaClient()
    const data=await req.json()
    console.log(data);
    
    const {Email,password,Name}=data
    if(!Email || !password || !Name)return NextResponse.json({message:"Credentials Not Provided",status:404})
    try{
// const hashedPassword=await bcryptjs.hash(password,10)
const savedUser=await prisma.user.create({
    data:{
        email:Email,password,name:Name
    }
})
return NextResponse.json({message:"Succesfully Created"},{status:201})
}
catch(err){
    return NextResponse.json({message:"Internal server error",status:500})
}

}