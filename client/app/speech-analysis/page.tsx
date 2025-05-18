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
import { useSession } from "next-auth/react"

// const data =  {
//   "num_matched": 7,
//   "total": 11,
//   "word_alignment": [
//       {
//           "actual": "the",
//           "expected": "wheel",
//           "matched": false,
//           "ref_time": "0.00-0.90",
//           "user_time": "4.70-4.80"
//       },
//       {
//           "actual": "and",
//           "expected": "and",
//           "matched": true,
//           "ref_time": "0.90-1.10",
//           "user_time": "2.50-2.90"
//       },
//       {
//           "actual": "fire",
//           "expected": "fire",
//           "matched": true,
//           "ref_time": "1.10-1.30",
//           "user_time": "2.90-3.10"
//       },
//       {
//           "actual": "are",
//           "expected": "are",
//           "matched": true,
//           "ref_time": "1.30-1.90",
//           "user_time": "3.10-3.50"
//       },
//       {
//           "actual": "2",
//           "expected": "2",
//           "matched": true,
//           "ref_time": "1.90-2.00",
//           "user_time": "3.50-4.30"
//       },
//       {
//           "actual": "of",
//           "expected": "of",
//           "matched": true,
//           "ref_time": "2.00-2.20",
//           "user_time": "4.30-4.70"
//       },
//       {
//           "actual": null,
//           "expected": "the",
//           "matched": false,
//           "ref_time": "2.20-2.20",
//           "user_time": null
//       },
//       {
//           "actual": "first",
//           "expected": "best",
//           "matched": false,
//           "ref_time": "2.20-2.40",
//           "user_time": "4.80-5.40"
//       },
//       {
//           "actual": "inventions",
//           "expected": "inventions",
//           "matched": true,
//           "ref_time": "2.40-3.40",
//           "user_time": "5.40-6.30"
//       },
//       {
//           "actual": "of",
//           "expected": "of",
//           "matched": true,
//           "ref_time": "3.40-3.60",
//           "user_time": "6.30-6.70"
//       },
//       {
//           "actual": null,
//           "expected": "humanity",
//           "matched": false,
//           "ref_time": "3.60-4.40",
//           "user_time": null
//       }
//   ]
// }

