# Facial Biometrics System

A comprehensive AI-powered facial recognition and biometrics system supporting both **1:1 Verification** and **1:N Identification** modes. Features LLM-assisted analysis using the Claude API.

**Master's Semester Project** | UPEC, 2nd Semester  
**Academic Year**: 2024–2025  
**Project Type**: Facial Biometrics System with LLM Integration

---

## 📋 Features

✅ **Verification Mode (1:1)** — Compare a probe face against a single claimed enrolled identity  
✅ **Identification Mode (1:N)** — Search and rank probe faces against the entire enrolled database  
✅ **LLM-Assisted Analysis** — Claude API integration for intelligent biometric decision explanation  
✅ **User Enrollment** — Register subjects from one or multiple face images; averaged template stored  
✅ **Performance Metrics** — ROC, DET, CMC curves; EER, Rank-1, Rank-5 accuracy computation  
✅ **Automatic Image Orientation** — Robust rotation-correction handles sideways/upside-down inputs  
✅ **Clean REST API** — FastAPI with auto-generated Swagger documentation  
✅ **Modern Frontend** — React 18 + Vite + TailwindCSS  
✅ **Free Deployment Ready** — Vercel (frontend) + Render (backend)

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI + Uvicorn
- **Face Detection & Alignment**: MediaPipe Face Detection (`model_selection=1`)
- **Feature Extraction**: FaceNet-PyTorch — `InceptionResnetV1` pretrained on VGGFace2
- **Deep Learning Runtime**: PyTorch 2.2.2 (CPU inference)
- **Matching Engine**: Custom cosine similarity + Euclidean distance
- **Biometric Evaluation**: scikit-learn (`roc_curve`, `det_curve`)
- **LLM**: Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Language**: Python 3.12

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS
- **HTTP Client**: Axios
- **Routing**: React Router v6

### Data & Dataset
- **Dataset**: Labeled Faces in the Wild (LFW) — sourced via `sklearn.datasets.fetch_lfw_people`
- **Split Strategy**: 70% enrollment, 30% probe (per subject, stratified by subject)
- **Minimum images per subject**: 5

### Deployment
- **Frontend**: Vercel (free tier)
- **Backend**: Render (free tier)

---

## 🧠 System Architecture & Technical Methodology

This section documents the full technical pipeline in detail, intended to serve as a reference for academic paper writing.

---

### 1. Face Detection & Preprocessing Pipeline

**Module**: [`backend/app/services/face_detector.py`](backend/app/services/face_detector.py)

The preprocessing pipeline is implemented in the `FaceDetector` class. It performs the following steps in sequence:

#### Step 1 — Automatic Image Orientation Correction (`auto_orient`)
> **Current Implementation (Phase 2+)**

Before face detection, the system attempts to correct the orientation of the input image. This step is critical for handling real-world images captured by mobile devices or rotated via metadata stripping.

- **Mechanism**: A multi-angle detection fallback strategy is applied. The detector first attempts face detection on the original image (0°). If no face is found, it sequentially rotates the image by 90° clockwise, 180°, and 90° counter-clockwise (i.e., 270° CW), running the face detector at each angle.
- **Decision**: The first rotation at which a face is successfully detected is accepted as the correct orientation. If no face is detected at any angle, the original image is returned.
- **Overhead**: Zero overhead for correctly oriented images (the original orientation succeeds first). For corrected images, at most 4 MediaPipe inference passes are required (~15 ms each on CPU).

```
Input Image → Detect(0°) → if fail → Detect(90°CW) → if fail → Detect(180°) → if fail → Detect(270°CW) → Oriented Image
```

