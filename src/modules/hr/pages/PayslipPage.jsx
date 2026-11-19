import React, { useEffect, useState, useRef } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Select,
  DatePicker,
  Tag,
  Space,
  message,
  Row,
  Col,
  Tabs,
  Typography,
  Divider,
} from "antd";
import {
  PrinterOutlined,
  DownloadOutlined,
  SyncOutlined,
  FileTextOutlined,
  EyeOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import {
  getPayslips,
  getPayslipById,
  regeneratePayslip,
} from "../hr.service";
import { getDepartments } from "../../staff/staff.service";
import { getAdminSettings } from "../../settings/settings.service";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const { Option } = Select;
const { Text, Title } = Typography;

const PayslipPage = () => {
  const [payslips, setPayslips] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedType, setSelectedType] = useState("FORM_25B");

  // View modal state
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [currentPayslip, setCurrentPayslip] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);

  const payslipRef = useRef(null);

  const fetchPayslipData = async () => {
    try {
      setLoading(true);
      const params = { month: selectedMonth };
      if (selectedDept) params.department = selectedDept;
      if (selectedType) params.type = selectedType;

      const data = await getPayslips(params);
      setPayslips(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error("Failed to load payslips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslipData();
  }, [selectedMonth, selectedDept, selectedType]);

  useEffect(() => {
    const loadInit = async () => {
      try {
        const [depts, settings] = await Promise.all([
          getDepartments(),
          getAdminSettings().catch(() => null),
        ]);
        setDepartments(Array.isArray(depts) ? depts : []);
        setAdminSettings(settings);
      } catch (err) {
        console.error(err);
      }
    };
    loadInit();
  }, []);

  const handleOpenPreview = async (record) => {
    try {
      const full = await getPayslipById(record.id);
      setCurrentPayslip(full);
      setPreviewModalVisible(true);
    } catch (err) {
      message.error("Failed to load payslip details");
    }
  };

  const handleRegenerate = async (payrollId) => {
    try {
      await regeneratePayslip(payrollId);
      message.success("Payslip regenerated with updated payroll values");
      fetchPayslipData();
      if (previewModalVisible && currentPayslip?.payrollId === payrollId) {
        const full = await getPayslipById(currentPayslip.id);
        setCurrentPayslip(full);
      }
    } catch (err) {
      message.error("Failed to regenerate payslip");
    }
  };

  const handleDownloadPDF = async () => {
    if (!payslipRef.current) return;
    try {
      setDownloadingPdf(true);
      const element = payslipRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `${currentPayslip?.type === "FORM_25B" ? "Form_25B" : "Payslip"}_${
          currentPayslip?.staff?.employeeId || "Staff"
        }_${currentPayslip?.month || selectedMonth}.pdf`
      );
      message.success("PDF exported successfully");
    } catch (err) {
      console.error(err);
      message.error("Failed to export PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const columns = [
    {
      title: "Payslip No.",
      dataIndex: "payslipNumber",
      key: "payslipNumber",
      render: (no) => <Tag color="blue" style={{ fontWeight: 700 }}>{no}</Tag>,
    },
    {
      title: "Employee ID",
      key: "employeeId",
      render: (_, r) => <Tag color="default">{r.staff?.employeeId}</Tag>,
    },
    {
      title: "Employee Name",
      key: "employeeName",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700 }}>{r.staff?.name}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            {r.staff?.department} • {r.staff?.designation}
          </div>
        </div>
      ),
    },
    {
      title: "Month",
      dataIndex: "month",
      key: "month",
      render: (m) => <Tag color="cyan">{m}</Tag>,
    },
    {
      title: "Document Type",
      dataIndex: "type",
      key: "type",
      render: (t) =>
        t === "FORM_25B" ? (
          <Tag color="purple" style={{ fontWeight: 600 }}>Form 25B-cum-Payslip</Tag>
        ) : (
          <Tag color="green" style={{ fontWeight: 600 }}>Employee Payslip</Tag>
        ),
    },
    {
      title: "Net Pay",
      key: "netPay",
      render: (_, r) => (
        <span style={{ fontWeight: 800, color: "#0f172a" }}>
          ₹{Number(r.payroll?.netPayRounded || r.payroll?.netSalary || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      title: "Generated At",
      dataIndex: "generatedAt",
      key: "generatedAt",
      render: (d) => dayjs(d).format("DD-MMM-YYYY HH:mm"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleOpenPreview(r)}
          >
            View / Print
          </Button>
          <Button
            size="small"
            icon={<SyncOutlined />}
            onClick={() => handleRegenerate(r.payrollId)}
          >
            Regenerate
          </Button>
        </Space>
      ),
    },
  ];

  const snapshot = currentPayslip?.snapshot || {};
  const isForm25B = currentPayslip?.type === "FORM_25B";

  // Filter out Loan EMI from deductions on employee payslip
  const isLoanDeduction = (d) => {
    if (!d || !d.label) return false;
    const l = d.label.toLowerCase();
    return l.includes("loan") || l.includes("கடன்") || l.includes("emi");
  };

  // For Form 25B
  const form25BDeductions = (snapshot.paymentAndDeductions?.deductions || []).filter(
    (d) => !isLoanDeduction(d)
  );
  const form25BTotalDeductions = form25BDeductions.reduce((acc, d) => acc + Number(d.amount || 0), 0);
  const form25BGross = Number(snapshot.salaryDetails?.grossPay || 0);
  const form25BNetPay = Math.round(form25BGross - form25BTotalDeductions);

  // For Regular Payslip
  const regularDeductions = (snapshot.deductions || []).filter(
    (d) => !isLoanDeduction(d)
  );
  const regularTotalDeductions = regularDeductions.reduce((acc, d) => acc + Number(d.amount || 0), 0);
  const regularGross = Number(snapshot.grossPay || 0);
  const regularNetPay = Math.round(regularGross - regularTotalDeductions);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--primary, #0f172a)" }}>
            Payslip & Form 25B Generation
          </h2>
          <p style={{ color: "#64748b", margin: "4px 0 0" }}>
            Official Tamil Nadu Factories Act Form 25B-cum-Payslip and Textile Mill Monthly Payslips with Bilingual Tamil/English Layout.
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <Card style={{ borderRadius: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
              SALARY MONTH
            </label>
            <DatePicker.MonthPicker
              value={dayjs(selectedMonth)}
              onChange={(d) => setSelectedMonth(d ? d.format("YYYY-MM") : dayjs().format("YYYY-MM"))}
              style={{ width: 180 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
              DOCUMENT FORMAT
            </label>
            <Select
              value={selectedType}
              onChange={setSelectedType}
              style={{ width: 240 }}
            >
              <Option value="FORM_25B">Form 25B-cum-Payslip (படிவம் 25B)</Option>
              <Option value="REGULAR_PAYSLIP">Monthly Employee Payslip</Option>
            </Select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
              DEPARTMENT
            </label>
            <Select
              allowClear
              placeholder="All Departments"
              value={selectedDept}
              onChange={setSelectedDept}
              style={{ width: 200 }}
            >
              {departments.map((d) => (
                <Option key={d.id} value={d.name}>
                  {d.name}
                </Option>
              ))}
            </Select>
          </div>

          <div style={{ marginTop: 20 }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={fetchPayslipData}>
              Filter
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 16 }}>
        <Table
          dataSource={payslips}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      {/* View & Print Modal */}
      <Modal
        title={isForm25B ? "Form 25B-cum-Payslip / ஊதிய இரசீது மற்றும் படிவம் 25B" : "Employee Payslip / ஊழியர் ஊதிய இரசீது"}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="regen"
            icon={<SyncOutlined />}
            onClick={() => handleRegenerate(currentPayslip?.payrollId)}
          >
            Regenerate
          </Button>,
          <Button
            key="pdf"
            type="primary"
            icon={<DownloadOutlined />}
            loading={downloadingPdf}
            onClick={handleDownloadPDF}
          >
            Download PDF
          </Button>,
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>,
        ]}
        width={850}
      >
        {currentPayslip && (
          <div
            ref={payslipRef}
            id="print-container"
            style={{
              padding: 24,
              background: "#ffffff",
              color: "#1e293b",
              fontFamily: "'Segoe UI', Arial, sans-serif",
              fontSize: 12,
              lineHeight: 1.4,
              border: "1px solid #cbd5e1",
              borderRadius: 8,
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", textTransform: "uppercase" }}>
                {adminSettings?.schoolName || "TEXTILE MANUFACTURING MILLS PRIVATE LIMITED"}
              </h2>
              <div style={{ fontSize: 11, color: "#475569" }}>
                {adminSettings?.address || "SF No. 124/2, Mill Road, Avinashi, Tirupur, Tamil Nadu - 641602"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6, color: "#0284c7" }}>
                {isForm25B
                  ? "FORM 25B-CUM-PAYSLIP / ஊதிய இரசீது மற்றும் படிவம் 25B"
                  : "EMPLOYEE PAYSLIP / ஊழியர் ஊதிய இரசீது"}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {isForm25B && "[Rule 103-B of Tamil Nadu Factories Rules, 1950] • "}
                For the Month of: <strong>{currentPayslip.month}</strong>
              </div>
            </div>

            {isForm25B ? (
              /* FORM 25B LAYOUT */
              <>
                {/* Employee Details Grid */}
                <div style={{ border: "1px solid #94a3b8", marginBottom: 12, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ background: "#f1f5f9", padding: "4px 8px", fontWeight: 700, fontSize: 11, borderBottom: "1px solid #94a3b8" }}>
                    பணியாளர் விபரம் / EMPLOYEE INFORMATION
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", width: "25%", fontWeight: 600 }}>
                          பதிவு எண் / Reg. No.:
                        </td>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", width: "25%" }}>
                          <strong>{snapshot.employeeInfo?.registrationNumber || "-"}</strong>
                        </td>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", width: "25%", fontWeight: 600 }}>
                          பணியாளர் எண் / Emp No.:
                        </td>
                        <td style={{ padding: "4px 8px", borderBottom: "1px solid #e2e8f0", width: "25%" }}>
                          <strong>{snapshot.employeeInfo?.employeeNumber || "-"}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
                          பணியாளர் பெயர் / Name:
                        </td>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
                          <strong>{snapshot.employeeInfo?.employeeName || "-"}</strong>
                        </td>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
                          சேர்ந்த நாள் / Joining Date:
                        </td>
                        <td style={{ padding: "4px 8px", borderBottom: "1px solid #e2e8f0" }}>
                          {snapshot.employeeInfo?.dateOfJoining || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
                          துறை / Department:
                        </td>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
                          {snapshot.employeeInfo?.department || "-"}
                        </td>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
                          பதவி / Designation:
                        </td>
                        <td style={{ padding: "4px 8px", borderBottom: "1px solid #e2e8f0" }}>
                          {snapshot.employeeInfo?.designation || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
                          UAN எண் / UAN No.:
                        </td>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
                          {snapshot.employeeInfo?.uanNumber || "-"}
                        </td>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
                          ESI எண் / ESI No.:
                        </td>
                        <td style={{ padding: "4px 8px", borderBottom: "1px solid #e2e8f0" }}>
                          {snapshot.employeeInfo?.esiNumber || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", fontWeight: 600 }}>
                          வங்கி பெயர் / Bank:
                        </td>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0" }}>
                          {snapshot.employeeInfo?.bankName || "-"}
                        </td>
                        <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", fontWeight: 600 }}>
                          கணக்கு எண் / A/C No.:
                        </td>
                        <td style={{ padding: "4px 8px" }}>
                          {snapshot.employeeInfo?.accountNumber || "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Attendance Summary */}
                <div style={{ border: "1px solid #94a3b8", marginBottom: 12, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ background: "#f1f5f9", padding: "4px 8px", fontWeight: 700, fontSize: 11, borderBottom: "1px solid #94a3b8" }}>
                    வருகை விபரம் / ATTENDANCE DETAILS
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, textAlign: "center" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                        <th style={{ padding: 4, borderRight: "1px solid #cbd5e1" }}>மொத்த நாட்கள்<br />Total Days</th>
                        <th style={{ padding: 4, borderRight: "1px solid #cbd5e1" }}>வேலை நாட்கள்<br />Attended</th>
                        <th style={{ padding: 4, borderRight: "1px solid #cbd5e1" }}>விடுப்பு (EL)<br />Leave Wages</th>
                        <th style={{ padding: 4, borderRight: "1px solid #cbd5e1" }}>விடுமுறை<br />Holidays</th>
                        <th style={{ padding: 4, borderRight: "1px solid #cbd5e1" }}>ஊதிய நாட்கள்<br />Paid Days</th>
                        <th style={{ padding: 4, borderRight: "1px solid #cbd5e1" }}>ஊதியமில்லா<br />LOP Days</th>
                        <th style={{ padding: 4 }}>கூடுதல் நேரம்<br />OT Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: 6, borderRight: "1px solid #cbd5e1", fontWeight: 700 }}>
                          {snapshot.attendanceDetails?.totalSalaryDays || 30}
                        </td>
                        <td style={{ padding: 6, borderRight: "1px solid #cbd5e1" }}>
                          {snapshot.attendanceDetails?.attendedDays || 0}
                        </td>
                        <td style={{ padding: 6, borderRight: "1px solid #cbd5e1" }}>
                          {snapshot.attendanceDetails?.leaveWithWages || 0}
                        </td>
                        <td style={{ padding: 6, borderRight: "1px solid #cbd5e1" }}>
                          {snapshot.attendanceDetails?.holidays || 0}
                        </td>
                        <td style={{ padding: 6, borderRight: "1px solid #cbd5e1", color: "#16a34a", fontWeight: 800 }}>
                          {snapshot.attendanceDetails?.paidDays || 0}
                        </td>
                        <td style={{ padding: 6, borderRight: "1px solid #cbd5e1", color: "#dc2626", fontWeight: 700 }}>
                          {snapshot.attendanceDetails?.lossOfPay || 0}
                        </td>
                        <td style={{ padding: 6, fontWeight: 700 }}>
                          {snapshot.attendanceDetails?.overtimeHours || 0} hrs
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Earnings & Deductions Table */}
                <div style={{ border: "1px solid #94a3b8", marginBottom: 12, borderRadius: 4, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #94a3b8" }}>
                        <th style={{ width: "35%", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #94a3b8" }}>
                          வருமானம் / EARNINGS
                        </th>
                        <th style={{ width: "15%", padding: "6px 8px", textAlign: "right", borderRight: "1px solid #94a3b8" }}>
                          தொகை (₹)
                        </th>
                        <th style={{ width: "35%", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #94a3b8" }}>
                          பிடித்தங்கள் / DEDUCTIONS
                        </th>
                        <th style={{ width: "15%", padding: "6px 8px", textAlign: "right" }}>
                          தொகை (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({
                        length: Math.max(
                          snapshot.salaryDetails?.earnings?.length || 0,
                          form25BDeductions.length
                        ),
                      }).map((_, i) => {
                        const earning = snapshot.salaryDetails?.earnings?.[i];
                        const deduction = form25BDeductions[i];
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0" }}>
                              {earning ? earning.label : ""}
                            </td>
                            <td style={{ padding: "4px 8px", textAlign: "right", borderRight: "1px solid #94a3b8" }}>
                              {earning ? Number(earning.amount || 0).toLocaleString("en-IN") : ""}
                            </td>
                            <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0" }}>
                              {deduction ? deduction.label : ""}
                            </td>
                            <td style={{ padding: "4px 8px", textAlign: "right" }}>
                              {deduction ? Number(deduction.amount || 0).toLocaleString("en-IN") : ""}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Totals Row */}
                      <tr style={{ background: "#f8fafc", borderTop: "2px solid #94a3b8", fontWeight: 800 }}>
                        <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0" }}>
                          மொத்த வருமானம் / GROSS PAY
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", borderRight: "1px solid #94a3b8", color: "#0284c7" }}>
                          ₹{form25BGross.toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0" }}>
                          மொத்த பிடித்தம் / TOTAL DEDUCTION
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", color: "#dc2626" }}>
                          ₹{form25BTotalDeductions.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net Pay Callout */}
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "2px solid #10b981",
                    borderRadius: 6,
                    padding: "8px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#065f46" }}>
                      நிகர ஊதியம் / NET PAY (ROUNDED OFF):
                    </div>
                    <div style={{ fontSize: 11, color: "#047857" }}>
                      Payment Date: {snapshot.paymentAndDeductions?.dateOfPayment} • Mode: {snapshot.paymentAndDeductions?.payMode}
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#059669" }}>
                    ₹{form25BNetPay.toLocaleString("en-IN")}
                  </div>
                </div>

                {/* Signatures */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, padding: "0 20px" }}>
                  <div style={{ textAlign: "center", borderTop: "1px dashed #64748b", width: 220, paddingTop: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 11 }}>தொழிலாளி கையொப்பம்</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Employee Signature</div>
                  </div>
                  <div style={{ textAlign: "center", borderTop: "1px dashed #64748b", width: 220, paddingTop: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 11 }}>மேலாளர் கையொப்பம்</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Authorized Manager Signature</div>
                  </div>
                </div>
              </>
            ) : (
              /* REGULAR MONTHLY PAYSLIP LAYOUT */
              <>
                {/* Employee Details Grid */}
                <div style={{ border: "1px solid #cbd5e1", marginBottom: 12, borderRadius: 4, padding: 10, background: "#f8fafc" }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <div><strong>Employee ID:</strong> {snapshot.employeeDetails?.employeeId}</div>
                      <div><strong>Name:</strong> {snapshot.employeeDetails?.employeeName}</div>
                    </Col>
                    <Col span={8}>
                      <div><strong>Department:</strong> {snapshot.employeeDetails?.department}</div>
                      <div><strong>Designation:</strong> {snapshot.employeeDetails?.designation}</div>
                    </Col>
                    <Col span={8}>
                      <div><strong>UAN / ESI:</strong> {snapshot.employeeDetails?.uanNumber} / {snapshot.employeeDetails?.esiNumber}</div>
                      <div><strong>Bank A/C:</strong> {snapshot.employeeDetails?.bankName} ({snapshot.employeeDetails?.accountNumber})</div>
                    </Col>
                  </Row>
                </div>

                {/* Attendance */}
                <div style={{ border: "1px solid #cbd5e1", marginBottom: 12, padding: 8, background: "#fff", borderRadius: 4 }}>
                  <Row gutter={16} style={{ textAlign: "center" }}>
                    <Col span={4}>
                      <div style={{ fontSize: 10, color: "#64748b" }}>CALC DAYS</div>
                      <div style={{ fontWeight: 700 }}>{snapshot.attendance?.attendanceCalculationDays}</div>
                    </Col>
                    <Col span={4}>
                      <div style={{ fontSize: 10, color: "#64748b" }}>PRESENT</div>
                      <div style={{ fontWeight: 700, color: "#16a34a" }}>{snapshot.attendance?.presentDays}</div>
                    </Col>
                    <Col span={4}>
                      <div style={{ fontSize: 10, color: "#64748b" }}>LEAVE WAGES</div>
                      <div style={{ fontWeight: 700 }}>{snapshot.attendance?.leaveWithWages}</div>
                    </Col>
                    <Col span={4}>
                      <div style={{ fontSize: 10, color: "#64748b" }}>HOLIDAYS</div>
                      <div style={{ fontWeight: 700 }}>{snapshot.attendance?.holidays}</div>
                    </Col>
                    <Col span={4}>
                      <div style={{ fontSize: 10, color: "#64748b" }}>TOTAL PAID</div>
                      <div style={{ fontWeight: 700, color: "#0284c7" }}>{snapshot.attendance?.totalDays}</div>
                    </Col>
                    <Col span={4}>
                      <div style={{ fontSize: 10, color: "#64748b" }}>LOP DAYS</div>
                      <div style={{ fontWeight: 700, color: "#dc2626" }}>{snapshot.attendance?.lossOfPay}</div>
                    </Col>
                  </Row>
                </div>

                {/* Earnings & Deductions Table */}
                <div style={{ border: "1px solid #94a3b8", marginBottom: 12, borderRadius: 4, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #94a3b8" }}>
                        <th style={{ width: "35%", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #94a3b8" }}>EARNINGS</th>
                        <th style={{ width: "15%", padding: "6px 8px", textAlign: "right", borderRight: "1px solid #94a3b8" }}>AMOUNT (₹)</th>
                        <th style={{ width: "35%", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #94a3b8" }}>DEDUCTIONS</th>
                        <th style={{ width: "15%", padding: "6px 8px", textAlign: "right" }}>AMOUNT (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({
                        length: Math.max(
                          snapshot.earnings?.length || 0,
                          regularDeductions.length
                        ),
                      }).map((_, i) => {
                        const earning = snapshot.earnings?.[i];
                        const deduction = regularDeductions[i];
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0" }}>{earning?.label}</td>
                            <td style={{ padding: "4px 8px", textAlign: "right", borderRight: "1px solid #94a3b8" }}>
                              {earning ? Number(earning.amount || 0).toLocaleString("en-IN") : ""}
                            </td>
                            <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0" }}>{deduction?.label}</td>
                            <td style={{ padding: "4px 8px", textAlign: "right" }}>
                              {deduction ? Number(deduction.amount || 0).toLocaleString("en-IN") : ""}
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: "#f8fafc", borderTop: "2px solid #94a3b8", fontWeight: 800 }}>
                        <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0" }}>GROSS PAY</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", borderRight: "1px solid #94a3b8", color: "#0284c7" }}>
                          ₹{regularGross.toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding: "6px 8px", borderRight: "1px solid #e2e8f0" }}>TOTAL DEDUCTION</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", color: "#dc2626" }}>
                          ₹{regularTotalDeductions.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Final Details */}
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "2px solid #10b981",
                    borderRadius: 6,
                    padding: "10px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#065f46" }}>NET PAYABLE AMOUNT:</div>
                    {snapshot.finalDetails?.busFareTravel > 0 && (
                      <div style={{ fontSize: 11, color: "#047857" }}>
                        Bus Fare / Travel Reimbursement: ₹{Number(snapshot.finalDetails.busFareTravel).toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#059669" }}>
                    ₹{regularNetPay.toLocaleString("en-IN")}
                  </div>
                </div>

                {/* Signatures */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, padding: "0 20px" }}>
                  <div style={{ textAlign: "center", borderTop: "1px dashed #64748b", width: 200, paddingTop: 4 }}>
                    <div style={{ fontWeight: 700 }}>Employee Signature</div>
                  </div>
                  <div style={{ textAlign: "center", borderTop: "1px dashed #64748b", width: 200, paddingTop: 4 }}>
                    <div style={{ fontWeight: 700 }}>Authorized Signatory</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayslipPage;

