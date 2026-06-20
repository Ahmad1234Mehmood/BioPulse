import torch
import numpy as np
from facenet_pytorch import InceptionResnetV1
from typing import List

class FeatureExtractor:
    """
    Feature extraction service using facenet-pytorch (InceptionResnetV1 pretrained on VGGFace2).
    """
    def __init__(self):
        # Force CPU for free-tier server compatibility
        self.device = torch.device('cpu')
        
        # Load the pretrained model and set it to evaluation mode
        self.model = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
        
    def _preprocess_tensor(self, img_array: np.ndarray) -> torch.Tensor:
        """
        Convert RGB 160x160 numpy array (0-255) to a normalized PyTorch tensor (-1 to 1).
        """
        # PyTorch expects CxHxW format
        img_tensor = torch.from_numpy(img_array).float().permute(2, 0, 1)
        
        # Normalize to [-1, 1] scale (standard for facenet-pytorch)
        img_tensor = (img_tensor - 127.5) / 128.0
        return img_tensor

    @torch.no_grad()
    def extract_embedding(self, face_image: np.ndarray) -> np.ndarray:
        """
        Extract a 512-d unit length embedding from a single face image.
        
        Args:
            face_image: Preprocessed 160x160 RGB numpy array.
            
        Returns:
            np.ndarray: 512-dimensional normalized embedding vector.
        """
        tensor = self._preprocess_tensor(face_image).unsqueeze(0).to(self.device)
        
        # Forward pass
        embedding = self.model(tensor)
        
        # L2 normalize the embedding
        embedding = torch.nn.functional.normalize(embedding, p=2, dim=1)
        
        return embedding.squeeze(0).cpu().numpy()
        
    @torch.no_grad()
    def extract_batch(self, images: List[np.ndarray]) -> List[np.ndarray]:
        """
        Extract embeddings for a batch of images.
        
        Args:
            images: List of preprocessed 160x160 RGB numpy arrays.
            
        Returns:
            List[np.ndarray]: List of 512-dimensional normalized embedding vectors.
        """
        if not images:
            return []
            
        tensors = [self._preprocess_tensor(img) for img in images]
        batch_tensor = torch.stack(tensors).to(self.device)
        
        # Forward pass
        embeddings = self.model(batch_tensor)
        
        # L2 normalize
        embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
        
        return [emb.cpu().numpy() for emb in embeddings]
