from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import time
import uuid
import librosa
import numpy as np
import joblib

app = Flask(__name__)

# ── CORS ──────────────────────────────────────────────────────────
# Restrict this to the actual domain(s) that serve your frontend once
# you know them (e.g. your Hugging Face Space / GitHub Pages URL).
# Using "*" (allow-all) is fine for local testing only.
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")
CORS(app, origins=ALLOWED_ORIGINS.split(",") if ALLOWED_ORIGINS != "*" else "*")

# ── Upload settings ───────────────────────────────────────────────
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"wav", "mp3"}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB per request, adjust as needed

app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# Load trained model once
model = joblib.load("stutter_model.pkl")


def extract_features(file_path):
    """Same feature extraction used during training: 40 MFCCs averaged over time."""
    try:
        audio, sr = librosa.load(file_path, duration=5)

        if len(audio) == 0:
            return None

        mfcc = librosa.feature.mfcc(
            y=audio,
            sr=sr,
            n_mfcc=40
        )

        features = np.mean(mfcc.T, axis=0)
        return features

    except Exception as e:
        print("Feature Error:", e)
        return None


@app.route("/")
def home():
    return "Speech Detection AI Backend Running ✅"


@app.route("/api/predict", methods=["POST"])
def predict():
    filepath = None
    try:
        file = request.files.get("file")

        if not file or file.filename == "":
            return jsonify({"error": "No file uploaded"}), 400

        # Validate extension before touching the filesystem
        if not allowed_file(file.filename):
            return jsonify({"error": "Unsupported file type. Only .wav and .mp3 are allowed."}), 400

        # Sanitize the filename and make it unique to prevent path
        # traversal and filename collisions between concurrent users.
        safe_name = secure_filename(file.filename)
        ext = safe_name.rsplit(".", 1)[1].lower()
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_name)

        file.save(filepath)

        start_time = time.time()

        # Extract MFCC features
        features = extract_features(filepath)

        if features is None:
            return jsonify({"error": "Feature extraction failed"}), 500

        # Model Prediction
        prediction = model.predict([features])[0]
        probabilities = model.predict_proba([features])[0]

        processing_ms = int((time.time() - start_time) * 1000)

        normal_prob = round(probabilities[0] * 100, 2)
        stutter_prob = round(probabilities[1] * 100, 2)

        confidence = round(max(normal_prob, stutter_prob), 2)

        result = {
            "isNormal": bool(prediction == 0),
            "confidence": confidence,
            "fluency": confidence,
            "processingMs": processing_ms,
            "normalProb": normal_prob,
            "stutterProb": stutter_prob
        }

        return jsonify(result)

    except Exception as e:
        # Avoid leaking internal details (stack traces, paths) to the client
        print("Prediction error:", e)
        return jsonify({"error": "Something went wrong while processing the file."}), 500

    finally:
        # clean up uploaded temp file
        try:
            if filepath and os.path.exists(filepath):
                os.remove(filepath)
        except Exception:
            pass


if __name__ == "__main__":
    # debug=False is required for any public/shared deployment — Flask's
    # debugger allows remote code execution if it's ever reachable.
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug_mode, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
