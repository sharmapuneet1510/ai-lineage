import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL

export const fieldApi = {
  searchFields: (jurisdiction?: string, search?: string, page: number = 1) =>
    axios.get(`${API_BASE}/fields`, {
      params: { jurisdiction, search, page, pageSize: 25 }
    }),
  getField: (fieldId: number) =>
    axios.get(`${API_BASE}/fields/${fieldId}`),
}
