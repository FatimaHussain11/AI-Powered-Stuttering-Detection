"""
Central configuration.

SECURITY / PORTABILITY NOTE
----------------------------
Your original notebook hardcoded an absolute path like:

    /content/drive/MyDrive/Dataset-20260613T045948Z-3-001.zip

Two problems with that:
1. It only works inside Google Colab with Drive mounted — breaks for
   anyone else who clones the repo (or for you, on another machine).
2. It leaks personal info into a public GitHub repo: your Drive folder
   naming, the exact upload timestamp encoded in the filename, and
   implicitly that you use Google Drive for this project.

Fix: never hardcode personal paths in code. Read them from environment
variables (with sane local defaults) or CLI arguments instead. That way
the repo only ever contains code, never your machine-specific paths.
"""

import os

# Path to the dataset zip file. Override by setting the DATASET_PATH
# environment variable, or by passing --dataset-path on the CLI.
DATASET_PATH = os.environ.get("DATASET_PATH", "data/dataset.zip")

# Where the trained model gets saved. Override with MODEL_PATH env var
# or --model-path on the CLI.
MODEL_PATH = os.environ.get("MODEL_PATH", "models/stutter_model.pkl")

# Audio settings
DURATION_SECONDS = 5
N_MFCC = 40
