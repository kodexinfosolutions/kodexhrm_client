import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Switch,
  Button,
  message,
  Row,
  Col,
  Checkbox,
  Typography,
  Select,
  Table,
  Space,
  Spin,
  Upload,
  Modal,
  Tag,
  Popconfirm,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UserAddOutlined,
  EditOutlined,
  KeyOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  StopOutlined,
  CloudServerOutlined,
  SyncOutlined,
  DisconnectOutlined,
  GoogleOutlined,
} from '@ant-design/icons';
import {
  getAdminSettings,
  updateAdminSettings,
  getRolePermissions,
  updateRolePermissions,
  getUserPermissions,
  updateUserPermissions,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getGoogleDriveStatus,
  getGoogleDriveConnectUrl,
  disconnectGoogleDrive,
  syncAllGoogleDriveDocuments,
} from '../modules/settings/settings.service';
import { getAllStaff } from '../modules/staff/staff.service';
import RolePermissionsManager from '../components/RolePermissionsManager';
import UserPermissionOverridesManager from '../components/UserPermissionOverridesManager';

const AdminSettings = () => {
  const DOCUMENT_ASSET_FIELDS = [
    { key: 'schoolLogo', label: 'Enterprise / Company Logo' },
    { key: 'principalSignature', label: 'Managing Director / Unit Head Signature' },
    { key: 'hrSignature', label: 'Head of HR Signature' },
    { key: 'chairmanSignature', label: 'Chairman / Executive Director Signature' },
    { key: 'accountantSignature', label: 'Finance & Accounts Head Signature' },
    { key: 'managerSignature', label: 'Plant / Operations Manager Signature' },
    { key: 'rubberStamp', label: 'Official Corporate Seal / Rubber Stamp' },
  ];

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsConfig, setPermissionsConfig] = useState({
    roles: [],
    permissions: [],
    rolePermissions: {},
  });
  const [userPermissionsLoading, setUserPermissionsLoading] = useState(false);
  const [userPermissionsSaving, setUserPermissionsSaving] = useState(false);
  const [userPermissionsConfig, setUserPermissionsConfig] = useState({
    users: [],
    permissions: [],
    userPermissionOverrides: {},
  });
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [documentAssets, setDocumentAssets] = useState({});

  // ─── USER MANAGEMENT STATE ────────────────────────────────
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [userModalMode, setUserModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFormSubmitting, setUserFormSubmitting] = useState(false);
  const [userForm] = Form.useForm();

  // ─── GOOGLE DRIVE INTEGRATION STATE ──────────────────────
  const [gdriveStatus, setGdriveStatus] = useState({ connected: false });
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [gdriveConnecting, setGdriveConnecting] = useState(false);
  const [gdriveSyncing, setGdriveSyncing] = useState(false);
  const [gdriveDisconnecting, setGdriveDisconnecting] = useState(false);
  const [gdriveSyncResult, setGdriveSyncResult] = useState(null);


  const normalizeAssetSrc = (value) => {
    if (!value) return "";
    let src = String(value).trim();
    if (!src) return "";
    if (
      src.startsWith("data:image") ||
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("blob:") ||
      src.startsWith("/erp/api/")
    ) {
      return src;
    }
    src = src.replace(/\\/g, "/");
    if (src.includes("Student_Documents/")) {
      return `/erp/api/student_documents/${src.split("Student_Documents/")[1]}`;
    }
    if (src.includes("Staff_Documents/")) {
      return `/erp/api/staff_documents/${src.split("Staff_Documents/")[1]}`;
    }
    if (src.includes("uploads/")) {
      return `/erp/api/uploads/${src.split("uploads/")[1]}`;
    }
    const normalized = src.replace(/^\/+/, "");
    return `/erp/api/${normalized}`;
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = typeof reader.result === 'string' ? reader.result.trim() : reader.result;
      resolve(res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleDocumentAssetUpload = async (assetKey, file) => {
    try {
      if (!file?.type?.startsWith('image/')) {
        message.error('Only image files are allowed');
        return Upload.LIST_IGNORE;
      }
      const base64 = await toBase64(file);
      setDocumentAssets((prev) => {
        const next = { ...prev, [assetKey]: base64 };
        if (assetKey === 'schoolLogo') next.companyLogo = base64;
        return next;
      });
      message.success('Image uploaded. Click "Save Settings" to apply globally.');
    } catch {
      message.error('Failed to process image');
    }
    return false;
  };

  const clearDocumentAsset = (assetKey) => {
    setDocumentAssets((prev) => {
      const next = { ...prev, [assetKey]: '' };
      if (assetKey === 'schoolLogo') next.companyLogo = '';
      return next;
    });
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getAdminSettings();
      const sanitized = {
        enableFeesModule: true,
        enableStaffModule: true,
        enableShiftModule: true,
        enableBiometricModule: true,
        ...data,
        schoolName:
          data?.schoolName &&
          !data.schoolName.toLowerCase().includes('matriculation') &&
          !data.schoolName.toLowerCase().includes('school')
            ? data.schoolName
            : (data?.companyName || 'TEXTILE MANUFACTURING MILLS PRIVATE LIMITED'),
        schoolCode:
          data?.schoolCode && data.schoolCode !== 'PSF'
            ? data.schoolCode
            : (data?.companyCode || 'TEX-MILL'),
        academicYear: data?.financialYear || data?.academicYear || '2026-2027',
        address: data?.address || 'SF No. 124/2, Mill Road, Avinashi, Tirupur, Tamil Nadu - 641602',
        gstin: data?.gstin || '33AAAAA0000A1Z5',
        cinNo: data?.cinNo || 'U17111TZ2020PTC012345',
      };
      form.setFieldsValue(sanitized);
      setDocumentAssets(data?.documentAssets || {});
    } catch {
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      setPermissionsLoading(true);
      const data = await getRolePermissions();
      setPermissionsConfig({
        roles: data.roles || [],
        permissions: data.permissions || [],
        rolePermissions: data.rolePermissions || {},
      });
    } catch {
      message.error('Failed to load role permissions');
    } finally {
      setPermissionsLoading(false);
    }
  };

  const loadUserPermissions = async () => {
    try {
      setUserPermissionsLoading(true);
      const data = await getUserPermissions();
      const nonStudentUsers = (data.users || []).filter(u => u.role !== 'STUDENT');
      
      let overrides = data.userPermissionOverrides || {};
      if (Array.isArray(overrides)) {
        overrides = overrides.reduce((acc, curr) => {
          if (curr && curr.userId) acc[curr.userId] = curr;
          // also handle if it's just id or user_id
          else if (curr && curr.id) acc[curr.id] = curr;
          return acc;
        }, {});
      }

      setUserPermissionsConfig({
        users: nonStudentUsers,
        permissions: data.permissions || [],
        userPermissionOverrides: overrides,
      });
      if (!selectedUserId && nonStudentUsers.length > 0) {
        setSelectedUserId(String(nonStudentUsers[0].id));
      }
    } catch {
      message.error('Failed to load user permission overrides');
    } finally {
      setUserPermissionsLoading(false);
    }
  };

  const loadUsersList = async () => {
    try {
      setUsersLoading(true);
      const data = await getUsers();
      setUsersList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load users list:', err);
      message.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadStaffOptions = async () => {
    try {
      const res = await getAllStaff({ limit: 1000 });
      const records = res?.data || (Array.isArray(res) ? res : []);
      setStaffList(records);
    } catch (err) {
      console.warn('Failed to load staff list for user linking:', err);
    }
  };

  const handleOpenCreateUser = () => {
    setUserModalMode('create');
    setSelectedUser(null);
    userForm.resetFields();
    userForm.setFieldsValue({
      role: 'STAFF',
      isActive: true,
    });
    setUserModalVisible(true);
  };

  const handleOpenEditUser = (user) => {
    setUserModalMode('edit');
    setSelectedUser(user);
    userForm.resetFields();
    userForm.setFieldsValue({
      name: user.name,
      email: user.email,
      role: user.role,
      staffId: user.staffId || undefined,
      isActive: user.isActive,
      password: '',
    });
    setUserModalVisible(true);
  };

  const handleSaveUser = async (values) => {
    try {
      setUserFormSubmitting(true);
      if (userModalMode === 'create') {
        const payload = {
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
          staffId: values.staffId || undefined,
          isActive: values.isActive !== false,
        };
        await createUser(payload);
        message.success('User account created successfully');
      } else {
        const payload = {
          name: values.name,
          email: values.email,
          role: values.role,
          staffId: values.staffId || undefined,
          isActive: values.isActive,
        };
        if (values.password && values.password.trim()) {
          payload.password = values.password.trim();
        }
        await updateUser(selectedUser.id, payload);
        message.success('User updated successfully');
      }
      setUserModalVisible(false);
      userForm.resetFields();
      loadUsersList();
      loadUserPermissions();
    } catch (err) {
      console.error('Error saving user:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to save user';
      message.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setUserFormSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      message.success(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully`);
      loadUsersList();
      loadUserPermissions();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await deleteUser(id);
      message.success('User deactivated successfully');
      loadUsersList();
      loadUserPermissions();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to deactivate user');
    }
  };

  // ─── GOOGLE DRIVE INTEGRATION HANDLERS ────────────────────
  const loadGoogleDriveStatus = async () => {
    try {
      setGdriveLoading(true);
      const status = await getGoogleDriveStatus();
      setGdriveStatus(status || { connected: false });
    } catch (err) {
      console.error('Failed to load Google Drive status:', err);
    } finally {
      setGdriveLoading(false);
    }
  };

  const handleConnectGoogleDrive = async () => {
    try {
      setGdriveConnecting(true);
      // Attempt 1: get authorization URL JSON directly
      try {
        const res = await getGoogleDriveConnectUrl();
        if (res?.url) {
          window.location.href = res.url;
          return;
        }
      } catch (e) {
        console.warn('auth-url endpoint unavailable, redirecting through connect endpoint with token:', e);
      }

      // Attempt 2: redirect through authenticated connect endpoint with JWT query token
      const token = localStorage.getItem('token');
      const connectEndpoint = `/erp/api/integrations/google-drive/connect${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.location.href = connectEndpoint;
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to initiate Google Drive connection');
      setGdriveConnecting(false);
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    try {
      setGdriveDisconnecting(true);
      await disconnectGoogleDrive();
      message.success('Google Drive disconnected successfully');
      setGdriveSyncResult(null);
      await loadGoogleDriveStatus();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to disconnect Google Drive');
    } finally {
      setGdriveDisconnecting(false);
    }
  };

  const handleSyncAllGoogleDrive = async () => {
    try {
      setGdriveSyncing(true);
      setGdriveSyncResult(null);
      const res = await syncAllGoogleDriveDocuments();
      setGdriveSyncResult(res);
      message.success(res?.message || 'Document synchronization finished');
      await loadGoogleDriveStatus();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to sync documents with Google Drive');
    } finally {
      setGdriveSyncing(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadPermissions();
    loadUserPermissions();
    loadUsersList();
    loadStaffOptions();
    loadGoogleDriveStatus();

    // Check if redirected back from Google OAuth callback
    const searchParams = new URLSearchParams(window.location.search);
    const gdriveSuccess = searchParams.get('gdrive_success');
    const gdriveError = searchParams.get('gdrive_error');
    const gdriveEmail = searchParams.get('email');

    if (gdriveSuccess === 'true') {
      message.success(`Google Drive connected successfully${gdriveEmail ? ` (${gdriveEmail})` : ''}!`);
      // Clean up query parameters from URL without reloading
      const newUrl = window.location.pathname + (searchParams.get('page') ? `?page=${searchParams.get('page')}` : '');
      window.history.replaceState({}, '', newUrl);
      loadGoogleDriveStatus();
    } else if (gdriveError) {
      message.error(`Google Drive connection error: ${decodeURIComponent(gdriveError)}`);
      const newUrl = window.location.pathname + (searchParams.get('page') ? `?page=${searchParams.get('page')}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFinish = async (values) => {
    try {
      setSaving(true);
      
      // Strip documentAssets from values if it was accidentally included via setFieldsValue
      const { documentAssets: _ignored, ...settingsPayload } = values;

      const updatedPayload = {
        ...settingsPayload,
        schoolName: settingsPayload.schoolName,
        companyName: settingsPayload.schoolName,
        schoolCode: settingsPayload.schoolCode,
        companyCode: settingsPayload.schoolCode,
        academicYear: settingsPayload.academicYear,
        financialYear: settingsPayload.academicYear,
        documentAssets,
      };

      await updateAdminSettings(updatedPayload);
      message.success('Enterprise settings updated successfully');
      window.dispatchEvent(new CustomEvent('admin-settings-updated', { detail: updatedPayload }));
      await loadSettings();
    } catch (err) {
      const serverMessage = err?.response?.data?.message || '';
      const isDocumentAssetsError = typeof serverMessage === 'string' && 
        serverMessage.toLowerCase().includes('documentassets') && 
        serverMessage.toLowerCase().includes('should not exist');

      if (isDocumentAssetsError) {
        console.warn('Backend rejected documentAssets, retrying without it...');
        try {
          const { documentAssets: _ignored, ...settingsPayload } = values;
          await updateAdminSettings(settingsPayload);
          message.success('Settings updated (Signatures were not changed)');
          await loadSettings();
          return;
        } catch (retryErr) {
          message.error(retryErr?.response?.data?.message || 'Failed to update settings');
          return;
        }
      }

      message.error(serverMessage || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const onRolePermissionChange = (role, checkedPermissions) => {
    setPermissionsConfig((prev) => ({
      ...prev,
      rolePermissions: {
        ...prev.rolePermissions,
        [role]: checkedPermissions,
      },
    }));
  };

  const onSavePermissions = async () => {
    try {
      setPermissionsSaving(true);
      await updateRolePermissions({ rolePermissions: permissionsConfig.rolePermissions });
      message.success('Role permissions updated');
      await loadPermissions();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to update role permissions');
    } finally {
      setPermissionsSaving(false);
    }
  };


  const onUserOverrideChange = (key, values) => {
    if (!selectedUserId) return;
    setUserPermissionsConfig((prev) => ({
      ...prev,
      userPermissionOverrides: {
        ...prev.userPermissionOverrides,
        [selectedUserId]: {
          grants: key === 'grants' ? values : prev.userPermissionOverrides?.[selectedUserId]?.grants || [],
          revokes: key === 'revokes' ? values : prev.userPermissionOverrides?.[selectedUserId]?.revokes || [],
        },
      },
    }));
  };

  const onSaveUserPermissions = async () => {
    if (!selectedUserId) {
      message.error('Select a user');
      return;
    }
    try {
      setUserPermissionsSaving(true);
      const override = userPermissionsConfig.userPermissionOverrides?.[selectedUserId] || {
        grants: [],
        revokes: [],
      };
      await updateUserPermissions(selectedUserId, override);
      message.success('User permission override updated');
      await loadUserPermissions();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to update user permissions');
    } finally {
      setUserPermissionsSaving(false);
    }
  };

  return (
    <div>
      {/* Editorial page header */}
      <div style={{ marginBottom: 32 }}>
        <div className="page-breadcrumb">
          <span>System</span>
          <span style={{ fontSize: 14 }}>›</span>
          <span style={{ color: '#00152a', fontWeight: 700 }}>Settings</span>
        </div>
        <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 28, fontWeight: 800, color: '#00152a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Enterprise Admin Settings
        </h2>
        <p style={{ color: '#43474d', fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
          Configure enterprise profile, operating units, core HR modules, and executive authorizations.
        </p>
      </div>

      {/* Enterprise Configuration Section */}
      <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ width: 3, height: 28, background: '#00152a', borderRadius: 9999, display: 'inline-block' }} />
            <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>Enterprise & Organization Configuration</h4>
          </div>
          <Spin spinning={loading}>
         <Form
  form={form}
  layout="vertical"
  onFinish={onFinish}
  initialValues={{
    schoolName: 'TEXTILE MANUFACTURING MILLS PRIVATE LIMITED',
    schoolCode: 'TEX-MILL',
    academicYear: '2026-2027',
    address: 'SF No. 124/2, Mill Road, Avinashi, Tirupur, Tamil Nadu - 641602',
    gstin: '33AAAAA0000A1Z5',
    cinNo: 'U17111TZ2020PTC012345',
    requireApprovalForAdmission: false,
    allowAdmissionEditAfterApproval: false,
    admissionNoAutoGenerate: true,
    enableIndividualDemotion: false,
    enableFeesModule: true,
    enableStaffModule: true,
    enableShiftModule: true,
    enableBiometricModule: true,
  }}
>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="schoolName" label="Company / Enterprise Name" rules={[{ required: true, message: 'Required' }]}>
                  <Input placeholder="e.g. TEXTILE MANUFACTURING MILLS PRIVATE LIMITED" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="schoolCode" label="Organization / Unit Code" rules={[{ required: true, message: 'Required' }]}>
                  <Input placeholder="e.g. TEX-MILL" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="academicYear" label="Financial / Fiscal Year" rules={[{ required: true, message: 'Required' }]}>
                  <Input placeholder="2026-2027 (FY 2026-27)" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="address" label="Registered Plant / Office Address">
                  <Input placeholder="e.g. SF No. 124/2, Mill Road, Avinashi, Tirupur, Tamil Nadu - 641602" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="gstin" label="GSTIN / Tax ID">
                  <Input placeholder="e.g. 33AAAAA0000A1Z5" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="cinNo" label="CIN / Registration No.">
                  <Input placeholder="e.g. U17111TZ2020PTC012345" />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
              <span style={{ width: 3, height: 20, background: '#44ddc1', borderRadius: 9999, display: 'inline-block' }} />
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, color: '#43474d' }}>Workforce Onboarding & Lifecycle</span>
            </div>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="requireApprovalForAdmission" label="Require HR Approval For New Hires" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="allowAdmissionEditAfterApproval" label="Allow Profile Edit After Approval" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="admissionNoAutoGenerate" label="Auto-Generate Employee ID / Code" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="enableIndividualDemotion" label="Enable Role & Designation Reassignments" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
              <span style={{ width: 3, height: 20, background: '#44ddc1', borderRadius: 9999, display: 'inline-block' }} />
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, color: '#43474d' }}>Core Enterprise Modules</span>
            </div>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="enableStaffModule" label="Enable Staff Management Module" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="enableFeesModule" label="Enable Payroll & Statutory Module" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="enableShiftModule" label="Enable Shift Management Module" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="enableBiometricModule" label="Enable Biometric / eSSL Integration" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
              <span style={{ width: 3, height: 20, background: '#44ddc1', borderRadius: 9999, display: 'inline-block' }} />
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, color: '#43474d' }}>Executive Signatures & Corporate Authorization Seal</span>
            </div>

            <Row gutter={[16, 16]}>
              {DOCUMENT_ASSET_FIELDS.map((asset) => {
                const imgSrc = normalizeAssetSrc(documentAssets?.[asset.key]);
                return (
                  <Col span={8} key={asset.key}>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fafafa' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>{asset.label}</div>
                      <div style={{ height: 80, borderRadius: 8, border: '1px dashed #d1d5db', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden' }}>
                        {imgSrc ? (
                          <img src={imgSrc} alt={asset.label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>No image uploaded</span>
                        )}
                      </div>
                      <Space>
                        <Upload
                          showUploadList={false}
                          accept="image/*"
                          beforeUpload={(file) => handleDocumentAssetUpload(asset.key, file)}
                        >
                          <Button size="small">Upload</Button>
                        </Upload>
                        <Button size="small" danger onClick={() => clearDocumentAsset(asset.key)} disabled={!imgSrc}>
                          Remove
                        </Button>
                      </Space>
                    </div>
                  </Col>
                );
              })}
            </Row>

            <Button type="primary" htmlType="submit" loading={saving}>
              Save Settings
            </Button>
          </Form>
          </Spin>
        </div>
      </div>

      {/* Google Drive Cloud Integration Section */}
      <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 3, height: 28, background: '#00152a', borderRadius: 9999, display: 'inline-block' }} />
              <div>
                <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GoogleOutlined style={{ color: '#4285F4', fontSize: 20 }} />
                  Google Drive Cloud Integration
                </h4>
              </div>
            </div>
            <div>
              <Button
                icon={<ReloadOutlined />}
                size="small"
                onClick={loadGoogleDriveStatus}
                loading={gdriveLoading}
              >
                Refresh Status
              </Button>
            </div>
          </div>
          <p style={{ color: '#43474d', fontSize: 13, marginBottom: 20, fontFamily: "'Public Sans', sans-serif" }}>
            Connect company Google Drive to securely archive employee records, appointment letters, certificates, and ID proofs.
          </p>

          <Spin spinning={gdriveLoading}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, background: '#f8fafc' }}>
              <Row gutter={[24, 16]} align="middle">
                <Col xs={24} md={14}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: gdriveStatus?.connected ? '#ecfdf5' : '#f1f5f9',
                        border: `1px solid ${gdriveStatus?.connected ? '#a7f3d0' : '#cbd5e1'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CloudServerOutlined
                        style={{
                          fontSize: 24,
                          color: gdriveStatus?.connected ? '#059669' : '#64748b',
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Status:</span>
                        {gdriveStatus?.connected ? (
                          <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                            Connected
                          </Tag>
                        ) : (
                          <Tag color="default" style={{ padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                            Not Connected
                          </Tag>
                        )}
                      </div>

                      {gdriveStatus?.connected ? (
                        <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                          <div>
                            <span style={{ fontWeight: 600, color: '#475569' }}>Connected Account: </span>
                            <span style={{ color: '#0369a1', fontWeight: 600 }}>{gdriveStatus.email || 'N/A'}</span>
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: '#475569' }}>Root Folder: </span>
                            <span>{gdriveStatus.rootFolderName || 'Kodex HRM'}</span>
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: '#475569' }}>Connected Date: </span>
                            <span>
                              {gdriveStatus.connectedAt
                                ? new Date(gdriveStatus.connectedAt).toLocaleString()
                                : 'N/A'}
                            </span>
                          </div>
                          {gdriveStatus.lastSyncAt && (
                            <div>
                              <span style={{ fontWeight: 600, color: '#475569' }}>Last Synchronized: </span>
                              <span>{new Date(gdriveStatus.lastSyncAt).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                          No Google account is currently linked. Click the button to grant permissions for document archiving.
                        </p>
                      )}
                    </div>
                  </div>
                </Col>

                <Col xs={24} md={10} style={{ textAlign: 'right' }}>
                  <Space wrap size="middle">
                    {!gdriveStatus?.connected ? (
                      <Button
                        type="primary"
                        icon={<GoogleOutlined />}
                        onClick={handleConnectGoogleDrive}
                        loading={gdriveConnecting}
                        style={{
                          background: '#051c33',
                          borderColor: '#051c33',
                          fontWeight: 600,
                          height: 40,
                          padding: '0 20px',
                          borderRadius: 8,
                        }}
                      >
                        Connect Google Drive
                      </Button>
                    ) : (
                      <>
                        <Button
                          icon={<SyncOutlined spin={gdriveSyncing} />}
                          onClick={handleSyncAllGoogleDrive}
                          loading={gdriveSyncing}
                          style={{
                            borderColor: '#0284c7',
                            color: '#0284c7',
                            fontWeight: 600,
                            height: 40,
                            borderRadius: 8,
                          }}
                        >
                          Sync Existing Documents
                        </Button>
                        <Popconfirm
                          title="Disconnect Google Drive?"
                          description="Are you sure you want to disconnect Google Drive? Automatic document backups will be paused."
                          onConfirm={handleDisconnectGoogleDrive}
                          okText="Disconnect"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            danger
                            icon={<DisconnectOutlined />}
                            loading={gdriveDisconnecting}
                            style={{ height: 40, borderRadius: 8, fontWeight: 600 }}
                          >
                            Disconnect
                          </Button>
                        </Popconfirm>
                      </>
                    )}
                  </Space>
                </Col>
              </Row>

              {/* Sync result details */}
              {gdriveSyncResult && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e2e8f0', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontWeight: 600 }}>
                    <CheckCircleOutlined />
                    <span>{gdriveSyncResult.message || 'Sync operation completed successfully.'}</span>
                  </div>
                  {(gdriveSyncResult.syncedCount !== undefined || gdriveSyncResult.totalPending !== undefined) && (
                    <div style={{ marginTop: 4, color: '#64748b' }}>
                      Processed: {gdriveSyncResult.syncedCount || 0} / {gdriveSyncResult.totalPending || 0} document(s)
                      {gdriveSyncResult.failedCount ? ` (${gdriveSyncResult.failedCount} failed)` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Spin>
        </div>
      </div>

      {/* Role Permissions Section */}
      <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ width: 3, height: 28, background: '#00152a', borderRadius: 9999, display: 'inline-block' }} />
            <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>Role Permissions</h4>
          </div>
          <p style={{ color: '#43474d', fontSize: 13, marginBottom: 20, fontFamily: "'Public Sans', sans-serif" }}>
            Configure predefined permissions per role. Changes apply to future authorization checks and new logins.
          </p>

          <Spin spinning={permissionsLoading}>
            <RolePermissionsManager 
              roles={permissionsConfig.roles}
              permissions={permissionsConfig.permissions}
              rolePermissions={permissionsConfig.rolePermissions}
              onChange={onRolePermissionChange}
              onSave={onSavePermissions}
              saving={permissionsSaving}
            />
          </Spin>
        </div>
      </div>

      {/* User Permission Overrides */}
      <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ width: 3, height: 28, background: '#00152a', borderRadius: 9999, display: 'inline-block' }} />
            <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>User Permission Overrides</h4>
          </div>
          <p style={{ color: '#43474d', fontSize: 13, marginBottom: 20, fontFamily: "'Public Sans', sans-serif" }}>
            Apply extra grants or revokes for specific users without changing their role defaults.
          </p>

          <Spin spinning={userPermissionsLoading}>
            <UserPermissionOverridesManager
              users={userPermissionsConfig.users}
              permissions={userPermissionsConfig.permissions}
              rolePermissions={permissionsConfig.rolePermissions}
              userPermissionOverrides={userPermissionsConfig.userPermissionOverrides}
              selectedUserId={selectedUserId}
              onSelectUser={setSelectedUserId}
              onChange={(type, values) => onUserOverrideChange(type, values)}
              onSave={onSaveUserPermissions}
              saving={userPermissionsSaving}
            />
          </Spin>
        </div>
      </div>

      {/* User Management Section */}
      <div style={{ background: '#f0f4f8', borderRadius: 16, padding: 4, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{ width: 3, height: 28, background: '#00152a', borderRadius: 9999, display: 'inline-block' }} />
                <h4 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 800, color: '#00152a', margin: 0 }}>
                  User Management & Access Accounts
                </h4>
              </div>
              <p style={{ color: '#43474d', fontSize: 13, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>
                Create, view, and manage administrative, HR, and staff user login credentials.
              </p>
            </div>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadUsersList} loading={usersLoading}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                style={{ background: '#00152a', borderColor: '#00152a', borderRadius: 8 }}
                onClick={handleOpenCreateUser}
              >
                Create User
              </Button>
            </Space>
          </div>

          <Spin spinning={usersLoading}>
            <Table
              dataSource={usersList}
              rowKey="id"
              pagination={{ pageSize: 8, showTotal: (total) => `Total ${total} users` }}
              columns={[
                {
                  title: 'Name',
                  dataIndex: 'name',
                  key: 'name',
                  render: (text, record) => (
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{text}</div>
                      {record.staffId && (
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          Staff ID: {record.staff?.employeeId || record.staffId}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  title: 'Email / Username',
                  dataIndex: 'email',
                  key: 'email',
                  render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
                },
                {
                  title: 'Role',
                  dataIndex: 'role',
                  key: 'role',
                  render: (role) => {
                    const colorMap = {
                      ADMIN: 'magenta',
                      HR_MANAGER: 'blue',
                      STAFF: 'cyan',
                    };
                    return <Tag color={colorMap[role] || 'default'} style={{ fontWeight: 600 }}>{role}</Tag>;
                  },
                },
                {
                  title: 'Status',
                  dataIndex: 'isActive',
                  key: 'isActive',
                  render: (isActive) => (
                    <Tag
                      icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}
                      color={isActive ? 'success' : 'error'}
                      style={{ borderRadius: 12, padding: '2px 10px' }}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </Tag>
                  ),
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  align: 'right',
                  render: (_, record) => (
                    <Space>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenEditUser(record)}
                      >
                        Edit / Reset Password
                      </Button>
                      <Popconfirm
                        title={record.isActive ? "Deactivate this user?" : "Activate this user?"}
                        description={`Are you sure you want to ${record.isActive ? 'deactivate' : 'activate'} login access for ${record.name}?`}
                        onConfirm={() => handleToggleUserStatus(record)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          size="small"
                          danger={record.isActive}
                          style={{
                            color: !record.isActive ? '#1677ff' : undefined,
                            borderColor: !record.isActive ? '#91caff' : undefined,
                          }}
                        >
                          {record.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </Popconfirm>
                      <Popconfirm
                        title="Delete user account?"
                        description={`Permanently deactivate / delete user account for ${record.name}?`}
                        onConfirm={() => handleDeleteUser(record.id)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Spin>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700 }}>
            <UserAddOutlined style={{ color: '#00152a' }} />
            <span>{userModalMode === 'create' ? 'Create New User Account' : `Edit User: ${selectedUser?.name}`}</span>
          </div>
        }
        open={userModalVisible}
        onCancel={() => {
          if (!userFormSubmitting) {
            setUserModalVisible(false);
            userForm.resetFields();
          }
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={userForm}
          layout="vertical"
          onFinish={handleSaveUser}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter user full name' }]}
          >
            <Input placeholder="e.g. John Doe" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email Address (Used for Login)"
            rules={[
              { required: true, message: 'Please enter user email address' },
              { type: 'email', message: 'Please enter a valid email address' },
            ]}
          >
            <Input placeholder="e.g. jdoe@company.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label={userModalMode === 'create' ? 'Password' : 'New Password (Leave blank to keep current)'}
            rules={[
              {
                required: userModalMode === 'create',
                message: 'Please enter a password',
              },
              {
                min: 6,
                message: 'Password must be at least 6 characters',
              },
            ]}
          >
            <Input.Password
              prefix={<KeyOutlined style={{ color: '#9ca3af' }} />}
              placeholder={userModalMode === 'create' ? 'Minimum 6 characters' : 'Enter new password or leave blank'}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="role"
                label="Assigned System Role"
                rules={[{ required: true, message: 'Please select a role' }]}
              >
                <Select placeholder="Select role">
                  <Select.Option value="ADMIN">ADMIN (Full System Privileges)</Select.Option>
                  <Select.Option value="HR_MANAGER">HR_MANAGER (Workforce & Payroll)</Select.Option>
                  <Select.Option value="STAFF">STAFF (Employee Portal Access)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="isActive"
                label="Account Status"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="Active"
                  unCheckedChildren="Inactive"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="staffId"
            label="Link to Staff Record (Optional)"
            extra="Associates this login credential with an employee profile in Staff Management."
          >
            <Select
              showSearch
              allowClear
              placeholder="Select employee profile (optional)"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={staffList.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.employeeId || 'No ID'}) - ${s.department || 'General'}`,
              }))}
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button
              onClick={() => {
                setUserModalVisible(false);
                userForm.resetFields();
              }}
              disabled={userFormSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={userFormSubmitting}
              style={{ background: '#00152a', borderColor: '#00152a' }}
            >
              {userModalMode === 'create' ? 'Create User' : 'Update User'}
            </Button>
          </div>
        </Form>
      </Modal>



    </div>
  );
};

export default AdminSettings;
