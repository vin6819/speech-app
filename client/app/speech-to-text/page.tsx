'use client'

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import axios from "axios"

export default function SpeechToText() {
  const [transcript, setTranscript] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const startRecording = async () => {
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
      formData.append('audio', audioBlob, 'recording.wav')
      formData.append('language_code', 'en-IN')

      try {
        const response = await axios.post('http://127.0.0.1:5001/google-stt', formData, {
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

  return (
    <div className="max-w-xl mx-auto mt-10 text-center">
      <h1 className="text-2xl font-bold mb-4">Speech to Text</h1>
      <div className="space-x-4 mb-6">
        <Button onClick={startRecording} disabled={isRecording}>Start Recording</Button>
        <Button onClick={stopRecording} disabled={!isRecording}>Stop Recording</Button>
      </div>
      {transcript && (
        <div className="p-4 rounded-xl shadow text-left">
          <h2 className="font-semibold mb-2">Transcript:</h2>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  )
}
