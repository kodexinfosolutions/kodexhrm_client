import React, { useState, useMemo, useEffect } from 'react';
import { Input, Button, Collapse, Select, Typography, Space, Row, Col, Segmented } from 'antd';
import { SearchOutlined, ExpandAltOutlined, ShrinkOutlined, CheckOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { parsePermission } from '../utils/permissionUtils';

const { Panel } = Collapse;
const { Text } = Typography;

const UserPermissionOverridesManager = ({
  users,
  permissions,
  rolePermissions,
  userPermissionOverrides,
  onChange,
  onSave,
  saving,
  selectedUserId,
  onSelectUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [filterMode, setFilterMode] = useState('All'); // 'All', 'Granted', 'Revoked', 'Modified'

  const selectedUser = useMemo(() => users.find(u => String(u.id) === selectedUserId), [users, selectedUserId]);
  const baseRolePermissions = useMemo(() => selectedUser ? (rolePermissions[selectedUser.role] || []) : [], [selectedUser, rolePermissions]);
  
  const currentOverrides = useMemo(() => {
    return userPermissionOverrides[selectedUserId] || { grants: [], revokes: [] };
  }, [userPermissionOverrides, selectedUserId]);

  const { grants = [], revokes = [] } = currentOverrides;

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

  // Filter modules/pages based on search query and filter mode
  const filteredModules = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const result = {};

    Object.keys(groupedPermissions).forEach(moduleName => {
      const moduleMatches = moduleName.toLowerCase().includes(query);
      const pages = groupedPermissions[moduleName];
      const matchedPages = {};

      Object.keys(pages).forEach(pageName => {
        const pageMatches = pageName.toLowerCase().includes(query);
        let matchedPerms = pages[pageName];

        // Apply Text Search
        if (query) {
          matchedPerms = matchedPerms.filter(p =>
            p.action.toLowerCase().includes(query) || p.raw.toLowerCase().includes(query)
          );
        }

        // Apply Mode Filter
        if (filterMode !== 'All') {
          matchedPerms = matchedPerms.filter(p => {
            const isGranted = grants.includes(p.raw);
            const isRevoked = revokes.includes(p.raw);
            if (filterMode === 'Granted') return isGranted;
            if (filterMode === 'Revoked') return isRevoked;
            if (filterMode === 'Modified') return isGranted || isRevoked;
            return true;
          });
        }

        // Keep page if it has matching perms, or if the page/module name matches the text search (and no mode filter is active that would hide it)
        const nameMatchesTextAndNoStrictFilter = (moduleMatches || pageMatches) && filterMode === 'All';
        
        if (matchedPerms.length > 0 || nameMatchesTextAndNoStrictFilter) {
          matchedPages[pageName] = matchedPerms.length > 0 ? matchedPerms : pages[pageName];
        }
      });

      if (Object.keys(matchedPages).length > 0) {
        result[moduleName] = matchedPages;
      }
    });

    return result;
  }, [groupedPermissions, searchQuery, filterMode, grants, revokes]);

  // Sync expanded keys when search changes
  useEffect(() => {
    if (searchQuery || filterMode !== 'All') {
      setExpandedKeys(Object.keys(filteredModules));
    } else {
      setExpandedKeys([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterMode]);

  const togglePermission = (rawPerm) => {
    if (!selectedUserId) return;
    
    const isInherited = baseRolePermissions.includes(rawPerm);
    const isGranted = grants.includes(rawPerm);
    const isRevoked = revokes.includes(rawPerm);

    let newGrants = [...grants];
    let newRevokes = [...revokes];

    if (isInherited) {
      if (isRevoked) {
        // Was revoked, now restore it
        newRevokes = newRevokes.filter(p => p !== rawPerm);
      } else {
        // Was inherited and active, now revoke it
        newRevokes.push(rawPerm);
        newGrants = newGrants.filter(p => p !== rawPerm); // cleanup just in case
      }
    } else {
      if (isGranted) {
        // Was granted, now remove grant
        newGrants = newGrants.filter(p => p !== rawPerm);
      } else {
        // Was default inactive, now grant it
        newGrants.push(rawPerm);
        newRevokes = newRevokes.filter(p => p !== rawPerm); // cleanup just in case
      }
    }

    onChange('grants', newGrants);
    onChange('revokes', newRevokes);
  };

  const getChipStyleAndIcon = (rawPerm) => {
    const isInherited = baseRolePermissions.includes(rawPerm);
    const isGranted = grants.includes(rawPerm);
    const isRevoked = revokes.includes(rawPerm);

    if (isGranted) {
      return {
        style: { background: '#dcfce7', borderColor: '#22c55e', color: '#166534', fontWeight: 600 },
        icon: <PlusOutlined style={{ fontSize: 12, marginRight: 6 }} />
      };
    }
    if (isRevoked) {
      return {
        style: { background: '#fee2e2', borderColor: '#ef4444', color: '#991b1b', fontWeight: 600 },
        icon: <MinusOutlined style={{ fontSize: 12, marginRight: 6 }} />
      };
    }
    if (isInherited) {
      return {
        style: { background: '#eff6ff', borderColor: '#3b82f6', color: '#1e40af', fontWeight: 600 },
        icon: <CheckOutlined style={{ fontSize: 12, marginRight: 6 }} />
      };
    }
    // Default (Not Inherited)
    return {
      style: { background: '#fff', borderColor: '#cbd5e1', color: '#475569', fontWeight: 400 },
      icon: null
    };
  };

  const expandAll = () => setExpandedKeys(Object.keys(groupedPermissions));
  const collapseAll = () => setExpandedKeys([]);

  const summaryStats = {
    inherited: baseRolePermissions.length,
    granted: grants.length,
    revoked: revokes.length,
    effective: baseRolePermissions.length + grants.length - revokes.length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header: User Selection & Summary */}
      <Row gutter={24}>
        <Col span={10}>
          <div style={{ background: '#f8fafc', padding: '20px 24px', borderRadius: 12, border: '1px solid #e2e8f0', height: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, display: 'block', marginBottom: 8 }}>Select User</Text>
            <Select
              style={{ width: '100%' }}
              value={selectedUserId}
              onChange={(val) => onSelectUser(String(val))}
              placeholder="Search or select user..."
              options={users.map((u) => ({
                value: String(u.id),
                label: `${u.name} (${u.email}) - ${u.role}${u.isActive ? '' : ' [Inactive]'}`,
              }))}
              showSearch
              optionFilterProp="label"
              size="large"
            />
          </div>
        </Col>
        
        {selectedUser && (
          <Col span={14}>
            <div style={{ display: 'flex', gap: 16, height: '100%' }}>
              <div style={{ flex: 1, background: '#f8fafc', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Inherited</Text>
                <Text strong style={{ fontSize: 24, color: '#3b82f6', lineHeight: 1.2 }}>✓ {summaryStats.inherited}</Text>
              </div>
              <div style={{ flex: 1, background: '#f0fdf4', padding: '16px 20px', borderRadius: 12, border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, color: '#166534' }}>Extra Granted</Text>
                <Text strong style={{ fontSize: 24, color: '#22c55e', lineHeight: 1.2 }}>+ {summaryStats.granted}</Text>
              </div>
              <div style={{ flex: 1, background: '#fef2f2', padding: '16px 20px', borderRadius: 12, border: '1px solid #fecaca', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, color: '#991b1b' }}>Revoked</Text>
                <Text strong style={{ fontSize: 24, color: '#ef4444', lineHeight: 1.2 }}>- {summaryStats.revoked}</Text>
              </div>
              <div style={{ flex: 1, background: '#1e293b', padding: '16px 20px', borderRadius: 12, border: '1px solid #0f172a', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, color: '#94a3b8' }}>Effective</Text>
                <Text strong style={{ fontSize: 24, color: '#fff', lineHeight: 1.2 }}>{summaryStats.effective}</Text>
              </div>
            </div>
          </Col>
        )}
      </Row>

      {selectedUser && (
        <>
          {/* Action Bar: Search & Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: '#f8fafc', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Space size="large" align="center">
              <div>
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
              <Segmented 
                options={['All', 'Granted']} 
                value={filterMode} 
                onChange={setFilterMode}
                size="large"
              />
            </Space>

            <Space>
              <Button icon={<ExpandAltOutlined />} onClick={expandAll}>Expand</Button>
              <Button icon={<ShrinkOutlined />} onClick={collapseAll}>Collapse</Button>
            </Space>
          </div>

          {/* Module Hierarchy */}
          <Collapse
            activeKey={expandedKeys}
            onChange={setExpandedKeys}
            expandIconPosition="end"
            style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}
          >
            {Object.entries(filteredModules).map(([moduleName, pages]) => {
              // Calculate module-level modified count
              const allModuleRawPerms = Object.values(groupedPermissions[moduleName] || {}).flat().map(p => p.raw);
              const moduleModifiedCount = allModuleRawPerms.filter(p => grants.includes(p) || revokes.includes(p)).length;

              return (
                <Panel
                  key={moduleName}
                  header={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Text strong style={{ fontSize: 16, color: '#1e293b' }}>{moduleName}</Text>
                        {moduleModifiedCount > 0 && (
                          <div style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                            {moduleModifiedCount} Modified
                          </div>
                        )}
                      </div>
                    </div>
                  }
                  style={{ background: '#fff', marginBottom: 8, border: '1px solid #e2e8f0', borderRadius: 8 }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
                    {Object.entries(pages).map(([pageName, perms]) => {
                      return (
                        <div key={pageName} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                          {/* Page Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text strong style={{ fontSize: 14, color: '#475569' }}>{pageName}</Text>
                          </div>

                          {/* Action Chips */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            {perms.map(p => {
                              const { style, icon } = getChipStyleAndIcon(p.raw);
                              return (
                                <div
                                  key={p.raw}
                                  onClick={() => togglePermission(p.raw)}
                                  style={{
                                    padding: '4px 14px',
                                    borderRadius: 20,
                                    border: `1px solid`,
                                    ...style,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'all 0.15s ease',
                                    userSelect: 'none',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.95)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
                                >
                                  {icon}
                                  <span style={{ fontSize: 13 }}>{p.action}</span>
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
            <Button size="large" onClick={() => {
              onChange('grants', []);
              onChange('revokes', []);
            }}>
              Clear All Overrides
            </Button>
            <Button size="large" type="primary" onClick={onSave} loading={saving}>Save User Overrides</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default UserPermissionOverridesManager;
