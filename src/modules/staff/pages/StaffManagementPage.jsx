import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Space,
  message,
  Popconfirm,
  Descriptions,
  Upload,
  Divider,
  Typography,
  Switch,
  Row,
  Col,
  Avatar,
  Badge,
  Tooltip,
  Tabs,
  Image,
  Alert,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  FileTextOutlined,
  DownloadOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  BankOutlined,
  IdcardOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  MedicineBoxOutlined,
  HistoryOutlined,
  DollarOutlined,
  ToolOutlined,
  ScheduleOutlined,
  ThunderboltOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  getAllStaff,
  getNextEmployeeId,
  createStaff,
  getStaff,
  getStaffDocuments,
  updateStaff,
  deleteStaff,
  uploadStaffDocument,
  deleteStaffDocument,
  getDepartments,
  getDesignations,
  createDepartment,
  createDesignation,
  getMachineries,
  createMachinery,
} from "../staff.service";
import {
  getShifts,
  getSalaryComponents,
  getEmployeeSalaryStructure,
  saveEmployeeSalaryStructure,
} from "../../hr/hr.service";
import dayjs from "dayjs";
import { hasPermission, PERMISSIONS } from "../../../utils/permissions";

const { Option } = Select;
const { Text } = Typography;

const DEFAULT_DESIGNATIONS = [
  "General Manager",
  "Plant Head",
  "Production Supervisor",
  "Quality Incharge",
  "Maintenance Engineer",
  "Shift Incharge",
  "Spinning Master",
  "Weaving Master",
  "Cutting Master",
  "Tailor / Operator",
  "Overlock Operator",
  "Packing Operator",
  "Finishing Incharge",
  "Store Keeper",
  "Accountant",
  "HR Executive",
  "Security Officer",
  "Helper",
  "Other",
];

const DEFAULT_DEPARTMENTS = [
  "Spinning",
  "Weaving",
  "Knitting",
  "Dyeing",
  "Cutting",
  "Stitching",
  "Embroidery",
  "Printing",
  "Quality Control",
  "Finishing & Packing",
  "Maintenance",
  "Administration",
  "HR & Accounts",
];

const STAFF_DOCUMENT_TYPES = [
  "EXPERIENCE_CERTIFICATE",
  "RELIEVING_LETTER",
  "APPOINTMENT_LETTER",
  "SALARY_SLIP",
  "EDUCATION_CERTIFICATE",
  "ID_PROOF",
  "ADDRESS_PROOF",
  "MEDICAL_CERTIFICATE",
  "FORM_25B_DOC",
  "OTHER",
];

const formatDocumentType = (value) =>
  String(value || "OTHER")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const resolveDocumentUrl = (path) => {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  const normalized = String(path).replace(/\\/g, "/");
  const base = (import.meta.env.VITE_API_URL || "/erp/api").replace(/\/+$/, "");

  if (normalized.includes("staff_documents/")) {
    const filename = normalized.split("staff_documents/")[1].replace(/^\/+/, "");
    return `${base}/staff_documents/${filename}`;
  }
  if (normalized.includes("uploads/")) {
    const filename = normalized.split("uploads/")[1].replace(/^\/+/, "");
    return `${base}/uploads/${filename}`;
  }

  const filename = normalized.split("/").pop();
  return `${base}/staff_documents/${filename}`;
};

