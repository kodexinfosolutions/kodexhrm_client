import axios from '../../utils/axios';

export const getAdminSettings = async () => {
  const res = await axios.get('/settings/admin');
  return res.data;
};

export const updateAdminSettings = async (payload) => {
  const res = await axios.put('/settings/admin', payload);
  return res.data;
};

export const getRolePermissions = async () => {
  const res = await axios.get('/settings/permissions');
  return res.data;
};

export const updateRolePermissions = async (payload) => {
  const res = await axios.put('/settings/permissions', payload);
  return res.data;
};

export const getUserPermissions = async () => {
  const res = await axios.get('/settings/user-permissions');
  return res.data;
};

export const updateUserPermissions = async (userId, payload) => {
  const res = await axios.put(`/settings/user-permissions/${userId}`, payload);
  return res.data;
};

export const getFeeReceiptFields = async () => {
  const res = await axios.get('/settings/fee-receipt-fields');
  return res.data;
};

export const updateFeeReceiptFields = async (payload) => {
  const res = await axios.put('/settings/fee-receipt-fields', payload);
  return res.data;
};

// ─── USER MANAGEMENT ─────────────────────────────────
export const getUsers = async () => {
  const res = await axios.get('/users');
  return res.data;
};

export const createUser = async (payload) => {
  const res = await axios.post('/users', payload);
  return res.data;
};

export const updateUser = async (id, payload) => {
  const res = await axios.put(`/users/${id}`, payload);
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await axios.delete(`/users/${id}`);
  return res.data;
};

// ─── GOOGLE DRIVE INTEGRATION ────────────────────────
export const getGoogleDriveStatus = async () => {
  const res = await axios.get('/integrations/google-drive/status');
  return res.data;
};

export const getGoogleDriveConnectUrl = async () => {
  const res = await axios.get('/integrations/google-drive/auth-url');
  return res.data;
};

export const disconnectGoogleDrive = async () => {
  const res = await axios.delete('/integrations/google-drive/disconnect');
  return res.data;
};

export const syncAllGoogleDriveDocuments = async () => {
  const res = await axios.post('/integrations/google-drive/sync-all');
  return res.data;
};

