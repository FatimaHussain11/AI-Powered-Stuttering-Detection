"""
Train a RandomForest classifier to detect stuttering from MFCC features,
and save the resulting model to disk.

This replaces notebook cells 3, 4, and 5 (train/test split + model
training + evaluation + saving + verifying the save worked).

Run from the project root, e.g.:

    python src/train.py --dataset-path data/dataset.zip --model-path models/stutter_model.pkl

Or rely on the defaults / environment variables set in config.py:

    export DATASET_PATH=/path/to/your/dataset.zip
    export MODEL_PATH=/path/to/save/model.pkl
    python src/train.py

MODEL FILE SECURITY NOTE
-------------------------
joblib.dump/joblib.load (like pickle) can execute arbitrary code when
loading a file. That's fine for a model *you* trained and saved
yourself, but never load a .pkl/.joblib file you downloaded from
somewhere untrusted — treat it the same as running an unknown script.
For this reason model files are also excluded from the repo via
.gitignore rather than committed.
"""

import argparse
import os

import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.utils import shuffle

import config
from feature_extraction import build_dataset


def parse_args():
    parser = argparse.ArgumentParser(description="Train stutter detection model")
    parser.add_argument(
        "--dataset-path",
        default=config.DATASET_PATH,
        help="Path to the dataset zip file (default: %(default)s, or set DATASET_PATH env var)",
    )
    parser.add_argument(
        "--model-path",
        default=config.MODEL_PATH,
        help="Where to save the trained model (default: %(default)s, or set MODEL_PATH env var)",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    # Step 1: load audio, extract MFCC features, and label by folder name.
    X, y = build_dataset(args.dataset_path)

    # Step 2: shuffle and split into train/test sets.
    X, y = shuffle(X, y, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print("X_train:", X_train.shape)
    print("X_test:", X_test.shape)

    # Step 3: train the classifier.
    model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    # Step 4: evaluate.
    y_pred = model.predict(X_test)
    print("Accuracy:", accuracy_score(y_test, y_pred) * 100)
    print(confusion_matrix(y_test, y_pred))

    # Step 5: save the model, creating the output directory if needed.
    os.makedirs(os.path.dirname(args.model_path) or ".", exist_ok=True)
    joblib.dump(model, args.model_path)
    print(f"Model saved to: {args.model_path}")

    # Step 6: verify the save actually worked.
    print("Save verified:", os.path.exists(args.model_path))


if __name__ == "__main__":
    main()
