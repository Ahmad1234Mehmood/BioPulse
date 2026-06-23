# FaceMetrics-AI: Facial Biometrics System

A comprehensive, production-grade AI-powered facial recognition and biometrics orchestration platform. The system supports **1:1 Verification** and **1:N Identification** modes, real-time dynamic threshold calibrations, automated ISO/IEC-compliant evaluation metrics, and conversational LLM diagnostics powered by the Google Gemini API with print-ready PDF export.

**Master's Semester Project** | Université Paris-Est Créteil (UPEC), 2nd Semester  
**Academic Year**: 2025–2026  
**Project Focus**: Deep Facial Biometrics, Operational Threshold Optimization, and LLM Analysis

---

## 📋 Features

*   ✅ **Verification Mode (1:1)** — Real-time comparison of a probe face against a claimed enrolled template, utilizing synchronized local and backend dynamic threshold calculations.
*   ✅ **Identification Mode (1:N)** — Exhaustive gallery search returning ranked candidates matching similarity indexes.
*   ✅ **LLM-Assisted Diagnostics** — Integrated Google Gemini API assistant that reviews operational metrics, analyzes FRR/FAR trade-offs, and provides natural-language troubleshooting.
*   ✅ **Dynamic A4 Report Downloads** — Export structured evaluation reports directly from the AI Chatbot into a beautifully styled PDF (using `jspdf` and `jspdf-autotable`) with auto-wrapped tables and metadata grids.
*   ✅ **Dual UI Themes (designed in Figma)** — Seamless toggling between **Dark Mode** (default) and **Light Mode** (soft-slate aesthetic) via a Settings dropdown in the Top Bar next to notifications.
*   ✅ **Performance Evaluation Engine** — Computes ROC curves, DET curves, and CMC charts, finding EER, Rank-1, and Rank-5 accuracy over benchmark datasets.
*   ✅ **Automatic Orientation & Preprocessing** — MediaPipe detection combined with landmark-based affine eye alignment and 4-angle rotation recovery (`auto_orient`).
*   ✅ **Fully Containerized & Documented** — FastAPI async backend serving auto-generated OpenAPI/Swagger endpoints, paired with a React 18 + Vite frontend.

---

## 🛠️ Technology Stack

### Backend
*   **Framework**: FastAPI + Uvicorn (Asynchronous REST API)
*   **Face Detection & Alignment**: MediaPipe Face Detection (`model_selection=1`)
*   **Feature Extraction**: FaceNet-PyTorch — `InceptionResnetV1` (pretrained on VGGFace2)
*   **Deep Learning Inference**: PyTorch 2.2.2 (CPU-optimized compilation)
*   **Matching & Evaluation**: Cosine Similarity, Euclidean Distance, and scikit-learn metrics
*   **AI Engine**: Google Gemini API via `google-generativeai` (running `gemini-1.5-flash`)
*   **Language**: Python 3.12

### Frontend
*   **Framework**: React 18 + Vite (Production build bundles under 20s)
*   **Styling & Themes**: Tailwind CSS + index.css (custom CSS variables mapping color tokens)
*   **Charts**: Recharts (with dynamically adapting themes for axis grid lines)
*   **Document Generation**: `jspdf` + `jspdf-autotable`
*   **Icons**: Google Material Symbols

### Data & Datasets
*   **Benchmarking**: Labeled Faces in the Wild (LFW) dataset
*   **Split Strategy**: 70% enrollment gallery, 30% probe query sets (stratified by subject)

---

## 🧠 System Architecture & Preprocessing Pipeline

This section documents the biometric processing pipeline in detail, suitable for scientific articles or project report presentations.

```
                  ┌───────────────────────────────┐
                  │          Input Image          │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │ 1. Orientation Correction (0°-270°) │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │    2. Face Detection (MediaPipe)    │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │    3. Affine Alignment (Eye-line)    │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
               ┌─────────────────────────────────────┐
               │   4. Embedding Generation (512-D)   │
               └──────────────────┬──────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌─────────────────┐                               ┌─────────────────┐
│ 1:1 Verification│                               │1:N Identification│
│ Cosine vs. L2   │                               │ Ranked Matches  │
└─────────────────┘                               └─────────────────┘
```

