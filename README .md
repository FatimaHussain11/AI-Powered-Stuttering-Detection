# 🌊🧠 SpeakFlow AI

<h3 align="center">AI-Powered Speech Stuttering Detection System</h3>

<p align="center">
An intelligent full-stack web application that analyzes speech recordings and detects whether the speech is <strong>Fluent</strong> or <strong>Stuttered</strong> using Machine Learning.
</p>

<p align="center">
<strong>SpeakFlow AI</strong> is an AI-powered web app that detects speech stuttering using MFCC feature extraction and a Random Forest classifier, providing confidence and fluency scores for uploaded or recorded audio. Built with Flask, Scikit-learn, and Librosa, it also includes user authentication, an admin dashboard, and PDF/CSV export features.
</p>

<p align="center">

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-Backend-black?logo=flask)
![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-Random%20Forest-orange?logo=scikitlearn)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Completed-success)

</p>

---

## 📖 Overview

SpeakFlow AI is an AI-powered speech analysis platform that classifies uploaded or recorded speech as **Fluent Speech** or **Stuttered Speech**.

The system extracts **Mel-Frequency Cepstral Coefficients (MFCCs)** from speech audio and uses a trained **Random Forest Machine Learning model** to predict speech fluency with confidence scores.

This project was developed as an academic Machine Learning project for the **Bachelor of Software Engineering** program at **The University of Faisalabad**.

---
## ✨ Features

- 🎙 Upload speech audio (WAV/MP3)
- 🎤 Record audio directly from the browser
- 🧠 AI-powered stuttering detection
- 📊 Confidence score for every prediction
- 📈 Fluency score calculation
- 📄 Generate PDF reports
- 🕑 Analysis history
- 👤 User authentication
- 🔐 Profile management
- 🛡 Admin dashboard
- 📊 Analytics charts
- 📁 Export analysis to CSV
- 🌙 Dark Mode support
- 📱 Fully responsive user interface

---

## 🏗 Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Chart.js
- jsPDF
- Font Awesome
- Google Fonts

### Backend

- Python
- Flask
- Flask-CORS
- Librosa
- NumPy
- Joblib

### Machine Learning

- Scikit-learn
- Random Forest Classifier
- MFCC Feature Extraction

---

## ⚙ How It Works

1. User uploads or records speech.
2. Audio is preprocessed.
3. MFCC features are extracted using Librosa.
4. Features are passed to the trained Random Forest model.
5. The system predicts:
   - ✅ Fluent Speech
   - ⚠ Stuttered Speech
6. Confidence score and fluency score are displayed.
7. The result can be downloaded as a PDF report.

---

## 📁 Project Structure

```text
SpeakFlow-AI/

├── app.py
├── stutter_model.pkl
├── requirements.txt
│
├── index.html
├── style.css
├── script.js
│
├── login.html
├── login.css
├── login.js
│
├── signup.html
├── signup.css
├── signup.js
│
├── admin.html
├── admin.css
├── admin.js
│
├── session.js
│
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/Earwigmoth10/SpeakFlow-AI.git
cd SpeakFlow-AI
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Start Flask Backend

```bash
python app.py
```

The backend will start at

```
http://127.0.0.1:5000
```

### 4. Start Frontend

```bash
python -m http.server 5500
```

Open

```
http://localhost:5500/index.html
```

---

## 📊 Model Information

| Feature | Details |
|---------|---------|
| Algorithm | Random Forest |
| Feature Extraction | 40 MFCC Features |
| Library | Scikit-learn |
| Audio Processing | Librosa |
| Output Classes | Fluent Speech / Stuttered Speech |

---

## 📂 Dataset

This model was trained using publicly available speech datasets collected from multiple sources.

### 🗣 Stuttering Speech Dataset

**UCLASS Stuttered Speech Clips (SEP-28k Format)**

https://www.kaggle.com/datasets/vudominhgiang/uclass-stuttered-speech-clips-sep-28k-format

### 🎤 Fluent Speech Dataset

**Mozilla Common Voice**

https://commonvoice.mozilla.org/

The datasets were preprocessed and combined to create a binary classification dataset for distinguishing between **Fluent Speech** and **Stuttered Speech**.

> **Note:** The datasets are **not included** in this repository. Please obtain them from their official sources and comply with their respective licenses before use.

---

## 📸 Application Preview

Add screenshots inside a folder named:

```
screenshots/
```

Example:

```
screenshots/

landing.png
analysis.png
results.png
history.png
login.png
admin-dashboard.png
```

Then display them like this:

| Landing Page | Audio Analysis |
|--------------|----------------|
<img width="878" height="405" alt="Capture" src="https://github.com/user-attachments/assets/c4c4c76b-91db-46b9-839c-39d340e8ca04" />  | <img width="240" height="402" alt="10" src="https://github.com/user-attachments/assets/dd6649d5-1ed3-4135-b831-3a9cea700058" />

| Results | History |
|----------|----------|
<img width="279" height="400" alt="9" src="https://github.com/user-attachments/assets/4e52e33f-ce4a-4d68-b705-fcf1b6a520dc" />  | <img width="668" height="341" alt="2" src="https://github.com/user-attachments/assets/b71a9f87-98c7-4929-b715-57c5e0dbed70" />


| Login | Admin Dashboard |
|-------|-----------------|
<img width="417" height="342" alt="3" src="https://github.com/user-attachments/assets/7a10bba5-5190-424f-a65c-22c956934800" />
 | <img width="487" height="119" alt="5" src="https://github.com/user-attachments/assets/bfd785e5-6d50-49c2-a8a0-8fcf592a0cc6" />


---

## 🔐 Demo Authentication

This project stores authentication and session information in browser **Local Storage** for demonstration purposes.

It does **not** use:

- Database authentication
- Password hashing
- JWT authentication

Therefore, this project is intended for **educational and portfolio purposes only**.

---

## 🤗 Hugging Face

### 📦 Model Repository

https://huggingface.co/earwigmoth/stuttering-detection

Contains:

- Trained Random Forest model
- Backend source code
- Documentation
- Requirements

### 🌐 Static Space

https://huggingface.co/spaces/earwigmoth/stuttering-detection-classifier

Contains:

- Complete frontend interface
- User Interface demonstration
- Portfolio showcase

> **Note:** The Static Space is intended to showcase the application's frontend. It does not perform live machine learning inference.

---

## 🎯 Future Improvements

- Deep Learning model (CNN/LSTM)
- Real-time speech streaming
- Cloud deployment
- User accounts with database integration
- Model optimization
- Multi-language speech support
- Mobile application

---

## 👩‍💻 Author

**Laiba Khan**

🎓 BS Software Engineering
🏫 The University of Faisalabad

### Connect with Me

**GitHub:** https://github.com/Earwigmoth10

**Hugging Face:** https://huggingface.co/earwigmoth

---

## ⭐ Support

If you found this project helpful, please consider giving it a **⭐ Star** on GitHub.

It motivates me to continue building and sharing more AI and Machine Learning projects.

---

## 📄 License

This project is licensed under the **MIT License**.
