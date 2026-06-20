"""
LFW Dataset Download and Preparation Script
Downloads the Labeled Faces in the Wild dataset and organizes it for facial biometrics experiments.
"""

import os
import json
import shutil
import logging
from pathlib import Path
from sklearn.datasets import fetch_lfw_people
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / 'Face_Database'
ENROLLMENT_DIR = SCRIPT_DIR / 'enrollment'
PROBE_DIR = SCRIPT_DIR / 'probe'

MIN_IMAGES_PER_SUBJECT = 5
ENROLLMENT_RATIO = 0.7
PROBE_RATIO = 0.3

# ============================================================================
# Main Functions
# ============================================================================

def create_directories():
    """Create necessary directories if they don't exist."""
    logger.info("Creating directories...")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ENROLLMENT_DIR.mkdir(parents=True, exist_ok=True)
    PROBE_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"✓ Created directories: {DATA_DIR}, {ENROLLMENT_DIR}, {PROBE_DIR}")


def download_lfw_dataset():
    """
    Download the LFW people dataset from sklearn.
    
    Returns:
        data: Loaded dataset object
    """
    logger.info("Downloading LFW dataset...")
    try:
        data = fetch_lfw_people(
            min_faces_per_person=MIN_IMAGES_PER_SUBJECT,
            resize=0.5,
            data_home=str(SCRIPT_DIR / 'lfw_data')
        )
        logger.info(f"✓ Downloaded LFW dataset")
        logger.info(f"  - Total subjects: {len(np.unique(data.target))}")
        logger.info(f"  - Total images: {len(data.data)}")
        return data
    except Exception as e:
        logger.error(f"✗ Failed to download LFW dataset: {e}")
        raise


def organize_dataset(data):
    """
    Organize dataset into Face_Database with enrollment and probe split.
    
    Args:
        data: sklearn LFW dataset object
    """
    logger.info("Organizing dataset...")
    
    # Clean existing face database
    if DATA_DIR.exists():
        shutil.rmtree(DATA_DIR)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    target_names = data.target_names
    total_subjects = len(target_names)
    
    logger.info(f"Processing {total_subjects} subjects...")
    
    for subject_idx, subject_name in enumerate(target_names, 1):
        # Find all images for this subject
        subject_mask = data.target == subject_idx - 1
        subject_images_idx = np.where(subject_mask)[0]
        n_images = len(subject_images_idx)
        
        logger.info(f"[{subject_idx}/{total_subjects}] {subject_name} ({n_images} images)")
        
        # Create subject directory
        subject_dir = DATA_DIR / f"subject_{subject_idx:03d}_{subject_name.replace(' ', '_')}"
        subject_dir.mkdir(parents=True, exist_ok=True)
        
        # Split images: 70% enrollment, 30% probe
        split_idx = int(n_images * ENROLLMENT_RATIO)
        enrollment_indices = subject_images_idx[:split_idx]
        probe_indices = subject_images_idx[split_idx:]
        
        # Save enrollment and probe metadata
        metadata = {
            "subject_id": subject_idx,
            "subject_name": subject_name,
            "total_images": n_images,
            "enrollment_count": len(enrollment_indices),
            "probe_count": len(probe_indices),
            "enrollment_indices": enrollment_indices.tolist(),
            "probe_indices": probe_indices.tolist(),
        }
        
        with open(subject_dir / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)
    
    logger.info(f"✓ Organized {total_subjects} subjects in {DATA_DIR}")


def collect_statistics(data):
    """
    Collect and save dataset statistics.
    
    Args:
        data: sklearn LFW dataset object
        
    Returns:
        dict: Dataset statistics
    """
    logger.info("Collecting statistics...")
    
    target_names = data.target_names
    total_subjects = len(target_names)
    total_images = len(data.data)
    
    enrollment_count = int(total_images * ENROLLMENT_RATIO)
    probe_count = total_images - enrollment_count
    
    stats = {
        "dataset_name": "Labeled Faces in the Wild (LFW)",
        "total_subjects": total_subjects,
        "total_images": total_images,
        "min_images_per_subject": MIN_IMAGES_PER_SUBJECT,
        "enrollment_count": enrollment_count,
        "probe_count": probe_count,
        "enrollment_ratio": ENROLLMENT_RATIO,
        "probe_ratio": PROBE_RATIO,
        "image_height": data.images.shape[1],
        "image_width": data.images.shape[2],
        "image_channels": 1,  # Grayscale
        "data_directory": str(DATA_DIR),
        "enrollment_directory": str(ENROLLMENT_DIR),
        "probe_directory": str(PROBE_DIR),
    }
    
    # Save statistics
    stats_file = SCRIPT_DIR / "dataset_stats.json"
    with open(stats_file, "w") as f:
        json.dump(stats, f, indent=2)
    
    logger.info(f"✓ Saved statistics to {stats_file}")
    
    return stats


def print_statistics(stats):
    """
    Print formatted statistics.
    
    Args:
        stats: Dictionary of dataset statistics
    """
    logger.info("\n" + "="*60)
    logger.info("📊 DATASET STATISTICS")
    logger.info("="*60)
    logger.info(f"Dataset: {stats['dataset_name']}")
    logger.info(f"Total Subjects: {stats['total_subjects']}")
    logger.info(f"Total Images: {stats['total_images']}")
    logger.info(f"Enrollment Images: {stats['enrollment_count']} ({stats['enrollment_ratio']*100:.1f}%)")
    logger.info(f"Probe Images: {stats['probe_count']} ({stats['probe_ratio']*100:.1f}%)")
    logger.info(f"Image Resolution: {stats['image_width']}x{stats['image_height']}")
    logger.info(f"Channels: {stats['image_channels']}")
    logger.info("="*60 + "\n")


def main():
    """
    Main execution function.
    """
    logger.info("🚀 Starting LFW Dataset Download and Preparation Script\n")
    
    try:
        # Step 1: Create directories
        create_directories()
        
        # Step 2: Download dataset
        data = download_lfw_dataset()
        
        # Step 3: Organize dataset
        organize_dataset(data)
        
        # Step 4: Collect statistics
        stats = collect_statistics(data)
        
        # Step 5: Print statistics
        print_statistics(stats)
        
        logger.info("✓ LFW dataset preparation completed successfully!")
        logger.info(f"✓ Data saved to: {SCRIPT_DIR}")
        
    except Exception as e:
        logger.error(f"✗ Error during dataset preparation: {e}")
        raise


if __name__ == "__main__":
    main()
