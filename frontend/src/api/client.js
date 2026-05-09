import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const userAPI = {
  profile: () => api.get('/user/profile'),
  updateProgress: (score) => api.post('/user/progress', { score }),
};

export const examAPI = {
  getQuestions: () => api.get('/exam/questions'),
  manage: (questions) => api.post('/exam/manage', { questions }),
  assess: (answers) => api.post('/exam/assess', { answers }),
  status: () => api.get('/exam/status'),
};

export const lectureAPI = {
  list: () => api.get('/lectures'),
  get: (title) => api.get(`/lectures/${encodeURIComponent(title)}`),
  upload: (formData) => api.post('/lectures/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (title) => api.delete(`/lectures/${encodeURIComponent(title)}`),
  ask: (title, question, chatHistory) => api.post(`/lectures/${encodeURIComponent(title)}/ask`, { question, chatHistory }),
  quiz: (title, numQuestions) => api.post(`/lectures/${encodeURIComponent(title)}/quiz`, { numQuestions }),
};

export const sectionAPI = {
  list: () => api.get('/sections'),
  get: (id) => api.get(`/sections/${id}`),
  create: (name, examQuestions) => api.post('/sections', { name, examQuestions }),
  enroll: (id) => api.post(`/sections/${id}/enroll`),
  getExam: (id) => api.get(`/sections/${id}/exam`),
  assessExam: (id, answers) => api.post(`/sections/${id}/exam/assess`, { answers }),
  getLectures: (id) => api.get(`/sections/${id}/lectures`),
  uploadLecture: (id, formData) => api.post(`/sections/${id}/lectures/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getLecture: (id, title) => api.get(`/sections/${id}/lectures/${encodeURIComponent(title)}`),
  deleteLecture: (id, title) => api.delete(`/sections/${id}/lectures/${encodeURIComponent(title)}`),
  getNotifications: (id) => api.get(`/sections/${id}/notifications`),
  ask: (id, title, question, chatHistory) => api.post(`/sections/${id}/lectures/${encodeURIComponent(title)}/ask`, { question, chatHistory }),
  quiz: (id, title, numQuestions) => api.post(`/sections/${id}/lectures/${encodeURIComponent(title)}/quiz`, { numQuestions }),
  getStudents: (id) => api.get(`/sections/${id}/students`),
};

export default api;
