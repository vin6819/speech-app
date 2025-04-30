"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import axios from "axios"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function TextToSpeechPage() {
  const [langCode, setLangCode] = useState("en-IN")
  const [voice, setVoice] = useState("MALE")
  const lang = {
    "en-IN": { "MALE": "en-IN-Standard-F", "FEMALE": "en-IN-Standard-E" },
    "es-ES": { "MALE": "es-ES-Standard-B", "FEMALE": "es-ES-Standard-C" },
    "fr-FR": { "MALE": "fr-FR-Standard-B", "FEMALE": "fr-FR-Standard-C" },
    "de-DE": { "MALE": "de-DE-Standard-B", "FEMALE": "de-DE-Standard-C" },
  }
  const transcribe = async () => {
    const text = document.querySelector("textarea")?.value
    const response = await axios.post("http://127.0.0.1:5001/tts", {
      text: text,
      voice: lang[langCode][voice],
      languageCode: langCode,
      },
      {
        responseType: 'blob',
      }
    )
    const audioUrl = URL.createObjectURL(response.data);
    const audio = new Audio(audioUrl);
    audio.play();
  }
  return (
    <div className="max-w-4xl mx-auto mt-10 p-4">
      <h1 className="text-2xl font-bold mb-4">Text to Speech</h1>
      <div className="flex w-full max-w-sm space-x-2 mt-4 flex-col gap-6">
        <div className="flex gap-2">
          <Select defaultValue={langCode} onValueChange={(value) => setLangCode(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Languages</SelectLabel>
                <SelectItem value="en-IN">English</SelectItem>
                <SelectItem value="es-ES">Spanish</SelectItem>
                <SelectItem value="fr-FR">French</SelectItem>
                <SelectItem value="de-DE">German</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select defaultValue={voice} onValueChange={(value) => setVoice(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Voices</SelectLabel>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Textarea placeholder="Enter your desired text" />
        <Button className="hover:bg-gray-400 cursor-pointer" onClick={transcribe}>Transcribe</Button>
      </div>
    </div>
  )
}
