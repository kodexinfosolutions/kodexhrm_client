import React, { useState, useMemo, useEffect } from 'react';
import { Input, Button, Collapse, Checkbox, Select, Typography, Space } from 'antd';
import { SearchOutlined, CheckCircleOutlined, ExpandAltOutlined, ShrinkOutlined, StopOutlined } from '@ant-design/icons';
import { parsePermission } from '../utils/permissionUtils';

const { Panel } = Collapse;
const { Text } = Typography;

const RolePermissionsManager = ({
  roles,
  permissions,
  rolePermissions,
  onChange,
  onSave,
  saving
}) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKeys, setExpandedKeys] = useState([]);

  useEffect(() => {
    if (roles?.length > 0 && !selectedRole) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedRole(roles[0]);
    }
  }, [roles, selectedRole]);

  // Group permissions by Module -> Page
  const groupedPermissions = useMemo(() => {
    const groups = {}; // { [moduleName]: { [pageName]: [perms] } }
    permissions.forEach(p => {
      const parsed = parsePermission(p);
      if (!groups[parsed.module]) groups[parsed.module] = {};
      if (!groups[parsed.module][parsed.page]) groups[parsed.module][parsed.page] = [];
      groups[parsed.module][parsed.page].push(parsed);
    });
    return groups;
  }, [permissions]);

  // Filter modules/pages based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery) return groupedPermissions;

    const query = searchQuery.toLowerCase();
    const result = {};

    Object.keys(groupedPermissions).forEach(moduleName => {
      const moduleMatches = moduleName.toLowerCase().includes(query);
      const pages = groupedPermissions[moduleName];
      const matchedPages = {};

      Object.keys(pages).forEach(pageName => {
        const pageMatches = pageName.toLowerCase().includes(query);
        const matchedPerms = pages[pageName].filter(p =>
          p.action.toLowerCase().includes(query) || p.raw.toLowerCase().includes(query)
        );

        if (moduleMatches || pageMatches || matchedPerms.length > 0) {
          matchedPages[pageName] = (moduleMatches || pageMatches) ? pages[pageName] : matchedPerms;
        }
      });

      if (Object.keys(matchedPages).length > 0) {
        result[moduleName] = matchedPages;
      }
    });

    return result;
  }, [groupedPermissions, searchQuery]);

  // Sync expanded keys when search changes
  useEffect(() => {
    if (searchQuery) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedKeys(Object.keys(filteredModules));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedKeys([]);
    }
  }, [searchQuery, filteredModules]);

  const currentRolePermissions = selectedRole ? (rolePermissions[selectedRole] || []) : [];

  const handleRoleChange = (role) => {
    setSelectedRole(role);
  };

  const togglePermission = (rawPerm) => {
    if (!selectedRole) return;
    const isChecked = currentRolePermissions.includes(rawPerm);
    let newPerms;
    if (isChecked) {
      newPerms = currentRolePermissions.filter(p => p !== rawPerm);
    } else {
      newPerms = [...currentRolePermissions, rawPerm];
    }
    onChange(selectedRole, newPerms);
  };

  const togglePageAll = (moduleName, pageName, e) => {
    e.stopPropagation();
    if (!selectedRole) return;
    
    const pagePerms = groupedPermissions[moduleName][pageName].map(p => p.raw);
    const hasAll = pagePerms.every(p => currentRolePermissions.includes(p));

    let newPerms = [...currentRolePermissions];
    if (hasAll) {
      newPerms = newPerms.filter(p => !pagePerms.includes(p));
    } else {
      pagePerms.forEach(p => {
        if (!newPerms.includes(p)) newPerms.push(p);
      });
    }
    onChange(selectedRole, newPerms);
  };

  const toggleModuleAll = (moduleName, e) => {
    e.stopPropagation();
    if (!selectedRole) return;

    const modulePerms = Object.values(groupedPermissions[moduleName])
      .flat()
      .map(p => p.raw);
      
    const hasAll = modulePerms.every(p => currentRolePermissions.includes(p));

    let newPerms = [...currentRolePermissions];
    if (hasAll) {
      newPerms = newPerms.filter(p => !modulePerms.includes(p));
    } else {
      modulePerms.forEach(p => {
        if (!newPerms.includes(p)) newPerms.push(p);
      });
    }
    onChange(selectedRole, newPerms);
  };

  const grantAll = () => {
    if (!selectedRole) return;
    onChange(selectedRole, [...permissions]);
  };

  const removeAll = () => {
    if (!selectedRole) return;
    onChange(selectedRole, []);
  };

  const expandAll = () => {
    setExpandedKeys(Object.keys(groupedPermissions));
  };

  const collapseAll = () => {
    setExpandedKeys([]);
  };

  if (!roles || roles.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Bar: Role Select and Global Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: '#f8fafc', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <Space size="large" align="center">
          <div>
            <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Editing Role</Text>
            <Select
              style={{ width: 200 }}
              value={selectedRole}
              onChange={handleRoleChange}
              options={roles.map(r => ({ value: r, label: r }))}
              size="large"
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>Search</Text>
            <Input
              placeholder="Search permissions..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: 250 }}
              allowClear
              size="large"
            />
          </div>
        </Space>

        <Space>
          <Button icon={<ExpandAltOutlined />} onClick={expandAll}>Expand All</Button>
          <Button icon={<ShrinkOutlined />} onClick={collapseAll}>Collapse All</Button>
          <Button icon={<CheckCircleOutlined />} onClick={grantAll} style={{ color: '#16a34a', borderColor: '#16a34a' }}>Grant All</Button>
          <Button icon={<StopOutlined />} onClick={removeAll} danger>Remove All</Button>
        </Space>
      </div>

      {/* Modules Accordion */}
      <Collapse
        activeKey={expandedKeys}
        onChange={setExpandedKeys}
        expandIconPosition="end"
        style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}
      >
        {Object.entries(filteredModules).map(([moduleName, pages]) => {
          const allModuleRawPerms = Object.values(groupedPermissions[moduleName]).flat().map(p => p.raw);
          const selectedModuleCount = allModuleRawPerms.filter(p => currentRolePermissions.includes(p)).length;
          const totalModuleCount = allModuleRawPerms.length;
          const isModuleAllSelected = selectedModuleCount === totalModuleCount && totalModuleCount > 0;
          const isModuleIndeterminate = selectedModuleCount > 0 && selectedModuleCount < totalModuleCount;

          return (
            <Panel
              key={moduleName}
              header={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Text strong style={{ fontSize: 16, color: '#1e293b' }}>{moduleName}</Text>
                    <div style={{ background: selectedModuleCount === totalModuleCount ? '#dcfce7' : '#f1f5f9', color: selectedModuleCount === totalModuleCount ? '#166534' : '#475569', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                      {selectedModuleCount} / {totalModuleCount}
                    </div>
                  </div>
                  <Checkbox
                    checked={isModuleAllSelected}
                    indeterminate={isModuleIndeterminate}
                    onClick={(e) => toggleModuleAll(moduleName, e)}
                  >
                    Select All
                  </Checkbox>
                </div>
              }
              style={{ background: '#fff', marginBottom: 8, border: '1px solid #e2e8f0', borderRadius: 8 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
                {Object.entries(pages).map(([pageName, perms]) => {
                  const allPageRawPerms = groupedPermissions[moduleName][pageName].map(p => p.raw);
                  const selectedPageCount = allPageRawPerms.filter(p => currentRolePermissions.includes(p)).length;
                  const totalPageCount = allPageRawPerms.length;
                  const isPageAllSelected = selectedPageCount === totalPageCount && totalPageCount > 0;
                  const isPageIndeterminate = selectedPageCount > 0 && selectedPageCount < totalPageCount;

                  return (
                    <div key={pageName} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                      {/* Page Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text strong style={{ fontSize: 14, color: '#475569' }}>{pageName}</Text>
                        <Checkbox
                          checked={isPageAllSelected}
                          indeterminate={isPageIndeterminate}
                          onChange={(e) => togglePageAll(moduleName, pageName, e)}
                          style={{ fontSize: 13, color: '#64748b' }}
                        >
                          Select All
                        </Checkbox>
                      </div>

                      {/* Action Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {perms.map(p => {
                          const isChecked = currentRolePermissions.includes(p.raw);
                          return (
                            <div
                              key={p.raw}
                              onClick={() => togglePermission(p.raw)}
                              style={{
                                padding: '4px 12px',
                                borderRadius: 20,
                                border: `1px solid ${isChecked ? '#2563eb' : '#cbd5e1'}`,
                                background: isChecked ? '#eff6ff' : '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.2s',
                                userSelect: 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (!isChecked) Object.assign(e.currentTarget.style, { background: '#f1f5f9', borderColor: '#94a3b8' })
                              }}
                              onMouseLeave={(e) => {
                                if (!isChecked) Object.assign(e.currentTarget.style, { background: '#fff', borderColor: '#cbd5e1' })
                              }}
                            >
                              <Checkbox checked={isChecked} style={{ pointerEvents: 'none' }} />
                              <Text style={{ color: isChecked ? '#1e40af' : '#334155', fontWeight: isChecked ? 600 : 400, fontSize: 13 }}>{p.action}</Text>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          );
        })}
      </Collapse>

      {/* Sticky Action Bar */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        background: '#fff',
        padding: '16px 24px',
        borderTop: '1px solid #e2e8f0',
        borderRadius: '0 0 14px 14px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 12,
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)',
        zIndex: 10
      }}>
        <Button size="large" onClick={() => onChange(selectedRole, rolePermissions[selectedRole] || [])}>Reset</Button>
        <Button size="large" type="primary" onClick={onSave} loading={saving}>Save Changes</Button>
      </div>
    </div>
  );
};

export default RolePermissionsManager;
