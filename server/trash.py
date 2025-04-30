import subprocess
import re
from fastdtw import fastdtw
from scipy.spatial.distance import euclidean
from metaphone import doublemetaphone
from textgrid import TextGrid

# Path configurations
ALIGN_INPUT_DIR = "align_input"
ALIGN_OUTPUT_DIR = "align_output"
DICTIONARY = "english_us_arpa"
LANGUAGE = "english"

def get_word_timing(textgrid_path):
    tg = TextGrid.fromFile(textgrid_path)
    word_tier = tg.getFirst("words")
    return [(interval.mark, interval.minTime, interval.maxTime) for interval in word_tier if interval.mark.strip()]

@app.route('/compare-audio', methods=['POST'])
def compare_audio():
#     # Ensure input and output dirs exist
    os.makedirs(ALIGN_INPUT_DIR, exist_ok=True)
    os.makedirs(ALIGN_OUTPUT_DIR, exist_ok=True)

#     # Save uploaded files
    reference_file = request.files['reference']
    user_file = request.files['user']
    transcript = request.form['transcript']

    reference_path = os.path.join(ALIGN_INPUT_DIR, "reference.wav")
    user_path = os.path.join(ALIGN_INPUT_DIR, "user.wav")
    transcript_path = os.path.join(ALIGN_INPUT_DIR, "reference.txt")

    reference_file.save(reference_path)
    user_file.save(user_path)
    with open(transcript_path, "w") as f:
        f.write(transcript.strip().lower())

#     # Run MFA alignment
    try:
        subprocess.run([
            "mfa", "align",
            ALIGN_INPUT_DIR,
            DICTIONARY,
            LANGUAGE,
            ALIGN_OUTPUT_DIR,
            "--clean", "--overwrite"
        ], check=True)
    except subprocess.CalledProcessError as e:
        return jsonify({"error": "MFA alignment failed", "details": str(e)}), 500

#     # Parse TextGrids
    try:
        ref_words = get_word_timing(os.path.join(ALIGN_OUTPUT_DIR, "reference.TextGrid"))
        user_words = get_word_timing(os.path.join(ALIGN_OUTPUT_DIR, "user.TextGrid"))
    except Exception as e:
        return jsonify({"error": "Failed to read TextGrids", "details": str(e)}), 500

#     # Compare words
    results = []
    for (ref_word, ref_start, ref_end), (user_word, user_start, user_end) in zip(ref_words, user_words):
        matched = ref_word.lower() == user_word.lower()
        results.append({
            "expected": ref_word,
            "actual": user_word,
            "matched": matched,
            "expected_time": f"{ref_start:.2f}-{ref_end:.2f}",
            "user_time": f"{user_start:.2f}-{user_end:.2f}"
        })

    return jsonify(results)



# Load W# Function to compare words based on case insensitivity and phonetic similarity
def compare_words(actual, expected):
    # Convert to lowercase for case insensitivity
    actual = actual.lower()
    expected = expected.lower()
    
    # Use double metaphone for phonetic comparison
    actual_metaphone = doublemetaphone(actual)[0]
    expected_metaphone = doublemetaphone(expected)[0]
    
    # Use Levenshtein distance for string similarity (if necessary)
    similarity = SequenceMatcher(None, actual, expected).ratio()
    
    # Compare phonetic codes
    if actual_metaphone == expected_metaphone:
        return True
    
    # If Levenshtein similarity is above a certain threshold (e.g., 0.8), consider it a match
    if similarity > 0.8:
        return True
    
    return False

# Function to extract word timestamps using Whisper model
def get_word_timestamps(audio_path):
    result = model.transcribe(audio_path, word_timestamps=True)
    words = []
    for segment in result['segments']:
        for word in segment.get("words", []):
            words.append((word['word'], word['start'], word['end']))
    return words

