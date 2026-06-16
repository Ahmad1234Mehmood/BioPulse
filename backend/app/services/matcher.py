import numpy as np
from typing import Dict, Any, List

class BiometricMatcher:
    """
    Biometric Matching Engine.
    Handles 1:1 Verification and 1:N Identification using embedding comparisons.
    """
    def __init__(self):
        pass

    def cosine_similarity(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """
        Computes the cosine similarity between two L2-normalized embeddings.
        Since embeddings are normalized, dot product equals cosine similarity.
        Returns a score mapped to [0, 1].
        """
        if emb1.ndim == 1:
            emb1 = emb1.reshape(1, -1)
        if emb2.ndim == 1:
            emb2 = emb2.reshape(1, -1)
            
        similarity = np.dot(emb1, emb2.T)[0, 0]
        # Map from [-1, 1] to [0, 1] for easier thresholding
        score = (similarity + 1.0) / 2.0
        return float(score)
        
    def euclidean_distance(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """ Computes the L2 Euclidean distance between two embeddings. """
        return float(np.linalg.norm(emb1 - emb2))

    def euclidean_similarity(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """
        Converts Euclidean distance to a [0, 1] similarity score via 1/(1+distance).
        Score of 1.0 means identical embeddings; approaches 0.0 as distance grows.
        This mapping makes L2 scores directly comparable to cosine scores for
        threshold-based classification and ROC/DET evaluation.
        """
        dist = self.euclidean_distance(emb1, emb2)
        return float(1.0 / (1.0 + dist))

    def verify(self, probe_embedding: np.ndarray, template_embedding: np.ndarray, threshold: float = 0.7) -> Dict[str, Any]:
        """
        Perform 1:1 verification.
        
        Args:
            probe_embedding: Embedding of the face to verify.
            template_embedding: Saved template of the claimed identity.
            threshold: Cosine similarity threshold for acceptance.
            
        Returns:
            Dict containing match (bool), score (float), and decision (str).
        """
        score = self.cosine_similarity(probe_embedding, template_embedding)
        match = score >= threshold
        decision = "Accept" if match else "Reject"
        
        return {
            "match": match,
            "score": score,
            "decision": decision,
            "threshold": threshold
        }
        
    def identify(self, probe_embedding: np.ndarray, all_templates: Dict[str, np.ndarray], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Perform 1:N identification against all enrolled templates.
        
        Args:
            probe_embedding: Embedding of the face to identify.
            all_templates: Dict of {subject_id: embedding}
            top_k: Number of top matches to return.
            
        Returns:
            List of top_k dictionaries with subject_id, score, and rank.
        """
        results = []
        for subject_id, template_emb in all_templates.items():
            score = self.cosine_similarity(probe_embedding, template_emb)
            results.append({
                "subject_id": subject_id,
                "score": score
            })
            
        # Sort descending by score
        results.sort(key=lambda x: x["score"], reverse=True)
        
        # Take top_k and add rank
        top_results = []
        for i, res in enumerate(results[:top_k]):
            top_results.append({
                "rank": i + 1,
                "subject_id": res["subject_id"],
                "score": res["score"]
            })
            
        return top_results
