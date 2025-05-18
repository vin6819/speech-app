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
from difflib import get_close_matches, SequenceMatcher
import traceback
import librosa
import numpy as np

app = Flask(__name__)
CORS(app)
model = whisper.load_model("base")

credentials_path = "google-credentials.json"

if os.getenv("GOOGLE_CREDENTIALS_JSON"):
    with open(credentials_path, "w") as f:
        f.write(os.getenv("GOOGLE_CREDENTIALS_JSON"))

    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

# os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "attendance-441817-cb17d8a87180.json"

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

def extract_mfcc_segment(audio, sr, start_time, end_time):
    start_sample = int(start_time * sr)
    end_sample = int(end_time * sr)
    segment = audio[start_sample:end_sample]
    mfcc = librosa.feature.mfcc(y=segment, sr=sr, n_mfcc=13)
    return mfcc.T

def compare_mfccs(mfcc1, mfcc2):
    from scipy.spatial.distance import cdist
    from fastdtw import fastdtw
    distance, _ = fastdtw(mfcc1, mfcc2, dist=lambda x, y: np.linalg.norm(x - y))
    return distance


@app.route('/compare-audio-whisper', methods=['POST'])
def compare_audio_whisper():
    if 'reference' not in request.files or 'user' not in request.files:
        return jsonify({"error": "Both reference and user audio files are required"}), 400

    reference_file = request.files['reference']
    user_file = request.files['user']
    language = request.form.get('language', None)
    print(language)

    # Save files temporarily
    ref_path = "ref_temp.wav"
    user_path = "user_temp.wav"
    user_converted_path = "user_converted.wav"
    reference_file.save(ref_path)
    user_file.save(user_path)
    convert_audio_to_linear16(ref_path, ref_path)
    convert_audio_to_linear16(user_path, user_converted_path)

    try:
        ref_words = get_word_timestamps_google(ref_path, language)
        user_words = get_word_timestamps_google(user_converted_path, language)
    except Exception as e:
        print("Error:", traceback.format_exc())
        return jsonify({"error": "STT transcription failed", "details": str(e)}), 500

    ref_text = [w[0].lower() for w in ref_words]
    user_text = [w[0].lower() for w in user_words]

    matcher = SequenceMatcher(None, ref_text, user_text)
    alignment = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal' or tag == 'replace':
            for i, j in zip(range(i1, i2), range(j1, j2)):
                alignment.append((ref_words[i], user_words[j]))
        elif tag == 'delete':
            for i in range(i1, i2):
                alignment.append((ref_words[i], None))
        elif tag == 'insert':
            for j in range(j1, j2):
                alignment.append((None, user_words[j]))

    # Load audio for MFCC analysis
    ref_audio, sr = librosa.load(ref_path, sr=16000)
    user_audio, _ = librosa.load(user_converted_path, sr=16000)

    results = []
    threshold = 7000
    for ref_entry, user_entry in alignment:
        if ref_entry and user_entry:
            ref_word, rs, re = ref_entry
            user_word, us, ue = user_entry
            matched = ref_word.lower() == user_word.lower()

            # Get MFCC and DTW score
            ref_mfcc = extract_mfcc_segment(ref_audio, sr, rs, re)
            user_mfcc = extract_mfcc_segment(user_audio, sr, us, ue)
            dtw_score = compare_mfccs(ref_mfcc, user_mfcc)

            results.append({
                "expected": ref_word,
                "actual": user_word,
                "ref_time": f"{rs:.2f}-{re:.2f}",
                "user_time": f"{us:.2f}-{ue:.2f}",
                "matched": matched,
                "dtw_score": dtw_score,
                "status": "ok" if matched and dtw_score < threshold else "mispronounced"
            })
        elif ref_entry and not user_entry:
            ref_word, rs, re = ref_entry
            results.append({
                "expected": ref_word,
                "actual": None,
                "ref_time": f"{rs:.2f}-{re:.2f}",
                "user_time": None,
                "matched": False,
                "dtw_score": None,
                "status": "missing"
            })
        elif user_entry and not ref_entry:
            user_word, us, ue = user_entry
            results.append({
                "expected": None,
                "actual": user_word,
                "ref_time": None,
                "user_time": f"{us:.2f}-{ue:.2f}",
                "matched": False,
                "dtw_score": None,
                "status": "extra"
            })

    return jsonify({
        "word_alignment": results,
        "num_matched": sum(1 for r in results if r["status"] == "ok"),
        "num_mispronounced": sum(1 for r in results if r["status"] == "mispronounced"),
        "num_missing": sum(1 for r in results if r["status"] == "missing"),
        "num_extra": sum(1 for r in results if r["status"] == "extra"),
        "total": len(results)
    })

# @app.route('/compare-audio-whisper', methods=['POST'])
# def compare_audio_whisper():
#     if 'reference' not in request.files or 'user' not in request.files:
#         return jsonify({"error": "Both reference and user audio files are required"}), 400
#     print(request)
#     reference_file = request.files['reference']
#     user_file = request.files['user']
#     language = request.form.get('language', None)

#     ref_path = "ref_temp.wav"
#     user_path = "user_temp.wav"
#     reference_file.save(ref_path)
#     user_file.save(user_path)
#     user_converted_path = "user_converted.wav"
#     convert_audio_to_linear16(ref_path, ref_path)
#     convert_audio_to_linear16(user_path, user_converted_path)
#     # Transcribe with Whisper
#     try:
#         ref_words = get_word_timestamps_google(ref_path, language)
#         user_words = get_word_timestamps_google(user_converted_path, language)
#     except Exception as e:
#         print("Error:", traceback.format_exc())
#         return jsonify({"error": "STT transcription failed", "details": str(e)}), 500
#     print(ref_words)
#     print(user_words)
#     # Extract word texts
#     ref_text = [word[0].lower() for word in ref_words]
#     user_text = [word[0].lower() for word in user_words]

#     # Align words using SequenceMatcher
#     matcher = SequenceMatcher(None, ref_text, user_text)
#     matching_blocks = matcher.get_matching_blocks()

#     results = []
#     used_user_indices = set()

#     for i, (ref_word, ref_start, ref_end) in enumerate(ref_words):
#         best_match = None
#         best_score = 0

#         for j, (user_word, user_start, user_end) in enumerate(user_words):
#             if j in used_user_indices:
#                 continue
#             score = SequenceMatcher(None, ref_word.lower(), user_word.lower()).ratio()
#             if score > best_score:
#                 best_score = score
#                 best_match = (j, user_word, user_start, user_end)

#         if best_match and best_score > 0.4:  # Allow mismatches, threshold ~40%
#             j, user_word, user_start, user_end = best_match
#             used_user_indices.add(j)
#             results.append({
#                 "expected": ref_word,
#                 "actual": user_word,
#                 "matched": ref_word.lower() == user_word.lower(),
#                 "ref_time": f"{ref_start:.2f}-{ref_end:.2f}",
#                 "user_time": f"{user_start:.2f}-{user_end:.2f}"
#             })
#         else:
#             # No close match found
#             results.append({
#                 "expected": ref_word,
#                 "actual": None,
#                 "matched": False,
#                 "ref_time": f"{ref_start:.2f}-{ref_end:.2f}",
#                 "user_time": None
#             })
#     return jsonify({
#         "word_alignment": results,
#         "num_matched": sum(r["matched"] for r in results),
#         "total": len(results)
#     })


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
    speaking_rate = data.get('speakingRate', 0.5)  # Speed: 0.25–4.0
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



