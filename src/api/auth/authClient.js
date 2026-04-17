import axios from "axios";
import { clearAuthState } from "../../utils/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

const parseStoredToken = (storedToken) => {
  if (!storedToken) return null;

  try {
    const parsed = JSON.parse(storedToken);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return null;
  } catch {
    // legacy format: token saved as plain JWT string
    return { token: storedToken };
  }
};

const extractTokensFromPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { accessToken: null, refreshToken: null, expiresIn: null };
  }

  const tokenInfo = payload.tokenInfo ?? payload.data?.tokenInfo ?? null;
  const tokens = payload.tokens ?? payload.data?.tokens ?? null;

  const accessToken =
    payload.token ??
    payload.idToken ??
    payload.accessToken ??
    tokenInfo?.token ??
    tokenInfo?.idToken ??
    tokenInfo?.accessToken ??
    tokens?.token ??
    tokens?.idToken ??
    tokens?.accessToken ??
    null;

  const refreshToken =
    payload.refreshToken ??
    tokenInfo?.refreshToken ??
    tokens?.refreshToken ??
    null;

  const expiresIn =
    payload.expiresIn ?? tokenInfo?.expiresIn ?? tokens?.expiresIn ?? null;

  return { accessToken, refreshToken, expiresIn };
};

const getTokens = () => {
  const parsed = parseStoredToken(localStorage.getItem("token"));
  return extractTokensFromPayload(parsed);
};

const saveTokens = (tokenInfo) => {
  const existing = parseStoredToken(localStorage.getItem("token")) ?? {};
  const next = extractTokensFromPayload(tokenInfo);

  localStorage.setItem(
    "token",
    JSON.stringify({
      ...existing,
      token: next.accessToken,
      refreshToken: next.refreshToken ?? existing.refreshToken ?? null,
      expiresIn: next.expiresIn ?? existing.expiresIn ?? null,
    }),
  );
};

const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// attach fresh token on every request
authClient.interceptors.request.use((config) => {
  const { accessToken } = getTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token),
  );
  pendingQueue = [];
};

// catch 401 → refresh → retry
authClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // queue concurrent requests while refresh is in progress
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return authClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { refreshToken } = getTokens();
      if (!refreshToken) throw new Error("No refresh token available");

      const { data } = await axios.post(
        `${API_BASE_URL}/api/auth/refresh-token`,
        { refreshToken },
        { headers: { "Content-Type": "application/json" } },
      );

      const refreshedTokens = extractTokensFromPayload(data);
      if (!refreshedTokens.accessToken) {
        throw new Error("No access token returned during refresh");
      }

      saveTokens(refreshedTokens);

      processQueue(null, refreshedTokens.accessToken);

      originalRequest.headers.Authorization = `Bearer ${refreshedTokens.accessToken}`;
      return authClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAuthState();
      window.location.href = "/signin";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

async function request(path, options = {}) {
  try {
    const response = await authClient({
      url: path,
      ...options,
    });

    const payload = response.data;
    if (payload && payload.success === false) {
      const message = payload.message || "Request failed. Please try again.";
      throw new Error(message);
    }

    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Request failed. Please try again.";

    throw new Error(message);
  }
}

export { request };