export default function SpeechAnalysisPage() {
  const { data: session } = useSession()
  const [transcript, setTranscript] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const [langCode, setLangCode] = useState("en-US")
  const [voice, setVoice] = useState("MALE")
  const [data, setData] = useState(null)
  const lang = {
    "en-IN": { "MALE": "en-IN-Standard-B", "FEMALE": "en-IN-Standard-A", "whisper": "en" },
    "en-US": { "MALE": "en-IN-Standard-B", "FEMALE": "en-IN-Standard-A", "whisper": "en" },
    "es-ES": { "MALE": "es-ES-Standard-B", "FEMALE": "es-ES-Standard-C", "whisper": "es" },
    "fr-FR": { "MALE": "fr-FR-Standard-B", "FEMALE": "fr-FR-Standard-C", "whisper": "fr" },
    "de-DE": { "MALE": "de-DE-Standard-B", "FEMALE": "de-DE-Standard-C", "whisper": "de" },
  }
  // const playSegment = (file: string, start: number, end: number) => {
  //   const audio = new Audio(file)

  //   audio.addEventListener('loadedmetadata', () => {
  //     audio.currentTime = start

  //     audio.play().then(() => {
  //       const duration = (end - start) * 1000
  //       setTimeout(() => audio.pause(), duration)
  //     }).catch((err) => {
  //       console.error("Playback error:", err)
  //     })
  //   })
  // }
  const playWholeAudio = (file: string) => {
    const audio = new Audio(file);
    audio.play().catch((err) => {
      console.error("Playback error:", err);
    });
  };
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        resolve(reader.result); 
      };
  
      reader.onerror = reject;
  
      reader.readAsDataURL(blob); 
    });
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
    // audio.play()


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
      formData.append('user', audioBlob, 'user_audio.wav')
      formData.append('reference', ttsBlob, 'ref_audio.wav')

      await axios.post('/api/save-audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const formData2 = new FormData()
      formData2.append('user', audioBlob, 'recording.wav')
      formData2.append('reference', ttsBlob, 'recording2.wav')
      formData2.append('language', langCode)

      try {
        const response = await axios.post('http://127.0.0.1:5001/compare-audio-whisper', formData2, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const audioB = await blobToBase64(audioBlob)
        const ttsB = await blobToBase64(ttsBlob)
        await axios.post('/api/feedAudio', {
          user_audio_base64: audioB,
          reference_audio_base64: ttsB,
          language: langCode,
          user_email: session?.user?.email || "phantomera.2000@gmail.com"
        });

        setTranscript(response.data.transcript)
        setData(response.data)
        const { num_matched, num_mispronounced, num_missing, num_extra } = response.data;
        let disorder = "Normal Speech or Mild Accent";

        if (num_mispronounced > num_missing && num_mispronounced > num_extra && num_mispronounced > 3) {
          disorder = "Articulation Disorder";
        } else if (num_missing > num_mispronounced && num_missing > num_extra && num_missing > 3) {
          disorder = "Apraxia of Speech";
        } else if (num_extra > 3) {
          disorder = "Fluency Disorder (e.g., Stuttering)";
        } else if (
          num_mispronounced >= 2 &&
          num_missing >= 2
        ) {
          disorder = "Phonological Disorder";
        }

        setData(prev => ({ ...prev, predicted_disorder: disorder }));
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
        <Button onClick={startRecording} disabled={isRecording} className="cursor-pointer">Start Recording</Button>
        <Button onClick={stopRecording} disabled={!isRecording} className="cursor-pointer">Stop Recording</Button>
      </div>
      {transcript && (
        <div className="p-4 rounded-xl shadow text-left">
          <h2 className="font-semibold mb-2">Transcript:</h2>
          <p>{transcript}</p>
        </div>
      )}
      {data && (
        <div className="p-4 rounded-xl shadow text-left mt-4 flex flex-col gap-4 justify-center items-center">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="space-x-2">
              <Button onClick={() => playWholeAudio("/ref_audio.wav")} className="cursor-pointer">Play Full Reference Audio</Button>
              <Button onClick={() => playWholeAudio("/user_audio.wav")} className="cursor-pointer">Play Full User Audio</Button>
            </div>
            <div className="text-m text-muted-foreground m-2">
              <span className="mr-4">✅ Correct: {data.num_matched}</span>
              <span className="mr-4">🗣️ Mispronounced: {data.num_mispronounced}</span>
              <span className="mr-4">⛔ Missing: {data.num_missing}</span>
              <span>➕ Extra: {data.num_extra}</span>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Actual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.word_alignment.map((item, idx) => {
                let rowClass = "text-black hover:text-black"; // force text color on hover too
                switch (item.status) {
                  case "ok":
                    rowClass += " bg-green-100 hover:bg-green-200";
                    break;
                  case "mispronounced":
                    rowClass += " bg-yellow-100 hover:bg-yellow-200";
                    break;
                  case "missing":
                    rowClass += " bg-red-100 hover:bg-red-200";
                    break;
                  case "extra":
                    rowClass += " bg-orange-100 hover:bg-orange-200";
                    break;
                  default:
                    rowClass += "";
                }

                return (
                  <TableRow key={idx} className={rowClass}>
                    <TableCell>
                      {item.status === "ok" && "✅ Matched"}
                      {item.status === "mispronounced" && "🔶 Mispronounced"}
                      {item.status === "missing" && "❌ Missing"}
                      {item.status === "extra" && "⚠️ Extra"}
                    </TableCell>
                    <TableCell>{item.expected ?? "—"}</TableCell>
                    <TableCell>{item.actual ?? "⛔ Missing"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {data.predicted_disorder && (
            <div className="text-lg font-semibold text-red-500 mt-2">
              🧠 Predicted Speech Disorder: {data.predicted_disorder}
            </div>
          )}

          {/* <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Expected</TableHead>
            <TableHead>Actual</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.word_alignment.map((item, idx) => (
            <TableRow key={idx}>
              <TableCell>{item.expected}</TableCell>
              <TableCell>{item.actual ?? "⛔ Missing"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table> */}
        </div>
      )}
    </div>
  )
}
