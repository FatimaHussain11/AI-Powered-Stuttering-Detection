"""
Handles reading the dataset zip and turning audio files into MFCC features.

This replaces notebook cells 1, 2, and 6. Your original notebook had two
versions of this logic:

  - Cells 1-2 used two separate variables, `normal_path` and `stutter_path`,
    but both were set to the SAME zip file. That means "normal" and
    "stutter" samples were both being read from one file and labeled
    0 / 1 in a way that didn't actually correspond to real folders —
    a real bug, not just a style issue.

  - Cell 6 fixed this properly: it reads ONE dataset zip and assigns the
    label by looking at the folder name inside the zip ("Stutter" vs
    "Normal"). That's the correct approach, so this file is built on
    cell 6's logic.

AUDIO FILE SAFETY NOTE
-----------------------
We only ever open zip entries in-memory via `zip_ref.open(...)` and hand
a file-like object to librosa — we never call `extractall()` and never
write attacker-controlled filenames to disk. That's important because
zip files can contain path-traversal ("zip slip") entries like
`../../etc/passwd`. If you ever change this code to extract files to
disk, sanitize each filename first (reject any entry whose resolved
path escapes the target directory) before writing it.
"""

import os
import zipfile

import librosa
import numpy as np
from tqdm import tqdm

from config import DURATION_SECONDS, N_MFCC


def extract_features(file_path_or_object):
    """Load an audio file (path or file-like object) and return its mean MFCC vector."""
    try:
        audio, sr = librosa.load(file_path_or_object, duration=DURATION_SECONDS)

        if len(audio) == 0:
            print(f"Warning: empty audio signal for {file_path_or_object}. Skipping.")
            return None

        mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=N_MFCC)
        return np.mean(mfcc.T, axis=0)

    except Exception as e:
        print(f"Error extracting features from {file_path_or_object}: {e}")
        return None


def build_dataset(dataset_path):
    """
    Read the dataset zip, extract MFCC features for every audio file, and
    label each sample by its folder name ("Stutter" -> 1, "Normal" -> 0).

    Returns (X, y) as numpy arrays.
    """
    X, y = [], []

    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset zip not found at: {dataset_path}")

    with zipfile.ZipFile(dataset_path, "r") as zip_ref:
        namelist = zip_ref.namelist()

        folders = {n.split("/")[1] for n in namelist if "/" in n and len(n.split("/")) > 1}
        print("Folders found in zip:", folders)

        empty_count = 0
        for file_name in tqdm(namelist, desc="Processing Audio"):
            if not file_name.endswith((".wav", ".mp3", ".flac", ".ogg")) or file_name.endswith("/"):
                continue

            if "Stutter" in file_name:
                label = 1
            elif "Normal" in file_name:
                label = 0
            else:
                continue  # skip files not in a recognized folder

            with zip_ref.open(file_name) as audio_file_in_zip:
                features = extract_features(audio_file_in_zip)

            if features is not None:
                X.append(features)
                y.append(label)
            else:
                empty_count += 1

        print(f"Skipped {empty_count} empty/unreadable files")

    X = np.array(X)
    y = np.array(y)
    print("Feature matrix:", X.shape)
    print("Labels:", y.shape)
    if len(y) > 0:
        print("Class distribution:", np.bincount(y))

    return X, y
