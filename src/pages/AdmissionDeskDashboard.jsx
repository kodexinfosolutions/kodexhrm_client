import React, { useEffect, useState, useRef } from "react";
import { message, Spin, Tag } from "antd";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import dayjs from "dayjs";
import {
  getAdmissionDashboardSummary,
  getNextAdmissionNo,
} from "../modules/admission/admission.service";
import { getAcademicYears } from "../modules/fees/fees.service";
import instance from "../utils/axios";

const fmt = (v) => Number(v || 0).toLocaleString("en-IN");

const AdmissionDeskDashboard = ({ onNavigate }) => {
  const dashboardRef = useRef(null);
    // PDF Download Handler - Download Student List
    const handleDownloadPDF = async () => {
      try {
        const approvedStudents = pending;
        if (approvedStudents.length === 0) {
          message.warning("No students to download");
          return;
        }
        
        // Create CSV content
        const headers = ["Student Name", "Admission No", "Academic STD", "Section", "Admission Date"];
        const rows = approvedStudents.map(app => [
          app.name || app.studentName || "",
          app.admission?.admissionNo || app.admissionNo || "",
          app.standard || app.admission?.standard || "",
          app.section || app.admission?.section || "",
          app.createdAt ? dayjs(app.createdAt).format("DD MMM YYYY") : ""
        ]);
        
        // Convert to CSV
        const csvContent = [
          headers.join(","),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Student_List_${academicYear}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success("Student list downloaded successfully");
      } catch (err) {
        message.error("Failed to download student list");
      }
    };
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [pending, setPending] = useState([]);
  const [nextAdmNo, setNextAdmNo] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  const [totalApplicationsCount, setTotalApplicationsCount] = useState(0);
  const [stdSectionCounts, setStdSectionCounts] = useState([]);

  const normalizeYear = (value) => String(value || "").trim();

  const toStudentAcademicYear = (student) =>
    normalizeYear(student?.academicYear || student?.admission?.academicYear);

  const getStudentsTabTotalCount = (rows, selectedAcademicYear) => {
    const list = Array.isArray(rows) ? rows : [];
    const approvedStudents = list.filter((student) => Boolean(student?.admission?.isApproved));

    if (!selectedAcademicYear) return approvedStudents.length;

    const selected = normalizeYear(selectedAcademicYear);
    const withAcademicYear = approvedStudents.filter((student) => toStudentAcademicYear(student));

    if (!withAcademicYear.length) return approvedStudents.length;

    return withAcademicYear.filter((student) => toStudentAcademicYear(student) === selected).length;
  };

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (academicYear) loadData();
  }, [academicYear]);

  const loadInitial = async () => {
    try {
      const years = await getAcademicYears();
      setAvailableYears(years || []);
      const defaultYear = years?.[0] || "";
      setAcademicYear(defaultYear);
      if (!defaultYear) setLoading(false);
    } catch {
      setAcademicYear("");
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, admNo, admissionsRes] = await Promise.allSettled([
        getAdmissionDashboardSummary(academicYear),
        getNextAdmissionNo(),
        instance.get("/admissions"),
      ]);
      if (summaryData.status === "fulfilled") setSummary(summaryData.value);
      if (admNo.status === "fulfilled") setNextAdmNo(admNo.value?.nextAdmissionNo || "");
      if (admissionsRes.status === "fulfilled") {
        const allAdmissions = admissionsRes.value?.data || [];
        setTotalApplicationsCount(getStudentsTabTotalCount(allAdmissions, academicYear));
        // Filter for approved students in the selected academic year, sorted by creation date (newest first)
        const recentApproved = allAdmissions
          .filter((student) => {
            const isApproved = Boolean(student?.admission?.isApproved);
            const academicYearMatch = toStudentAcademicYear(student) === normalizeYear(academicYear);
            return isApproved && academicYearMatch;
          })
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        
        // Calculate standard/section wise counts
        const counts = {};
        recentApproved.forEach((student) => {
          const std = student.standard || student.admission?.standard || "Unknown";
          const section = student.section || student.admission?.section || "";
          const key = section ? `${std} - ${section}` : std;
          counts[key] = (counts[key] || 0) + 1;
        });
        
        const countsList = Object.entries(counts)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count);
        
        setStdSectionCounts(countsList);
        setPending(recentApproved.slice(0, 10));
      } else {
        setTotalApplicationsCount(0);
        setStdSectionCounts([]);
      }
    } catch {
      message.error("Failed to load dashboard data");
      setTotalApplicationsCount(0);
      setStdSectionCounts([]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Spin size="large" />
      </div>
    );
  }

  const total = totalApplicationsCount;

  const statusColor = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "APPROVED") return "green";
    if (s === "PENDING") return "gold";
    if (s === "REJECTED") return "red";
    return "default";
  };

  return (
    <div className="space-y-8 duration-500 animate-in fade-in" ref={dashboardRef}>
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight font-headline text-primary">
            Admission Front Desk
          </h2>
          <p className="mt-1 text-on-surface-variant">
            {dayjs().format("dddd, MMMM D, YYYY")} — {academicYear} Session
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 font-bold text-white transition-all shadow bg-primary rounded-xl hover:opacity-90"
            type="button"
          >
            Download List
          </button>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-4 py-2 text-sm font-bold border-none bg-surface-container-high rounded-xl text-primary focus:ring-2 focus:ring-primary"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
        <div className="relative p-5 overflow-hidden bg-surface-container-lowest rounded-xl shadow-ambient-sm group">
          <div className="absolute w-20 h-20 transition-colors rounded-full -right-4 -top-4 bg-primary/5 blur-2xl group-hover:bg-primary/10" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="w-full">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Total Applications</p>
              <h3 className="text-3xl font-extrabold font-headline text-primary">{fmt(total)}</h3>
            </div>
            <span className="p-2.5 bg-primary-fixed rounded-full text-primary material-symbols-outlined text-xl shrink-0 ml-4">person_add</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-3">{academicYear} session</p>
        </div>

        <div className="relative p-5 overflow-hidden bg-surface-container-lowest rounded-xl shadow-ambient-sm group">
          <div className="absolute w-20 h-20 transition-colors rounded-full -right-4 -top-4 bg-secondary-fixed/5 blur-2xl group-hover:bg-secondary-fixed/10" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Standard & Section Wise</p>
            <div className="space-y-1.5">
              {stdSectionCounts.length > 0 ? (
                stdSectionCounts.map((item) => (
                  <p key={item.label} className="text-[10px] text-on-surface-variant">
                    <span className="font-semibold text-primary">{item.label}:</span> {item.count}
                  </p>
                ))
              ) : (
                <p className="text-[10px] text-on-surface-variant">—</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { key: "admission", icon: "add_circle", label: "New Application", color: "bg-primary/10 text-primary" },
         // { key: "approval", icon: "rule", label: "Approvals Queue", color: "bg-amber-50 text-amber-700" },
          { key: "bulk-upload", icon: "upload", label: "Bulk Upload", color: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
          { key: "students", icon: "group", label: "View Students", color: "bg-primary-fixed text-primary" },
        ].map((action) => (
          <button
            key={action.key}
            onClick={() => onNavigate(action.key)}
            className="flex flex-col items-center gap-2 p-5 rounded-xl bg-surface-container-lowest shadow-ambient-sm hover:shadow-ambient transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <span className={`material-symbols-outlined text-2xl p-3 rounded-full ${action.color}`}>{action.icon}</span>
            <span className="text-xs font-bold text-on-surface-variant">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Recent Applicants Table */}
      <div className="overflow-hidden bg-surface-container-lowest rounded-xl shadow-ambient-sm">
        <div className="flex items-center justify-between p-5 border-b border-surface-container-low">
          <h4 className="text-base font-bold font-headline text-primary">Recent Applicants</h4>
          <button
            onClick={() => onNavigate("students")}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            View All <span className="text-sm material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        
        {/* Table Header */}
        <div className="grid grid-cols-3 px-5 py-3 border-b bg-surface-container-low/50 border-surface-container-low">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Student Details</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Academic STD</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Section</p>
          </div>
        </div>
        
        {pending.length === 0 ? (
          <div className="p-8 text-sm text-center text-on-surface-variant">No recent applicants for {academicYear} session</div>
        ) : (
          <div className="divide-y divide-surface-container-low">
            {pending.map((app, idx) => (
              <div key={app.id || idx} className="grid items-center grid-cols-3 px-5 py-3 transition-colors hover:bg-surface-container-low/50">
                <div className="flex items-center min-w-0 gap-4">
                  <div className="flex items-center justify-center text-sm font-bold rounded-full w-9 h-9 bg-primary-fixed text-primary shrink-0">
                    {(app.name || app.studentName || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-on-surface">{app.name || app.studentName}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      {app.admission?.admissionNo || app.admissionNo || "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-primary">
                    {app.standard || app.admission?.standard || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-primary mb-1">
                    {app.section || app.admission?.section || "—"}
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    {app.createdAt ? dayjs(app.createdAt).format("DD MMM YYYY") : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdmissionDeskDashboard;
