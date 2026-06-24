import apiClient from './client';

// Health Check
export const healthCheck = () => {
  return apiClient.get('/health');
};

// Enrollment
export const enrollSubject = (subjectName, files) => {
  const formData = new FormData();
  formData.append('subject_name', subjectName);
  
  // Accept both a single file or an array of files
  if (Array.isArray(files)) {
    files.forEach((file) => {
      formData.append('images', file);
    });
  } else {
    formData.append('images', files);
  }
  
  return apiClient.post('/api/v1/enrollment/enroll', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getEnrolledSubjects = () => {
  return apiClient.get('/api/v1/enrollment/enrolled');
};

export const deleteSubject = (subjectId) => {
  return apiClient.delete(`/api/v1/enrollment/enrolled/${subjectId}`);
};

// Verification
export const verifyUser = (claimedSubjectId, probeImage, claimImage = null, threshold = 0.70) => {
  const formData = new FormData();
  formData.append('claimed_subject_id', claimedSubjectId);
  formData.append('probe_image', probeImage);
  if (claimImage) {
    formData.append('claim_image', claimImage);
  }
  formData.append('threshold', threshold);
  
  return apiClient.post('/api/v1/verification/verify', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Identification
export const identifyUser = (probeImage, threshold = 0.70) => {
  const formData = new FormData();
  formData.append('probe_image', probeImage);
  formData.append('threshold', threshold);
  
  return apiClient.post('/api/v1/identification/identify', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// LLM Analysis
export const analyzeFace = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/api/v1/llm/analyze-face', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const queryAssistant = (message, history = []) => {
  return apiClient.post('/api/v1/llm/chat', { message, history });
};


// Metrics
export const getMetricsSummary = () => {
  return apiClient.get('/api/v1/metrics/summary');
};

export const getDatasetStats = () => {
  return apiClient.get('/api/v1/metrics/dataset-stats');
};

export const runMetricsEvaluation = (force = false, bypassDetection = false) => {
  return apiClient.get(`/api/v1/metrics/run?force=${force}&bypass_detection=${bypassDetection}`);
};

export const runRotationRobustness = () => {
  return apiClient.get('/api/v1/metrics/rotation-robustness');
};

export default {
  healthCheck,
  enrollSubject,
  getEnrolledSubjects,
  deleteSubject,
  verifyUser,
  identifyUser,
  analyzeFace,
  queryAssistant,
  getMetricsSummary,
  getDatasetStats,
  runMetricsEvaluation,
  runRotationRobustness,
};
