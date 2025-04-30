'use client'

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import axios from "axios"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const data =  {
  "num_matched": 7,
  "total": 11,
  "word_alignment": [
      {
          "actual": "the",
          "expected": "wheel",
          "matched": false,
          "ref_time": "0.00-0.90",
          "user_time": "4.70-4.80"
      },
      {
          "actual": "and",
          "expected": "and",
          "matched": true,
          "ref_time": "0.90-1.10",
          "user_time": "2.50-2.90"
      },
      {
          "actual": "fire",
          "expected": "fire",
          "matched": true,
          "ref_time": "1.10-1.30",
          "user_time": "2.90-3.10"
      },
      {
          "actual": "are",
          "expected": "are",
          "matched": true,
          "ref_time": "1.30-1.90",
          "user_time": "3.10-3.50"
      },
      {
          "actual": "2",
          "expected": "2",
          "matched": true,
          "ref_time": "1.90-2.00",
          "user_time": "3.50-4.30"
      },
      {
          "actual": "of",
          "expected": "of",
          "matched": true,
          "ref_time": "2.00-2.20",
          "user_time": "4.30-4.70"
      },
      {
          "actual": null,
          "expected": "the",
          "matched": false,
          "ref_time": "2.20-2.20",
          "user_time": null
      },
      {
          "actual": "first",
          "expected": "best",
          "matched": false,
          "ref_time": "2.20-2.40",
          "user_time": "4.80-5.40"
      },
      {
          "actual": "inventions",
          "expected": "inventions",
          "matched": true,
          "ref_time": "2.40-3.40",
          "user_time": "5.40-6.30"
      },
      {
          "actual": "of",
          "expected": "of",
          "matched": true,
          "ref_time": "3.40-3.60",
          "user_time": "6.30-6.70"
      },
      {
          "actual": null,
          "expected": "humanity",
          "matched": false,
          "ref_time": "3.60-4.40",
          "user_time": null
      }
  ]
}

export default function SpeechAnalysisPage() {
  const [transcript, setTranscript] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const [langCode, setLangCode] = useState("en-US")
  const [voice, setVoice] = useState("MALE")
  const lang = {
    "en-IN": { "MALE": "en-IN-Standard-B", "FEMALE": "en-IN-Standard-A", "whisper": "en" },
    "en-US": { "MALE": "en-IN-Standard-B", "FEMALE": "en-IN-Standard-A", "whisper": "en" },
    "es-ES": { "MALE": "es-ES-Standard-B", "FEMALE": "es-ES-Standard-C", "whisper": "es" },
    "fr-FR": { "MALE": "fr-FR-Standard-B", "FEMALE": "fr-FR-Standard-C", "whisper": "fr" },
    "de-DE": { "MALE": "de-DE-Standard-B", "FEMALE": "de-DE-Standard-C", "whisper": "de" },
  }
  const playSegment = (file: string, start: number, end: number) => {
    const audio = new Audio(file)
    
    audio.addEventListener('loadedmetadata', () => {
      audio.currentTime = start
  
      audio.play().then(() => {
        const duration = (end - start) * 1000
        setTimeout(() => audio.pause(), duration)
      }).catch((err) => {
        console.error("Playback error:", err)
      })
    })
  }


  const startRecording = async () => {
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
    const ttsBlob = response.data;
    const audioUrl = URL.createObjectURL(response.data);
    const audio = new Audio(audioUrl);
    audio.play()


    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder
    audioChunksRef.current = []

    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
      const formData = new FormData()
      formData.append('user', audioBlob, 'recording.wav')
      formData.append('reference', ttsBlob, 'recording2.wav')
      formData.append('language', langCode)

      try {
        const response = await axios.post('http://127.0.0.1:5001/compare-audio-whisper', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setTranscript(response.data.transcript)
        console.log('STT Response:', response.data)
      } catch (error) {
        console.error('STT Error:', error)
      }
    }

    mediaRecorder.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  
    // const mismatches = data.word_alignment.filter((item: any) => item.matched === false)
    // console.log(mismatches)

  const getClip = (audioFile: string, start: number, end: number) => {
    return `${audioFile}#t=${start},${end}`
  
  }

  return (
    <div className="max-w-xl mx-auto mt-10 text-center">
      <h1 className="text-2xl font-bold mb-4">Speech Analysis</h1>
      <div className="flex gap-2 mb-4">
          <Select defaultValue={langCode} onValueChange={(value) => setLangCode(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Languages</SelectLabel>
                <SelectItem value={langCode}>English</SelectItem>
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
      <div className="space-x-4 mb-6 mt-6">
        <Button onClick={startRecording} disabled={isRecording}>Start Recording</Button>
        <Button onClick={stopRecording} disabled={!isRecording}>Stop Recording</Button>
      </div>
      {transcript && (
        <div className="p-4 rounded-xl shadow text-left">
          <h2 className="font-semibold mb-2">Transcript:</h2>
          <p>{transcript}</p>
        </div>
      )}
      {data && (
        <div className="p-4 rounded-xl shadow text-left mt-4">
          <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Expected</TableHead>
          <TableHead>Actual</TableHead>
          <TableHead>Reference Audio</TableHead>
          <TableHead>User Audio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.word_alignment.map((item: any, idx: number) => {
          const [refStart, refEnd] = item.ref_time.split("-").map(parseFloat)
          const [userStart, userEnd] = item.user_time ? item.user_time.split("-").map(parseFloat) : [null, null]
          return (
            <TableRow key={idx}>
              <TableCell>{item.expected}</TableCell>
              <TableCell>{item.actual ?? "⛔ Missing"}</TableCell>
              <TableCell>
                {/* <audio controls preload="none">
                  <source src={getClip("/ref_audio.wav", refStart, refEnd)} type="audio/wav" />
                  Your browser does not support audio.
                </audio> */}
                <Button onClick={() => playSegment("/ref_audio.wav", userStart, userEnd)}>Play Clip</Button>
              </TableCell>
              <TableCell>
                {userStart !== null ? (
                  // <audio controls preload="none">
                  //   <source src={getClip("/user_audio.wav", userStart, userEnd)} type="audio/wav" />
                  //   Your browser does not support audio.
                  // </audio>
                  <Button onClick={() => playSegment("/user_audio.wav", userStart, userEnd)}>Play Clip</Button>
                ) : (
                  <span className="text-red-500">⛔ Not Found</span>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
        </div>
      )}
    </div>
  )
}
