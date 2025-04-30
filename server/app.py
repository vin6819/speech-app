from flask import Flask, request, jsonify
import whisper
import os
from google.cloud import texttospeech, speech
from difflib import SequenceMatcher
from flask_cors import CORS
from flask import send_file
import io
import traceback
from pydub import AudioSegment
import subprocess
from difflib import get_close_matches

app = Flask(__name__)
CORS(app)
model = whisper.load_model("base")



# Set up Google Cloud TTS
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "attendance-441817-cb17d8a87180.json"
gcloud_tts_client = texttospeech.TextToSpeechClient()
speech_client = speech.SpeechClient()

########################################################################################################################################################
  # You can try "small" or "medium" too
def convert_audio_to_linear16(input_path, output_path):
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_channels(1).set_frame_rate(16000)
    audio.export(output_path, format="wav", parameters=["-acodec", "pcm_s16le"])


def get_word_timestamps_google(audio_path, language="en-US"):
    with open(audio_path, "rb") as audio_file:
        content = audio_file.read()

    audio = speech.RecognitionAudio(content=content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        language_code=language,
        enable_word_time_offsets=True,
        # sample_rate_hertz=48000,
        model="default",
        use_enhanced=True,
    )

    response = speech_client.recognize(config=config, audio=audio)
    word_timestamps = []

    for result in response.results:
        alternative = result.alternatives[0]
        for word_info in alternative.words:
            word = word_info.word
            start = word_info.start_time.total_seconds()
            end = word_info.end_time.total_seconds()
            word_timestamps.append((word, start, end))

    return word_timestamps

@app.route('/compare-audio-whisper', methods=['POST'])
def compare_audio_whisper():
    if 'reference' not in request.files or 'user' not in request.files:
        return jsonify({"error": "Both reference and user audio files are required"}), 400
    print(request)
    reference_file = request.files['reference']
    user_file = request.files['user']
    language = request.form.get('language', None)

    ref_path = "ref_temp.wav"
    user_path = "user_temp.wav"
    reference_file.save(ref_path)
    user_file.save(user_path)
    user_converted_path = "user_converted.wav"
    convert_audio_to_linear16(ref_path, ref_path)
    convert_audio_to_linear16(user_path, user_converted_path)
    # Transcribe with Whisper
    try:
        ref_words = get_word_timestamps_google(ref_path, language)
        user_words = get_word_timestamps_google(user_converted_path, language)
    except Exception as e:
        print("Error:", traceback.format_exc())
        return jsonify({"error": "STT transcription failed", "details": str(e)}), 500
    print(ref_words)
    print(user_words)
    # Extract word texts
    ref_text = [word[0].lower() for word in ref_words]
    user_text = [word[0].lower() for word in user_words]

    # Align words using SequenceMatcher
    matcher = SequenceMatcher(None, ref_text, user_text)
    matching_blocks = matcher.get_matching_blocks()

    results = []
    used_user_indices = set()

    for i, (ref_word, ref_start, ref_end) in enumerate(ref_words):
        best_match = None
        best_score = 0

        for j, (user_word, user_start, user_end) in enumerate(user_words):
            if j in used_user_indices:
                continue
            score = SequenceMatcher(None, ref_word.lower(), user_word.lower()).ratio()
            if score > best_score:
                best_score = score
                best_match = (j, user_word, user_start, user_end)

        if best_match and best_score > 0.4:  # Allow mismatches, threshold ~40%
            j, user_word, user_start, user_end = best_match
            used_user_indices.add(j)
            results.append({
                "expected": ref_word,
                "actual": user_word,
                "matched": ref_word.lower() == user_word.lower(),
                "ref_time": f"{ref_start:.2f}-{ref_end:.2f}",
                "user_time": f"{user_start:.2f}-{user_end:.2f}"
            })
        else:
            # No close match found
            results.append({
                "expected": ref_word,
                "actual": None,
                "matched": False,
                "ref_time": f"{ref_start:.2f}-{ref_end:.2f}",
                "user_time": None
            })
    return jsonify({
        "word_alignment": results,
        "num_matched": sum(r["matched"] for r in results),
        "total": len(results)
    })


########################################################################################################################################################








@app.route('/google-stt', methods=['POST'])
def google_speech_to_text():
    if 'audio' not in request.files:
        return jsonify({"error": "Audio file is required"}), 400

    audio_file = request.files['audio']
    audio_content = audio_file.read()
    # audio_filename = f"static/{uuid.uuid4()}.mp3"
    # with open(audio_filename, "wb") as out:
    #     out.write(audio_content)

    # Get the language code from form data, default to English
    language_code = request.form.get('language_code', 'en-US')

    audio = speech.RecognitionAudio(content=audio_content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED,
        sample_rate_hertz=48000,
        language_code=language_code
    )

    response = speech_client.recognize(config=config, audio=audio)

    transcript = ""
    for result in response.results:
        transcript += result.alternatives[0].transcript
    print(transcript)
    return jsonify({
        "transcript": transcript,
        "language_code": language_code
    })







# Endpoint 3: Generate correct pronunciation audio
@app.route('/tts', methods=['POST'])
def generate_tts():
    data = request.get_json()
    print(data)
    text = data['text']
    
    # Customizing Voice & Audio Configuration
    voice = data.get('voice', 'en-US-Wavenet-D')  # Default to American English voice
    language_code = data.get('languageCode', 'en-US')
    gender = data.get('ssmlGender', 'NEUTRAL')  # Options: MALE, FEMALE, NEUTRAL
    speaking_rate = data.get('speakingRate', 0.6)  # Speed: 0.25–4.0
    pitch = data.get('pitch', 0.0)  # Pitch: -20.0 to 20.0
    volume_gain = data.get('volumeGainDb', 0.0)  # Volume: -96.0 to 16.0

    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice_params = texttospeech.VoiceSelectionParams(
        language_code=language_code,
        name=voice,  # Choose specific voice (e.g., "en-GB-Wavenet-A" for British English)
        ssml_gender=texttospeech.SsmlVoiceGender[gender.upper()]  # MALE, FEMALE, NEUTRAL
    )
    
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=speaking_rate,  # Adjust speaking rate (speed)
        pitch=pitch,  # Adjust pitch
        volume_gain_db=volume_gain  # Adjust volume gain
    )
    
    # Request TTS from Google Cloud
    response = gcloud_tts_client.synthesize_speech(
        input=synthesis_input, 
        voice=voice_params, 
        audio_config=audio_config
    )

    return send_file(
        io.BytesIO(response.audio_content),
        mimetype='audio/mpeg',
        as_attachment=False,
        download_name='output.mp3'
    )

    # # Save the audio to a file
    # audio_filename = f"static/{uuid.uuid4()}.mp3"
    # with open(audio_filename, "wb") as out:
    #     out.write(response.audio_content)

    # return jsonify({"audio_url": f"/{audio_filename}"})

if __name__ == '__main__':
    app.run(debug=True)



