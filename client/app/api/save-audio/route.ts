import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(req: Request) {
  const formData = await req.formData()
  const userAudio = formData.get('user') as File
  const refAudio = formData.get('reference') as File

  if (!userAudio || !refAudio) {
    return new Response('Missing audio files', { status: 400 })
  }

  const userBuffer = Buffer.from(await userAudio.arrayBuffer())
  const refBuffer = Buffer.from(await refAudio.arrayBuffer())

  const userPath = path.join(process.cwd(), 'public', 'user_audio.wav')
  const refPath = path.join(process.cwd(), 'public', 'ref_audio.wav')

  await writeFile(userPath, userBuffer)
  await writeFile(refPath, refBuffer)

  return new Response(JSON.stringify({ message: 'Files saved successfully' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