@app.route('/compare-audio-whisper2', methods=['POST'])
def compare_audio_whisper2():
    if 'reference' not in request.files or 'user' not in request.files or 'transcript' not in request.form:
        return jsonify({"error": "Reference audio, user audio, and transcript are all required"}), 400

    reference_file = request.files['reference']
    user_file = request.files['user']
    intended_text = request.form['transcript'].strip()

    ref_path = "ref_temp.wav"
    user_path = "user_temp.wav"
    reference_file.save(ref_path)
    user_file.save(user_path)

    try:
        ref_words = get_word_timestamps(ref_path)
        user_words = get_word_timestamps(user_path)
    except Exception as e:
        return jsonify({"error": "Whisper transcription failed", "details": str(e)}), 500

    if not user_words or not ref_words:
        return jsonify({"error": "One of the transcriptions is empty"}), 400

    # Normalize text for better matching (convert to lowercase)
    intended_tokens = re.findall(r"\b\w+\b", intended_text.lower())
    user_tokens = [word[0].lower() for word in user_words]

    # Word Matching: Compare intended transcript vs actual spoken
    matcher = SequenceMatcher(None, intended_tokens, user_tokens)
    word_matches = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        for i, j in zip(range(i1, i2), range(j1, j2)):
            if i < len(intended_tokens) and j < len(user_words):
                expected = intended_tokens[i]
                actual, start, end = user_words[j]
                matched = compare_words(expected, actual)  # Matching words based on phonetic similarity and Levenshtein distance
                word_matches.append({
                    "expected": expected,
                    "actual": actual,
                    "matched": matched,
                    "user_time": f"{start:.2f}-{end:.2f}"
                })

    # Timing Comparison with DTW
    ref_vec = [(start, 0) for _, start, _ in ref_words]
    user_vec = [(start, 0) for _, start, _ in user_words]

    # Pad vectors if needed
    max_len = max(len(ref_vec), len(user_vec))
    ref_vec.extend([(0, 0)] * (max_len - len(ref_vec)))
    user_vec.extend([(0, 0)] * (max_len - len(user_vec)))

    try:
        distance, path = fastdtw(ref_vec, user_vec, dist=euclidean)
    except Exception as e:
        return jsonify({"error": "DTW failed", "details": str(e)}), 500

    dtw_result = []
    for i, j in path:
        if i < len(ref_words) and j < len(user_words):
            ref_word, ref_start, ref_end = ref_words[i]
            user_word, user_start, user_end = user_words[j]
            dtw_result.append({
                "expected": ref_word,
                "actual": user_word,
                "ref_time": f"{ref_start:.2f}-{ref_end:.2f}",
                "user_time": f"{user_start:.2f}-{user_end:.2f}"
            })

    return jsonify({
        "transcript_match": {
            "match_percentage": round(100 * sum(w["matched"] for w in word_matches) / max(len(word_matches), 1), 2),
            "word_alignment": word_matches
        },
        "timing_alignment": {
            "dtw_distance": distance,
            "word_timing_path": dtw_result
        }
    })





#######################################

def get_word_timestamps(audio_path, language=None):
    # Get transcriptions with word-level timestamps using Whisper
    result = model.transcribe(audio_path, word_timestamps=True, language=language)
    words = []
    for segment in result['segments']:
        for word in segment.get("words", []):
            words.append((word['word'], word['start'], word['end']))  # Collecting words and their start/end times
    return words

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

    # Transcribe with Whisper
    try:
        ref_words = get_word_timestamps(ref_path, language)
        user_words = get_word_timestamps(user_path, language)
    except Exception as e:
        return jsonify({"error": "Whisper transcription failed", "details": str(e)}), 500

    # Extract word texts
    ref_text = [word[0].lower() for word in ref_words]
    user_text = [word[0].lower() for word in user_words]

    # Align words using SequenceMatcher
    matcher = SequenceMatcher(None, ref_text, user_text)
    results = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        for i, j in zip(range(i1, i2), range(j1, j2)):
            if i < len(ref_words) and j < len(user_words):
                ref_word, ref_start, ref_end = ref_words[i]
                user_word, user_start, user_end = user_words[j]
                matched = ref_word.lower() == user_word.lower()
                results.append({
                    "expected": ref_word,
                    "actual": user_word,
                    "matched": matched,
                    "ref_time": f"{ref_start:.2f}-{ref_end:.2f}",
                    "user_time": f"{user_start:.2f}-{user_end:.2f}"
                })

    return jsonify({
        "word_alignment": results,
        "num_matched": sum(r["matched"] for r in results),
        "total": len(results)
    })