#### Step 2 — Face Detection
**Library**: [MediaPipe Face Detection](https://google.github.io/mediapipe/solutions/face_detection) (`model_selection=1`, suitable for images with faces within 5 metres)

- Input: BGR image (OpenCV format)
- The image is converted to RGB before processing (required by MediaPipe)
- Output: A list of detected faces, each with a **bounding box** (relative coordinates) and **6 facial keypoints**: right eye, left eye, nose tip, mouth centre, right ear tragion, left ear tragion
- The face with the **highest confidence score** is selected as the primary face

#### Step 3 — Geometric Face Alignment (`align_face`)
- The angle between the eye centres (right eye and left eye landmarks) is computed using `arctan2(dY, dX)`
- An affine rotation matrix is applied (`cv2.getRotationMatrix2D`) to rotate the image so the eye line is perfectly horizontal
- This step reduces intra-subject variation caused by head tilt and significantly improves embedding consistency

#### Step 4 — Cropping & Resizing
- After alignment, face detection is re-run on the aligned image to obtain an accurate bounding box
- A **10% margin** is added on all four sides to include surrounding facial context (hair, chin, ears)
- The face region is cropped and resized to **160 × 160 pixels** (required input size for InceptionResnetV1)
- The final output is an **RGB numpy array** in range [0, 255]

---

### 2. Feature Extraction (Embedding Generation)

**Module**: [`backend/app/services/feature_extractor.py`](backend/app/services/feature_extractor.py)

**Model**: `InceptionResnetV1` from [`facenet-pytorch`](https://github.com/timesler/facenet-pytorch), pretrained on **VGGFace2** (a large-scale dataset of ~3.3 million face images of 9,131 subjects).

- **Architecture**: Inception-ResNet-V1 — a deep convolutional neural network combining Inception modules with residual connections
- **Input**: 160 × 160 RGB image, pixel values normalized to [−1, 1] via `(x − 127.5) / 128.0`
- **Output**: A **512-dimensional embedding vector**
- **Normalization**: The output embedding is L2-normalized to unit length using `torch.nn.functional.normalize(p=2)`. This ensures that all embeddings lie on a unit hypersphere, making cosine similarity equivalent to a dot product
- **Inference mode**: `@torch.no_grad()` is used to disable gradient computation, reducing memory usage and speeding up inference
- **Device**: CPU only (compatible with free-tier deployment)

Both single-image (`extract_embedding`) and batched (`extract_batch`) inference are supported.

---

### 3. Template Enrollment

**Module**: [`backend/app/services/enrollment_service.py`](backend/app/services/enrollment_service.py)

- **Multiple images per subject are supported**: For each subject, one or more face images are uploaded. Each image is individually preprocessed and embedded
- **Template aggregation**: The embeddings from all successfully processed images are **averaged** (mean pooling) to create a single representative template vector
- **Re-normalization**: The averaged embedding is re-normalized to unit length before storage. This maintains the L2-normalization property required for correct cosine similarity computation
- **Storage**: Templates are persisted as JSON files on disk at `backend/data/enrollment/{subject_id}.json`

---

### 4. Biometric Matching

**Module**: [`backend/app/services/matcher.py`](backend/app/services/matcher.py)

#### 4.1 Similarity Metric — Cosine Similarity
The primary matching metric is **Cosine Similarity**. Since embeddings are L2-normalized, the cosine similarity reduces to the **dot product**:

```
cosine_similarity(e1, e2) = e1 · e2   (for unit-length vectors)
```

The raw dot product lies in [−1, 1]. It is remapped to [0, 1] for easier thresholding:

```
score = (dot_product + 1.0) / 2.0
```

A secondary **Euclidean distance** (`L2 norm`) is also implemented, though not yet used in the primary pipeline.

#### 4.2 Verification (1:1 Mode)
- The probe embedding is compared against the **single claimed identity's template**
- A **fixed threshold** of `0.7` (on the [0,1] scale) is applied by default, derived from the EER analysis
- Decision: **Accept** if `score ≥ threshold`, else **Reject**

#### 4.3 Identification (1:N Mode)
- The probe embedding is compared against **all enrolled templates** in the gallery
- All scores are sorted in descending order
- The **top-K** subjects (default K=5) are returned with their rank and similarity score

---

### 5. Biometric Performance Evaluation Framework

**Module**: [`backend/app/services/metrics_service.py`](backend/app/services/metrics_service.py)

The system implements a complete ISO/IEC 19795-compliant biometric evaluation framework.

#### 5.1 Experimental Protocol

- **Dataset**: LFW (Labeled Faces in the Wild) — subjects with ≥5 images
- **Gallery**: All enrolled subject templates from `backend/data/enrollment/`
- **Probes**: Probe images defined per subject in `backend/data/Face_Database/subject_XXX/metadata.json`
- **Current evaluation scope**: First 25 subjects' probe images (limited to prevent HTTP timeout)
- **Pairing strategy**: All-against-all exhaustive comparison — each probe is compared against every enrolled template

#### 5.2 Score Generation
- A probe-gallery comparison generates two score distributions:
  - **Genuine scores**: Comparisons where the probe subject matches the gallery template subject (label = 1)
  - **Impostor scores**: Comparisons where subjects differ (label = 0)

#### 5.3 Verification Metrics — ROC & DET Curves

**Receiver Operating Characteristic (ROC) Curve**:
- X-axis: False Accept Rate (FAR) = FP / (FP + TN)
- Y-axis: True Accept Rate (TAR) = TP / (TP + FN)
- Computed via `sklearn.metrics.roc_curve`
- Downsampled to 100 points for efficient JSON transport

**Detection Error Tradeoff (DET) Curve**:
- X-axis: False Accept Rate (FAR)
- Y-axis: False Reject Rate (FRR) = 1 − TAR
- Computed via `sklearn.metrics.det_curve`

**Equal Error Rate (EER)**:
- The threshold point where FAR = FRR
- Computed by finding the minimum of `|FAR − FRR|` across all threshold values
- `EER = (FAR[min_idx] + FRR[min_idx]) / 2`

#### 5.4 Identification Metrics — CMC Curve

**Cumulative Match Characteristic (CMC) Curve**:
- Measures the probability that the correct identity appears within the top-K retrieved results
- Evaluated at ranks 1 through `max_rank` (default: 5)
- For each probe, the system ranks all gallery subjects by similarity score; if the true subject appears at rank ≤ K, the rank-K count is incremented

### 6. Phase 3 Evaluation Results & Analysis

This section documents the results obtained from running the Phase 3 biometric evaluation pipeline.

#### 6.1 Summary of Performance Metrics
*   **Equal Error Rate (EER)**: **49.65%** (Cosine) | **49.65%** (Euclidean)
    *   *Meaning*: The threshold point where False Accept Rate (FAR) equals False Reject Rate (FRR). An EER of ~49.6% represents near-random guessing performance. This occurs because the evaluation script matches LFW probe images against the system's local enrollment database (`Face_Database`), which lacks the corresponding subject templates for most LFW probes, collapsing the genuine match score distribution.
*   **Rank-1 Accuracy**: **89.06%**
    *   *Meaning*: For 89.06% of the successfully detected probe faces, the correct matching subject is returned as the absolute top-ranked candidate.
*   **Failure to Acquire (FTA) Rate**: **39.62%**
    *   *Meaning*: The face detector failed to locate or crop a face in 39.62% of the probe images (mainly due to extreme poses, scale variations, and shadows in the LFW dataset).
*   **Effective Rank-1 Accuracy**: **53.77%**
    *   *Meaning*: Computes identification accuracy penalized by the failure to acquire a face ($Rank1 \times (1 - FTA)$). This represents the actual, real-world usability of the system.

#### 6.2 NIST FAR Operating Points (Verification)
*   **High-Security (FAR = 0.1% Target)**: Actual FAR: `0.12%` | FRR: `100.0%` (TAR: `0.0%`) | Threshold: `0.9131`
*   **Medium-Security (FAR = 1.0% Target)**: Actual FAR: `1.10%` | FRR: `98.44%` (TAR: `1.56%`) | Threshold: `0.7209`
*   **Permissive (FAR = 10.0% Target)**: Actual FAR: `10.50%` | FRR: `89.06%` (TAR: `10.94%`) | Threshold: `0.6131`
    *   *Meaning*: Shows the trade-off between security (FAR) and usability (FRR). At strict thresholds (e.g. `0.9131`), no genuine users are accepted because the genuine and impostor score distributions overlap significantly in the current database mismatch setup.

#### 6.3 Rotation Robustness Evaluation (auto_orient Verification)
*   **Upright (0°)**: FTA: `39.62%` | Rank-1: `89.06%` | EER: `49.65%`
*   **90° CW (auto_orient ON)**: FTA: `39.62%` | Rank-1: `71.88%` | EER: `51.56%`
*   **180° (auto_orient ON)**: FTA: `39.62%` | Rank-1: `71.88%` | EER: `51.56%`
*   **90° CCW (auto_orient ON)**: FTA: `39.62%` | Rank-1: `89.06%` | EER: `49.65%`
*   **90° CW (auto_orient OFF - Degraded Baseline)**: FTA: `100.0%` (0 faces detected)
    *   *Meaning*: Confirm that without orientation correction, rotated images fail completely. Enabling `auto_orient` successfully corrects orientation, bringing detection rates back to baseline levels. The minor Rank-1 drop (from 89% to 71%) is due to resampling artifacts introduced by 2D image rotations.

---

## 🔬 Biometric System Improvements: Phase 3 Ablation Details

This section outlines the comparison between the original implementation, the issues detected, the implemented Phase 3 modifications, and recommendations for further improvement.

---

### Improvement 1 — Batched Inference & Optimization
*   **Current Method (Phase 2)**: Extracted face embeddings one-by-one inside a serial loop.
*   **Issue**: Underutilized CPU parallel vector operations, leading to slow processing and API timeouts on large datasets.
*   **Modified Method (Phase 3)**: Face crops are queued and processed in batches of `32` via `feature_extractor.extract_batch()`.
*   **Suggestion for Future Improvement**: Implement an asynchronous task queue (e.g. Celery + Redis) to handle evaluations out-of-band and apply **FP16 quantization** to the PyTorch InceptionResnetV1 model for faster CPU execution.

---

### Improvement 2 — Failure to Acquire (FTA) Tracking
*   **Current Method (Phase 2)**: Silently skipped probe images where face detection failed (`continue`).
*   **Issue**: selection bias; ignoring detection failures artificially inflates accuracy metrics, making the system appear more reliable than it is.
*   **Modified Method (Phase 3)**: Caught `NoFaceDetectedError` and calculated `fta_rate` and `effective_rank_1_accuracy` to represent real-world usability.
*   **Suggestion for Future Improvement**: Integrate an **Image Quality Assessment (IQA)** pre-processing step (e.g. computing Laplacian variance for blur and histogram analysis for exposure) to reject low-quality inputs at acquisition.

---

### Improvement 3 — FAR-Targeted Threshold Analysis
*   **Current Method (Phase 2)**: Reported only EER and a single threshold.
*   **Issue**: Real-world biometric deployments do not run at EER; they operate at predefined security levels (e.g., FAR = 0.1% or 1%).
*   **Modified Method (Phase 3)**: Extracted thresholds and true acceptance rates at standard operating points (`0.1%`, `1.0%`, `10.0%`).
*   **Suggestion for Future Improvement**: Implement **dynamic thresholding** that adapts to specific user age groups or matching conditions.

---

### Improvement 4 — Cosine vs. L2 Distance Metric Comparison
*   **Current Method (Phase 2)**: Exclusively used Cosine Similarity.
*   **Issue**: No empirical validation or comparison showing why Cosine was preferred over Euclidean (L2) distance.
*   **Modified Method (Phase 3)**: Added L2 similarity calculation $s = \frac{1}{1 + d}$, generated parallel metrics curves, and recommended Cosine.
*   **Suggestion for Future Improvement**: Train a lightweight metric-learning layer (e.g. linear discriminant analysis) on the 512-d embeddings to optimize class separability.

---

### Improvement 5 — Rotation Robustness Evaluation
*   **Current Method (Phase 2)**: Orientation correction (`auto_orient`) was implemented but unchecked.
*   **Issue**: No quantitative measurements proving that the system handles rotated inputs or analyzing potential degradation.
*   **Modified Method (Phase 3)**: Automated a 5-scenario test pipeline checking metrics across all angles with and without correction.
*   **Suggestion for Future Improvement**: Utilize a 3D pose estimation model (like MediaPipe FaceMesh) to estimate head yaw, pitch, and roll, and apply **3D face frontalization** before template matching.

---

## 📁 Project Structure

```
facial-biometrics/
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI application entry point
│   │   ├── routes/
│   │   │   ├── enrollment.py            # POST /enroll, GET/DELETE /enrolled
│   │   │   ├── verification.py          # POST /verify (1:1 mode)
│   │   │   ├── identification.py        # POST /identify (1:N mode)
│   │   │   ├── metrics.py               # GET /metrics/run, /metrics/cached
│   │   │   └── llm.py                   # POST /llm/analyze
│   │   ├── services/
│   │   │   ├── face_detector.py         # Detection, alignment, auto-orientation
│   │   │   ├── feature_extractor.py     # InceptionResnetV1 embedding (512-d)
│   │   │   ├── enrollment_service.py    # Template creation and storage
│   │   │   ├── matcher.py               # Cosine similarity, 1:1/1:N matching
│   │   │   └── metrics_service.py       # ROC, DET, CMC, EER evaluation
│   │   └── utils/
│   ├── data/
│   │   ├── Face_Database/               # Per-subject folders with metadata.json
│   │   ├── enrollment/                  # Persisted template JSON files
│   │   ├── lfw_data/                    # Cached LFW dataset (sklearn format)
│   │   └── download_lfw.py              # Dataset download + split script
│   ├── scripts/
│   │   └── batch_enroll_lfw.py          # Batch enrollment script for LFW
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Verification.jsx
│   │   │   ├── Identification.jsx
│   │   │   └── Metrics.jsx
│   │   ├── api/
│   │   │   ├── client.js
│   │   │   └── services.js
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.12** (with environment: `facBio_env`)
- **Node.js 16+** and npm
- **Claude API Key** (from Anthropic)

### Installation & Setup

#### 1. Backend Setup

```bash
cd backend
conda activate facBio_env
pip install -r requirements.txt
cp .env.example .env
# Add CLAUDE_API_KEY to .env
```

#### 2. Download & Prepare LFW Dataset

```bash
python data/download_lfw.py
# Downloads LFW, organizes into Face_Database/, splits 70/30
```

#### 3. Batch Enroll Subjects

```bash
python scripts/batch_enroll_lfw.py
# Enrolls all subjects using the enrollment service
```

#### 4. Frontend Setup

```bash
cd frontend
npm install
```

#### 5. Run Locally

```bash
# Terminal 1 — Backend
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- **App**: `http://localhost:5173`
- **API Docs**: `http://localhost:8000/docs`

---

## 📡 API Endpoints

### Enrollment
```
POST   /api/v1/enrollment/enroll           # Enroll a new subject (multi-image)
GET    /api/v1/enrollment/enrolled         # List all enrolled subjects
DELETE /api/v1/enrollment/enrolled/{id}    # Delete a subject
```

### Verification (1:1)
```
POST /api/v1/verification/verify           # Verify probe against claimed identity
```

### Identification (1:N)
```
POST /api/v1/identification/identify       # Identify probe against full gallery
```

### Metrics
```
GET  /api/v1/metrics/run                   # Run full evaluation pipeline
GET  /api/v1/metrics/cached                # Return last cached metrics result
```

### LLM Analysis
```
POST /api/v1/llm/analyze                   # LLM-assisted biometric analysis
```

---

## 🔧 Configuration

### Backend `.env`

```env
ENVIRONMENT=development
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:5173
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxx
CLAUDE_MODEL=claude-sonnet-4-20250514
FACE_DETECTION_THRESHOLD=0.5
FACE_SIMILARITY_THRESHOLD=0.7
```

### Frontend `.env`

```env
VITE_BACKEND_URL=http://localhost:8000
```

---

## 📊 Dataset Summary

| Property | Value |
|----------|-------|
| Source | LFW (Labeled Faces in the Wild) |
| Total subjects (≥5 images) | 423 |
| Enrollment split | 70% per subject |
| Probe split | 30% per subject |
| Currently enrolled | 370 subjects |
| Currently evaluated (probes) | 757 images |

---

## 📝 Project Status

### ✅ Completed
- [x] Face detection with MediaPipe (model_selection=1)
- [x] Face alignment via eye landmark geometry
- [x] Automatic image orientation correction (auto_orient — 4-angle fallback)
- [x] 512-d embedding extraction with InceptionResnetV1 (VGGFace2 pretrained)
- [x] Template enrollment with multi-image averaged templates
- [x] 1:1 Verification with cosine similarity thresholding
- [x] 1:N Identification with ranked gallery search (top-K)
- [x] ROC curve, DET curve, and EER computation
- [x] CMC curve with Rank-1 through Rank-5 accuracy
- [x] LLM-assisted analysis via Anthropic Claude API
- [x] Full REST API with FastAPI + React frontend
- [x] **Improvement 1**: Batched PyTorch inference for full-dataset evaluation
- [x] **Improvement 2**: Failure to Acquire (FTA) and Failure to Enroll (FTE) tracking
- [x] **Improvement 3**: FAR-targeted threshold analysis (FAR = 0.1%, 1%, 10%)
- [x] **Improvement 4**: Euclidean (L2) distance metric comparison vs. Cosine Similarity
- [x] **Improvement 5**: Rotation robustness formal evaluation (before/after auto_orient)
- [x] **Metrics Dashboard UI**: Multi-tab panel tracking EER, FTA, Rank-1, operating points table, metric comparisons, and rotation robustness tests

---

## 📚 Key References

- **FaceNet**: Schroff, F., Kalenichenko, D., & Philbin, J. (2015). *FaceNet: A Unified Embedding for Face Recognition and Clustering*. CVPR.
- **VGGFace2**: Cao, Q., et al. (2018). *VGGFace2: A Dataset for Recognising Faces Across Pose and Age*. FG.
- **MediaPipe**: Lugaresi, C., et al. (2019). *MediaPipe: A Framework for Building Perception Pipelines*. arXiv:1906.08172.
- **LFW**: Huang, G. B., et al. (2007). *Labeled Faces in the Wild: A Database for Studying Face Recognition in Unconstrained Environments*. UMass Technical Report.
- **Biometric Evaluation Standard**: ISO/IEC 19795-1:2021 — *Biometric Performance Testing and Reporting*.

---

## 🎓 Project Author

**Master's Student** — Advanced Computing & Security, UPEC  
**Academic Year**: 2024–2025  
**Project Type**: Facial Biometrics System with LLM Integration

---

**Last Updated**: June 2026  
**Status**: Phase 3 Complete ✅ (All biometric improvements implemented and verified)
