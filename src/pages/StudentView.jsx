import React, { useEffect, useState, useMemo } from "react";
import { Modal, Select, message, Button, Popconfirm, Input } from "antd";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import instance from "../utils/axios";
import dayjs from "dayjs";
import { linkSiblings, demoteIndividualStudents, unlinkSibling, unarchiveStudent } from "../modules/admission/admission.service";
import { getAdminSettings } from "../modules/settings/settings.service";
import { SearchOutlined, TagOutlined, SaveOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { patchAdmission } from "../modules/admission/admission.service";
import logo from "../assets/logo.jpeg";

import { useNavigate } from "react-router-dom";

// ── helpers ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, color, trend }) => (
  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 group">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all group-hover:scale-110`} style={{ background: `${color}15`, color: color }}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      {trend && (
        <div className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${trend > 0 ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
    <div>
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
      <div className="text-2xl font-black tracking-tighter text-slate-900">{value}</div>
    </div>
  </div>
);



const formatLabel = (text) => {
  return text
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
};

const avatarColor = (name = "") =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const initials = (name = "") => {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const REQUIRED_DOCUMENT_CONFIG = [
  { key: "birthCert", label: "Birth Certificate" },
  { key: "communityCert", label: "Community Certificate" },
  { key: "aadharStudent", label: "Student Aadhaar" },
];

const getDocumentRow = (student) => {
  const docs = student?.documents;
  if (Array.isArray(docs)) return docs[0] || {};
  if (docs && typeof docs === "object") return docs;
  return {};
};

const hasDocumentUploaded = (documentRow, key) => {
  if (!documentRow) return false;
  return Boolean(
    documentRow[key] ||
    documentRow[`${key}Path`] ||
    documentRow?.[key]?.path ||
    documentRow?.[`${key}File`] ||
    documentRow?.[`${key}Url`]
  );
};

const getMissingRequiredDocuments = (student) => {
  const documentRow = getDocumentRow(student);
  return REQUIRED_DOCUMENT_CONFIG.filter(({ key }) => !hasDocumentUploaded(documentRow, key));
};

// ── component ─────────────────────────────────────────────────────────────
const StudentView = ({ onCollectFee, onEdit }) => {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState(null);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [guardianFilter, setGuardianFilter] = useState("");
  const [fatherFilter, setFatherFilter] = useState("");
  const [siblingFilter, setSiblingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [adminSettings, setAdminSettings] = useState({});
  const [editingTagId, setEditingTagId] = useState(null);
  const [labelFilter, setLabelFilter] = useState("");

  // row expander
  const [expandedId, setExpandedId] = useState(null);

  // sibling link modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [targetSiblingIds, setTargetSiblingIds] = useState([]);
  const [linking, setLinking] = useState(false);
  const [linkClassFilter, setLinkClassFilter] = useState("");
  const [linkSectionFilter, setLinkSectionFilter] = useState("");

  const normalizeAssetSrc = (asset) => {
    if (!asset) return "";
    let src = String(asset).trim();
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

  const getSchoolLogoSrc = (settings, fallbackLogo) => {
    const logoCandidate =
      settings?.schoolLogo ||
      settings?.logo ||
      settings?.schoolLogoPath ||
      settings?.documentAssets?.schoolLogo ||
      fallbackLogo;

    if (!logoCandidate) return "";
    const normalizedLogo = String(logoCandidate);
    if (
      normalizedLogo.startsWith("data:image") ||
      normalizedLogo.startsWith("http://") ||
      normalizedLogo.startsWith("https://") ||
      normalizedLogo.startsWith("/")
    ) {
      return normalizedLogo;
    }
    if (normalizedLogo.startsWith("/erp/api/")) {
      return normalizedLogo;
    }
    return `/erp/api/${normalizedLogo.replace(/^\/+/, "").replace(/\\/g, "/")}`;
  };

  const pdfLogoSrc = logo;
  const detailDocumentRow = getDocumentRow(detailStudent);

  const pdfStyles = {
    pdfWrapper: {
      width: "794px",
      height: "1123px",
      background: "#ffffff",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: "#0f172a",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      padding: "14px 18px",
    },
    pdfHeader: {
      display: "grid",
      gridTemplateColumns: "1.2fr 2.2fr 1fr",
      alignItems: "center",
      border: "1px solid #000000",
      background: "#ffffff",
      marginBottom: "10px",
      minHeight: "104px",
      padding: "6px 10px",
      gap: "8px",
    },
    sectionHeader: {
      background: "#ffffff",
      color: "#000000",
      fontWeight: 900,
      fontSize: "12px",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      border: "1px solid #000000",
      borderBottom: "none",
      padding: "6px 10px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
      marginBottom: "10px",
    },
    th: {
      border: "1px solid #000000",
      background: "#ffffff",
      padding: "6px 8px",
      fontSize: "10px",
      color: "#000000",
      textAlign: "left",
      fontWeight: "800",
      textTransform: "uppercase",
    },
    tdLabel: {
      border: "1px solid #000000",
      background: "#ffffff",
      padding: "5px 7px",
      fontSize: "10px",
      fontWeight: "700",
      color: "#000000",
    },
    tdValue: {
      border: "1px solid #000000",
      background: "#ffffff",
      padding: "5px 7px",
      fontSize: "10px",
      fontWeight: "700",
      color: "#000000",
    },
    declarationBox: {
      border: "1px solid #000000",
      background: "#ffffff",
      padding: "10px 12px",
      fontSize: "10px",
      lineHeight: 1.5,
      color: "#000000",
      marginBottom: "10px",
    },
    signatureRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      border: "1px solid #000000",
      borderTop: "none",
      minHeight: "74px",
    },
    signatureCell: {
      borderRight: "1px solid #000000",
      padding: "8px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: "6px",
    },
    sigImage: {
      maxHeight: "40px",
      maxWidth: "110px",
      objectFit: "contain",
    },
  };

  const detailFamily = detailStudent?.family || {};
  const detailAddress = detailStudent?.address || {};
  const detailPrimaryAcademic = (detailStudent?.academics || [])[0] || {};
  const detailSelectedStream =
    detailPrimaryAcademic?.stream ||
    detailStudent?.academicStreamCustom ||
    detailStudent?.academicStream ||
    "-";
  const detailGuardianRelation = String(detailFamily?.guardianRelation || "").toLowerCase();
  const detailIsSingleParent = Boolean(detailFamily?.isSingleParent);
  const showFatherDetails = !detailIsSingleParent || detailGuardianRelation === "father";
  const showMotherDetails = !detailIsSingleParent || detailGuardianRelation === "mother";
  const showGuardianDetails =
    detailIsSingleParent &&
    Boolean(detailGuardianRelation) &&
    detailGuardianRelation !== "father" &&
    detailGuardianRelation !== "mother";

  // PDF export for a student row (review-template layout)
  const handlePrintPDF = async () => {
    try {
      const pageOne = document.getElementById("pdfPage1");
      if (!pageOne) return;

      const images = Array.from(pageOne.querySelectorAll("img"));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      const canvas = await html2canvas(pageOne, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      const firstPageImage = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;

      pdf.addImage(firstPageImage, "PNG", 0, 0, pageWidth, pageHeight);

      const admissionNo = (detailStudent?.admission?.admissionNo || "Student").toString().trim();
      pdf.save(`${admissionNo}.pdf`);
    } catch (err) {
      console.error(err);
      message.error("PDF generation failed");
    }
  };

  // Kit Tag update handler
  const handleKitTagUpdate = async (admissionId, tagValue) => {
    if (!admissionId) {
      message.error("Admission ID not found");
      return;
    }
    try {
      await patchAdmission(admissionId, { kitTag: tagValue });
      message.success(tagValue === null ? "Label removed" : "Label updated");

      // Clear the input field manually if the tag was removed
      if (tagValue === null) {
        const input = document.getElementById(`kit-tag-input-${admissionId}`);
        if (input) input.value = '';
      }
      fetchStudents(true);
      setEditingTagId(null);
    } catch {
      message.error("Failed to update label");
    }
  };

  // Archive handler (soft delete)
  const handleArchive = async (studentId) => {
    try {
      await instance.delete(`/admissions/${studentId}`);
      message.success("Student archived");
      fetchStudents();
    } catch {
      message.error("Failed to archive student");
    }
  };
  const fetchStudents = (keepPage = false) => {
    instance.get("/admissions").then((res) => {
      const data = (res.data || []).filter((s) => s.admission?.isApproved);
      const newestFirst = [...data].sort((a, b) => {
        const aDate = new Date(a?.createdAt || a?.admission?.admissionDate || 0).getTime();
        const bDate = new Date(b?.createdAt || b?.admission?.admissionDate || 0).getTime();
        return bDate - aDate;
      });
      setStudents(newestFirst);
      if (!keepPage) setPage(1);
    });
  };

  const handleUnarchive = async (studentId) => {
    try {
      await unarchiveStudent(studentId);
      message.success("Student restored from archive");
      fetchStudents();
    } catch {
      message.error("Failed to restore student");
    }
  };

  const fetchAdminSettings = async () => {
    try {
      const data = await getAdminSettings();
      setAdminSettings(data || {});
    } catch (err) {
      console.error("Failed to fetch admin settings", err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAdminSettings();
  }, []);

  // ── filter / search ───────────────────────────────────────────────────────
  const classOptions = useMemo(() =>
    Array.from(new Set(students.map((s) => s.standard || s.admission?.standard).filter(Boolean))).sort(),
    [students]
  );

  const sectionOptions = useMemo(() =>
    Array.from(new Set(students.map((s) => s.section).filter(Boolean))).sort(),
    [students]
  );

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter === "active" && (s.users?.isActive === false || s.standard === "ALUMNI" || s.admission?.standard === "ALUMNI")) return false;
      if (statusFilter === "archived" && (s.users?.isActive !== false || s.standard === "ALUMNI" || s.admission?.standard === "ALUMNI")) return false;
      if (statusFilter === "alumni" && s.standard !== "ALUMNI" && s.admission?.standard !== "ALUMNI") return false;
      if (classFilter && (s.standard || s.admission?.standard) !== classFilter) return false;
      if (sectionFilter && (s.section || "") !== sectionFilter) return false;
      if (genderFilter && (s.gender || "").toLowerCase() !== genderFilter) return false;
      if (guardianFilter) {
        const gStr = guardianFilter.toLowerCase();
        const fam = s.family || {};
        const isMatch =
          (fam.guardianName || "").toLowerCase().includes(gStr) ||
          (fam.fatherName || "").toLowerCase().includes(gStr) ||
          (fam.motherName || "").toLowerCase().includes(gStr);
        if (!isMatch) return false;
      }
      if (fatherFilter && !(s.family?.fatherName || "").toLowerCase().includes(fatherFilter.toLowerCase())) return false;
      if (siblingFilter) {
        if (siblingFilter === "has" && !s.siblingGroupId) return false;
        if (siblingFilter === "none" && s.siblingGroupId) return false;
      }
      if (labelFilter && !(s.kitTag || "").toLowerCase().includes(labelFilter.toLowerCase())) return false;
      if (q) {
        const blob = [
          s.name, s.standard, s.gender, s.admission?.admissionNo,
          s.family?.fatherName, s.family?.motherName, s.kitTag
        ].join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [students, classFilter, sectionFilter, genderFilter, guardianFilter, fatherFilter, siblingFilter, statusFilter, searchText, labelFilter]);

  // ── summary stats ─────────────────────────────────────────────────────────
  const totalEnrollment = students.length;
  const activeStudents = students.filter((s) => s.users?.isActive !== false).length;

  // ── pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── exports ───────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const headers = [
      "Name",
      "Admission No",
      "STD",
      "Section",
      "Primary Guardian",
      "Relation",
      "Label",
      "Linked Siblings"
    ];

    const rows = filtered.map(s => {
      const name = s.name || 'Unknown';
      const admissionNo = s.admission?.admissionNo || s.id || '';
      const std = s.standard || s.admission?.standard || '';
      const section = s.section || 'Unassigned';

      const primaryGuardianName = s.family?.isSingleParent
        ? (s.family?.guardianName || s.family?.fatherName || s.family?.motherName || "Not Available")
        : (s.family?.fatherName || "Not Available");

      const primaryGuardianRel = s.family?.isSingleParent
        ? (s.family?.guardianRelation || "Guardian")
        : (s.family?.fatherName ? "Father" : "Contact");

      const label = s.kitTag || "";

      const siblings = (s.siblings || []).map(sib => `${sib.name} (${sib.standard || ''} ${sib.section || ''})`).join(" | ");

      return [
        `"${name.replace(/"/g, '""')}"`,
        `"${String(admissionNo).replace(/"/g, '""')}"`,
        `"${String(std).replace(/"/g, '""')}"`,
        `"${String(section).replace(/"/g, '""')}"`,
        `"${primaryGuardianName.replace(/"/g, '""')}"`,
        `"${primaryGuardianRel.replace(/"/g, '""')}"`,
        `"${label.replace(/"/g, '""')}"`,
        `"${siblings.replace(/"/g, '""')}"`
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Students_Export_${dayjs().format('YYYY-MM-DD')}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── sibling link ──────────────────────────────────────────────────────────
  const openLinkModal = (student) => {
    setSelectedStudent(student);
    setTargetSiblingIds([]);
    setIsModalOpen(true);
  };

  const handleLink = async () => {
    if (!targetSiblingIds.length) { message.error("Please select at least one sibling to link"); return; }
    setLinking(true);
    try {
      await linkSiblings({ studentIds: [selectedStudent.id, ...targetSiblingIds] });
      message.success("Siblings linked successfully!");
      setIsModalOpen(false);
      fetchStudents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Linking failed");
    }
    setLinking(false);
  };

  const handleDemote = (student) => {
    Modal.confirm({
      title: 'Confirm Demotion',
      content: `Are you sure you want to demote ${student.name}? This will reduce their standard by one level.`,
      okText: 'Yes, Demote',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          await demoteIndividualStudents({ studentIds: [student.id] });
          message.success(`${student.name} demoted successfully`);
          fetchStudents();
        } catch (err) {
          message.error(err?.response?.data?.message || 'Demotion failed');
        }
      },
    });
  };

  const handleUnlink = (student) => {
    Modal.confirm({
      title: 'Unlink Sibling',
      content: `Are you sure you want to remove ${student.name} from their sibling group?`,
      okText: 'Yes, Unlink',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await unlinkSibling(student.id);
          message.success(`${student.name} unlinked successfully`);
          fetchStudents();
          setSelectedStudent(prev => prev ? { ...prev, siblings: prev.siblings?.filter(s => s.id !== student.id) } : null);
        } catch (err) {
          message.error(err?.response?.data?.message || 'Unlinking failed');
        }
      },
    });
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="student-view-modern p-8 min-h-screen bg-[#fdfdfd]">
        <style>{`
        .student-view-modern { font-family: 'Public Sans', sans-serif; }
        .premium-table thead th { background: #f8fafc !important; color: #64748b !important; font-size: 10px !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; border-bottom: 1px solid #f1f5f9 !important; padding: 16px 20px !important; }
        .premium-table tbody td { padding: 16px 20px !important; border-bottom: 1px solid #f8fafc !important; }
        .filter-input { border-radius: 14px !important; border: 1px solid #f1f5f9 !important; background: #ffffff !important; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .filter-input:hover, .filter-input:focus { border-color: #00152a !important; box-shadow: 0 4px 12px rgba(0,21,42,0.05); }
        .status-tag { border-radius: 9999px; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 12px; }
        .student-view-modern .material-symbols-outlined { display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
        .student-view-modern .material-symbols-outlined.text-sm,
        .student-view-modern .material-symbols-outlined.text-base,
        .student-view-modern .material-symbols-outlined.text-[18px],
        .student-view-modern .material-symbols-outlined.text-[14px] {
          line-height: 1;
          height: 1em;
          min-width: 1em;
        }
      `}</style>

        {/* Header Section */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full">Archive List</span>
              <span className="text-slate-200">/</span>
              <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Active Directory</span>
            </div>
            <h1 className="text-5xl font-black leading-tight tracking-tighter text-slate-900">
              Student <span className="text-teal-600">Management</span>
            </h1>
          </div>
          <button
            onClick={handleExportCsv}
            className="px-6 py-2.5 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 shadow-sm hover:border-slate-400 transition-all flex items-center gap-2"
          >
            <span className="text-sm leading-none material-symbols-outlined">file_download</span>
            Export
          </button>
        </div>

        {/* Summary Stats Bento Grid */}
        <div className="grid grid-cols-1 gap-6 mb-12 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Students" value={totalEnrollment} icon="groups" color="#0f172a" trend={8} />
          <StatCard title="Active Profile" value={activeStudents} icon="verified" color="#10b981" />
          <StatCard title="Filtered Scope" value={filtered.length} icon="filter_alt" color="#6366f1" />
          <StatCard title="Siblings Group" value={students.filter(s => s.siblingGroupId).length} icon="family_restroom" color="#f59e0b" />
        </div>

        {/* Filter Control Bar */}
        <div className="p-6 mb-8 bg-white border shadow-sm rounded-3xl border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-grow min-w-[300px] h-11">
              <span className="absolute text-base leading-none -translate-y-1/2 material-symbols-outlined left-3 top-1/2 text-slate-400">
                search
              </span>

              <Input
                placeholder="Search Student (Name, ID, Guardian)..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(1);
                }}
                prefix={<SearchOutlined />}
                allowClear
                size="large"
                className="filter-input"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Select
                value={classFilter || undefined}
                placeholder="All Standard"
                allowClear
                size="large"
                onChange={(val) => { setClassFilter(val || ''); setPage(1); }}
                style={{ minWidth: 140 }}
                options={[
                  ...classOptions.map((c) => ({ value: c, label: c })),
                ]}
              />

              <Select
                value={sectionFilter || undefined}
                placeholder="Sections"
                allowClear
                size="large"
                onChange={(val) => { setSectionFilter(val || ''); setPage(1); }}
                style={{ minWidth: 120 }}
                options={sectionOptions.map((c) => ({ value: c, label: c }))}
              />

              <Select
                value={genderFilter || undefined}
                placeholder="Gender"
                allowClear
                size="large"
                onChange={(val) => { setGenderFilter(val || ''); setPage(1); }}
                style={{ minWidth: 120 }}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'others', label: 'Others' },
                ]}
              />

              <Input
                value={guardianFilter}
                onChange={(e) => { setGuardianFilter(e.target.value); setPage(1); }}
                placeholder="Primary Guardian"
                allowClear
                size="large"
                style={{ width: 160 }}
                className="filter-input text-[11px] font-bold"
              />

              <Input
                value={labelFilter}
                onChange={(e) => { setLabelFilter(e.target.value); setPage(1); }}
                placeholder="Label / Tag"
                allowClear
                size="large"
                style={{ width: 120 }}
                className="filter-input text-[11px] font-bold"
              />

              <Select
                value={siblingFilter || undefined}
                placeholder="Siblings Status"
                size="large"
                allowClear
                onChange={setSiblingFilter}
                style={{ minWidth: 160 }}
                options={[
                  { value: "has", label: "Has Siblings" },
                  { value: "none", label: "No Siblings" },
                ]}
              />

              <Select
                value={statusFilter}
                placeholder="Profile Status"
                size="large"
                onChange={setStatusFilter}
                style={{ minWidth: 160 }}
                options={[
                  { value: "active", label: "Active Profiles" },
                  { value: "archived", label: "Archived Records" },
                  { value: "alumni", label: "Alumni" },
                  { value: "all", label: "All Statuses" },
                ]}
              />

              {(classFilter || sectionFilter || genderFilter || guardianFilter || fatherFilter || siblingFilter || statusFilter !== "active" || searchText || labelFilter) && (
                <button
                  onClick={() => { setClassFilter(""); setSectionFilter(""); setGenderFilter(""); setGuardianFilter(""); setFatherFilter(""); setSiblingFilter(""); setLabelFilter(""); setStatusFilter("active"); setSearchText(""); setPage(1); }}
                  className="px-4 flex items-center gap-1 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all h-[40px]"
                >
                  <span className="text-sm leading-none material-symbols-outlined">close</span>
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full premium-table">
              <thead>
                <tr>
                  <th className="w-12" />
                  <th>Student Details</th>
                  <th>Academic STD</th>
                  <th>Primary Guardian</th>
                  <th>Label</th>
                  <th className="text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <span className="block mb-4 text-5xl material-symbols-outlined text-slate-200">person_search</span>
                      <p className="text-sm font-bold text-slate-400">No records matching the current criteria.</p>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((s) => {
                    const isExpanded = expandedId === s.id;
                    const name = s.name || "Unknown";
                    const initialsStr = initials(name);
                    const documentRow = getDocumentRow(s);
                    const photoPath =
                      documentRow?.photoPath ||
                      documentRow?.photo ||
                      documentRow?.profilePhotoPath ||
                      documentRow?.profilePhoto ||
                      s?.photoPath ||
                      s?.photo;
                    const photoUrl = normalizeAssetSrc(photoPath);
                    const areaValue = s.address?.street || s.address?.village || "";
                    const missingRequiredDocs = getMissingRequiredDocuments(s);
                    const hasMissingRequiredDocs = missingRequiredDocs.length > 0;
                    const missingRequiredDocsTitle = hasMissingRequiredDocs
                      ? `Missing: ${missingRequiredDocs.map((doc) => doc.label).join(", ")}`
                      : "All required documents uploaded";

                    return (
                      <React.Fragment key={s.id}>
                        <tr id={`student-row-${s.id}`} className="transition-all group hover:bg-slate-50/50">
                          <td className="text-center">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : s.id)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-slate-900 text-white rotate-180' : 'text-slate-300 hover:text-slate-900 hover:bg-slate-100'}`}
                            >
                              <span className="text-sm leading-none material-symbols-outlined">expand_more</span>
                            </button>
                          </td>
                          <td>
                            <div className="flex items-center gap-4">
                              <div className="relative w-10 h-10">
                                {hasMissingRequiredDocs && (
                                  <span
                                    className="absolute z-10 w-3 h-3 rounded-full -top-1 -right-1 bg-rose-500 ring-2 ring-white"
                                    title={missingRequiredDocsTitle}
                                  />
                                )}
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-[10px] border-2 border-white shadow-sm overflow-hidden">
                                  {photoUrl ? (
                                    <img src={photoUrl} className="object-cover w-full h-full" alt="" />
                                  ) : initialsStr}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="text-[13px] font-black text-slate-900 tracking-tight leading-none">{name}</div>
                                  {hasMissingRequiredDocs && (
                                    <span
                                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[8px] font-black uppercase tracking-widest"
                                      title={missingRequiredDocsTitle}
                                    >
                                      Docs Missing
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.admission?.admissionNo || s.id}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-900">{s.standard || s.admission?.standard}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{s.academicYear} | {s.section || 'Unassigned'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-900">
                                {s.family?.isSingleParent
                                  ? (s.family?.guardianName || s.family?.fatherName || s.family?.motherName || "Not Available")
                                  : (s.family?.fatherName || "Not Available")}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                {s.family?.isSingleParent
                                  ? (s.family?.guardianRelation || "Guardian")
                                  : (s.family?.fatherName ? "Father" : "Contact")}
                              </span>
                            </div>
                          </td>
                          <td>
                            {editingTagId === s.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Tag ID"
                                  id={`kit-tag-input-${s.id}`}
                                  defaultValue={s.kitTag}
                                  autoFocus
                                  onPressEnter={() => {
                                    const val = document.getElementById(`kit-tag-input-${s.id}`).value;
                                    handleKitTagUpdate(s.id, val);
                                  }}
                                  className="!rounded-xl !border-slate-200 !text-[11px] !font-bold !w-24 focus:!border-teal-500"
                                />
                                <button
                                  onClick={() => {
                                    const val = document.getElementById(`kit-tag-input-${s.id}`).value;
                                    handleKitTagUpdate(s.id, val);
                                  }}
                                  className="flex items-center justify-center w-8 h-8 text-teal-600 transition-all rounded-lg bg-teal-50 hover:bg-teal-600 hover:text-white"
                                  title="Save Tag"
                                >
                                  <span className="material-symbols-outlined text-[16px] leading-none">save</span>
                                </button>
                                <button
                                  onClick={() => setEditingTagId(null)}
                                  className="flex items-center justify-center w-8 h-8 transition-all rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white"
                                  title="Cancel"
                                >
                                  <span className="material-symbols-outlined text-[16px] leading-none">close</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {s.kitTag ? (
                                  <div className="px-3 py-1.5 bg-slate-100 text-slate-900 text-[11px] font-black rounded-xl border border-slate-200 flex items-center gap-2">
                                    {s.kitTag}
                                    <button
                                      onClick={() => setEditingTagId(s.id)}
                                      className="text-slate-400 hover:text-teal-600 transition-all ml-1"
                                      title="Edit Tag"
                                    >
                                      <span className="material-symbols-outlined text-[14px] leading-none">edit</span>
                                    </button>
                                    <Popconfirm
                                      title="Remove this tag?"
                                      onConfirm={() => handleKitTagUpdate(s.id, null)}
                                      okText="Remove"
                                      cancelText="Cancel"
                                    >
                                      <button
                                        className="text-slate-400 hover:text-rose-600 transition-all"
                                        title="Remove Tag"
                                      >
                                        <span className="material-symbols-outlined text-[14px] leading-none">close</span>
                                      </button>
                                    </Popconfirm>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setEditingTagId(s.id)}
                                    className="px-3 py-1.5 border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:border-teal-500 hover:text-teal-600 transition-all"
                                  >
                                    + Add Tag
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => onCollectFee && onCollectFee(s.id)}
                                className="flex items-center justify-center text-teal-600 transition-all shadow-sm w-9 h-9 rounded-xl bg-teal-50 hover:bg-teal-600 hover:text-white"
                                title="Fee Ledger"
                              >
                                <span className="material-symbols-outlined text-[18px] leading-none">payments</span>
                              </button>
                              <button
                                onClick={() => openLinkModal(s)}
                                className="flex items-center justify-center transition-all shadow-sm w-9 h-9 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white"
                                title="Siblings Link"
                              >
                                <span className="material-symbols-outlined text-[18px] leading-none">add_link</span>
                              </button>
                              <button
                                onClick={() => onEdit && onEdit(s)}
                                className="flex items-center justify-center transition-all shadow-sm w-9 h-9 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white"
                                title="Edit"
                              >
                                <span className="material-symbols-outlined text-[18px] leading-none">edit_note</span>
                              </button>
                              {/* demote button  */}
                              {adminSettings?.enableIndividualDemotion && <button onClick={() => handleDemote(s)} className="flex items-center justify-center text-yellow-600 transition-all shadow-sm w-9 h-9 rounded-xl bg-yellow-50 hover:bg-yellow-600 hover:text-black" title="Demote"><span className="material-symbols-outlined text-[18px] leading-none">arrow_downward</span></button>}
                              {/* Archive / Unarchive button */}
                              {s.users?.isActive === false ? (
                                <Popconfirm title="Restore student record?" onConfirm={() => handleUnarchive(s.id)}>
                                  <button
                                    className="flex items-center justify-center text-teal-600 transition-all shadow-sm w-9 h-9 rounded-xl bg-teal-50 hover:bg-teal-600 hover:text-white"
                                    title="Unarchive"
                                  >
                                    <span className="material-symbols-outlined text-[18px] leading-none">unarchive</span>
                                  </button>
                                </Popconfirm>
                              ) : (
                                <Popconfirm title="Archive student record?" onConfirm={() => handleArchive(s.id)}>
                                  <button
                                    className="flex items-center justify-center transition-all shadow-sm w-9 h-9 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                                    title="Archive"
                                  >
                                    <span className="material-symbols-outlined text-[18px] leading-none">archive</span>
                                  </button>
                                </Popconfirm>
                              )}
                              {/* Issue PDF button */}
                              <button
                                onClick={() => {
                                  setDetailStudent(s);
                                  setTimeout(() => handlePrintPDF(), 300);
                                }} className="flex items-center justify-center transition-all shadow-sm w-9 h-9 rounded-xl bg-slate-50 text-slate-900 hover:bg-slate-900 hover:text-white"
                                title="Issue PDF"
                              >
                                <span className="material-symbols-outlined text-[18px] leading-none">picture_as_pdf</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={6} className="px-12 py-6">
                              <div className="grid grid-cols-1 gap-8 p-8 bg-white border shadow-sm rounded-3xl border-slate-100 lg:grid-cols-12">
                                {/* Student Profile Overview */}
                                <div className="flex flex-col items-center text-center lg:col-span-3">
                                  <div className="relative mb-6">
                                    {photoUrl ? (
                                      <img
                                        src={photoUrl}
                                        className="w-40 h-40 rounded-[40px] object-cover border-4 border-white shadow-2xl"
                                        alt={s.name}
                                      />
                                    ) : (
                                      <div className="w-40 h-40 rounded-[40px] bg-slate-200 text-slate-400 flex items-center justify-center text-5xl font-black border-4 border-white shadow-xl">
                                        {s.name?.charAt(0)}
                                      </div>
                                    )}
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                      Roll #{s.admission?.admissionNo || s.id}
                                    </div>
                                  </div>
                                  <h2 className="mb-1 text-2xl font-black tracking-tighter text-slate-900">{s.name}</h2>
                                  <div className="flex items-center justify-center gap-2 mb-6">
                                    <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[10px] font-black uppercase tracking-widest rounded-full">{s.gender}</span>
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">{s.bloodGroup}</span>
                                  </div>
                                  <div className="w-full space-y-2">
                                    <div className="flex items-center justify-between p-3 text-xs bg-white border shadow-sm rounded-2xl border-slate-100">
                                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Admission Date</span>
                                      <span className="font-black text-slate-900">{s.admission?.admissionDate ? dayjs(s.admission?.admissionDate).format('YYYY-MM-DD') : '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 text-xs bg-white border shadow-sm rounded-2xl border-slate-100">
                                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Current Grade</span>
                                      <span className="font-black text-slate-900">{s.standard || s.admission?.standard}</span>
                                    </div>
                                    <div className={`flex justify-between items-center p-3 rounded-2xl border text-xs shadow-sm ${hasMissingRequiredDocs ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
                                      <span className={`font-bold uppercase tracking-widest text-[9px] ${hasMissingRequiredDocs ? 'text-rose-500' : 'text-slate-400'}`}>Required Docs</span>
                                      <span className={`font-black ${hasMissingRequiredDocs ? 'text-rose-600' : 'text-teal-600'}`} title={missingRequiredDocsTitle}>
                                        {hasMissingRequiredDocs ? `${missingRequiredDocs.length} Missing` : 'Complete'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {/* Detailed Info Groups */}
                                <div className="grid grid-cols-1 gap-6 lg:col-span-9 md:grid-cols-2">
                                  <div className="p-6 border bg-slate-50 rounded-2xl border-slate-100">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[14px]">verified_user</span> Governance Data
                                    </h4>
                                    <div className="grid grid-cols-1 gap-y-2">
                                      <div><span className="text-xs font-bold text-slate-400">Religion:</span> <span className="text-xs font-black text-slate-900">{s.religion}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Community:</span> <span className="text-xs font-black text-slate-900">{s.community}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Caste:</span> <span className="text-xs font-black text-slate-900">{s.caste}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Mother Tongue:</span> <span className="text-xs font-black text-slate-900">{s.motherTongue}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Aadhar ID:</span> <span className="text-xs font-black text-slate-900">{s.aadharNo}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Identification:</span> <span className="text-xs font-black text-slate-900">{s.identification1}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">School Origination:</span> <span className="text-xs font-black text-slate-900">{s.previousSchool}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Transport Mode:</span> <span className="text-xs font-black text-slate-900">{s.transportMode}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">RTE Status:</span> <span className="text-xs font-black text-slate-900">{s.rte ? "Yes" : "No"}</span></div>
                                    </div>
                                  </div>
                                  <div className="p-6 border bg-slate-50 rounded-2xl border-slate-100">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[14px]">family_history</span> Family Matrix
                                    </h4>
                                    <div className="grid grid-cols-1 gap-y-2">
                                      {s.family?.isSingleParent ? (
                                        <>
                                          <div><span className="text-xs font-bold text-slate-400">Primary Guardian:</span> <span className="text-xs font-black text-slate-900">{s.family?.guardianName || s.family?.fatherName || s.family?.motherName}</span></div>
                                          <div><span className="text-xs font-bold text-slate-400">Guardian Mob.:</span> <span className="text-xs font-black text-slate-900">{s.family?.guardianPhone || s.family?.fatherPhone || s.family?.motherPhone}</span></div>
                                          <div><span className="text-xs font-bold text-slate-400">Guardian Relation:</span> <span className="text-xs font-black text-slate-900">{s.family?.guardianRelation || "Guardian"}</span></div>
                                        </>
                                      ) : (
                                        <>
                                          <div><span className="text-xs font-bold text-slate-400">Father:</span> <span className="text-xs font-black text-slate-900">{s.family?.fatherName}</span></div>
                                          <div><span className="text-xs font-bold text-slate-400">Father Mob.:</span> <span className="text-xs font-black text-slate-900">{s.family?.fatherPhone}</span></div>
                                          <div><span className="text-xs font-bold text-slate-400">Mother:</span> <span className="text-xs font-black text-slate-900">{s.family?.motherName}</span></div>
                                          <div><span className="text-xs font-bold text-slate-400">Mother Mob.:</span> <span className="text-xs font-black text-slate-900">{s.family?.motherPhone}</span></div>
                                        </>
                                      )}
                                      <div><span className="text-xs font-bold text-slate-400">Primary Email:</span> <span className="text-xs font-black text-slate-900">{s.family?.parentsEmail}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Annual Income:</span> <span className="text-xs font-black text-slate-900">₹{s.family?.familyIncome || 0}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Sibling Registry:</span> <span className="text-xs font-black text-slate-900">{s.siblings && s.siblings.length > 0 ? `${s.siblings.length} Linked (${s.siblings.map(sib => sib.name).join(', ')})` : "None"}</span></div>
                                      <div><span className="text-xs font-bold text-slate-400">Residential Area:</span> <span className="text-xs font-black text-slate-900">{s.address?.city}</span></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-8 py-6 bg-slate-50/50">
            <div className="text-[11px] font-black uppercase text-slate-400 tracking-widest">
              Visible: <span className="text-slate-900">{Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="flex items-center justify-center w-10 h-10 transition-all bg-white border rounded-xl border-slate-200 text-slate-600 hover:border-slate-400 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all ${p === page ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300'}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="flex items-center justify-center w-10 h-10 transition-all bg-white border rounded-xl border-slate-200 text-slate-600 hover:border-slate-400 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <button key="cancel" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">
            Abort
          </button>,
          <button key="submit" onClick={handleLink} className="px-8 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl transition-all" disabled={linking}>
            {linking ? 'Establishing Link...' : 'Authorize Linkage'}
          </button>
        ]}
        centered
        width={560}
        className="premium-modal"
        title={
          <div className="flex items-center gap-4 py-2">
            <div className="flex items-center justify-center w-12 h-12 text-teal-600 shadow-sm rounded-2xl bg-teal-50">
              <span className="leading-none material-symbols-outlined">add_link</span>
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Family Matrix</div>
              <div className="text-xl font-black tracking-tight text-slate-900">Siblings Link
                — {selectedStudent?.name}</div>
            </div>
          </div>
        }
      >
        <div className="py-6 space-y-8">
          <div className="p-6 italic border bg-slate-50 rounded-3xl border-slate-100">
            <p className="text-slate-500 text-[13px] font-bold leading-relaxed">
              Link siblings to group students with the same parents into one family for unified records, shared fees tracking, and streamlined communication.
            </p>
          </div>
          {selectedStudent?.siblings?.length > 0 && (
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                Currently Linked Siblings
              </label>
              <div className="space-y-2">
                {selectedStudent.siblings.map(sib => (
                  <div key={sib.id} className="flex items-center justify-between p-3 border bg-slate-50 rounded-2xl border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-teal-50 text-teal-600 font-black text-[11px]">
                        {sib.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[12px] font-black text-slate-900 leading-tight">{sib.name}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sib.standard} {sib.admission?.admissionNo ? `· ${sib.admission.admissionNo}` : ''}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnlink(sib)}
                      className="flex items-center justify-center w-8 h-8 transition-all shadow-sm rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                      title="Unlink Sibling"
                    >
                      <span className="material-symbols-outlined text-[16px]">link_off</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
              Add New Sibling Link
            </label>
            <div className="flex gap-2">
              <Select
                value={linkClassFilter || undefined}
                placeholder="Standard Filter"
                allowClear
                size="large"
                className="w-1/2"
                onChange={setLinkClassFilter}
                options={classOptions.map(c => ({ value: c, label: c }))}
              />
              <Select
                value={linkSectionFilter || undefined}
                placeholder="Section Filter"
                allowClear
                size="large"
                className="w-1/2"
                onChange={setLinkSectionFilter}
                options={sectionOptions.map(c => ({ value: c, label: c }))}
              />
            </div>
            <Select
              mode="multiple"
              showSearch
              placeholder="Search Student by name or Admission ID..."
              className="w-full premium-select"
              style={{ width: "100%" }}
              size="large"
              optionFilterProp="label"
              onChange={setTargetSiblingIds}
              value={targetSiblingIds}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={students
                .filter((s) => s.id !== selectedStudent?.id)
                .filter((s) => !selectedStudent?.siblings?.some(sib => sib.id === s.id))
                .filter((s) => !linkClassFilter || s.standard === linkClassFilter || s.admission?.standard === linkClassFilter)
                .filter((s) => !linkSectionFilter || s.section === linkSectionFilter || s.admission?.section === linkSectionFilter)
                .map((s) => ({
                  label: `${s.name} (${s.admission?.admissionNo || s.id})`,
                  value: s.id,
                }))}
            />
          </div>
        </div>
      </Modal>

      {/* ── Student Profile Application Modal ── */}
      <Modal
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setDetailStudent(null); }}
        footer={null}
        width={1100}
        centered
        className="premium-modal"
        styles={{ body: { padding: 0 } }}
      >
        {detailStudent && (
          <div className="overflow-hidden bg-white">
            {/* Header Section */}
            <div className="relative p-12 overflow-hidden text-white bg-slate-900">
              <div className="absolute top-0 right-0 -mt-48 -mr-48 rounded-full w-96 h-96 bg-teal-500/10 blur-3xl" />
              <div className="relative flex items-center gap-10">
                <div className="w-32 h-32 rounded-[40px] bg-white/5 border-4 border-white/10 flex items-center justify-center text-5xl font-black text-teal-400 shadow-2xl">
                  {initials(detailStudent.name)}
                </div>
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <h2 className="text-5xl tracking-tighter text-white">{detailStudent.name}</h2>
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${detailStudent.admission?.isApproved ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                      {detailStudent.admission?.isApproved ? 'Verified Personnel' : 'Pending Audit'}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-lg font-bold text-slate-400">
                    <span className="flex items-center gap-2"><span className="text-teal-400 material-symbols-outlined">id_card</span> {detailStudent.admission?.admissionNo || detailStudent.id}</span>
                    <span className="opacity-20">|</span>
                    <span className="flex items-center gap-2"><span className="text-teal-400 material-symbols-outlined">school</span> {detailStudent.standard}</span>
                    <span className="opacity-20">|</span>
                    <span className="flex items-center gap-2"><span className="text-teal-400 material-symbols-outlined">calendar_today</span> {detailStudent.academicYear}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-12">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                {/* Main Application Content */}
                <div className="space-y-10 lg:col-span-8">
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-2 h-8 rounded-full bg-slate-900" />
                      <h4 className="text-2xl font-black tracking-tight text-slate-900">Personnel Biography</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-px overflow-hidden border shadow-sm bg-slate-100 rounded-3xl border-slate-100">
                      {[
                        { label: "Temporal Birth", value: dayjs(detailStudent.dob).format("DD MMM YYYY"), icon: "event" },
                        { label: "Biological Gender", value: detailStudent.gender, icon: "diversity_3" },
                        { label: "Ancestry / Faith", value: `${detailStudent.religion || ""} / ${detailStudent.community || ""}`, icon: "history_edu" },
                        { label: "Vitality (Blood)", value: detailStudent.bloodGroup, icon: "bloodtype" },
                        { label: "Paternal Root", value: detailStudent.family?.fatherName, icon: "person" },
                        { label: "Maternal Root", value: detailStudent.family?.motherName, icon: "person_4" },
                        { label: "Contact Channel", value: detailStudent.family?.fatherPhone || detailStudent.family?.motherPhone, icon: "call" },
                        { label: "Logistic Mode", value: detailStudent.transportMode || "Local Transit", icon: "potted_plant" },
                      ].map((item, idx) => (
                        <div key={idx} className="p-6 transition-all bg-white hover:bg-slate-50/50">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="material-symbols-outlined text-[14px] text-slate-400">{item.icon}</span>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{item.label}</span>
                          </div>
                          <div className="text-[14px] font-extrabold text-slate-900">{item.value || 'N/A'}</div>
                        </div>
                      ))}
                      <div className="col-span-2 p-6 bg-white border-t border-slate-50 hover:bg-slate-50/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="material-symbols-outlined text-[14px] text-slate-400">location_on</span>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Resident Domicile</span>
                        </div>
                        <div className="text-[14px] font-extrabold text-slate-900 leading-relaxed">
                          {[detailStudent.address?.line1, detailStudent.address?.line2, detailStudent.address?.city, detailStudent.address?.state].filter(Boolean).join(", ")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {detailStudent.academics && detailStudent.academics.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-2 h-8 bg-teal-500 rounded-full" />
                        <h4 className="text-2xl font-black tracking-tight text-slate-900">Academic History</h4>
                      </div>
                      <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl">
                        <div className="flex items-start justify-between mb-8">
                          <div>
                            <div className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Qualifying Examination</div>
                            <div className="text-2xl font-black">{detailStudent.academics[0].examName}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Board Register</div>
                            <div className="text-lg font-black">{detailStudent.academics[0].registerNo}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-6">
                          <div className="p-5 text-center border bg-white/5 rounded-2xl border-white/10">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Aggregate</div>
                            <div className="text-xl font-black text-teal-400">{detailStudent.academics[0].totalObtainedMarks} / {detailStudent.academics[0].totalMaxMarks}</div>
                          </div>
                          <div className="p-5 text-center bg-teal-500 shadow-lg rounded-2xl shadow-teal-500/20">
                            <div className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-2">Percentage</div>
                            <div className="text-2xl font-black text-white">{detailStudent.academics[0].totalPercentage}%</div>
                          </div>
                          <div className="p-5 text-center border bg-white/5 rounded-2xl border-white/10">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Session</div>
                            <div className="text-xl font-black text-white">{detailStudent.academics[0].monthYear}</div>
                          </div>
                          <div className="p-5 text-center border bg-white/5 rounded-2xl border-white/10">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Stream</div>
                            <div className="text-xl font-black text-teal-400">{detailStudent.academics[0].stream || 'General'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar Content */}
                <div className="lg:col-span-4">
                  <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 h-full">
                    <h4 className="flex items-center gap-3 mb-8 text-lg font-black text-slate-900">
                      <span className="material-symbols-outlined text-slate-400">shield</span> Institutional Status
                    </h4>

                    <div className="space-y-6">
                      <div className="p-6 bg-white border shadow-sm rounded-3xl border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Vitality</div>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full animate-pulse ${detailStudent.users?.isActive !== false ? 'bg-teal-500' : 'bg-rose-500'}`} />
                          <span className="text-lg font-black text-slate-900">{detailStudent.users?.isActive !== false ? 'Active Individual' : 'Archived Record'}</span>
                        </div>
                      </div>

                      <div className="p-6 bg-white border shadow-sm rounded-3xl border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[14px]">supervisor_account</span>
                          Sibling Link
                        </div>
                        {detailStudent.siblings && detailStudent.siblings.length > 0 ? (
                          <div className="space-y-2">
                            {detailStudent.siblings.map((sib) => (
                              <div key={sib.id} className="flex items-center gap-3 p-3 border bg-slate-50 rounded-2xl border-slate-100">
                                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-[11px] font-black flex-shrink-0">
                                  {sib.name?.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-[12px] font-black text-slate-900 leading-tight">{sib.name}</div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sib.standard} {sib.admission?.admissionNo ? `· ${sib.admission.admissionNo}` : ''}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-lg font-black text-slate-900">
                            Independent
                            <span className="material-symbols-outlined text-slate-200">family_restroom</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-12 mt-12 border-t border-slate-200">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Audit Synchronized</h5>
                        <p className="text-xs font-bold leading-relaxed text-slate-500">
                          Profile was last validated on {dayjs().format('DD MMMM YYYY')}. All academic and biographical vectors are consistent with institutional standards.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>


      <div
        id="pdfContent"
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
        }}
      >
        <div id="pdfPage1" style={pdfStyles.pdfWrapper}>
          <div style={pdfStyles.pdfHeader}>
            <div style={{ textAlign: "left", alignSelf: "stretch", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ border: "1px solid #000000", padding: "5px 8px", background: "#ffffff", fontWeight: 900, fontSize: 12, color: "#000000", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>
                Admission Form
              </div>
              <div style={{ fontSize: 10, color: "#000000", lineHeight: 1.5 }}>
                <div><strong>Adm. No:</strong> {detailStudent?.admission?.admissionNo || "-"}</div>
                <div><strong>Date:</strong> {detailStudent?.admission?.admissionDate ? dayjs(detailStudent.admission.admissionDate).format("DD/MM/YYYY") : dayjs().format("DD/MM/YYYY")}</div>
                <div><strong>Academic Year:</strong> {detailStudent?.admission?.academicYear || detailStudent?.academicYear || "-"}</div>
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <img
                  src={pdfLogoSrc || logo}
                  alt="Logo"
                  style={{ height: "52px", objectFit: "contain" }}
                />
                <div>
                  <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#000000", letterSpacing: "0.005em", whiteSpace: "nowrap" }}>
                    {adminSettings?.schoolName || "PSF Matriculation Higher Secondary School"}
                  </h1>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", fontWeight: 700, color: "#000000" }}>
                    {adminSettings?.address || "Vadugappatti (Po), Sankari (Tk), Salem (Dt) - 637301"}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ width: "92px", height: "110px", justifySelf: "end", borderRadius: "4px", background: "#ffffff", border: "1px solid #000000", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {normalizeAssetSrc(detailDocumentRow?.photoPath || detailDocumentRow?.photo || detailDocumentRow?.profilePhotoPath || detailDocumentRow?.profilePhoto) ? (
                <img
                  src={normalizeAssetSrc(detailDocumentRow?.photoPath || detailDocumentRow?.photo || detailDocumentRow?.profilePhotoPath || detailDocumentRow?.profilePhoto)}
                  alt="Student Photo"
                  crossOrigin="anonymous"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: "10px", fontWeight: "800", color: "#000000" }}>PASTE PHOTO</span>
              )}
            </div>
          </div>

          <div style={pdfStyles.sectionHeader}>1. Student Profile</div>
          <table style={pdfStyles.table}>
            <tbody>
              <tr>
                <td style={pdfStyles.tdLabel}>Student Name</td><td style={pdfStyles.tdValue}>{detailStudent?.name || "-"}</td>
                <td style={pdfStyles.tdLabel}>Admission No</td><td style={pdfStyles.tdValue}>{detailStudent?.admission?.admissionNo || "-"}</td>
                <td style={pdfStyles.tdLabel}>Academic Year</td><td style={pdfStyles.tdValue}>{detailStudent?.admission?.academicYear || detailStudent?.academicYear || "-"}</td>
              </tr>
              <tr>
                <td style={pdfStyles.tdLabel}>Standard</td><td style={pdfStyles.tdValue}>{detailStudent?.standard || detailStudent?.admission?.standard || "-"}</td>
                <td style={pdfStyles.tdLabel}>Section</td><td style={pdfStyles.tdValue}>{detailStudent?.section || "A"}</td>
                <td style={pdfStyles.tdLabel}>Admission Date</td><td style={pdfStyles.tdValue}>{detailStudent?.admission?.admissionDate ? dayjs(detailStudent.admission.admissionDate).format("DD/MM/YYYY") : "-"}</td>
              </tr>
              <tr>
                <td style={pdfStyles.tdLabel}>Gender</td><td style={pdfStyles.tdValue}>{detailStudent?.gender || "-"}</td>
                <td style={pdfStyles.tdLabel}>Date of Birth</td><td style={pdfStyles.tdValue}>{detailStudent?.dob ? dayjs(detailStudent.dob).format("DD/MM/YYYY") : "-"}</td>
                <td style={pdfStyles.tdLabel}>Blood Group</td><td style={pdfStyles.tdValue}>{detailStudent?.bloodGroup || "-"}</td>
              </tr>
              <tr>
                <td style={pdfStyles.tdLabel}>Religion</td><td style={pdfStyles.tdValue}>{detailStudent?.religion || "-"}</td>
                <td style={pdfStyles.tdLabel}>Community</td><td style={pdfStyles.tdValue}>{detailStudent?.community || "-"}</td>
                <td style={pdfStyles.tdLabel}>Caste</td><td style={pdfStyles.tdValue}>{detailStudent?.caste || "-"}</td>
              </tr>
              <tr>
                <td style={pdfStyles.tdLabel}>Mother Tongue</td><td style={pdfStyles.tdValue}>{detailStudent?.motherTongue || "-"}</td>
                <td style={pdfStyles.tdLabel}>Aadhar No</td><td style={pdfStyles.tdValue}>{detailStudent?.aadharNo || "-"}</td>
                <td style={pdfStyles.tdLabel}>Selected Stream</td><td style={pdfStyles.tdValue}>{detailSelectedStream}</td>
              </tr>
            </tbody>
          </table>

          <div style={pdfStyles.sectionHeader}>2. Family Details</div>
          <table style={pdfStyles.table}>
            <tbody>
              {showFatherDetails && (
                <>
                  <tr>
                    <td style={pdfStyles.tdLabel}>Father Name</td><td style={pdfStyles.tdValue}>{detailFamily?.fatherName || "-"}</td>
                    <td style={pdfStyles.tdLabel}>Father Mobile</td><td style={pdfStyles.tdValue}>{detailFamily?.fatherPhone || "-"}</td>
                    <td style={pdfStyles.tdLabel}>Father WhatsApp</td><td style={pdfStyles.tdValue}>{detailFamily?.fatherWhatsapp || detailFamily?.fatherWhatsAppNo || "-"}</td>
                  </tr>
                  <tr>
                    <td style={pdfStyles.tdLabel}>Father Occupation</td><td style={pdfStyles.tdValue}>{detailFamily?.fatherOccupation || "-"}</td>
                    <td style={pdfStyles.tdLabel}>Father Aadhar</td><td style={pdfStyles.tdValue}>{detailFamily?.fatherAadhar || detailFamily?.fatherAadharNo || "-"}</td>
                    <td style={pdfStyles.tdLabel}>Annual Income</td><td style={pdfStyles.tdValue}>{detailFamily?.familyIncome ? `Rs.${detailFamily.familyIncome}` : "-"}</td>
                  </tr>
                </>
              )}
              {showMotherDetails && (
                <>
                  <tr>
                    <td style={pdfStyles.tdLabel}>Mother Name</td><td style={pdfStyles.tdValue}>{detailFamily?.motherName || "-"}</td>
                    <td style={pdfStyles.tdLabel}>Mother Mobile</td><td style={pdfStyles.tdValue}>{detailFamily?.motherPhone || "-"}</td>
                    <td style={pdfStyles.tdLabel}>Mother WhatsApp</td><td style={pdfStyles.tdValue}>{detailFamily?.motherWhatsapp || detailFamily?.motherWhatsAppNo || "-"}</td>
                  </tr>
                  <tr>
                    <td style={pdfStyles.tdLabel}>Mother Occupation</td><td style={pdfStyles.tdValue}>{detailFamily?.motherOccupation || "-"}</td>
                    <td style={pdfStyles.tdLabel}>Mother Aadhar</td><td style={pdfStyles.tdValue}>{detailFamily?.motherAadhar || detailFamily?.motherAadharNo || "-"}</td>
                    <td style={pdfStyles.tdLabel}>Annual Income</td><td style={pdfStyles.tdValue}>{detailFamily?.familyIncome ? `Rs.${detailFamily.familyIncome}` : "-"}</td>
                  </tr>
                </>
              )}
              {showGuardianDetails && (
                <>
                  <tr>
                    <td style={pdfStyles.tdLabel}>Guardian Relation</td><td style={pdfStyles.tdValue}>{detailFamily?.guardianRelation || "-"}</td>
                    <td style={pdfStyles.tdLabel}>Guardian Name</td><td style={pdfStyles.tdValue}>{detailFamily?.guardianName || "-"}</td>
                    <td style={pdfStyles.tdLabel}>Guardian Phone</td><td style={pdfStyles.tdValue}>{detailFamily?.guardianPhone || "-"}</td>
                  </tr>
                  <tr>
                    <td style={pdfStyles.tdLabel}>Guardian WhatsApp</td><td style={pdfStyles.tdValue}>{detailFamily?.guardianWhatsapp || "-"}</td>
                    <td style={pdfStyles.tdLabel}>Guardian Aadhar</td><td style={pdfStyles.tdValue}>{detailFamily?.guardianAadhar || "-"}</td>
                    <td style={pdfStyles.tdLabel}>Guardian Occupation</td><td style={pdfStyles.tdValue}>{detailFamily?.guardianOccupation || "-"}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          <div style={pdfStyles.sectionHeader}>3. Address</div>
          <table style={pdfStyles.table}>
            <tbody>
              <tr>
                <td style={pdfStyles.tdLabel}>Door No</td><td style={pdfStyles.tdValue}>{detailAddress?.doorNo || detailAddress?.line1 || "-"}</td>
                <td style={pdfStyles.tdLabel}>Street</td><td style={pdfStyles.tdValue}>{detailAddress?.street || detailAddress?.line2 || "-"}</td>
                <td style={pdfStyles.tdLabel}>Village / PO / Area</td><td style={pdfStyles.tdValue}>{detailAddress?.line3 || "-"}</td>
              </tr>
              <tr>
                <td style={pdfStyles.tdLabel}>Taluk</td><td style={pdfStyles.tdValue}>{detailAddress?.landmark || "-"}</td>
                <td style={pdfStyles.tdLabel}>District</td><td style={pdfStyles.tdValue}>{detailAddress?.city || "-"}</td>
                <td style={pdfStyles.tdLabel}>State</td><td style={pdfStyles.tdValue}>{detailAddress?.state || "-"}</td>
              </tr>
              <tr>
                <td style={pdfStyles.tdLabel}>Pincode</td><td style={pdfStyles.tdValue}>{detailAddress?.pin || "-"}</td>
                <td style={pdfStyles.tdLabel}>Nationality</td><td style={pdfStyles.tdValue}>{detailAddress?.nationality || detailStudent?.nationality || "Indian"}</td>
                <td style={pdfStyles.tdLabel}></td><td style={pdfStyles.tdValue}>-</td>
              </tr>
            </tbody>
          </table>

          <div style={pdfStyles.sectionHeader}>4. Academic History</div>
          <table style={pdfStyles.table}>
            <thead>
              <tr>
                <th style={pdfStyles.th}>Exam / Board</th>
                <th style={pdfStyles.th}>Register No</th>
                <th style={pdfStyles.th}>Month & Year</th>
                <th style={pdfStyles.th}>Max Marks</th>
                <th style={pdfStyles.th}>Marks Obtained</th>
                <th style={pdfStyles.th}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {(detailStudent?.academics || []).length ? (
                (detailStudent?.academics || []).map((ac, i) => (
                  <tr key={i}>
                    <td style={pdfStyles.tdValue}>{ac?.examName || "-"}</td>
                    <td style={pdfStyles.tdValue}>{ac?.registerNo || "-"}</td>
                    <td style={pdfStyles.tdValue}>{ac?.monthYear || "-"}</td>
                    <td style={pdfStyles.tdValue}>{ac?.totalMaxMarks ?? "-"}</td>
                    <td style={pdfStyles.tdValue}>{ac?.totalObtainedMarks ?? "-"}</td>
                    <td style={pdfStyles.tdValue}>{ac?.totalPercentage != null ? `${ac.totalPercentage}%` : "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={pdfStyles.tdValue}>-</td><td style={pdfStyles.tdValue}>-</td><td style={pdfStyles.tdValue}>-</td><td style={pdfStyles.tdValue}>-</td><td style={pdfStyles.tdValue}>-</td><td style={pdfStyles.tdValue}>-</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={pdfStyles.sectionHeader}>5. Subject-Wise Marks</div>
          <table style={pdfStyles.table}>
            <thead>
              <tr>
                <th style={pdfStyles.th}>Subject</th>
                <th style={pdfStyles.th}>Max Marks</th>
                <th style={pdfStyles.th}>Marks Obtained</th>
                <th style={pdfStyles.th}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {((detailStudent?.academics || []).reduce((acc, ac) => acc.concat(ac?.subjects || []), [])).length ? (
                (detailStudent?.academics || []).reduce((acc, ac) => acc.concat(ac?.subjects || []), []).map((subject, idx) => {
                  const maxMarks = Number(subject?.maxMarks || 0);
                  const obtainedMarks = Number(subject?.obtainedMarks || 0);
                  const pct = maxMarks > 0 ? `${((obtainedMarks / maxMarks) * 100).toFixed(1)}%` : "-";
                  return (
                    <tr key={idx}>
                      <td style={pdfStyles.tdValue}>{subject?.subjectName || "-"}</td>
                      <td style={pdfStyles.tdValue}>{subject?.maxMarks ?? "-"}</td>
                      <td style={pdfStyles.tdValue}>{subject?.obtainedMarks ?? "-"}</td>
                      <td style={pdfStyles.tdValue}>{pct}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td style={pdfStyles.tdValue} colSpan={4}>No subject marks entered.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: "auto" }}>
            <div style={pdfStyles.sectionHeader}>6. Declaration</div>
            <div style={pdfStyles.declarationBox}>
              I hereby declare that all information provided in this admission form is true and correct to the best of my knowledge.
              I undertake to abide by the rules and regulations of the institution.
            </div>

            <div style={pdfStyles.signatureRow}>
              <div style={pdfStyles.signatureCell}>
                <div style={{ width: "100%", height: "34px" }} />
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#000000" }}>Parent / Guardian Signature</div>
              </div>
              <div style={{ ...pdfStyles.signatureCell, borderRight: "none" }}>
                {normalizeAssetSrc(adminSettings?.documentAssets?.principalSignature || adminSettings?.principalSignature) ? (
                  <img
                    src={normalizeAssetSrc(adminSettings?.documentAssets?.principalSignature || adminSettings?.principalSignature)}
                    alt="Principal Signature"
                    crossOrigin="anonymous"
                    style={pdfStyles.sigImage}
                  />
                ) : (
                  <div style={{ width: "110px", height: "34px", borderBottom: "1px dashed #000000" }} />
                )}
                {normalizeAssetSrc(adminSettings?.documentAssets?.rubberStamp || adminSettings?.rubberStamp) && (
                  <img
                    src={normalizeAssetSrc(adminSettings?.documentAssets?.rubberStamp || adminSettings?.rubberStamp)}
                    alt="Principal Seal"
                    crossOrigin="anonymous"
                    style={{ width: 42, height: 42, objectFit: "contain" }}
                  />
                )}
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#000000" }}>Principal Signature</div>
              </div>
            </div>
          </div>
        </div>

      </div>


    </div>



  );
};

export default StudentView;
