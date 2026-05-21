function getApiBaseCandidates() {
  const configuredBase = import.meta.env.VITE_API_BASE_URL;
  if (configuredBase) return [configuredBase];

  if (typeof window === 'undefined') {
    return ['http://localhost/monitoring-system-app/backend/monitoring_api/api'];
  }

  const { origin, hostname, port } = window.location;
  const apacheBase = `${window.location.protocol}//${hostname}/monitoring-system-app/backend/monitoring_api/api`;
  const legacyApacheBase = `${window.location.protocol}//${hostname}/monitoring_api/api`;

  if (port === '5173') {
    return ['/api', apacheBase, legacyApacheBase];
  }

  return [
    `${origin}/monitoring-system-app/backend/monitoring_api/api`,
    '/monitoring-system-app/backend/monitoring_api/api',
    `${origin}/monitoring_api/api`,
    '/monitoring_api/api',
    '/api'
  ];
}

const API_BASE_CANDIDATES = getApiBaseCandidates();

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  let payload;

  if (isJson) {
    const text = await response.text();
    payload = text ? JSON.parse(text) : null;
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload?.message
        ? payload.message
        : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function fetchFromApiBases(endpoint, options) {
  let lastError = null;

  for (const base of API_BASE_CANDIDATES) {
    try {
      const response = await fetch(`${base}${endpoint}`, options);
      return await parseResponse(response);
    } catch (error) {
      lastError = error;
      if (!String(error.message).includes('HTTP 404')) {
        throw error;
      }
    }
  }

  throw lastError || new Error('API request failed');
}

async function request(endpoint, options = {}) {
  return fetchFromApiBases(endpoint, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers,
    },
  });
}

async function requestForm(endpoint, formData) {
  return fetchFromApiBases(endpoint, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
}

// Auth
export const login = (email, password) =>
  request('/login_api.php', {
    method: 'POST',
    body: new URLSearchParams({ email, password }),
  });

export const register = (data) =>
  request('/register_api.php', {
    method: 'POST',
    body: new URLSearchParams(data),
  });

export const googleAuth = (data) =>
  request('/google_auth.php', {
    method: 'POST',
    body: new URLSearchParams(data),
  });

export const updateProfile = (formData) =>
  requestForm('/update_profile.php', formData);

// Student
export const getStudentMonitoring = (lab = 'all') =>
  request(`/get_student_monitoring.php?lab=${lab}`);

export const getAvailablePCs = (monitoringId) =>
  request(`/get_available_pcs.php?monitoring_id=${monitoringId}`);

export const checkin = (monitoringId, pcId, studentId) =>
  request('/checkin.php', {
    method: 'POST',
    body: new URLSearchParams({ 
      monitoring_id: monitoringId, 
      pc_id: pcId, 
      student_id: studentId,
      user_id: studentId,
      users_id: studentId,
    }),
  });

export const createPrivateSession = (data) => {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(item => params.append(`${key}[]`, item));
    } else if (value !== undefined && value !== null) {
      params.append(key, value);
    }
  });
  return request('/create_private_session.php', {
    method: 'POST',
    body: params,
  });
};

export const getMySessions = () => request('/get_my_sessions.php');

// Instructor
export const getInstructorMonitoring = () => request('/get_instructor_monitoring.php');

export const createMonitoring = (formData) =>
  requestForm('/create_monitoring.php', formData);

export const getAttendance = (monitoringId) =>
  request(`/get_attendance.php?monitoring_id=${monitoringId}`);

export const getStudentsBySection = ({ course, year_level, section }) =>
  request(`/get_students_by_section.php?course=${encodeURIComponent(course)}&year_level=${encodeURIComponent(year_level)}&section=${encodeURIComponent(section)}`);

// Custodian
export const getAllMonitoring = (lab = 'all') =>
  request(`/get_monitoring.php?lab=${lab}`);

export const deleteMonitoring = (monitoringId) =>
  request('/delete_monitoring.php', {
    method: 'POST',
    body: new URLSearchParams({ monitoring_id: monitoringId }),
  });

  // User management (for custodian)
export const getUsers = () => request('/get_users.php');

export const getReport = (date, includePrivate = true) =>
  request(`/get_report.php?date=${encodeURIComponent(date)}&include_private=${includePrivate ? '1' : '0'}`);

export const deleteUser = (userId) =>
  request('/delete_user.php', {
    method: 'POST',
    body: new URLSearchParams({ user_id: userId, users_id: userId }),
  });
