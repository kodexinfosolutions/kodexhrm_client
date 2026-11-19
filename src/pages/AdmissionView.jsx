import React, { useState, useEffect } from "react";
import { Table, Input, Button, Space, message, Popconfirm, DatePicker, Tag, Select, Modal, Row } from "antd";
import "./AdmissionView.css";
import { SearchOutlined, EditOutlined, DownloadOutlined, DeleteOutlined, PrinterOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from "../assets/logo.jpeg";

// Redesigned handlePrintPDF logic will be moved inside the component
import instance from "../utils/axios";
import dayjs from "dayjs";
import { getPendingAdmissions, setAdmissionApproval, bulkApproval } from "../modules/admission/admission.service";
import { getAcademicYears, getAcademicYear as fetchCurrentYear } from "../modules/fees/fees.service";
import { getAdminSettings } from "../modules/settings/settings.service";
import { PERMISSIONS, usePermissionHelpers } from "../utils/permissions";

const normalizeStudentPhotoSrc = (value) => {
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

const extractStudentPhotoPath = (record) => {
  const doc = record?.documents?.[0] || {};
  return doc.photoPath || doc.profilePhotoPath || doc.profilePhoto || "";
};

const getInitials = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "NA";

const StudentAvatar = ({ name, photoPath, imageClassName, fallbackClassName }) => {
  const [failed, setFailed] = useState(false);
  const src = normalizeStudentPhotoSrc(photoPath);
  const initials = getInitials(name);

  if (!src || failed) {
    return <div className={fallbackClassName}>{initials}</div>;
  }

  return <img src={src} className={imageClassName} alt={name || "Student"} onError={() => setFailed(true)} />;
};

const StatCard = ({ title, value, icon, color, trend }) => (
  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 group">
    <div className="flex justify-between items-start mb-4">
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
      <div className="text-2xl font-black text-slate-900 tracking-tighter">{value}</div>
    </div>
  </div>
);

const normalizeStandardValue = (value) => {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  const lower = raw.toLowerCase();

  if (lower === "lkg") return "LKG";
  if (lower === "ukg") return "UKG";

  const stdCodeMatch = lower.match(/^std[_\-\s]?(\d{1,2})$/);
  if (stdCodeMatch) return stdCodeMatch[1];

  const numberMatch = lower.match(/^(\d{1,2})(st|nd|rd|th)?(\s*standard)?$/);
  if (numberMatch) return numberMatch[1];

  return raw;
};

const formatStandardLabel = (value) => {
  const normalized = normalizeStandardValue(value);
  if (normalized === "LKG" || normalized === "UKG") return normalized;

  const num = Number(normalized);
  if (!Number.isNaN(num) && normalized !== "") {
    if (num === 1) return "1st Standard";
    if (num === 2) return "2nd Standard";
    if (num === 3) return "3rd Standard";
    return `${num}th Standard`;
  }

  return value || "";
};

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
  };;

const AdmissionView = ({ onEdit, mode = "all" }) => {
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

  const detailStudent = printingRecord;
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
  const pdfLogoSrc = getSchoolLogoSrc(adminSettings, logo) || logo;
  const detailDocumentRow = detailStudent?.documents?.[0];

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState({});
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalModalRecord, setApprovalModalRecord] = useState(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkApprovalLoading, setBulkApprovalLoading] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);
  const [printingRecord, setPrintingRecord] = useState(null);
  
  const [filterStandard, setFilterStandard] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterApproval, setFilterApproval] = useState("");
  const [filterDate, setFilterDate] = useState(null);
  const [filterAcademicYear, setFilterAcademicYear] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterFatherName, setFilterFatherName] = useState("");
  const [filterSibling, setFilterSibling] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [availableYears, setAvailableYears] = useState([]);

  const getDocumentAssets = () => {
    const assets = adminSettings?.documentAssets || {};
    return {
      principalSignature: assets.principalSignature || adminSettings?.principalSignature || "",
      hrSignature: assets.hrSignature || adminSettings?.hrSignature || "",
      chairmanSignature: assets.chairmanSignature || adminSettings?.chairmanSignature || "",
      rubberStamp: assets.rubberStamp || adminSettings?.rubberStamp || "",
    };
  };

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

  const { hasPermission } = usePermissionHelpers();
  const canApprove = hasPermission(PERMISSIONS.ADMISSION_APPROVE) && (adminSettings?.requireApprovalForAdmission ?? true);

  // Re-apply filters whenever data or any filter changes
  useEffect(() => {
    applyFilters(
      searchText,
      filterStandard,
      filterGender,
      filterStatus,
      filterApproval,
      filterDate,
      filterAcademicYear,
      filterSection,
      filterFatherName,
      filterSibling,
      filterArea,
      data
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data,
    searchText,
    filterStandard,
    filterGender,
    filterStatus,
    filterApproval,
    filterDate,
    filterAcademicYear,
    filterSection,
    filterFatherName,
    filterSibling,
    filterArea
  ]);

  const handlePrintPDF = async (record) => {
    setPrintingRecord(record);
    // Wait for DOM to render hidden content
    setTimeout(async () => {
      try {
        const input = document.getElementById("viewPdfContent");
        if (!input) return;
        
        const canvas = await html2canvas(input, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: 800,
        });
        
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        
        const pdf = new jsPDF("p", "mm", "a4");
        let position = 0;
        
        const imgData = canvas.toDataURL("image/png");
        
        // Add first page
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        // Add additional pages if needed
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        pdf.save(`Admission_${record.admission?.admissionNo || record.id}.pdf`);
      } catch (err) {
        console.error("PDF Export Error:", err);
        message.error("Failed to generate PDF");
      } finally {
        setPrintingRecord(null);
      }
    }, 100);
  };

  const documentAssets = getDocumentAssets();

  const loadAdminSettings = async () => {
    try {
      const settings = await getAdminSettings();
      setAdminSettings(settings);
    } catch (err) {
      console.error("Failed to load admin settings:", err);
    }
  };

  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      const rows = mode === "approval"
        ? await getPendingAdmissions()
        : (await instance.get("/admissions")).data;
      setData(rows);
      // Apply filters to initial data
      applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, rows);
    } catch {
      message.error("Failed to load admissions");
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const [years] = await Promise.all([
        getAcademicYears(),
        fetchCurrentYear()
      ]);
      setAvailableYears(years || []);
      // Do not set filterAcademicYear by default
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchAdmissions();
    loadAdminSettings();
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Helper to get unique values for dropdowns
  const getUnique = (arr, key) => {
    const values = arr.map(item => {
      if (typeof key === 'string') return item[key];
      // for nested keys like ['admission','standard']
      if (Array.isArray(key)) return key.reduce((o, k) => (o ? o[k] : undefined), item);
      return undefined;
    });
    return Array.from(new Set(values.filter(Boolean)));
  };


  // Combined filter
  const applyFilters = (searchVal, std, gender, status, approval, dateRange, academicYear, section, fatherName, sibling, areaSearch, sourceData = data) => {
    let filtered = sourceData.filter((item) => {
      // Search
      if (searchVal && searchVal.trim() !== "") {
        const found = Object.values(item).some((v) =>
          String(v).toLowerCase().includes(searchVal.toLowerCase())
        );
        if (!found) return false;
      }
      // Standard
      if (std && std !== "") {
        const itemStandard = item.admission?.standard || item.standard;
        if (normalizeStandardValue(itemStandard) !== normalizeStandardValue(std)) return false;
      }
      // Gender
      if (gender && gender !== "") {
        if (item.gender !== gender) return false;
      }
      // Status
      if (status && status !== "") {
        const isActive = item.users?.isActive ?? 1;
        if ((status === 'active' && !isActive) || (status === 'inactive' && isActive)) return false;
      }
      // Approval
      if (approval && approval !== "") {
        const isApproved = Boolean(item.admission?.isApproved);
        if ((approval === 'approved' && !isApproved) || (approval === 'pending' && isApproved)) return false;
      }
      // Academic Year
      if (academicYear && academicYear !== "") {
        if (item.academicYear !== academicYear) return false;
      }
      // Section
      if (section && section !== "") {
        if (item.section !== section) return false;
      }
      // Father Name
      if (fatherName && fatherName.trim() !== "") {
        if (!(item.family?.fatherName || "").toLowerCase().includes(fatherName.toLowerCase())) return false;
      }
      // Sibling
      if (sibling && sibling !== "") {
        if (sibling === 'has' && !item.siblingGroupId) return false;
        if (sibling === 'none' && item.siblingGroupId) return false;
      }
      // Area Search
      if (areaSearch && areaSearch.trim() !== "") {
        const areaStr = areaSearch.toLowerCase();
        const address = item.address || {};
        const isMatch = 
          (address.line1 || "").toLowerCase().includes(areaStr) ||
          (address.line2 || "").toLowerCase().includes(areaStr) ||
          (address.line3 || "").toLowerCase().includes(areaStr) ||
          (address.city || "").toLowerCase().includes(areaStr) ||
          (address.state || "").toLowerCase().includes(areaStr) ||
          String(address.pin || "").toLowerCase().includes(areaStr);
        if (!isMatch) return false;
      }
      // Admission Date
      if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
        const admDate = item.admission?.admissionDate;
        if (admDate) {
          const d = dayjs(admDate);
          if (!(d.isAfter(dateRange[0].startOf('day').subtract(1, 'ms')) && d.isBefore(dateRange[1].endOf('day').add(1, 'ms')))) return false;
        } else {
          return false;
        }
      }
      return true;
    });
    setFilteredData(filtered);
  };

  // Handlers
  const handleSearch = (value) => {
    setSearchText(value);
    applyFilters(value, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleStandard = (value) => {
    setFilterStandard(value);
    applyFilters(searchText, value, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleGender = (value) => {
    setFilterGender(value);
    applyFilters(searchText, filterStandard, value, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleStatus = (value) => {
    setFilterStatus(value);
    applyFilters(searchText, filterStandard, filterGender, value, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleApprovalFilter = (value) => {
    setFilterApproval(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, value, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleDate = (dates) => {
    setFilterDate(dates);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, dates, filterAcademicYear, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleAcademicYear = (value) => {
    setFilterAcademicYear(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, value, filterSection, filterFatherName, filterSibling, filterArea);
  };
  const handleSection = (value) => {
    setFilterSection(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, value, filterFatherName, filterSibling, filterArea);
  };
  const handleFatherName = (value) => {
    setFilterFatherName(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, value, filterSibling, filterArea);
  };
  const handleSibling = (value) => {
    setFilterSibling(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, value, filterArea);
  };
  const handleArea = (value) => {
    setFilterArea(value);
    applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling, value);
  };

  const handleSetApproval = async (record, approved, reason) => {
    if (!canApprove) {
      message.error("You are not authorized to approve admissions");
      return;
    }

    try {
      setApprovalLoading((prev) => ({ ...prev, [record.id]: true }));
      await setAdmissionApproval(record.id, approved, reason);
      message.success(approved ? "Admission approved" : "Admission marked pending");
      await fetchAdmissions();
      applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update approval");
    } finally {
      setApprovalLoading((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  const openMarkPendingModal = (record) => {
    setApprovalModalRecord(record);
    setApprovalReason("");
    setApprovalModalOpen(true);
  };

  const handleConfirmMarkPending = async () => {
    if (!approvalModalRecord) return;
    await handleSetApproval(approvalModalRecord, false, approvalReason || undefined);
    setApprovalModalOpen(false);
    setApprovalModalRecord(null);
    setApprovalReason("");
  };

  const handleBulkApproval = async (approved) => {
    if (selectedRowKeys.length === 0) {
      message.error("Select at least one admission");
      return;
    }
    try {
      setBulkApprovalLoading(true);
      const result = await bulkApproval(selectedRowKeys, approved);
      message.success(`${result.updatedCount} admissions ${approved ? 'approved' : 'marked pending'}`);
      setSelectedRowKeys([]);
      await fetchAdmissions();
      applyFilters(searchText, filterStandard, filterGender, filterStatus, filterApproval, filterDate, filterAcademicYear, filterSection, filterFatherName, filterSibling);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Bulk approval failed');
    } finally {
      setBulkApprovalLoading(false);
    }
  };

  const rowSelection = canApprove ? {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: false,
    }),
  } : undefined;

  // Sort
  const handleSort = (field) => {
    const order = sortOrder === "ascend" ? "descend" : "ascend";
    setSortOrder(order);
    const sorted = [...filteredData].sort((a, b) => {
      // deeply resolve fields
      const resolvePath = (obj, path) => path.split('.').reduce((o, p) => (o ? o[p] : ""), obj);
      const valA = String(resolvePath(a, field));
      const valB = String(resolvePath(b, field));
      if (order === "ascend") return valA.localeCompare(valB);
      else return valB.localeCompare(valA);
    });
    setFilteredData(sorted);
  };

  // Helper to flatten nested objects
  const flattenObject = (obj, prefix = "") => {
    let result = {};
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(result, flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
    return result;
  };

  // Export CSV with expanded nested objects
  const exportCSV = () => {
    if (!filteredData.length) return;
    // Flatten all rows
    const flatRows = filteredData.map(row => flattenObject(row));
    // Collect all unique keys for columns
    const allKeys = Array.from(new Set(flatRows.flatMap(row => Object.keys(row))));
    // Build CSV rows
    const csvRows = [
      allKeys.join(","),
      ...flatRows.map(row =>
        allKeys.map(k => {
          let v = row[k];
          if (v === undefined || v === null) return "";
          v = String(v).replace(/"/g, '""');
          return `"${v}"`;
        }).join(",")
      )
    ];
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (record) => {
    if (onEdit) onEdit(record);
  };

  const handleDelete = async (id) => {
    try {
      console.log("Deleting ID:", id);
      await instance.delete(`/users/${id}`);
      console.log("Deleted ID:", id);
      setData(data.filter((item) => item.id !== id));
      setFilteredData(filteredData.filter((item) => item.id !== id));
      message.success("Deleted successfully");
    } catch {
      message.error("Delete failed");
    }
  };

  const renderBool = (val) => (val ? "Yes" : "No");
  const renderDate = (date) => (date ? dayjs(date).format("YYYY-MM-DD") : "");

  const expandedRowRender = (record) => {
    const detailGroup = (title, icon, items, color) => (
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
          <span className={`w-6 h-6 rounded-lg flex items-center justify-center`} style={{ background: `${color}15`, color: color }}>
            <span className="material-symbols-outlined text-[14px]">{icon}</span>
          </span>
          {title}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
          {items.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
              <span className="text-[12px] font-extrabold text-slate-900">{value || 'Not Disclosed'}</span>
            </div>
          ))}
        </div>
      </div>
    );

    const photoPath = extractStudentPhotoPath(record);

    return (
      <div className="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 m-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Student Profile Overview */}
          <div className="lg:col-span-3 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <StudentAvatar
                name={record.name}
                photoPath={photoPath}
                imageClassName="w-40 h-40 rounded-[40px] object-cover border-4 border-white shadow-2xl"
                fallbackClassName="w-40 h-40 rounded-[40px] bg-slate-200 text-slate-400 flex items-center justify-center text-5xl font-black border-4 border-white shadow-xl"
              />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                Roll #{record.admission?.admissionNo}
              </div>
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">{record.name}</h2>
            <div className="flex items-center gap-2 justify-center mb-6">
               <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[10px] font-black uppercase tracking-widest rounded-full">{record.gender}</span>
               <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">{record.bloodGroup}</span>
            </div>

            <div className="w-full space-y-2">
               <div className="flex justify-between items-center p-3 bg-white rounded-2xl border border-slate-100 text-xs shadow-sm">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Admission Date</span>
                  <span className="font-black text-slate-900">{renderDate(record.admission?.admissionDate)}</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-white rounded-2xl border border-slate-100 text-xs shadow-sm">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Current Grade</span>
                  <span className="font-black text-slate-900">{formatStandardLabel(record.standard || record.admission?.standard)}</span>
               </div>
            </div>
          </div>

          {/* Detailed Bento Groups */}
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
            {detailGroup("Governance Data", "verified_user", [
               ["Religion", record.religion],
               ["Community", record.community],
               ["Caste", record.caste],
               ["Mother Tongue", record.motherTongue],
               ["Aadhar ID", record.aadharNo],
               ["Identification", record.identification1],
               ["School Origination", record.previousSchool],
               ["Transport Mode", record.transportMode],
            ], "#0f172a")}

            {detailGroup("Family Matrix", "family_history", [
               ["Father", record.family?.fatherName],
               ["Father Mob.", record.family?.fatherPhone],
               ["Mother", record.family?.motherName],
               ["Mother Mob.", record.family?.motherPhone],
               ["Primary Email", record.family?.parentsEmail],
               ["Annual Income", `₹${record.family?.familyIncome || 0}`],
               ["Sibling Registry", record.family?.siblings ? "Active" : "None"],
               ["Residential Area", record.address?.city],
            ], "#6366f1")}

            {detailGroup("Academic Standing", "school", [
               ["Registration No", record.admission?.registerNo],
               ["Academic Period", record.admission?.academicYear],
               ["Valid From", renderDate(record.admission?.admissionFrom)],
               ["Valid To", renderDate(record.admission?.admissionTo)],
               ["Hostel Request", renderBool(record.family?.hostelRequired)],
               ["RTE Status", renderBool(record.rte)],
            ], "#10b981")}

            {detailGroup("Administrative Seal", "ink_pen", [
               ["Staff Seal", record.admission?.staffSignature],
               ["Principal Seal", record.admission?.principalSignature],
               ["System Auditor", record.admission?.approvedByRole],
               ["Audit Timestamp", record.admission?.approvedAt ? dayjs(record.admission.approvedAt).format("DD MMM YYYY, HH:mm") : "-"],
            ], "#f59e0b")}
          </div>
        </div>
      </div>
    );
  };

  const columns = [
    {
      title: "Student Details",
      dataIndex: "name",
      sorter: true,
      fixed: "left",
      width: 280,
      onHeaderCell: () => ({ onClick: () => handleSort("name") }),
      render: (text, record) => {
        const photoPath = extractStudentPhotoPath(record);
        return (
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <StudentAvatar
                name={text}
                photoPath={photoPath}
                imageClassName="w-10 h-10 rounded-xl object-cover avatar-ring"
                fallbackClassName="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-[10px] avatar-ring"
              />
            </div>
            <div>
              <div className="text-[13px] font-black text-slate-900 tracking-tight leading-none mb-1">{text}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {record.admission?.admissionNo}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: "STD | Sec",
      dataIndex: "standard",
      width: 150,
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="text-[11px] font-black text-slate-900">{formatStandardLabel(record.standard || record.admission?.standard)}</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{record.academicYear} | {record.section || 'N/A'}</span>
        </div>
      )
    },
    {
      title: "Parent",
      width: 180,
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="text-[11px] font-black text-slate-900">{record.family?.fatherName || "No Family Contact"}</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{record.gender} | Indian</span>
        </div>
      )
    },
    {
      title: "Verification",
      width: 140,
      render: (_, record) => {
        const approved = Boolean(record.admission?.isApproved);
        return (
          <span className={`status-tag ${approved ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'}`}>
            {approved ? 'Verified' : 'Pending'}
          </span>
        );
      }
    },
    {
      title: "Status",
      width: 120,
      render: (_, record) => {
        const active = (record.users?.isActive ?? 1);
        return (
          <span className={`status-tag ${active ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
            {active ? 'Active' : 'Inactive'}
          </span>
        );
      }
    },
    {
      title: "Actions",
      fixed: "right",
      width: 320,
      render: (_, record) => (
        <Space size={8}>
          {mode !== "approval" && (
            <button 
              onClick={() => handleEdit(record)}
              className="px-4 py-1.5 bg-slate-50 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              Edit
            </button>
          )}
          {mode !== "approval" && (
            <Popconfirm title="Archive student record?" onConfirm={() => handleDelete(record?.users?.id)}>
              <button 
                className="px-4 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-rose-100 hover:bg-rose-100 transition-all"
              >
                Archive
              </button>
            </Popconfirm>
          )}
          <button 
            onClick={() => handlePrintPDF(record)}
            className="px-4 py-1.5 bg-slate-50 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[14px]">print</span>
            Issue PDF
          </button>
          {canApprove && (
            <div className="flex gap-2">
              <button
                disabled={Boolean(record.admission?.isApproved)}
                onClick={() => handleSetApproval(record, true, undefined)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${record.admission?.isApproved ? 'bg-slate-100 text-slate-400 blur-[0.5px]' : 'bg-teal-600 text-white shadow-lg shadow-teal-500/20 hover:bg-teal-700'}`}
              >
                {record.admission?.isApproved ? 'Verified' : 'Verify'}
              </button>
            </div>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="admission-view-modern p-8 min-h-screen bg-[#fdfdfd]">
      <style>{`
        .admission-view-modern { font-family: 'Public Sans', sans-serif; }
        .premium-table .ant-table-thead > tr > th { background: #f8fafc !important; font-weight: 800 !important; color: #64748b !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; font-size: 10px !important; border-bottom: 1px solid #f1f5f9 !important; padding: 16px !important; }
        .premium-table .ant-table-row td { padding: 16px !important; border-bottom: 1px solid #f8fafc !important; }
        .premium-table .ant-table-row:hover td { background: #f8fafc !important; }
        .filter-control { border-radius: 12px !important; border: 1px solid #e2e8f0 !important; background: #ffffff !important; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
        .filter-control, .filter-control .ant-select-selector, .filter-control .ant-picker, .filter-control .ant-input-affix-wrapper {
          min-height: 2.5rem !important;
          height: 2.5rem !important;
          border-radius: 0.75rem !important;
        }
        .filter-control .ant-picker-range, .filter-control .ant-input {
          line-height: 1.3 !important;
        }
        .filter-control:hover, .filter-control:focus { border-color: #cbd5e1 !important; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06); }
        .filter-control .material-symbols-outlined { display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
        .filter-toolbar { border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(248, 250, 252, 0.9); border-radius: 18px; padding: 0.75rem 0.9rem; }
        .filter-toolbar > .flex { gap: 0.5rem; }
        .status-tag { border-radius: 9999px; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 12px; }
      `}</style>

      {/* Header Section */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full">Archive List</span>
            <span className="text-slate-200">/</span>
            <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{mode === "approval" ? "Queue" : "Repository"}</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">
            {mode === "approval" ? "Approval" : "Student"} <span className="text-teal-600">Applications</span>
          </h1>
        </div>
        
        <div className="flex gap-4">
           {canApprove && selectedRowKeys.length > 0 && (
             <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                <button 
                  onClick={() => handleBulkApproval(true)} 
                  disabled={bulkApprovalLoading}
                  className="px-6 py-2.5 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-teal-700 transition-all flex items-center gap-2"
                >
                  Verify {selectedRowKeys.length}
                  <span className="material-symbols-outlined text-sm">verified</span>
                </button>
                <button 
                  onClick={() => handleBulkApproval(false)} 
                  disabled={bulkApprovalLoading}
                  className="px-6 py-2.5 bg-white text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-50 transition-all"
                >
                  Hold
                </button>
             </div>
           )}
           <button 
             onClick={exportCSV} 
             className="px-6 py-2.5 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 shadow-sm hover:border-slate-400 transition-all flex items-center gap-2"
           >
             <DownloadOutlined /> Admission Application
           </button>
        </div>
      </div>

      {/* Bento Grid Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard 
          title="Total Enrollments" 
          value={data.length} 
          icon="groups" 
          color="#0f172a" 
          trend={12} 
        />
        <StatCard 
          title="Academic Ready" 
          value={data.filter(i => i.admission?.isApproved).length} 
          icon="verified" 
          color="#10b981" 
        />
        <StatCard 
          title="Pending Queue" 
          value={data.filter(i => !i.admission?.isApproved).length} 
          icon="pending_actions" 
          color="#f59e0b" 
        />
        <StatCard 
          title="Fresh Intake" 
          value={data.filter(i => dayjs(i.admission?.admissionDate).isSame(dayjs(), 'day')).length} 
          icon="new_releases" 
          color="#6366f1" 
        />
      </div>

      {/* Compact Filter Toolbar */}
      <div className="filter-toolbar mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-500">Filters</span>

          <div className="min-w-[220px] flex-1">
            <label className="sr-only" htmlFor="admission-filter-search">Search Student</label>
            <Input
              id="admission-filter-search"
              name="admissionFilterSearch"
              placeholder="Search Student"
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="filter-control !w-full !h-10"
              prefix={<SearchOutlined className="text-slate-400" />}
            />
          </div>

          <div className="min-w-[150px] max-w-[180px]">
            <label className="sr-only">Grade</label>
            <Select
              allowClear
              placeholder="Grade"
              className="filter-control !w-full !h-10"
              variant="borderless"
              value={filterStandard}
              onChange={handleStandard}
              options={getUnique(data, ["admission", "standard"]).map((v) => ({
                label: formatStandardLabel(v),
                value: v,
              }))}
            />
          </div>

          <div className="min-w-[130px] max-w-[150px]">
            <label className="sr-only">Gender</label>
            <Select
              allowClear
              placeholder="Gender"
              className="filter-control !w-full !h-10"
              variant="borderless"
              value={filterGender}
              onChange={handleGender}
              options={getUnique(data, "gender").map((v) => ({ label: v, value: v }))}
            />
          </div>

          <div className="min-w-[140px] max-w-[160px]">
            <label className="sr-only">Status</label>
            <Select
              allowClear
              placeholder="Status"
              className="filter-control !w-full !h-10"
              variant="borderless"
              value={filterStatus}
              onChange={handleStatus}
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
            />
          </div>

          <div className="min-w-[150px] max-w-[180px]">
            <label className="sr-only">Academic Year</label>
            <Select
              allowClear
              placeholder="Year"
              className="filter-control !w-full !h-10"
              variant="borderless"
              value={filterAcademicYear}
              onChange={handleAcademicYear}
              options={availableYears.map((v) => ({ label: v, value: v }))}
            />
          </div>

          <div className="min-w-[180px] max-w-[220px]">
            <label className="sr-only">Joined Date</label>
            <DatePicker.RangePicker
              className="filter-control !w-full !h-10"
              value={filterDate}
              onChange={handleDate}
              placeholder={["Joined From", "To"]}
            />
          </div>

          <div className="min-w-[180px] max-w-[220px]">
            <label className="sr-only" htmlFor="admission-filter-area">Area / Street / PIN</label>
            <Input
              id="admission-filter-area"
              name="admissionFilterArea"
              allowClear
              placeholder="Area / Street / PIN"
              value={filterArea}
              onChange={(e) => handleArea(e.target.value)}
              className="filter-control !w-full !h-10 !bg-slate-50/60"
              prefix={<span className="material-symbols-outlined text-slate-400 text-base leading-none">location_on</span>}
            />
          </div>

          <div className="min-w-[180px] max-w-[220px]">
            <label className="sr-only" htmlFor="admission-filter-parent">Parent / Guardian</label>
            <Input
              id="admission-filter-parent"
              name="admissionFilterParent"
              allowClear
              placeholder="Parent / Guardian"
              value={filterFatherName}
              onChange={(e) => handleFatherName(e.target.value)}
              className="filter-control !w-full !h-10 !bg-slate-50/60"
              prefix={<span className="material-symbols-outlined text-slate-400 text-base leading-none">person</span>}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {mode === "approval" && (
              <button
                onClick={fetchAdmissions}
                className="h-10 w-10 rounded-xl bg-slate-50 text-slate-900 flex items-center justify-center hover:bg-slate-100 transition-all border border-slate-200"
              >
                <ReloadOutlined />
              </button>
            )}
            <button
              onClick={() => {
                setSearchText("");
                setFilterStandard("");
                setFilterGender("");
                setFilterStatus("");
                setFilterApproval("");
                setFilterDate(null);
                setFilterAcademicYear("");
                setFilterSection("");
                setFilterFatherName("");
                setFilterSibling("");
                setFilterArea("");
              }}
              className="h-10 px-4 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-sm"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        rowKey="id"
        rowSelection={rowSelection}
        expandable={{
          expandedRowRender,
          columnWidth: 48,
        }}
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        className="premium-table"
      />

      {/* ── HIDDEN PDF TEMPLATE FOR VIEW LIST ── */}
      {printingRecord && (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div id="viewPdfContent" style={pdfStyles.pdfWrapper}>
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
                  {normalizeAssetSrc(documentAssets.principalSignature) ? (
                    <img
                      src={normalizeAssetSrc(documentAssets.principalSignature)}
                      alt="Principal Signature"
                      crossOrigin="anonymous"
                      style={pdfStyles.sigImage}
                    />
                  ) : (
                    <div style={{ width: "110px", height: "34px", borderBottom: "1px dashed #000000" }} />
                  )}
                  {normalizeAssetSrc(documentAssets.rubberStamp) && (
                    <img
                      src={normalizeAssetSrc(documentAssets.rubberStamp)}
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
      )}

      <Modal
        title="Reason (Optional)"
        open={approvalModalOpen}
        onCancel={() => {
          setApprovalModalOpen(false);
          setApprovalModalRecord(null);
          setApprovalReason("");
        }}
        onOk={handleConfirmMarkPending}
        okText="Save"
      >
        <Input.TextArea
          id="admission-mark-pending-reason"
          name="admissionMarkPendingReason"
          rows={4}
          placeholder="Why is this admission being marked pending?"
          value={approvalReason}
          onChange={(e) => setApprovalReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default AdmissionView;
