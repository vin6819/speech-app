import NextAuth, { NextAuthOptions } from "next-auth";
import  CredentialsProvider  from "next-auth/providers/credentials";
import bcryptjs from 'bcryptjs'
import {  PrismaClient } from "@/lib/generated/prisma";
const prisma=new PrismaClient()
const options:NextAuthOptions={
    providers:[
        CredentialsProvider({
            id:"user-login",
            credentials:{
                email:{label:"email",type:"text"},
                password:{label:"password",type:"text"}
            },
            async authorize({email,password}:{email:string,password:string}){
                if(!email || !password)throw new Error("Missing Information")
                    const user=await prisma.user.findUnique({
                where:{
                    email
                }})
               const users=await prisma.user.findMany()
               console.log(users);
               
                
                if(!user) throw new Error("User Not Found")
const passwordValid=await bcryptjs.compare(password,user.password)
                if(!passwordValid)throw new Error("Password not valid")
                return user
            }
        
        }
    )
        
    ],
    pages:{
        signIn:"/login"
    },
    secret:"speech-analysis",
    callbacks:{
        async jwt({token,user}) {
            if(user){
                token.user=user
            }
            return token
        },
        async session({session,token}){
            if(token){
                session.user=token.user
            }
            return session
        }
    }
}
const handler=NextAuth(options)
export {handler as GET,handler as POST}