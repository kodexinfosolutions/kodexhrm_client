import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Avatar, Dropdown, Modal } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import StaffManagementPage from "../modules/staff/pages/StaffManagementPage";
import AdminSettings from "./AdminSettings";

import HRDashboardPage from "../modules/hr/pages/HRDashboardPage";
import AttendancePage from "../modules/hr/pages/AttendancePage";
import LeaveManagementPage from "../modules/hr/pages/LeaveManagementPage";
import PermissionPage from "../modules/hr/pages/PermissionPage";
import PFESIPage from "../modules/hr/pages/PFESIPage";
import ESSLSyncPage from "../modules/hr/pages/ESSLSyncPage";
import PayrollPage from "../modules/hr/pages/PayrollPage";
import PayslipPage from "../modules/hr/pages/PayslipPage";
import BonusManagementPage from "../modules/hr/pages/BonusManagementPage";
import ShiftManagementPage from "../modules/hr/pages/ShiftManagementPage";
import AdvanceRequestPage from "../modules/hr/pages/AdvanceRequestPage";
import SalaryAbstractPage from "../modules/hr/pages/SalaryAbstractPage";
import IncrementManagementPage from "../modules/hr/pages/IncrementManagementPage";

import { getAdminSettings } from "../modules/settings/settings.service";
import { hasPermission, PERMISSIONS, getCurrentUser } from "../utils/permissions";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedKey = searchParams.get("page") || "hr-dashboard";

  const setSelectedKey = (key) => {
    setSearchParams({ page: key });
  };

  const [expandedGroups, setExpandedGroups] = useState({
    "time-group": true,
    "payroll-group": true,
    "statutory-group": true,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);
  const currentUser = getCurrentUser();
  const displayName = currentUser?.name || currentUser?.email || "HR Administrator";
  const userRole = currentUser?.role || "ADMIN";
  const isTeacherOrStaffSelf = userRole === "STAFF";

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
    if (src.includes("uploads/")) {
      return `/erp/api/uploads/${src.split("uploads/")[1]}`;
    }
    const normalized = src.replace(/^\/+/, "");
    return `/erp/api/${normalized}`;
  };

  const companyLogo = normalizeAssetSrc(
    adminSettings?.documentAssets?.companyLogo ||
    adminSettings?.documentAssets?.schoolLogo ||
    adminSettings?.companyLogo ||
    adminSettings?.schoolLogo
  );

  const companyName =
    adminSettings?.companyName ||
    adminSettings?.schoolName ||
    "TEXTILE MANUFACTURING MILLS";

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getAdminSettings();
        setAdminSettings(settings);
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    loadSettings();

    const handleSettingsUpdated = (e) => {
      if (e?.detail) {
        setAdminSettings((prev) => ({ ...prev, ...e.detail }));
      } else {
        loadSettings();
      }
    };
    window.addEventListener("admin-settings-updated", handleSettingsUpdated);
    return () => window.removeEventListener("admin-settings-updated", handleSettingsUpdated);
  }, []);

  useEffect(() => {
    if (companyName) {
      document.title = `${companyName} | Kodex HRM`;
    }
    if (companyLogo) {
      const link = document.getElementById("app-favicon") || document.querySelector("link[rel*='icon']");
      if (link) {
        link.href = companyLogo;
      }
    }
  }, [companyName, companyLogo]);

  const canStaffAccess = hasPermission(PERMISSIONS.STAFF_READ) || userRole === "ADMIN";
  const canReadSettings = hasPermission(PERMISSIONS.SETTINGS_READ) || userRole === "ADMIN";
  const canHRAttendance = hasPermission(PERMISSIONS.HR_ATTENDANCE_READ) || isTeacherOrStaffSelf || userRole === "ADMIN";
  const canHRLeave = hasPermission(PERMISSIONS.HR_LEAVE_READ) || isTeacherOrStaffSelf || userRole === "ADMIN";
  const canHRPermission = hasPermission(PERMISSIONS.HR_PERMISSION_READ) || isTeacherOrStaffSelf || userRole === "ADMIN";
  const canHRStatutory = hasPermission(PERMISSIONS.HR_STATUTORY_READ) || userRole === "ADMIN";
  const canHRESSL = hasPermission(PERMISSIONS.HR_ESSL_READ) || userRole === "ADMIN";
  const canHRPayroll = hasPermission(PERMISSIONS.HR_PAYROLL_READ) || userRole === "ADMIN";
  const canHRAdvanceSelf = isTeacherOrStaffSelf;

  const onLogout = () => {
    Modal.confirm({
      title: "Confirm Logout",
      content: "Are you sure you want to log out of the HRMS?",
      okText: "Logout",
      okButtonProps: { danger: true },
      onOk: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
      },
    });
  };

  const onUserMenuClick = ({ key }) => {
    if (key === "settings") setSelectedKey("admin-settings");
    else if (key === "logout") onLogout();
  };

  const userMenu = [
    { key: "settings", label: "Settings", icon: <SettingOutlined /> },
    { type: "divider" },
    { key: "logout", label: "Logout", icon: <LogoutOutlined />, danger: true },
  ];

  const sidebarLinks = [
    { key: "hr-dashboard", label: "HR Dashboard", icon: "space_dashboard", permission: true },
    { key: "staff-management", label: "Staff Management", icon: "badge", permission: canStaffAccess },
    { key: "shift-management", label: "Shift Management", icon: "schedule", permission: canStaffAccess },
    {
      key: "time-group",
      label: "Time & Attendance",
      icon: "timelapse",
      permission: true,
      children: [
        { key: "hr-attendance", label: "Attendance Marking", icon: "fact_check", permission: canHRAttendance },
        { key: "hr-leaves", label: "Leave Management", icon: "event_busy", permission: canHRLeave },
        { key: "hr-permission", label: "Permission Slips", icon: "timer", permission: canHRPermission },
        { key: "hr-essl", label: "Biometric / ESSL", icon: "fingerprint", permission: canHRESSL },
      ],
    },
    {
      key: "payroll-group",
      label: "Payroll & Compensation",
      icon: "payments",
      permission: true,
      children: [
        { key: "hr-payroll", label: "Monthly Payroll", icon: "point_of_sale", permission: canHRPayroll },
        { key: "hr-payslip", label: "Payslip & Form 25B", icon: "receipt_long", permission: canHRPayroll },
        { key: "bonus-management", label: "Bonus Management", icon: "redeem", permission: canHRPayroll },
        { key: "hr-salary-abstract", label: "Salary Abstract", icon: "summarize", permission: canHRPayroll },
        { key: "hr-increment", label: "Salary Increments", icon: "trending_up", permission: canHRPayroll },
      ],
    },
    {
      key: "statutory-group",
      label: "Statutory & Benefits",
      icon: "account_balance",
      permission: true,
      children: [
        { key: "hr-pf-esi", label: "PF & ESI Management", icon: "verified_user", permission: canHRStatutory },
        { key: "hr-advance", label: "Advance Requests", icon: "request_quote", permission: canHRPayroll || canHRAdvanceSelf },
      ],
    },
  ];

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const isChildSelected = (children) => children?.some((c) => c.key === selectedKey);

  const renderSidebarItem = (link, collapsed) => {
    if (!link.permission) return null;

    if (link.children) {
      const isExpanded = expandedGroups[link.key] || isChildSelected(link.children);
      const groupActive = isChildSelected(link.children);

      return (
        <div key={link.key} className="mb-1">
          <button
            onClick={() => toggleGroup(link.key)}
            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all text-sm ${
              groupActive
                ? "bg-slate-800 text-indigo-400 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span className={`material-symbols-outlined text-lg ${groupActive ? "text-indigo-400" : ""}`}>
              {link.icon}
            </span>
            {!collapsed && (
              <>
                <span className="tracking-tight font-medium flex-1 text-sm">{link.label}</span>
                <span className="material-symbols-outlined text-sm text-slate-500">
                  {isExpanded ? "expand_less" : "expand_more"}
                </span>
              </>
            )}
          </button>

          {isExpanded && (
            <div className={`mt-1 space-y-0.5 border-l-2 border-slate-700 pl-2 ${collapsed ? "ml-1" : "ml-4"}`}>
              {link.children.map((child) => {
                if (!child.permission) return null;
                const isActive = selectedKey === child.key;
                return (
                  <button
                    key={child.key}
                    onClick={() => setSelectedKey(child.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all text-xs font-medium ${
                      isActive
                        ? "bg-indigo-600 text-white font-semibold shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">{child.icon}</span>
                    {!collapsed && <span>{child.label}</span>}
                    {isActive && !collapsed && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const isActive = selectedKey === link.key;
    return (
      <button
        key={link.key}
        onClick={() => setSelectedKey(link.key)}
        className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all text-sm mb-1 ${
          isActive
            ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/25"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
        }`}
      >
        <span className="text-lg material-symbols-outlined">{link.icon}</span>
        {!collapsed && <span className="font-medium">{link.label}</span>}
      </button>
    );
  };

  const renderContent = () => {
    switch (selectedKey) {
      case "dashboard":
      case "hr-dashboard":
        return <HRDashboardPage onNavigate={(key) => setSelectedKey(key)} />;
      case "staff-management":
        return <StaffManagementPage />;
      case "shift-management":
        return <ShiftManagementPage />;
      case "hr-attendance":
        return <AttendancePage selfOnly={isTeacherOrStaffSelf} />;
      case "hr-leaves":
        return <LeaveManagementPage selfOnly={isTeacherOrStaffSelf} />;
      case "hr-permission":
        return <PermissionPage selfOnly={isTeacherOrStaffSelf} />;
      case "hr-payroll":
        return <PayrollPage selfOnly={isTeacherOrStaffSelf} />;
      case "hr-payslip":
        return <PayslipPage />;
      case "bonus-management":
        return <BonusManagementPage />;
      case "hr-pf-esi":
        return <PFESIPage />;
      case "hr-advance":
        return <AdvanceRequestPage selfOnly={isTeacherOrStaffSelf} />;
      case "hr-increment":
        return <IncrementManagementPage />;
      case "hr-salary-abstract":
        return <SalaryAbstractPage />;
      case "hr-essl":
        return <ESSLSyncPage />;
      case "admin-settings":
        return <AdminSettings />;
      default:
        return <HRDashboardPage onNavigate={(key) => setSelectedKey(key)} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        sidebarLinks={sidebarLinks}
        renderSidebarItem={renderSidebarItem}
        canReadSettings={canReadSettings}
        selectedKey={selectedKey}
        setSelectedKey={setSelectedKey}
        onLogout={onLogout}
        userRole={userRole}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        companyLogo={companyLogo}
        companyName={companyName}
      />

      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${sidebarCollapsed ? "ml-16" : "ml-64"}`}>
        {/* Top Header */}
        <header className={`fixed top-0 right-0 ${sidebarCollapsed ? "left-16" : "left-64"} h-16 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm flex items-center justify-between px-8 transition-all duration-200`}>
          <div className="flex items-center gap-3">
            {companyLogo && (
              <img
                src={companyLogo}
                alt="Company Logo"
                className="w-9 h-9 rounded-lg object-contain bg-slate-50 border border-slate-200 p-0.5 shadow-xs"
              />
            )}
            <div>
              <span className="text-xs uppercase tracking-wider font-extrabold text-indigo-600">
                {companyName}
              </span>
              <div className="text-sm font-semibold text-slate-800">
                {sidebarLinks.flatMap(l => l.children ? l.children : [l]).find(l => l.key === selectedKey)?.label || "HR Management"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800">{displayName}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{userRole}</div>
            </div>

            <Dropdown menu={{ items: userMenu, onClick: onUserMenuClick }} trigger={["click"]} placement="bottomRight">
              <Avatar
                size={40}
                style={{ backgroundColor: "#4f46e5", color: "#ffffff", fontWeight: 700, cursor: "pointer" }}
                icon={<UserOutlined />}
              >
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
            </Dropdown>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 mt-16 max-w-7xl mx-auto w-full flex flex-col justify-between">
          <div>{renderContent()}</div>
          <footer className="mt-12 pt-6 pb-2 border-t border-slate-200/80 text-center text-xs text-slate-500">
            <p className="font-semibold text-slate-600">Kodex HRM — Developed by Kodex Infosolutions</p>
            <p className="text-[11px] text-slate-400 mt-1">© 2026 Kodex Infosolutions. All Rights Reserved.</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
