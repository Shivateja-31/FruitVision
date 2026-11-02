import axios, { AxiosProgressEvent } from 'axios';
import {
  HealthResponse,
  ConfigResponse,
  InspectionJob,
  InspectionListResponse,
  InspectionUploadOptions
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Accept': 'application/json'
  }
});

export const apiService = {
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  async getHealth(): Promise<HealthResponse> {
    const response = await client.get<HealthResponse>('/health');
    return response.data;
  },

  async getConfig(): Promise<ConfigResponse> {
    const response = await client.get<ConfigResponse>('/config');
    return response.data;
  },

  async uploadInspection(options: InspectionUploadOptions): Promise<InspectionJob> {
    const formData = new FormData();
    formData.append('file', options.file);
    formData.append('confidence', options.confidence.toString());
    formData.append('tracking_enabled', options.trackingEnabled.toString());
    formData.append('quality_inspection_enabled', options.qualityEnabled.toString());
    formData.append('frame_stride', options.frameStride.toString());

    const response = await client.post<InspectionJob>('/inspections', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (options.onUploadProgress) {
          options.onUploadProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total
          });
        }
      }
    });

    return response.data;
  },

  async getInspection(jobId: string): Promise<InspectionJob> {
    const response = await client.get<InspectionJob>(`/inspections/${jobId}`);
    return response.data;
  },

  async listInspections(page: number = 1, limit: number = 20): Promise<InspectionListResponse> {
    const response = await client.get<InspectionListResponse>('/inspections', {
      params: { page, limit }
    });
    return response.data;
  },

  async cancelInspection(jobId: string): Promise<{ id: string; message: string; status: string }> {
    const response = await client.post(`/inspections/${jobId}/cancel`);
    return response.data;
  },

  async deleteInspection(jobId: string): Promise<{ status: string; job_id: string; message: string }> {
    const response = await client.delete(`/inspections/${jobId}`);
    return response.data;
  },

  getVideoStreamUrl(jobId: string): string {
    return `${API_BASE_URL}/api/inspections/${jobId}/video`;
  },

  getImageStreamUrl(jobId: string): string {
    return `${API_BASE_URL}/api/inspections/${jobId}/image`;
  },

  getOriginalMediaUrl(jobId: string): string {
    return `${API_BASE_URL}/api/inspections/${jobId}/original`;
  },

  getReportDownloadUrl(jobId: string): string {
    return `${API_BASE_URL}/api/inspections/${jobId}/report`;
  },

  getCsvDownloadUrl(jobId: string): string {
    return `${API_BASE_URL}/api/inspections/${jobId}/csv`;
  }
};