### 1. Preprocessing & Alignment
*   **Auto-Orientation**: Rotates raw images in 90° intervals to locate faces under extreme camera rotations. If no face is found at 0°, the pipeline checks 90° CW, 180°, and 90° CCW, selecting the first working angle.
*   **Affine Alignment**: Calculates the rotation angle between detected eye centers (`arctan2(dY, dX)`) and performs a 2D affine warp to align the face horizontally before cropping.
*   **Cropping**: Adds a 10% bounding box margin to capture facial boundary features, resizing the final crop to $160 \times 160$ pixels.

### 2. Embedding Extraction
*   The $160 \times 160$ face crop is normalized to $[-1, 1]$ and run through the `InceptionResnetV1` network.
*   The raw outputs are L2-normalized to lie on a 512-dimensional unit hypersphere.
*   Inference is run under `@torch.no_grad()` to conserve RAM and speed up execution on CPU resources.

### 3. Template Enrollment & Matching
*   **Averaged Templates**: When enrolling a subject with multiple images, the system averages their embedding vectors and re-normalizes the result to preserve the unit vector property.
*   **Similarity Matcher**: Compares vectors using Cosine similarity. The raw score $[-1, 1]$ is mapped to $[0, 1]:$
    $$\text{remap\_score} = \frac{\text{dot\_product} + 1.0}{2.0}$$
*   Dynamic updates sync threshold sliders on the frontend with backend matching logic, preventing lagging calculations.

---

## 📈 Evaluation Results & Robustness Analysis

These results represent the actual benchmark performance metrics obtained from executing the biometric evaluation pipeline on the LFW dataset (evaluating enrolled subjects across 757 test probes):

### 1. General Metrics
*   **Equal Error Rate (EER)**: **0.97%** (at a threshold of **0.7308**)
    *   *Meaning*: The optimal balance threshold where False Accept Rate (FAR) equals False Reject Rate (FRR). A low EER of 0.97% demonstrates highly accurate verification.
*   **Rank-1 Accuracy**: **93.53%** (93.53% of probe faces are correctly matched to the top candidate in 1:N Identification).
*   **Rank-5 Accuracy**: **94.85%** (The true identity appears within the top-5 candidates in 94.85% of queries).

### 2. Operational Threshold Table
| Security Profile | Target FAR | Actual FAR | FRR | Decision Threshold |
| :--- | :--- | :--- | :--- | :--- |
| **High Security (Banking)** | 0.1% | 0.10% | 1.11% | `0.7674` |
| **Balanced Security (EER)** | 1.0% | 1.00% | 0.14% | `0.7308` |
| **Convenience Mode** | 10.0% | 10.00% | 0.14% | `0.6087` |

### 3. Rotation Robustness (auto_orient Evaluation)
*   **Upright (0°)**: EER: `0.97%` | Rank-1: `93.53%`
*   **90° CW / 180° / 90° CCW (auto_orient ON)**: EER: `0.97%` | Rank-1: `93.53%`
*   **90° CW (auto_orient OFF - Degraded Baseline)**: EER: `25.42%` | Rank-1: `34.21%`
*   *Conclusion*: Enabling `auto_orient` recovers acquisition and maintains baseline EER (0.97%), proving that orientation correction is essential for real-world robustness.

### 4. Ablation Study: Cosine vs. Euclidean (L2) Metric
*   **Cosine Similarity**: EER: **0.97%** | ROC-AUC: **0.9986**
*   **Euclidean (L2) Distance**: EER: **3.84%** | ROC-AUC: **0.9863**
*   *Conclusion*: Cosine similarity yields a significantly lower error rate and higher area under the ROC curve, validating its choice as the default matching metric.

---

## 📁 Project Structure

