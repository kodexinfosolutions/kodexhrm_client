import React from "react";

const Sidebar = ({
  sidebarLinks = [],
  renderSidebarItem,
  canReadSettings,
  selectedKey,
  setSelectedKey,
  onLogout,
  userRole,
  collapsed,
  setCollapsed,
  companyLogo,
  companyName,
}) => {
  return (
    <aside
      className={`h-screen ${collapsed ? "w-16" : "w-64"} fixed left-0 top-0 overflow-y-auto bg-slate-900 text-slate-100 flex flex-col py-5 z-50 border-r border-slate-800 transition-all duration-200 shadow-xl`}
    >
      <div className={`px-2 mb-6 flex items-center justify-between ${collapsed ? "px-2" : "px-4"}`}>
        <div className={collapsed ? "hidden" : "block min-w-0 flex-1 pr-2"}>
          <div className="flex items-center gap-2.5">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName || "Logo"}
                className="w-9 h-9 rounded-lg object-contain bg-white/10 p-1 border border-slate-700/60 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-indigo-400 text-2xl">precision_manufacturing</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-black tracking-tight text-white font-headline truncate" title={companyName}>
                {companyName || "Kodex HRM"}
              </h1>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase truncate">
                Kodex HRM
              </p>
            </div>
          </div>
        </div>
        <button
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((v) => !v)}
        >
          <span className="material-symbols-outlined text-lg">{collapsed ? "chevron_right" : "chevron_left"}</span>
        </button>
      </div>

      {collapsed && (
        <div className="flex justify-center mb-4">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt="Logo"
              className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1 border border-slate-700"
            />
          ) : (
            <span className="material-symbols-outlined text-indigo-400 text-2xl">precision_manufacturing</span>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3">
        {sidebarLinks.map((link) => renderSidebarItem(link, collapsed))}
      </nav>

      <div className={`mt-auto pt-4 border-t border-slate-800 ${collapsed ? "mx-1" : "mx-3"} space-y-1`}>
        {canReadSettings && (
          <button
            onClick={() => setSelectedKey("admin-settings")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all ${
              selectedKey === "admin-settings"
                ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-xl">settings</span>
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </button>
        )}
        <button
          onClick={onLogout}
          className="w-full text-left text-rose-400 hover:bg-rose-500/10 px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all font-medium text-sm"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          {!collapsed && <span>Logout</span>}
        </button>

        {!collapsed && (
          <div className="pt-3 pb-1 text-center border-t border-slate-800/80 mt-2">
            <p className="text-[11px] font-medium text-slate-400 leading-tight">
              Developed by Kodex Infosolutions
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              © 2026 Kodex Infosolutions. All Rights Reserved.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