const isImageFile = (doc) => {
  const path = (doc?.url || doc?.filePath || doc?.fileName || doc?.title || "").toLowerCase();
  return (
    path.endsWith(".jpg") ||
    path.endsWith(".jpeg") ||
    path.endsWith(".png") ||
    path.endsWith(".webp") ||
    path.endsWith(".gif") ||
    path.endsWith(".svg") ||
    path.endsWith(".bmp")
  );
};

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const StatCard = ({ title, value, icon, color }) => (
  <Card
    className="erp-stat-card"
    style={{
      borderRadius: "20px",
      overflow: "hidden",
      border: "1px solid #e2e8f0",
      height: "100%",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}
    bodyStyle={{ padding: 20 }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: `${color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
          fontSize: 22,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {title}
        </p>
        <h3
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: "800",
            color: "#0f172a",
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </h3>
      </div>
    </div>
  </Card>
);

const StaffManagementPage = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docUploadLoading, setDocUploadLoading] = useState(false);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState(null);
  const [creationFiles, setCreationFiles] = useState([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [pfFilter, setPfFilter] = useState("all");
  const [esiFilter, setEsiFilter] = useState("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState("active");

  // Masters
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [machineries, setMachineries] = useState([]);
  const [shifts, setShifts] = useState([]);

  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDesignationName, setNewDesignationName] = useState("");
  const [newMachineryName, setNewMachineryName] = useState("");
  const [addingMaster, setAddingMaster] = useState(false);

  // Salary Structure Modal States
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [salaryStaff, setSalaryStaff] = useState(null);
  const [salaryComponents, setSalaryComponents] = useState([]);
  const [employeeEarnings, setEmployeeEarnings] = useState([]);
  const [employeeDeductions, setEmployeeDeductions] = useState([]);
  const [effectiveFrom, setEffectiveFrom] = useState(dayjs());
  const [salaryRemarks, setSalaryRemarks] = useState("");
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [savingSalary, setSavingSalary] = useState(false);

  const [form] = Form.useForm();
  const [docForm] = Form.useForm();

  const canCreateStaff = hasPermission(PERMISSIONS.STAFF_CREATE);
  const canUpdateStaff = hasPermission(PERMISSIONS.STAFF_UPDATE);
  const canDeleteStaff = hasPermission(PERMISSIONS.STAFF_DELETE);

  const fetchMasters = async () => {
    try {
      const [deps, desigs, machs, shs] = await Promise.all([
        getDepartments().catch(() => []),
        getDesignations().catch(() => []),
        getMachineries().catch(() => []),
        getShifts().catch(() => []),
      ]);
      setDepartments(Array.isArray(deps) ? deps : []);
      setDesignations(Array.isArray(desigs) ? desigs : []);
      setMachineries(Array.isArray(machs) ? machs : []);
      setShifts(Array.isArray(shs) ? shs : []);
    } catch {
      // ignore
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await getAllStaff({ status: activeStatusFilter });
      setStaff(Array.isArray(data) ? data : []);
    } catch {
      message.error("Failed to load staff records");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
    fetchMasters();
  }, [activeStatusFilter]);

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) return;
    setAddingMaster(true);
    try {
      await createDepartment(newDepartmentName);
      setNewDepartmentName("");
      message.success("Department added");
      await fetchMasters();
    } catch {
      message.error("Failed to add department");
    } finally {
      setAddingMaster(false);
    }
  };

  const handleAddDesignation = async (e) => {
    e.preventDefault();
    if (!newDesignationName.trim()) return;
    setAddingMaster(true);
    try {
      await createDesignation(newDesignationName);
      setNewDesignationName("");
      message.success("Job Title added");
      await fetchMasters();
    } catch {
      message.error("Failed to add job title");
    } finally {
      setAddingMaster(false);
    }
  };

  const handleAddMachinery = async (e) => {
    e.preventDefault();
    if (!newMachineryName.trim()) return;
    setAddingMaster(true);
    try {
      const code = newMachineryName
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_")
        .slice(0, 10);
      await createMachinery({ name: newMachineryName.trim(), code });
      setNewMachineryName("");
      message.success("Machinery added");
      const updated = await getMachineries();
      setMachineries(updated || []);
    } catch {
      message.error("Failed to add machinery");
    } finally {
      setAddingMaster(false);
    }
  };

  const populateStructureFromSalary = (gross, pf = true, esi = true, comps = salaryComponents) => {
    const grossVal = Number(gross || 0);
    const earnings = (comps || [])
      .filter((c) => c.type === "EARNING")
      .map((c) => {
        let val = 0;
        if (c.code === "BASIC") val = Math.round(grossVal * 0.5);
        else if (c.code === "DA") val = Math.round(grossVal * 0.15);
        else if (c.code === "HRA") val = Math.round(grossVal * 0.2);
        else if (c.code === "CONVEYANCE") val = Math.round(grossVal * 0.1);
        else if (c.code === "ATTENDANCE_BONUS") val = grossVal > 0 ? 500 : 0;
        else if (c.defaultValue) val = Number(c.defaultValue);
        return {
          componentId: c.id,
          name: c.name,
          code: c.code,
          calculationType: c.calculationType || "FIXED",
          value: val,
          baseComponentId: null,
          isMonthly: true,
        };
      });

    const deductions = (comps || [])
      .filter((c) => {
        if (c.type !== "DEDUCTION") return false;
        if (c.code === "PF" && !pf) return false;
        if (c.code === "ESI" && !esi) return false;
        return true;
      })
      .map((c) => ({
        componentId: c.id,
        name: c.name,
        code: c.code,
        calculationType: c.calculationType || "FIXED",
        value:
          c.code === "PF"
            ? (pf ? 12 : 0)
            : c.code === "ESI"
            ? (esi ? 0.75 : 0)
            : Number(c.defaultValue || 0),
        baseComponentId: null,
        isMonthly: true,
      }));

    setEmployeeEarnings(earnings);
    setEmployeeDeductions(deductions);
    return { earnings, deductions };
  };

  const handleGrossSalaryChange = (newGross) => {
    form.setFieldsValue({ salary: newGross });
    const grossVal = Number(newGross || 0);
    if (grossVal > 0 && salaryComponents.length > 0) {
      const pf = form.getFieldValue("pfEnabled") ?? true;
      const esi = form.getFieldValue("esiEnabled") ?? true;
      populateStructureFromSalary(grossVal, pf, esi, salaryComponents);
    }
  };

  const handleAutoCalculateStructure = () => {
    const currentGross = form.getFieldValue("salary");
    if (!currentGross) {
      message.info("Please enter a Monthly Gross Salary first");
      return;
    }
    const pf = form.getFieldValue("pfEnabled") ?? true;
    const esi = form.getFieldValue("esiEnabled") ?? true;
    populateStructureFromSalary(currentGross, pf, esi, salaryComponents);
    message.success(`Salary structure generated for ₹${Number(currentGross).toLocaleString("en-IN")}`);
  };

  const handleSyncGrossFromStructure = () => {
    if (calculatedSalary.grossPay > 0) {
      form.setFieldsValue({ salary: calculatedSalary.grossPay });
      message.success(`Monthly Gross Salary synced to ₹${calculatedSalary.grossPay.toLocaleString("en-IN")}`);
    }
  };

  const openCreate = async () => {
    if (!canCreateStaff) {
      message.error("You are not authorized to create staff");
      return;
    }
    setEditingStaff(null);
    setSalaryStaff(null);
    form.resetFields();
    setCreationFiles([]);
    setEffectiveFrom(dayjs());
    setSalaryRemarks("Initial Structure Setup");

    let comps = salaryComponents;
    if (!comps || comps.length === 0) {
      try {
        comps = await getSalaryComponents();
        comps = Array.isArray(comps) ? comps : [];
        setSalaryComponents(comps);
      } catch {
        comps = [];
      }
    }

    const defaultSalary = 18000;
    populateStructureFromSalary(defaultSalary, true, true, comps);

    try {
      const response = await getNextEmployeeId();
      form.setFieldsValue({
        employeeId: response?.employeeId || "",
        joiningDate: dayjs(),
        salary: defaultSalary,
        pfEnabled: true,
        esiEnabled: true,
        paymentMode: "BANK_TRANSFER",
        district: "Tirupur",
        state: "Tamil Nadu",
        category: "Production Staff",
      });
    } catch {
      form.setFieldsValue({
        employeeId: "",
        joiningDate: dayjs(),
        salary: defaultSalary,
        pfEnabled: true,
        esiEnabled: true,
      });
    }
    setModalOpen(true);
  };

  const openEdit = (record) => {
    if (!canUpdateStaff) {
      message.error("You are not authorized to update staff");
      return;
    }
    setEditingStaff(record);
    setSalaryStaff(record);
    const currentShiftId =
      record.shiftAssignments?.[0]?.shiftId ||
      record.shiftAssignments?.[0]?.shift?.id;
    const currentMachineryIds = (record.machineries || [])
      .map((m) => m.machineryId || m.machinery?.id)
      .filter(Boolean);
    const statutory = record.staffStatutory;

    form.setFieldsValue({
      ...record,
      shiftId: currentShiftId,
      machineryIds: currentMachineryIds,
      educationalQualification:
        record.educationalQualification || record.ugDegree || "",
      previousCompany: record.previousCompany || record.previousSchoolName || "",
      pfNumber: statutory?.pfNumber || "",
      uanNumber: statutory?.uanNumber || "",
      esiNumber: statutory?.esiNumber || "",
      pfEnabled: statutory?.pfEnabled ?? true,
      esiEnabled: statutory?.esiEnabled ?? true,
      joiningDate: record.joiningDate ? dayjs(record.joiningDate) : null,
      relievingDate: record.relievingDate ? dayjs(record.relievingDate) : null,
      dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
      bankIfsc: record.bankIfsc || "",
      bankBranch: record.bankBranch || "",
    });

    (async () => {
      try {
        let comps = salaryComponents;
        if (!comps || comps.length === 0) {
          comps = await getSalaryComponents();
          comps = Array.isArray(comps) ? comps : [];
          setSalaryComponents(comps);
        }
        const structData = await getEmployeeSalaryStructure(record.id).catch(() => null);
        const rawItems = structData?.currentStructure || structData?.structure?.components || structData?.items || [];
        if (rawItems && rawItems.length > 0) {
          const earnings = rawItems
            .filter((c) => c.component?.type === "EARNING" || c.type === "EARNING")
            .map((c) => ({
              componentId: c.componentId,
              name: c.component?.name || "Earning",
              code: c.component?.code || "",
              calculationType: c.calculationType,
              value: Number(c.amount || c.value || 0),
              baseComponentId: c.baseComponentId,
              isMonthly: c.isMonthly ?? true,
            }));
          const deductions = rawItems
            .filter((c) => c.component?.type === "DEDUCTION" || c.type === "DEDUCTION")
            .map((c) => ({
              componentId: c.componentId,
              name: c.component?.name || "Deduction",
              code: c.component?.code || "",
              calculationType: c.calculationType,
              value: Number(c.amount || c.value || 0),
              baseComponentId: c.baseComponentId,
              isMonthly: c.isMonthly ?? true,
            }));
          setEmployeeEarnings(earnings);
          setEmployeeDeductions(deductions);
          setEffectiveFrom(structData?.structure?.effectiveFrom ? dayjs(structData.structure.effectiveFrom) : dayjs());
          setSalaryRemarks(structData?.structure?.remarks || "Current Structure Configuration");
        } else {
          populateStructureFromSalary(
            record.salary || 18000,
            statutory?.pfEnabled !== false,
            statutory?.esiEnabled !== false,
            comps
          );
        }
      } catch {
        // fallback
      }
    })();

    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        ...(values.employeeId ? { employeeId: values.employeeId } : {}),
        isActive: values.relievingDate ? false : true,
        joiningDate: values.joiningDate ? values.joiningDate.toISOString() : null,
        relievingDate: values.relievingDate ? values.relievingDate.toISOString() : null,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : null,
        bankIfsc: values.bankIfsc || "",
        bankBranch: values.bankBranch || "",
        machineryIds: values.machineryIds || [],
        shiftId: values.shiftId || null,
        educationalQualification: values.educationalQualification || "",
        previousCompany: values.previousCompany || "",
      };

      let savedStaffId = null;
      if (editingStaff) {
        if (!canUpdateStaff) {
          message.error("You are not authorized to update staff");
          return;
        }
        await updateStaff(editingStaff.id, payload);
        savedStaffId = editingStaff.id;
        message.success("Employee record updated successfully");
      } else {
        if (!canCreateStaff) {
          message.error("You are not authorized to create staff");
          return;
        }
        const newStaff = await createStaff(payload);
        savedStaffId = newStaff?.id;
        message.success("Employee created successfully");

        if (creationFiles && creationFiles.length > 0) {
          message.loading({ content: "Uploading documents...", key: "docUpload" });
          try {
            for (const file of creationFiles) {
              await uploadStaffDocument(newStaff.id, {
                type: "OTHER",
                title: file.name,
                file: file.originFileObj || file,
              });
            }
            message.success({ content: "Documents uploaded successfully", key: "docUpload" });
          } catch {
            message.error({ content: "Failed to upload some documents", key: "docUpload" });
          }
        }
      }

      // Auto-save salary structure if configured
      const hasStructure = employeeEarnings.length > 0 || employeeDeductions.length > 0;
      if (hasStructure && savedStaffId) {
        try {
          const items = [
            ...employeeEarnings.map((e) => ({
              componentId: e.componentId,
              calculationType: e.calculationType || "FIXED",
              amount: Number(e.value || 0),
              percentage: Number(e.value || 0),
            })),
            ...employeeDeductions.map((d) => ({
              componentId: d.componentId,
              calculationType: d.calculationType || "FIXED",
              amount: Number(d.value || 0),
              percentage: Number(d.value || 0),
            })),
          ];
          await saveEmployeeSalaryStructure(savedStaffId, {
            effectiveFrom: effectiveFrom ? effectiveFrom.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
            grossSalary: Number(payload.salary || calculatedSalary.grossPay || 0),
            items,
            components: items,
            remarks: salaryRemarks || "Structure Setup",
          });
        } catch (salaryErr) {
          console.warn("Salary structure save notice:", salaryErr);
        }
      }
      setModalOpen(false);
      fetchStaff();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save staff record");
    }
  };

  const handleDelete = async (id) => {
    if (!canDeleteStaff) {
      message.error("You are not authorized to deactivate staff");
      return;
    }
    try {
      await deleteStaff(id);
      message.success("Employee deactivated");
      fetchStaff();
    } catch {
      message.error("Failed to deactivate employee");
    }
  };

  const fetchStaffDocuments = async (staffId) => {
    setDocumentsLoading(true);
    try {
      const data = await getStaffDocuments(staffId);
      setDocuments(Array.isArray(data) ? data : []);
    } catch {
      setDocuments([]);
    }
    setDocumentsLoading(false);
  };

  const openDetail = async (record) => {
    setSelectedStaff(record);
    setDetailModal(true);
    try {
      const detail = await getStaff(record.id);
      setSelectedStaff(detail);
      await fetchStaffDocuments(record.id);
    } catch {
      // ignore
    }
  };

  // Salary Structure Management Logic
  const openSalaryStructure = async (record) => {
    setSalaryStaff(record);
    setSalaryModalOpen(true);
    setSalaryLoading(true);
    try {
      const [comps, structData] = await Promise.all([
        getSalaryComponents(),
        getEmployeeSalaryStructure(record.id).catch(() => null),
      ]);
      setSalaryComponents(comps || []);

      if (structData?.structure) {
        setEffectiveFrom(
          structData.structure.effectiveFrom
            ? dayjs(structData.structure.effectiveFrom)
            : dayjs()
        );
        setSalaryRemarks(structData.structure.remarks || "Regular Salary Structure");
        const earnings = (structData.structure.components || [])
          .filter(
            (c) =>
              c.component?.type === "EARNING" || c.type === "EARNING"
          )
          .map((c) => ({
            componentId: c.componentId,
            name: c.component?.name || "Earning",
            code: c.component?.code || "",
            calculationType: c.calculationType,
            value: Number(c.value || 0),
            baseComponentId: c.baseComponentId,
            isMonthly: c.isMonthly ?? true,
          }));
        const deductions = (structData.structure.components || [])
          .filter(
            (c) =>
              c.component?.type === "DEDUCTION" || c.type === "DEDUCTION"
          )
          .map((c) => ({
            componentId: c.componentId,
            name: c.component?.name || "Deduction",
            code: c.component?.code || "",
            calculationType: c.calculationType,
            value: Number(c.value || 0),
            baseComponentId: c.baseComponentId,
            isMonthly: c.isMonthly ?? true,
          }));
        setEmployeeEarnings(earnings);
        setEmployeeDeductions(deductions);
      } else {
        setEffectiveFrom(dayjs());
        setSalaryRemarks("Initial Structure Setup");
        const gross = Number(record.salary || 18000);
        const defaultEarnings = (comps || [])
          .filter((c) => c.type === "EARNING")
          .map((c) => {
            let val = 0;
            if (c.code === "BASIC") val = Math.round(gross * 0.5);
            else if (c.code === "DA") val = Math.round(gross * 0.15);
            else if (c.code === "HRA") val = Math.round(gross * 0.2);
            else if (c.code === "CONVEYANCE") val = Math.round(gross * 0.1);
            else if (c.code === "ATTENDANCE_BONUS") val = 500;
            return {
              componentId: c.id,
              name: c.name,
              code: c.code,
              calculationType: c.calculationType,
              value: val,
              baseComponentId: null,
              isMonthly: true,
            };
          });
        const isPf = (record.staffStatutory?.pfEnabled !== undefined ? record.staffStatutory.pfEnabled : structData?.staff?.pfEnabled) !== false && !record.staffStatutory?.isStipend;
        const isEsi = (record.staffStatutory?.esiEnabled !== undefined ? record.staffStatutory.esiEnabled : structData?.staff?.esiEnabled) !== false && !record.staffStatutory?.isStipend;

        const defaultDeductions = (comps || [])
          .filter((c) => {
            if (c.type !== "DEDUCTION") return false;
            if (c.code === "PF" && !isPf) return false;
            if (c.code === "ESI" && !isEsi) return false;
            return true;
          })
          .map((c) => ({
            componentId: c.id,
            name: c.name,
            code: c.code,
            calculationType: c.calculationType,
            value:
              c.code === "PF"
                ? (isPf ? 12 : 0)
                : c.code === "ESI"
                ? (isEsi ? 0.75 : 0)
                : Number(c.defaultValue || 0),
            baseComponentId: null,
            isMonthly: true,
          }));
        setEmployeeEarnings(defaultEarnings);
        setEmployeeDeductions(defaultDeductions);
      }
      setSalaryHistory(structData?.history || []);
    } catch {
      message.error("Failed to load salary structure details");
    } finally {
      setSalaryLoading(false);
    }
  };

  const calculatedSalary = useMemo(() => {
    let gross = 0;
    let basicVal = 0;
    let daVal = 0;
    let hraVal = 0;
    employeeEarnings.forEach((e) => {
      if (e.calculationType === "FIXED") {
        const val = Number(e.value || 0);
        gross += val;
        if (e.name?.toLowerCase().includes("basic") || e.code === "BASIC") {
          basicVal = val;
        } else if (e.name?.toLowerCase().includes("dearness") || e.code === "DA" || e.name === "DA") {
          daVal = val;
        } else if (e.name?.toLowerCase().includes("house rent") || e.code === "HRA") {
          hraVal = val;
        }
      }
    });
    employeeEarnings.forEach((e) => {
      const val = Number(e.value || 0);
      if (e.calculationType === "PERCENTAGE" || e.calculationType === "PERCENTAGE_OF_BASIC") {
        const amt = (val / 100) * basicVal;
        gross += amt;
        if (e.name?.toLowerCase().includes("dearness") || e.code === "DA" || e.name === "DA") {
          daVal = amt;
        } else if (e.name?.toLowerCase().includes("house rent") || e.code === "HRA") {
          hraVal = amt;
        }
      } else if (e.calculationType === "PERCENTAGE_OF_GROSS") {
        const amt = (val / 100) * gross;
        gross += amt;
        if (e.name?.toLowerCase().includes("dearness") || e.code === "DA" || e.name === "DA") {
          daVal = amt;
        } else if (e.name?.toLowerCase().includes("house rent") || e.code === "HRA") {
          hraVal = amt;
        }
      } else if (e.calculationType === "PER_DAY") {
        gross += val * 26;
      } else if (e.calculationType === "PER_HOUR") {
        gross += val * 8 * 26;
      }
    });

    const pfFormVal = form?.getFieldValue?.("pfEnabled");
    const esiFormVal = form?.getFieldValue?.("esiEnabled");
    const isPfApplicable = (pfFormVal !== undefined ? pfFormVal : salaryStaff?.staffStatutory?.pfEnabled) !== false && !salaryStaff?.staffStatutory?.isStipend;
    const isEsiApplicable = (esiFormVal !== undefined ? esiFormVal : salaryStaff?.staffStatutory?.esiEnabled) !== false && !salaryStaff?.staffStatutory?.isStipend;

    let totalDeductions = 0;
    employeeDeductions.forEach((d) => {
      if ((d.code === "PF" || d.name?.toUpperCase().includes("PROVIDENT")) && !isPfApplicable) return;
      if ((d.code === "ESI" || d.name?.toUpperCase().includes("ESI")) && !isEsiApplicable) return;

      const val = Number(d.value || 0);
      const isPf = d.code === "PF" || d.name?.toUpperCase().includes("PROVIDENT");
      const isEsi = d.code === "ESI" || d.name?.toUpperCase().includes("ESI");
      if (d.calculationType === "FIXED") {
        totalDeductions += val;
      } else if (d.calculationType === "PERCENTAGE" || d.calculationType === "PERCENTAGE_OF_BASIC") {
        if (isPf) {
          const pfBase = basicVal + daVal;
          const pfWage = Math.min(pfBase, 15000);
          totalDeductions += (val / 100) * pfWage;
        } else if (isEsi) {
          // ESI Base = Basic + DA + HRA
          const esiBase = basicVal + daVal + hraVal;
          totalDeductions += (val / 100) * esiBase;
        } else {
          totalDeductions += (val / 100) * basicVal;
        }
      } else if (d.calculationType === "PERCENTAGE_OF_GROSS") {
        if (isEsi) {
          // ESI Base = Basic + DA + HRA
          const esiBase = basicVal + daVal + hraVal;
          totalDeductions += (val / 100) * esiBase;
        } else {
          totalDeductions += (val / 100) * gross;
        }
      } else if (d.calculationType === "PER_DAY") {
        totalDeductions += val * 26;
      } else if (d.calculationType === "PER_HOUR") {
        totalDeductions += val * 8 * 26;
      }
    });

    return {
      grossPay: Math.round(gross),
      totalDeductions: Math.round(totalDeductions),
      netPay: Math.round(gross - totalDeductions),
    };
  }, [employeeEarnings, employeeDeductions, salaryStaff, form]);

  const handleSaveSalaryStructure = async () => {
    setSavingSalary(true);
    try {
      const items = [
        ...employeeEarnings.map((e) => ({
          componentId: e.componentId,
          calculationType: e.calculationType || "FIXED",
          amount: Number(e.value || 0),
          percentage: Number(e.value || 0),
        })),
        ...employeeDeductions.map((d) => ({
          componentId: d.componentId,
          calculationType: d.calculationType || "FIXED",
          amount: Number(d.value || 0),
          percentage: Number(d.value || 0),
        })),
      ];

      await saveEmployeeSalaryStructure(salaryStaff.id, {
        effectiveFrom: effectiveFrom ? effectiveFrom.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
        grossSalary: Number(calculatedSalary.grossPay || 0),
        items,
        components: items,
        remarks: salaryRemarks || "Salary Structure Revision",
      });
      message.success("Salary structure revision committed successfully");
      setSalaryModalOpen(false);
      fetchStaff();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save salary structure");
    } finally {
      setSavingSalary(false);
    }
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      const matchSearch =
        !searchTerm ||
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone?.includes(searchTerm);
      const matchDept =
        departmentFilter === "all" ||
        s.department?.toLowerCase() === departmentFilter.toLowerCase();
      const currentShiftId =
        s.shiftAssignments?.[0]?.shiftId || s.shiftAssignments?.[0]?.shift?.id;
      const matchShift =
        shiftFilter === "all" || currentShiftId === shiftFilter;

      const isPf = s.staffStatutory?.pfEnabled !== false && !s.staffStatutory?.isStipend;
      const matchPf =
        pfFilter === "all" ||
        (pfFilter === "applicable" ? isPf : !isPf);

      const isEsi = s.staffStatutory?.esiEnabled !== false && !s.staffStatutory?.isStipend;
      const matchEsi =
        esiFilter === "all" ||
        (esiFilter === "applicable" ? isEsi : !isEsi);

      return matchSearch && matchDept && matchShift && matchPf && matchEsi;
    });
  }, [staff, searchTerm, departmentFilter, shiftFilter, pfFilter, esiFilter]);

  const totalEmployees = staff.length;
  const activePersonnel = staff.filter((s) => s.isActive).length;
  const pfApplicableCount = staff.filter((s) => s.isActive && s.staffStatutory?.pfEnabled !== false && !s.staffStatutory?.isStipend).length;
  const esiApplicableCount = staff.filter((s) => s.isActive && s.staffStatutory?.esiEnabled !== false && !s.staffStatutory?.isStipend).length;
  const totalDepartments = Array.from(new Set(staff.map((s) => s.department).filter(Boolean))).length;

  const columns = [
    {
      title: "Personnel Profile",
      key: "personnel",
      render: (_, record) => (
        <Space size={14}>
          <Avatar
            size={44}
            style={{
              backgroundColor: record.isActive ? "#4f46e5" : "#94a3b8",
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {record.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 14 }}>
              {record.name}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#4f46e5" }}>
                {record.employeeId}
              </span>
              {record.registrationNumber && (
                <Tag color="cyan" style={{ fontSize: 10, padding: "0 4px" }}>
                  Reg: {record.registrationNumber}
                </Tag>
              )}
            </div>
          </div>
        </Space>
      ),
      width: 240,
    },
    {
      title: "Job & Department",
      key: "job",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700, color: "#1e293b" }}>{record.designation}</div>
          <Tag color="blue" style={{ marginTop: 4, borderRadius: 4, fontSize: 11 }}>
            {record.department || "General"}
          </Tag>
        </div>
      ),
      width: 170,
    },
    {
      title: "Assigned Shift",
      key: "shift",
      render: (_, record) => {
        const shift = record.shiftAssignments?.[0]?.shift;
        if (!shift) return <Tag color="default">Not Assigned</Tag>;
        return (
          <Tooltip title={`Timings: ${shift.startTime} - ${shift.endTime} | Break: ${shift.breakDurationMinutes}m`}>
            <Tag
              color={shift.isNightShift ? "purple" : "geekblue"}
              style={{ fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}
            >
              {shift.isNightShift ? "🌙 " : "☀️ "}
              {shift.name} ({shift.code})
            </Tag>
          </Tooltip>
        );
      },
      width: 160,
    },
    {
      title: "Machinery Operated",
      key: "machinery",
      render: (_, record) => {
        const machs = record.machineries || [];
        if (!machs.length) return <span style={{ color: "#94a3b8" }}>—</span>;
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {machs.slice(0, 2).map((m) => (
              <Tag
                key={m.id || m.machinery?.id}
                color="cyan"
                style={{ fontSize: 11, borderRadius: 4 }}
              >
                {m.machinery?.name || m.machinery?.code}
              </Tag>
            ))}
            {machs.length > 2 && (
              <Tooltip title={machs.slice(2).map((m) => m.machinery?.name).join(", ")}>
                <Tag color="default" style={{ fontSize: 10 }}>
                  +{machs.length - 2} more
                </Tag>
              </Tooltip>
            )}
          </div>
        );
      },
      width: 170,
    },
    {
      title: "Contact",
      key: "contact",
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ color: "#0f172a", fontWeight: 600 }}>{record.phone || "—"}</div>
          <div style={{ color: "#64748b" }}>{record.email || "No email"}</div>
        </div>
      ),
      width: 140,
    },
    {
      title: "Gross Salary",
      key: "salary",
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 800, color: "#059669", fontSize: 14 }}>
            ₹{Number(record.salary || 0).toLocaleString("en-IN")}
          </div>
          <Tag color={record.paymentMode === "CASH" ? "orange" : "green"} style={{ fontSize: 10 }}>
            {record.paymentMode === "CASH" ? "Cash" : "Bank Transfer"}
          </Tag>
        </div>
      ),
      width: 140,
    },
    {
      title: "Statutory (PF & ESI)",
      key: "statutoryCoverage",
      render: (_, record) => {
        const isPf = record.staffStatutory?.pfEnabled !== false && !record.staffStatutory?.isStipend;
        const isEsi = record.staffStatutory?.esiEnabled !== false && !record.staffStatutory?.isStipend;
        return (
          <Space direction="vertical" size={2}>
            <Tag color={isPf ? "blue" : "default"} style={{ fontSize: 11, fontWeight: 700, borderRadius: 4 }}>
              PF: {isPf ? "Active" : "Non-PF"}
            </Tag>
            <Tag color={isEsi ? "cyan" : "default"} style={{ fontSize: 11, fontWeight: 700, borderRadius: 4 }}>
              ESI: {isEsi ? "Active" : "Non-ESI"}
            </Tag>
          </Space>
        );
      },
      width: 140,
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Badge
          status={record.isActive ? "success" : "error"}
          text={
            <span style={{ fontWeight: 700, color: record.isActive ? "#16a34a" : "#dc2626" }}>
              {record.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          }
        />
      ),
      width: 110,
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 170,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="View Profile">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: "#4f46e5" }} />}
              onClick={() => openDetail(record)}
            />
          </Tooltip>

          <Tooltip title="Configure Salary Structure & Revisions">
            <Button
              type="text"
              icon={<WalletOutlined style={{ color: "#059669" }} />}
              onClick={() => openSalaryStructure(record)}
            />
          </Tooltip>

          {canUpdateStaff && (
            <Tooltip title="Edit Staff Record">
              <Button
                type="text"
                icon={<EditOutlined style={{ color: "#2563eb" }} />}
                onClick={() => openEdit(record)}
              />
            </Tooltip>
          )}

          {canDeleteStaff && (
            <Popconfirm
              title="Deactivate this employee?"
              description="This will mark the employee as inactive and preserve all historical payslips."
              onConfirm={() => handleDelete(record.id)}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto" }}>
      {/* Header Profile Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6366f1" }}>
            Enterprise HR Management Suite
          </div>
          <h2 style={{ fontSize: 30, fontWeight: 900, color: "#0f172a", margin: "4px 0" }}>
            Staff & Workforce Management
          </h2>
          <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>
            Manage industrial personnel records, textile machinery operations, shift allocations, and dynamic salary structures.
          </p>
        </div>

        {canCreateStaff && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            size="large"
            style={{
              height: 46,
              padding: "0 24px",
              fontWeight: 700,
              backgroundColor: "#4f46e5",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
            }}
          >
            Create Staff
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="Total Workforce"
            value={totalEmployees}
            icon={<UserOutlined />}
            color="#4f46e5"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="Active Personnel"
            value={activePersonnel}
            icon={<CheckCircleOutlined />}
            color="#059669"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="PF Applicable"
            value={`${pfApplicableCount} / ${activePersonnel}`}
            icon={<SafetyCertificateOutlined />}
            color="#0284c7"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="ESI Applicable"
            value={`${esiApplicableCount} / ${activePersonnel}`}
            icon={<MedicineBoxOutlined />}
            color="#0d9488"
          />
        </Col>
      </Row>

      {/* Filter and Search Bar */}
      <Card style={{ marginBottom: 20, borderRadius: 16, border: "1px solid #e2e8f0" }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              placeholder="Search name, ID, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="middle"
              allowClear
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: "100%" }}
              value={departmentFilter}
              onChange={setDepartmentFilter}
              placeholder="Department"
            >
              <Option value="all">All Departments</Option>
              {departments.map((d) => (
                <Option key={d.id} value={d.name}>
                  {d.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: "100%" }}
              value={shiftFilter}
              onChange={setShiftFilter}
              placeholder="Assigned Shift"
            >
              <Option value="all">All Shifts</Option>
              {shifts.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Select
              style={{ width: "100%" }}
              value={pfFilter}
              onChange={setPfFilter}
              placeholder="PF Applicability"
            >
              <Option value="all">All PF</Option>
              <Option value="applicable">PF Applicable</Option>
              <Option value="non_pf">Non-PF Only</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Select
              style={{ width: "100%" }}
              value={esiFilter}
              onChange={setEsiFilter}
              placeholder="ESI Applicability"
            >
              <Option value="all">All ESI</Option>
              <Option value="applicable">ESI Applicable</Option>
              <Option value="non_esi">Non-ESI Only</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4} style={{ textAlign: "right" }}>
            <Select
              value={activeStatusFilter}
              onChange={setActiveStatusFilter}
              style={{ width: 130 }}
            >
              <Option value="active">Active Only</Option>
              <Option value="all">All Records</Option>
              <Option value="inactive">Inactive Only</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Staff Table */}
      <Card style={{ borderRadius: 16, border: "1px solid #e2e8f0" }} bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={filteredStaff}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showTotal: (total) => `Total ${total} employees` }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Create / Edit Staff Modal */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
            <UserOutlined style={{ color: "#4f46e5" }} />
            {editingStaff ? `Edit Employee Record — ${editingStaff.name}` : "Create New Staff Member"}
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} style={{ backgroundColor: "#4f46e5" }}>
            {editingStaff ? "Save Updates" : "Create Employee"}
          </Button>,
        ]}
        width={1140}
        centered
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={20}>
            {/* Left Column: Personal, Address, Qualifications */}
            <Col xs={24} lg={13}>
              <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 20 }}>
                <h4 style={{ fontWeight: 800, fontSize: 13, color: "#4f46e5", marginBottom: 16, textTransform: "uppercase" }}>
                  1. Basic Details
                </h4>
                <Row gutter={12}>
                  <Col span={14}>
                    <Form.Item name="name" label={<span style={{ fontWeight: 700, fontSize: 12 }}>FULL NAME</span>} rules={[{ required: true }]}>
                      <Input size="middle" prefix={<UserOutlined style={{ color: "#94a3b8" }} />} placeholder="e.g. R. Subramanian" />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item name="employeeId" label={<span style={{ fontWeight: 700, fontSize: 12 }}>EMPLOYEE ID</span>} rules={[{ required: true }]}>
                      <Input size="middle" disabled={!editingStaff} prefix={<IdcardOutlined style={{ color: "#94a3b8" }} />} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="phone" label={<span style={{ fontWeight: 700, fontSize: 12 }}>PHONE NUMBER</span>} rules={[{ required: true, pattern: /^\d{10}$/, message: "10-digit number" }]}>
                      <Input size="middle" prefix={<PhoneOutlined style={{ color: "#94a3b8" }} />} maxLength={10} placeholder="Primary Phone" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="email" label={<span style={{ fontWeight: 700, fontSize: 12 }}>EMAIL (OPTIONAL)</span>} rules={[{ type: "email" }]}>
                      <Input size="middle" prefix={<MailOutlined style={{ color: "#94a3b8" }} />} placeholder="Work/Personal Email" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="dateOfBirth" label={<span style={{ fontWeight: 700, fontSize: 12 }}>DATE OF BIRTH</span>}>
                      <DatePicker size="middle" style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="maritalStatus" label={<span style={{ fontWeight: 700, fontSize: 12 }}>MARITAL STATUS</span>}>
                      <Select size="middle">
                        <Option value="MARRIED">Married</Option>
                        <Option value="SINGLE">Single</Option>
                        <Option value="OTHER">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                {!editingStaff && (
                  <Form.Item name="password" label={<span style={{ fontWeight: 700, fontSize: 12 }}>PORTAL LOGIN PASSWORD (OPTIONAL)</span>}>
                    <Input.Password size="middle" placeholder="Defaults to password123" />
                  </Form.Item>
                )}
              </div>

              {/* Qualification & Experience & Machinery Section */}
              <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 20 }}>
                <h4 style={{ fontWeight: 800, fontSize: 13, color: "#4f46e5", marginBottom: 16, textTransform: "uppercase" }}>
                  2. Qualifications, Experience & Machinery
                </h4>
                <Row gutter={12}>
                  <Col span={14}>
                    <Form.Item name="educationalQualification" label={<span style={{ fontWeight: 700, fontSize: 12 }}>EDUCATIONAL QUALIFICATION</span>}>
                      <Select size="middle" placeholder="Select Qualification" allowClear showSearch>
                        <Option value="SSLC / 10th">SSLC / 10th</Option>
                        <Option value="HSC / 12th">HSC / 12th</Option>
                        <Option value="ITI (Fitter / Textile / Electrician)">ITI (Fitter / Textile / Electrician)</Option>
                        <Option value="Diploma (Textile Technology)">Diploma (Textile Technology)</Option>
                        <Option value="Diploma (Mechanical / Electrical)">Diploma (Mechanical / Electrical)</Option>
                        <Option value="B.Tech / B.E. (Textile / Apparel)">B.Tech / B.E. (Textile / Apparel)</Option>
                        <Option value="B.Com / B.A. / B.Sc">B.Com / B.A. / B.Sc</Option>
                        <Option value="Post Graduate (MBA / M.Sc)">Post Graduate (MBA / M.Sc)</Option>
                        <Option value="Other">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item name="yearsOfExperience" label={<span style={{ fontWeight: 700, fontSize: 12 }}>YEARS OF EXP.</span>}>
                      <InputNumber size="middle" style={{ width: "100%" }} min={0} placeholder="e.g. 5" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="previousCompany" label={<span style={{ fontWeight: 700, fontSize: 12 }}>PREVIOUS COMPANY / MILL</span>}>
                  <Input size="middle" placeholder="e.g. Sree Shanmugavel Mills, Dindigul" />
                </Form.Item>

                {/* Machinery Operated Multi-Select */}
                <Form.Item
                  name="machineryIds"
                  label={
                    <span style={{ fontWeight: 700, fontSize: 12, color: "#0891b2" }}>
                      MACHINERY OPERATED (MULTI-SELECT)
                    </span>
                  }
                >
                  <Select
                    mode="multiple"
                    size="middle"
                    placeholder="Select all machines operated"
                    allowClear
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: "8px 0" }} />
                        <Space style={{ padding: "0 8px 4px" }}>
                          <Input
                            placeholder="Add new machine"
                            value={newMachineryName}
                            onChange={(e) => setNewMachineryName(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddMachinery} loading={addingMaster}>
                            Add
                          </Button>
                        </Space>
                      </>
                    )}
                  >
                    {machineries.map((m) => (
                      <Option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>

              {/* Address Details */}
              <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                <h4 style={{ fontWeight: 800, fontSize: 13, color: "#4f46e5", marginBottom: 16, textTransform: "uppercase" }}>
                  3. Address Details
                </h4>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="doorNo" label={<span style={{ fontWeight: 700, fontSize: 11 }}>DOOR / HOUSE NO</span>}>
                      <Input size="middle" placeholder="Door No" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="street" label={<span style={{ fontWeight: 700, fontSize: 11 }}>STREET / LANE</span>}>
                      <Input size="middle" placeholder="Street" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="area" label={<span style={{ fontWeight: 700, fontSize: 11 }}>VILLAGE / AREA</span>}>
                      <Input size="middle" placeholder="Area" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="district" label={<span style={{ fontWeight: 700, fontSize: 11 }}>DISTRICT</span>}>
                      <Input size="middle" placeholder="District" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </Col>

            {/* Right Column: Shift Assignment, Job, Payment & Statutory */}
            <Col xs={24} lg={11}>
              {/* Shift & Job Details */}
              <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", marginBottom: 20 }}>
                <h4 style={{ fontWeight: 800, fontSize: 13, color: "#4f46e5", marginBottom: 16, textTransform: "uppercase" }}>
                  4. Shift & Job Allocation
                </h4>

                {/* Assigned Shift Dropdown */}
                <Form.Item
                  name="shiftId"
                  label={
                    <span style={{ fontWeight: 700, fontSize: 12, color: "#4338ca" }}>
                      ASSIGNED SHIFT
                    </span>
                  }
                  rules={[{ required: true, message: "Please assign a shift" }]}
                >
                  <Select size="middle" placeholder="Select Employee Shift">
                    {shifts.map((s) => (
                      <Option key={s.id} value={s.id}>
                        {s.name} ({s.code}) — {s.startTime} to {s.endTime} {s.isNightShift ? "🌙 (Night)" : "☀️"}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="designation" label={<span style={{ fontWeight: 700, fontSize: 12 }}>JOB TITLE / DESIGNATION</span>} rules={[{ required: true }]}>
                  <Select
                    size="middle"
                    placeholder="Select Designation"
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: "8px 0" }} />
                        <Space style={{ padding: "0 8px 4px" }}>
                          <Input
                            placeholder="New Job Title"
                            value={newDesignationName}
                            onChange={(e) => setNewDesignationName(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddDesignation} loading={addingMaster}>
                            Add
                          </Button>
                        </Space>
                      </>
                    )}
                  >
                    {Array.from(new Set([...DEFAULT_DESIGNATIONS, ...designations.map((d) => d.name)])).map((name) => (
                      <Option key={name} value={name}>
                        {name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="department" label={<span style={{ fontWeight: 700, fontSize: 12 }}>DEPARTMENT</span>}>
                  <Select
                    size="middle"
                    placeholder="Select Department"
                    allowClear
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: "8px 0" }} />
                        <Space style={{ padding: "0 8px 4px" }}>
                          <Input
                            placeholder="New Department"
                            value={newDepartmentName}
                            onChange={(e) => setNewDepartmentName(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddDepartment} loading={addingMaster}>
                            Add
                          </Button>
                        </Space>
                      </>
                    )}
                  >
                    {Array.from(new Set([...DEFAULT_DEPARTMENTS, ...departments.map((d) => d.name)])).map((name) => (
                      <Option key={name} value={name}>
                        {name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="joiningDate" label={<span style={{ fontWeight: 700, fontSize: 12 }}>DATE OF JOINING</span>} rules={[{ required: true }]}>
                      <DatePicker size="middle" style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="relievingDate" label={<span style={{ fontWeight: 700, fontSize: 12 }}>RELIEVING DATE</span>}>
                      <DatePicker size="middle" style={{ width: "100%" }} placeholder="If resigned" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              {/* Payment Details & Statutory */}
              <div style={{ background: "#f8fafc", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h4 style={{ fontWeight: 800, fontSize: 13, color: "#4f46e5", margin: 0, textTransform: "uppercase" }}>
                    5. Payment & Statutory
                  </h4>
                  <Tag color="purple" style={{ fontWeight: 700, fontSize: 11, borderRadius: 6, margin: 0 }}>
                    Structure Config Active
                  </Tag>
                </div>

                {/* Monthly Gross Salary & Payment Mode */}
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      name="salary"
                      label={
                        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                          <span style={{ fontWeight: 700, fontSize: 11 }}>MONTHLY GROSS SALARY</span>
                          {calculatedSalary.grossPay > 0 && (
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, height: "auto", fontSize: 11, fontWeight: 700, color: "#4f46e5" }}
                              onClick={handleSyncGrossFromStructure}
                            >
                              Sync (₹{calculatedSalary.grossPay.toLocaleString("en-IN")})
                            </Button>
                          )}
                        </div>
                      }
                      rules={[{ required: true, message: "Please specify salary" }]}
                    >
                      <InputNumber
                        min={0}
                        prefix="₹"
                        size="middle"
                        style={{ width: "100%" }}
                        placeholder="e.g. 18000"
                        onChange={(val) => handleGrossSalaryChange(val)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="paymentMode" label={<span style={{ fontWeight: 700, fontSize: 11 }}>PAYMENT MODE</span>}>
                      <Select size="middle">
                        <Option value="BANK_TRANSFER">Bank Transfer</Option>
                        <Option value="CASH">Liquid Cash</Option>
                        <Option value="CHEQUE">Cheque</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {/* Current Structure Configuration Embedded Sub-Card */}
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 14,
                    border: "1px solid #cbd5e1",
                    padding: "16px",
                    marginBottom: 16,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <WalletOutlined style={{ color: "#059669", fontSize: 15 }} />
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>
                        Current Structure Configuration
                      </span>
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      style={{ backgroundColor: "#059669", fontSize: 11, fontWeight: 700, borderRadius: 6 }}
                      onClick={handleAutoCalculateStructure}
                    >
                      Auto-Calculate from Salary
                    </Button>
                  </div>

                  {/* Summary Live Calculation Box */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #bbf7d0",
                      marginBottom: 12,
                      display: "flex",
                      justifyContent: "space-around",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
                        GROSS EARNINGS
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#15803d" }}>
                        ₹{calculatedSalary.grossPay.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div style={{ fontSize: 18, color: "#94a3b8" }}>—</div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#991b1b", textTransform: "uppercase" }}>
                        TOTAL DEDUCTIONS
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#b91c1c" }}>
                        ₹{calculatedSalary.totalDeductions.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div style={{ fontSize: 18, color: "#94a3b8" }}>=</div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#1e40af", textTransform: "uppercase" }}>
                        NET TAKE-HOME
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#1d4ed8" }}>
                        ₹{calculatedSalary.netPay.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* Tabs for Earnings & Deductions Components */}
                  <Tabs
                    size="small"
                    items={[
                      {
                        key: "earnings",
                        label: (
                          <span style={{ fontWeight: 700, fontSize: 12, color: "#15803d" }}>
                            Earnings Components ({employeeEarnings.length})
                          </span>
                        ),
                        children: (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>
                                Individual Earnings Breakdown
                              </span>
                              <Select
                                placeholder="+ Add Component"
                                size="small"
                                style={{ width: 140 }}
                                value={null}
                                onSelect={(val) => {
                                  const comp = salaryComponents.find((c) => c.id === val);
                                  if (comp && !employeeEarnings.some((e) => e.componentId === comp.id)) {
                                    setEmployeeEarnings([
                                      ...employeeEarnings,
                                      {
                                        componentId: comp.id,
                                        name: comp.name,
                                        code: comp.code,
                                        calculationType: comp.calculationType || "FIXED",
                                        value: 0,
                                        isMonthly: true,
                                      },
                                    ]);
                                  }
                                }}
                              >
                                {salaryComponents
                                  .filter((c) => c.type === "EARNING" && !employeeEarnings.some((e) => e.componentId === c.id))
                                  .map((c) => (
                                    <Option key={c.id} value={c.id}>
                                      {c.name}
                                    </Option>
                                  ))}
                              </Select>
                            </div>

                            {employeeEarnings.length === 0 ? (
                              <div style={{ textAlign: "center", padding: "12px", color: "#94a3b8", fontSize: 11 }}>
                                No earnings configured. Enter a salary above or click "+ Add Component".
                              </div>
                            ) : (
                              employeeEarnings.map((item, idx) => (
                                <div
                                  key={item.componentId || idx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    marginBottom: 6,
                                    padding: "6px 8px",
                                    backgroundColor: "#f8fafc",
                                    borderRadius: 8,
                                    border: "1px solid #f1f5f9",
                                  }}
                                >
                                  <span style={{ flex: 1, fontWeight: 700, fontSize: 11, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {item.name}
                                  </span>
                                  <Select
                                    size="small"
                                    style={{ width: 110 }}
                                    value={item.calculationType}
                                    onChange={(val) => {
                                      const next = [...employeeEarnings];
                                      next[idx].calculationType = val;
                                      setEmployeeEarnings(next);
                                    }}
                                  >
                                    <Option value="FIXED">Fixed (₹)</Option>
                                    <Option value="PERCENTAGE_OF_BASIC">% of Basic</Option>
                                    <Option value="PERCENTAGE_OF_GROSS">% of Gross</Option>
                                    <Option value="PER_DAY">Per Day</Option>
                                    <Option value="PER_HOUR">Per Hour</Option>
                                  </Select>
                                  <InputNumber
                                    size="small"
                                    min={0}
                                    style={{ width: 85 }}
                                    value={item.value}
                                    onChange={(val) => {
                                      const next = [...employeeEarnings];
                                      next[idx].value = val || 0;
                                      setEmployeeEarnings(next);
                                    }}
                                  />
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={() => {
                                      setEmployeeEarnings(employeeEarnings.filter((_, i) => i !== idx));
                                    }}
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        ),
                      },
                      {
                        key: "deductions",
                        label: (
                          <span style={{ fontWeight: 700, fontSize: 12, color: "#b91c1c" }}>
                            Deductions Components ({employeeDeductions.length})
                          </span>
                        ),
                        children: (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>
                                Statutory & Other Deductions
                              </span>
                              <Select
                                placeholder="+ Add Component"
                                size="small"
                                style={{ width: 140 }}
                                value={null}
                                onSelect={(val) => {
                                  const comp = salaryComponents.find((c) => c.id === val);
                                  if (comp && !employeeDeductions.some((d) => d.componentId === comp.id)) {
                                    setEmployeeDeductions([
                                      ...employeeDeductions,
                                      {
                                        componentId: comp.id,
                                        name: comp.name,
                                        code: comp.code,
                                        calculationType: comp.calculationType || "FIXED",
                                        value: 0,
                                        isMonthly: true,
                                      },
                                    ]);
                                  }
                                }}
                              >
                                {salaryComponents
                                  .filter((c) => c.type === "DEDUCTION" && !employeeDeductions.some((d) => d.componentId === c.id))
                                  .map((c) => (
                                    <Option key={c.id} value={c.id}>
                                      {c.name}
                                    </Option>
                                  ))}
                              </Select>
                            </div>

                            {employeeDeductions.length === 0 ? (
                              <div style={{ textAlign: "center", padding: "12px", color: "#94a3b8", fontSize: 11 }}>
                                No deductions configured.
                              </div>
                            ) : (
                              employeeDeductions.map((item, idx) => (
                                <div
                                  key={item.componentId || idx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    marginBottom: 6,
                                    padding: "6px 8px",
                                    backgroundColor: "#fef2f2",
                                    borderRadius: 8,
                                    border: "1px solid #fee2e2",
                                  }}
                                >
                                  <span style={{ flex: 1, fontWeight: 700, fontSize: 11, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {item.name}
                                  </span>
                                  <Select
                                    size="small"
                                    style={{ width: 110 }}
                                    value={item.calculationType}
                                    onChange={(val) => {
                                      const next = [...employeeDeductions];
                                      next[idx].calculationType = val;
                                      setEmployeeDeductions(next);
                                    }}
                                  >
                                    <Option value="FIXED">Fixed (₹)</Option>
                                    <Option value="PERCENTAGE_OF_BASIC">% of Basic</Option>
                                    <Option value="PERCENTAGE_OF_GROSS">% of Gross</Option>
                                    <Option value="PER_DAY">Per Day</Option>
                                    <Option value="PER_HOUR">Per Hour</Option>
                                  </Select>
                                  <InputNumber
                                    size="small"
                                    min={0}
                                    style={{ width: 85 }}
                                    value={item.value}
                                    onChange={(val) => {
                                      const next = [...employeeDeductions];
                                      next[idx].value = val || 0;
                                      setEmployeeDeductions(next);
                                    }}
                                  />
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={() => {
                                      setEmployeeDeductions(employeeDeductions.filter((_, i) => i !== idx));
                                    }}
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        ),
                      },
                    ]}
                  />

                  {/* Effective Date & Remarks */}
                  <Row gutter={8} style={{ marginTop: 10 }}>
                    <Col span={10}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 2 }}>
                        EFFECTIVE DATE
                      </div>
                      <DatePicker
                        size="small"
                        style={{ width: "100%" }}
                        value={effectiveFrom}
                        onChange={(d) => setEffectiveFrom(d || dayjs())}
                      />
                    </Col>
                    <Col span={14}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 2 }}>
                        STRUCTURE REMARKS
                      </div>
                      <Input
                        size="small"
                        value={salaryRemarks}
                        onChange={(e) => setSalaryRemarks(e.target.value)}
                        placeholder="e.g. Initial Structure Setup"
                      />
                    </Col>
                  </Row>
                </div>

                {/* Bank Account Details */}
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="bankName" label={<span style={{ fontWeight: 700, fontSize: 11 }}>BANK NAME</span>}>
                      <Input size="middle" prefix={<BankOutlined />} placeholder="e.g. SBI, Canara" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="bankAccountNo" label={<span style={{ fontWeight: 700, fontSize: 11 }}>ACCOUNT NUMBER</span>}>
                      <Input size="middle" placeholder="Account No" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="bankIfsc" label={<span style={{ fontWeight: 700, fontSize: 11 }}>IFSC CODE</span>}>
                      <Input size="middle" placeholder="IFSC" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="bankBranch" label={<span style={{ fontWeight: 700, fontSize: 11 }}>BRANCH NAME</span>}>
                      <Input size="middle" placeholder="Branch" />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider style={{ margin: "12px 0" }} />

                {/* Statutory Numbers & Toggles */}
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      name="pfEnabled"
                      valuePropName="checked"
                      label={<span style={{ fontWeight: 700, fontSize: 11 }}>PF APPLICABLE</span>}
                      initialValue={true}
                    >
                      <Switch
                        checkedChildren="YES"
                        unCheckedChildren="NO"
                        onChange={(checked) => {
                          const next = [...employeeDeductions];
                          const pfIdx = next.findIndex((d) => d.code === "PF" || d.name?.toUpperCase().includes("PROVIDENT"));
                          if (pfIdx >= 0) {
                            next[pfIdx].value = checked ? 12 : 0;
                            setEmployeeDeductions(next);
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="esiEnabled"
                      valuePropName="checked"
                      label={<span style={{ fontWeight: 700, fontSize: 11 }}>ESI APPLICABLE</span>}
                      initialValue={true}
                    >
                      <Switch
                        checkedChildren="YES"
                        unCheckedChildren="NO"
                        onChange={(checked) => {
                          const next = [...employeeDeductions];
                          const esiIdx = next.findIndex((d) => d.code === "ESI" || d.name?.toUpperCase().includes("ESI"));
                          if (esiIdx >= 0) {
                            next[esiIdx].value = checked ? 0.75 : 0;
                            setEmployeeDeductions(next);
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="uanNumber" label={<span style={{ fontWeight: 700, fontSize: 11 }}>UAN NUMBER</span>}>
                      <Input size="middle" placeholder="12-digit UAN" maxLength={12} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="pfNumber" label={<span style={{ fontWeight: 700, fontSize: 11 }}>PF NUMBER</span>}>
                      <Input size="middle" placeholder="PF Member ID" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="esiNumber" label={<span style={{ fontWeight: 700, fontSize: 11 }}>ESI NUMBER (IP NO)</span>}>
                      <Input size="middle" placeholder="17-digit IP" maxLength={17} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="registrationNumber" label={<span style={{ fontWeight: 700, fontSize: 11 }}>FORM 25B REG NO</span>}>
                      <Input size="middle" placeholder="Factory Reg No" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Salary Structure Configuration & Revisions Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 900, color: "#0f172a" }}>
            <WalletOutlined style={{ color: "#059669" }} />
            <span>Salary Structure & Revisions — {salaryStaff?.name} ({salaryStaff?.employeeId})</span>
          </div>
        }
        open={salaryModalOpen}
        onCancel={() => setSalaryModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setSalaryModalOpen(false)}>
            Close
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={savingSalary}
            onClick={handleSaveSalaryStructure}
            style={{ backgroundColor: "#059669", fontWeight: 700 }}
          >
            Save & Commit Revision
          </Button>,
        ]}
        width={950}
        centered
        destroyOnClose
      >
        <Tabs
          defaultActiveKey="current"
          items={[
            {
              key: "current",
              label: <span style={{ fontWeight: 700 }}>Current Structure Configuration</span>,
              children: (
                <div>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                        EFFECTIVE FROM DATE
                      </div>
                      <DatePicker
                        style={{ width: "100%" }}
                        value={effectiveFrom}
                        onChange={(d) => setEffectiveFrom(d || dayjs())}
                      />
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                        REVISION REMARKS / JUSTIFICATION
                      </div>
                      <Input
                        value={salaryRemarks}
                        onChange={(e) => setSalaryRemarks(e.target.value)}
                        placeholder="e.g. Annual Appraisal / Minimum Wage Revision"
                      />
                    </Col>
                  </Row>

                  {/* Summary Live Calculation Box */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)",
                      padding: "16px 20px",
                      borderRadius: 14,
                      border: "1px solid #bbf7d0",
                      marginBottom: 20,
                      display: "flex",
                      justifyContent: "space-around",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
                        GROSS EARNINGS
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#15803d" }}>
                        ₹{calculatedSalary.grossPay.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div style={{ fontSize: 24, color: "#94a3b8" }}>—</div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#991b1b", textTransform: "uppercase" }}>
                        TOTAL DEDUCTIONS
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#b91c1c" }}>
                        ₹{calculatedSalary.totalDeductions.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div style={{ fontSize: 24, color: "#94a3b8" }}>=</div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#1e40af", textTransform: "uppercase" }}>
                        NET TAKE-HOME PAY
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#1d4ed8" }}>
                        ₹{calculatedSalary.netPay.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  <Row gutter={20}>
                    {/* Earnings Configuration */}
                    <Col span={12}>
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <span style={{ fontWeight: 800, color: "#15803d", fontSize: 13 }}>
                            EARNINGS COMPONENTS
                          </span>
                          <Select
                            placeholder="+ Add Component"
                            size="small"
                            style={{ width: 140 }}
                            onSelect={(val) => {
                              const comp = salaryComponents.find((c) => c.id === val);
                              if (comp && !employeeEarnings.some((e) => e.componentId === comp.id)) {
                                setEmployeeEarnings([
                                  ...employeeEarnings,
                                  {
                                    componentId: comp.id,
                                    name: comp.name,
                                    code: comp.code,
                                    calculationType: comp.calculationType,
                                    value: 0,
                                    isMonthly: true,
                                  },
                                ]);
                              }
                            }}
                          >
                            {salaryComponents
                              .filter((c) => c.type === "EARNING" && !employeeEarnings.some((e) => e.componentId === c.id))
                              .map((c) => (
                                <Option key={c.id} value={c.id}>
                                  {c.name}
                                </Option>
                              ))}
                          </Select>
                        </div>

                        {employeeEarnings.map((item, idx) => (
                          <div
                            key={item.componentId || idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 8,
                              padding: "6px 8px",
                              backgroundColor: "#f8fafc",
                              borderRadius: 8,
                            }}
                          >
                            <span style={{ flex: 1, fontWeight: 700, fontSize: 12, color: "#1e293b" }}>
                              {item.name}
                            </span>
                            <Select
                              size="small"
                              style={{ width: 130 }}
                              value={item.calculationType}
                              onChange={(val) => {
                                const next = [...employeeEarnings];
                                next[idx].calculationType = val;
                                setEmployeeEarnings(next);
                              }}
                            >
                              <Option value="FIXED">Fixed (₹)</Option>
                              <Option value="PERCENTAGE_OF_BASIC">% of Basic</Option>
                              <Option value="PERCENTAGE_OF_GROSS">% of Gross</Option>
                              <Option value="PER_DAY">Per Day</Option>
                              <Option value="PER_HOUR">Per Hour</Option>
                            </Select>
                            <InputNumber
                              size="small"
                              min={0}
                              style={{ width: 90 }}
                              value={item.value}
                              onChange={(val) => {
                                const next = [...employeeEarnings];
                                next[idx].value = val || 0;
                                setEmployeeEarnings(next);
                              }}
                            />
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                setEmployeeEarnings(employeeEarnings.filter((_, i) => i !== idx));
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </Col>

                    {/* Deductions Configuration */}
                    <Col span={12}>
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <span style={{ fontWeight: 800, color: "#b91c1c", fontSize: 13 }}>
                            DEDUCTIONS COMPONENTS
                          </span>
                          <Select
                            placeholder="+ Add Component"
                            size="small"
                            style={{ width: 140 }}
                            onSelect={(val) => {
                              const comp = salaryComponents.find((c) => c.id === val);
                              if (comp && !employeeDeductions.some((d) => d.componentId === comp.id)) {
                                setEmployeeDeductions([
                                  ...employeeDeductions,
                                  {
                                    componentId: comp.id,
                                    name: comp.name,
                                    code: comp.code,
                                    calculationType: comp.calculationType,
                                    value: 0,
                                    isMonthly: true,
                                  },
                                ]);
                              }
                            }}
                          >
                            {salaryComponents
                              .filter((c) => c.type === "DEDUCTION" && !employeeDeductions.some((d) => d.componentId === c.id))
                              .map((c) => (
                                <Option key={c.id} value={c.id}>
                                  {c.name}
                                </Option>
                              ))}
                          </Select>
                        </div>

                        {employeeDeductions.map((item, idx) => (
                          <div
                            key={item.componentId || idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 8,
                              padding: "6px 8px",
                              backgroundColor: "#f8fafc",
                              borderRadius: 8,
                            }}
                          >
                            <span style={{ flex: 1, fontWeight: 700, fontSize: 12, color: "#1e293b" }}>
                              {item.name}
                            </span>
                            <Select
                              size="small"
                              style={{ width: 130 }}
                              value={item.calculationType}
                              onChange={(val) => {
                                const next = [...employeeDeductions];
                                next[idx].calculationType = val;
                                setEmployeeDeductions(next);
                              }}
                            >
                              <Option value="FIXED">Fixed (₹)</Option>
                              <Option value="PERCENTAGE_OF_BASIC">% of Basic</Option>
                              <Option value="PERCENTAGE_OF_GROSS">% of Gross</Option>
                              <Option value="PER_DAY">Per Day</Option>
                              <Option value="PER_HOUR">Per Hour</Option>
                            </Select>
                            <InputNumber
                              size="small"
                              min={0}
                              style={{ width: 90 }}
                              value={item.value}
                              onChange={(val) => {
                                const next = [...employeeDeductions];
                                next[idx].value = val || 0;
                                setEmployeeDeductions(next);
                              }}
                            />
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                setEmployeeDeductions(employeeDeductions.filter((_, i) => i !== idx));
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: "history",
              label: (
                <span style={{ fontWeight: 700 }}>
                  <HistoryOutlined /> Revision History ({salaryHistory.length})
                </span>
              ),
              children: (
                <Table
                  dataSource={salaryHistory}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: "Effective Date",
                      dataIndex: "effectiveFrom",
                      render: (d) => dayjs(d).format("DD MMM YYYY"),
                    },
                    {
                      title: "Gross Pay",
                      dataIndex: "grossSalary",
                      render: (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`,
                    },
                    {
                      title: "Net Pay",
                      dataIndex: "netSalary",
                      render: (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`,
                    },
                    {
                      title: "Remarks",
                      dataIndex: "remarks",
                      render: (r) => r || "—",
                    },
                    {
                      title: "Status",
                      dataIndex: "isActive",
                      render: (active) => (
                        <Tag color={active ? "green" : "default"}>
                          {active ? "CURRENT" : "SUPERSEDED"}
                        </Tag>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={null}
        width={850}
        centered
        destroyOnClose
      >
        {selectedStaff && (
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <Avatar
                size={64}
                style={{ backgroundColor: "#4f46e5", fontSize: 24, fontWeight: 900 }}
              >
                {selectedStaff.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
                    {selectedStaff.name}
                  </h3>
                  <Tag color={selectedStaff.isActive ? "green" : "red"}>
                    {selectedStaff.isActive ? "ACTIVE" : "INACTIVE"}
                  </Tag>
                </div>
                <div style={{ color: "#64748b", fontSize: 13, display: "flex", gap: 12, marginTop: 4 }}>
                  <span>ID: <strong style={{ color: "#4f46e5" }}>{selectedStaff.employeeId}</strong></span>
                  <span>|</span>
                  <span>Designation: <strong>{selectedStaff.designation}</strong></span>
                  <span>|</span>
                  <span>Dept: <strong>{selectedStaff.department || "General"}</strong></span>
                </div>
              </div>
              <Button
                type="primary"
                icon={<WalletOutlined />}
                onClick={() => {
                  setDetailModal(false);
                  openSalaryStructure(selectedStaff);
                }}
                style={{ backgroundColor: "#059669", fontWeight: 700 }}
              >
                Configure Salary
              </Button>
            </div>

            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
              <Descriptions.Item label="Form 25B Reg No">
                {selectedStaff.registrationNumber || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {selectedStaff.phone || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedStaff.email || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Assigned Shift">
                {selectedStaff.shiftAssignments?.[0]?.shift ? (
                  <Tag color="purple">
                    {selectedStaff.shiftAssignments[0].shift.name} ({selectedStaff.shiftAssignments[0].shift.startTime} - {selectedStaff.shiftAssignments[0].shift.endTime})
                  </Tag>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Qualification">
                {selectedStaff.educationalQualification || selectedStaff.ugDegree || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Experience">
                {selectedStaff.yearsOfExperience ? `${selectedStaff.yearsOfExperience} Years` : "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Prev Company / Mill" span={3}>
                {selectedStaff.previousCompany || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Machinery Operated" span={3}>
                {(selectedStaff.machineries || []).length > 0 ? (
                  <Space wrap>
                    {selectedStaff.machineries.map((m) => (
                      <Tag key={m.id || m.machinery?.id} color="cyan">
                        {m.machinery?.name || m.machinery?.code}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  "—"
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Monthly Gross Salary">
                ₹{Number(selectedStaff.salary || 0).toLocaleString("en-IN")}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                {selectedStaff.paymentMode || "Bank Direct"}
              </Descriptions.Item>
              <Descriptions.Item label="Bank Account">
                {selectedStaff.bankAccountNo ? `${selectedStaff.bankName} - ${selectedStaff.bankAccountNo}` : "—"}
              </Descriptions.Item>

              <Descriptions.Item label="UAN Number">
                {selectedStaff.staffStatutory?.uanNumber || selectedStaff.uanNumber || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="PF Number">
                {selectedStaff.staffStatutory?.pfNumber || selectedStaff.pfNumber || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="ESI Number">
                {selectedStaff.staffStatutory?.esiNumber || selectedStaff.esiNumber || "—"}
              </Descriptions.Item>
            </Descriptions>

            {/* Document Section */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: "#1e293b" }}>
                  Staff Documents ({documents.length})
                </span>
                <Upload
                  showUploadList={false}
                  beforeUpload={async (file) => {
                    try {
                      await uploadStaffDocument(selectedStaff.id, {
                        type: "OTHER",
                        title: file.name,
                        file,
                      });
                      message.success("Document uploaded");
                      fetchStaffDocuments(selectedStaff.id);
                    } catch {
                      message.error("Failed to upload document");
                    }
                    return false;
                  }}
                >
                  <Button size="small" icon={<UploadOutlined />}>Upload Document</Button>
                </Upload>
              </div>

              {documents.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {documents.map((doc) => {
                    const fileUrl = resolveDocumentUrl(doc.url || doc.filePath || doc.fileName);
                    const isImg = isImageFile(doc);
                    return (
                      <div
                        key={doc.id}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          padding: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        }}
                      >
                        {/* Thumbnail / Image Preview */}
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 8,
                            overflow: "hidden",
                            background: "#e2e8f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          {isImg && fileUrl ? (
                            <Image
                              src={fileUrl}
                              alt={doc.title || doc.fileName || "Document"}
                              style={{ width: 52, height: 52, objectFit: "cover" }}
                              preview={{ mask: <EyeOutlined style={{ fontSize: 14 }} /> }}
                            />
                          ) : (
                            <FileTextOutlined style={{ fontSize: 24, color: "#6366f1" }} />
                          )}
                        </div>

                        {/* Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#1e293b",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={doc.title || doc.fileName}
                          >
                            {doc.title || doc.fileName || formatDocumentType(doc.type)}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                            <Tag color="blue" style={{ fontSize: 10, padding: "0 6px", borderRadius: 4, margin: 0 }}>
                              {doc.type || "OTHER"}
                            </Tag>
                            {doc.fileSize && (
                              <span style={{ fontSize: 11, color: "#64748b" }}>
                                {formatFileSize(doc.fileSize)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {fileUrl && (
                            <Tooltip title="Open in new tab">
                              <Button
                                type="text"
                                size="small"
                                icon={<EyeOutlined style={{ color: "#4f46e5" }} />}
                                onClick={() => window.open(fileUrl, "_blank")}
                              />
                            </Tooltip>
                          )}
                          {fileUrl && (
                            <Tooltip title="Download">
                              <a href={fileUrl} download={doc.fileName || doc.title || "document"} target="_blank" rel="noreferrer">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<DownloadOutlined style={{ color: "#059669" }} />}
                                />
                              </a>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete">
                            <Popconfirm
                              title="Delete this document?"
                              description={doc.googleDriveFileId ? "Will also be moved to Google Drive Trash." : undefined}
                              onConfirm={async () => {
                                try {
                                  const res = await deleteStaffDocument(selectedStaff.id, doc.id);
                                  if (res?.driveTrashed) {
                                    message.success("Document deleted and moved to Google Drive Trash");
                                  } else {
                                    message.success("Document deleted from HRM");
                                  }
                                  fetchStaffDocuments(selectedStaff.id);
                                } catch (err) {
                                  const errMsg = err?.response?.data?.message || err?.message || "Failed to delete document";
                                  Modal.confirm({
                                    title: "Drive Sync Deletion Notice",
                                    content: `${errMsg}\n\nWould you like to delete the document from HRM anyway?`,
                                    okText: "Delete from HRM Anyway",
                                    okType: "danger",
                                    cancelText: "Cancel",
                                    onOk: async () => {
                                      try {
                                        await deleteStaffDocument(selectedStaff.id, doc.id, true);
                                        message.success("Document deleted from HRM");
                                        fetchStaffDocuments(selectedStaff.id);
                                      } catch {
                                        message.error("Failed to force delete document");
                                      }
                                    },
                                  });
                                }
                              }}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                              />
                            </Popconfirm>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", padding: "8px 0" }}>
                  No documents uploaded for this employee.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StaffManagementPage;