```
facial-biometrics/
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI application gateway
│   │   ├── routes/
│   │   │   ├── enrollment.py            # Registry management endpoints
│   │   │   ├── verification.py          # 1:1 Matching
│   │   │   ├── identification.py        # 1:N Matching
│   │   │   ├── metrics.py               # Analytical evaluation pipelines
│   │   │   └── llm.py                   # Google Gemini assistant routing
│   │   ├── services/
│   │   │   ├── face_detector.py         # MediaPipe pipeline + alignment
│   │   │   ├── feature_extractor.py     # InceptionResnetV1 512-d extraction
│   │   │   ├── enrollment_service.py    # Multi-image averaged serialization
│   │   │   ├── matcher.py               # Cosine/Euclidean matching operations
│   │   │   └── llm_service.py           # Gemini API integrations
│   │   └── utils/
│   ├── data/
│   │   ├── Face_Database/               # Gallery metadata and images
│   │   ├── enrollment/                  # Enrolled JSON templates
│   │   └── download_lfw.py              # LFW download and database split
│   ├── scripts/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/                  # TopBar (Settings & Dropdown), Sidebar, Icons
│   │   ├── context/                     # AppContext (toasts, theme management)
│   │   ├── pages/                       # Dashboard, Verify, Identify, Metrics, Assistant
│   │   ├── api/                         # Client Axios setup
│   │   └── App.jsx
│   ├── tailwind.config.js               # Theme CSS variables configuration
│   └── vite.config.js
│
└── README.md                            # Project documentation
```

---

## 🚀 Quick Start

### Prerequisites
*   **Python 3.12**
*   **Node.js 18+**
*   **Google Gemini API Key (Offline support available, but to insure better results provide API KEY in .env file)**

### 1. Backend Installation & Setup
```bash
cd backend
python -m venv facBio_env
source facBio_env/bin/activate  # On Windows: facBio_env\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Configure your GEMINI_API_KEY in .env
```

### 2. Download LFW Dataset & Run Enrollment
```bash
# Downloads, splits (70/30), and sets up Face_Database/
python data/download_lfw.py

# Performs batch enrollment of gallery templates
python scripts/batch_enroll_lfw.py
```

### 3. Frontend Installation
```bash
cd ../frontend
npm install
```

### 4. Run Locally
```bash
# Terminal 1 — Start the FastAPI backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Start the React/Vite development server
cd frontend
npm run dev
```

*   **GUI Address**: `http://localhost:5173`
*   **Swagger API Docs**: `http://localhost:8000/docs`

---

## 📡 API Endpoints

### Biometric Verification & Matching
*   `POST /api/v1/verification/verify` — Processes a probe image against a claimed enrollment template.
*   `POST /api/v1/identification/identify` — Evaluates a probe face against the entire gallery template collection.
*   `POST /api/v1/enrollment/enroll` — Registers a new user template using single or multiple face samples.

### Performance Auditing & Diagnostics
*   `GET /api/v1/metrics/run` — Triggers a full biometric evaluation run on LFW.
*   `GET /api/v1/metrics/summary` — Retrieves cached EER, Rank-N, and operating point statistics.
*   `POST /api/v1/llm/analyze` — Sends system metrics to the Gemini assistant for diagnostic review.

---

## 🔧 Environment Configuration

### Backend `.env`
```env
ENVIRONMENT=development
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-1.5-flash
FACE_DETECTION_THRESHOLD=0.5
FACE_SIMILARITY_THRESHOLD=0.7
```

### Frontend `.env`
```env
VITE_BACKEND_URL=http://localhost:8000
```

---

## 📚 Key References
1.  **FaceNet**: Schroff, F., Kalenichenko, D., & Philbin, J. (2015). *FaceNet: A Unified Embedding for Face Recognition and Clustering*. IEEE CVPR.
2.  **VGGFace2**: Cao, Q., Shen, L., Xie, W., Parkhi, O. M., & Zisserman, A. (2018). *VGGFace2: A Dataset for Recognising Faces Across Pose and Age*. IEEE FG.
3.  **Biometric testing guidelines**: ISO/IEC 19795-1:2021 — *Biometric performance testing and reporting standards*.

---

## 🎓 Authors
*   **Wajid Ali & Ahmad Mehmood - Master's Student** — UPEC Master in International Biometrics and Intelligent Vision

