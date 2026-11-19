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
  Tabs,
  Row,
  Col,
  Statistic,
  Badge,
  Typography,
} from "antd";
import {
  GiftOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  FileDoneOutlined,
  BarChartOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  getBonuses,
  getBonusReports,
  createBonus,
  approveBonus,
  rejectBonus,
  markPaidBonus,
  bulkPayBonus,
  deleteBonus,
} from "../hr.service";
import { getAllStaff, getDepartments } from "../../staff/staff.service";
import dayjs from "dayjs";

const { Option } = Select;
const { Text, Title } = Typography;

const BONUS_TYPES = [
  { value: "ATTENDANCE_BONUS", label: "Attendance Bonus / வருகை ஊக்கத்தொகை" },
  { value: "PERFORMANCE_BONUS", label: "Performance Bonus / செயல் திறன் போனஸ்" },
  { value: "FESTIVAL_BONUS", label: "Festival Bonus (Diwali/Pongal) / பண்டிகை போனஸ்" },
  { value: "PRODUCTION_BONUS", label: "Production Bonus / உற்பத்தி போனஸ்" },
  { value: "SPECIAL_BONUS", label: "Special Incentive / சிறப்பு ஊக்கத்தொகை" },
  { value: "OTHER_BONUS", label: "Other Bonus / இதர போனஸ்" },
];

const APPROVAL_COLORS = {
  PENDING: "gold",
  APPROVED: "green",
  REJECTED: "red",
};

const PAYMENT_COLORS = {
  PENDING: "orange",
  PAID: "blue",
  CANCELLED: "default",
};

const BonusManagementPage = () => {
  const [bonuses, setBonuses] = useState([]);
  const [reports, setReports] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("bonuses");

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [filterDept, setFilterDept] = useState(null);
  const [filterApproval, setFilterApproval] = useState(null);
  const [filterPayment, setFilterPayment] = useState(null);

  // Bulk selection
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkPayLoading, setBulkPayLoading] = useState(false);

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedBonusId, setSelectedBonusId] = useState(null);
  const [createDeptFilter, setCreateDeptFilter] = useState(null);

  const [createForm] = Form.useForm();
  const [rejectForm] = Form.useForm();

  const filteredCreateStaff = useMemo(() => {
    if (!createDeptFilter || createDeptFilter === "ALL") return staffList;
    return staffList.filter((s) => s.department === createDeptFilter);
  }, [staffList, createDeptFilter]);

  const fetchBonusData = async () => {
    try {
      setLoading(true);
      const params = { month: selectedMonth };
      if (filterDept) params.department = filterDept;
      if (filterApproval) params.approvalStatus = filterApproval;
      if (filterPayment) params.paymentStatus = filterPayment;

      const [bonusData, reportData] = await Promise.all([
        getBonuses(params),
        getBonusReports(selectedMonth),
      ]);

      setBonuses(Array.isArray(bonusData) ? bonusData : []);
      setReports(reportData);
    } catch (err) {
      console.error(err);
      message.error("Failed to load bonus records");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffAndDepts = async () => {
    try {
      const [staff, depts] = await Promise.all([getAllStaff(), getDepartments()]);
      setStaffList(Array.isArray(staff) ? staff : []);
      setDepartments(Array.isArray(depts) ? depts : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBonusData();
  }, [selectedMonth, filterDept, filterApproval, filterPayment]);

  useEffect(() => {
    fetchStaffAndDepts();
  }, []);

  const handleOpenCreateModal = () => {
    createForm.resetFields();
    setCreateDeptFilter(null);
    createForm.setFieldsValue({
      bonusType: "FESTIVAL_BONUS",
      calculationType: "FIXED",
      bonusMonth: dayjs(selectedMonth),
      amount: 1000,
      paymentMode: "BANK_TRANSFER",
    });
    setCreateModalVisible(true);
  };

  const handleDepartmentSelectInCreate = (deptName) => {
    setCreateDeptFilter(deptName || null);
    if (!deptName || deptName === "ALL") {
      createForm.setFieldsValue({ staffIds: staffList.map((s) => s.id) });
      return;
    }
    const matchingStaff = staffList
      .filter((s) => s.department === deptName)
      .map((s) => s.id);
    createForm.setFieldsValue({ staffIds: matchingStaff });
  };

  const handleSaveBonus = async () => {
    try {
      const values = await createForm.validateFields();
      const payload = {
        staffIds: values.staffIds,
        bonusType: values.bonusType,
        calculationType: values.calculationType,
        amount: values.amount,
        percentage: values.percentage,
        bonusMonth: values.bonusMonth.format("YYYY-MM"),
        paymentDate: values.paymentDate ? values.paymentDate.format("YYYY-MM-DD") : undefined,
        description: values.description,
        paymentMode: values.paymentMode,
      };

      const res = await createBonus(payload);
      message.success(res?.message || "Bonuses created successfully");
      setCreateModalVisible(false);
      fetchBonusData();
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.message || "Failed to create bonus");
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveBonus(id);
      message.success("Bonus approved successfully");
      fetchBonusData();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to approve bonus");
    }
  };

  const handleOpenReject = (id) => {
    setSelectedBonusId(id);
    rejectForm.resetFields();
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    try {
      const values = await rejectForm.validateFields();
      await rejectBonus(selectedBonusId, values.reason);
      message.success("Bonus rejected");
      setRejectModalVisible(false);
      fetchBonusData();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to reject bonus");
    }
  };

  const handlePay = async (id) => {
    try {
      await markPaidBonus(id, { paymentMode: "BANK_TRANSFER" });
      message.success("Bonus marked as paid successfully");
      fetchBonusData();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to mark bonus as paid");
    }
  };

  const handleBulkPay = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      setBulkPayLoading(true);
      await bulkPayBonus({ ids: selectedRowKeys, paymentMode: "BANK_TRANSFER" });
      message.success(`Successfully marked ${selectedRowKeys.length} bonus record(s) as paid!`);
      setSelectedRowKeys([]);
      fetchBonusData();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to process bulk payment");
    } finally {
      setBulkPayLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBonus(id);
      message.success("Bonus entry deleted");
      fetchBonusData();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete bonus");
    }
  };

  const columns = [
    {
      title: "Employee",
      key: "employee",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700 }}>{r.staff?.name}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            <Tag color="blue">{r.staff?.employeeId}</Tag> {r.staff?.department}
          </div>
        </div>
      ),
    },
    {
      title: "Bonus Type",
      dataIndex: "bonusType",
      key: "bonusType",
      render: (type) => {
        const item = BONUS_TYPES.find((b) => b.value === type);
        return <Tag color="purple">{item ? item.label.split("/")[0] : type}</Tag>;
      },
    },
    {
      title: "Month",
      dataIndex: "bonusMonth",
      key: "bonusMonth",
      render: (m) => <Tag color="default">{m}</Tag>,
    },
    {
      title: "Amount (₹)",
      dataIndex: "amount",
      key: "amount",
      render: (amt) => (
        <span style={{ fontWeight: 800, color: "#0f172a" }}>
          ₹{Number(amt || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      title: "Approval Status",
      dataIndex: "approvalStatus",
      key: "approvalStatus",
      render: (status) => <Tag color={APPROVAL_COLORS[status] || "default"}>{status}</Tag>,
    },
    {
      title: "Payment Status",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      render: (status) => <Tag color={PAYMENT_COLORS[status] || "default"}>{status}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space size="small">
          {r.approvalStatus === "PENDING" && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(r.id)}
              >
                Approve
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleOpenReject(r.id)}
              >
                Reject
              </Button>
            </>
          )}

          {r.approvalStatus === "APPROVED" && r.paymentStatus === "PENDING" && (
            <Popconfirm
              title="Confirm Bonus Payment"
              description={`Mark bonus of ₹${Number(r.amount || 0).toLocaleString()} for ${r.staff?.name} as Paid?`}
              onConfirm={() => handlePay(r.id)}
              okText="Yes, Pay"
              cancelText="Cancel"
              okButtonProps={{ style: { background: "#10b981", borderColor: "#10b981" } }}
            >
              <Button
                size="small"
                style={{ background: "#10b981", borderColor: "#10b981", color: "#fff", fontWeight: 600 }}
                icon={<DollarOutlined />}
              >
                Pay
              </Button>
            </Popconfirm>
          )}

          {r.paymentStatus !== "PAID" && (
            <Popconfirm
              title="Delete Bonus?"
              description="Are you sure you want to delete this bonus entry?"
              onConfirm={() => handleDelete(r.id)}
            >
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--primary, #0f172a)" }}>
            Bonus & Incentive Management
          </h2>
          <p style={{ color: "#64748b", margin: "4px 0 0" }}>
            Create, approve, and track textile production, festival, and performance bonuses with seamless payroll integration.
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateModal}
          size="large"
          style={{ borderRadius: 10 }}
        >
          Add New Bonus Entry
        </Button>
      </div>

      {/* Metric Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="Total Bonus Created"
              value={reports?.summary?.totalBonusCreated || 0}
              prefix="₹"
              valueStyle={{ color: "#3b82f6", fontWeight: 800 }}
            />
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Total records: {reports?.summary?.totalCount || 0}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="Approved Bonus"
              value={reports?.summary?.totalApprovedAmount || 0}
              prefix="₹"
              valueStyle={{ color: "#10b981", fontWeight: 800 }}
            />
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Approved count: {reports?.summary?.approvedCount || 0}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="Paid Bonus"
              value={reports?.summary?.totalPaidAmount || 0}
              prefix="₹"
              valueStyle={{ color: "#0284c7", fontWeight: 800 }}
            />
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Paid count: {reports?.summary?.paidCount || 0}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="Pending Payment"
              value={reports?.summary?.pendingAmount || 0}
              prefix="₹"
              valueStyle={{ color: "#f59e0b", fontWeight: 800 }}
            />
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Awaiting disbursement
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: "bonuses",
            label: (
              <span>
                <GiftOutlined /> Bonus Transactions ({bonuses.length})
              </span>
            ),
            children: (
              <Card style={{ borderRadius: 16 }}>
                {/* Filters & Bulk Quick Action */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                  <Space wrap size="middle">
                    <DatePicker.MonthPicker
                      value={dayjs(selectedMonth)}
                      onChange={(d) => setSelectedMonth(d ? d.format("YYYY-MM") : dayjs().format("YYYY-MM"))}
                      placeholder="Select Month"
                    />
                    <Select
                      allowClear
                      placeholder="Filter by Department"
                      style={{ width: 180 }}
                      value={filterDept}
                      onChange={setFilterDept}
                    >
                      {departments.map((d) => (
                        <Option key={d.id} value={d.name}>
                          {d.name}
                        </Option>
                      ))}
                    </Select>
                    <Select
                      allowClear
                      placeholder="Approval Status"
                      style={{ width: 150 }}
                      value={filterApproval}
                      onChange={setFilterApproval}
                    >
                      <Option value="PENDING">Pending</Option>
                      <Option value="APPROVED">Approved</Option>
                      <Option value="REJECTED">Rejected</Option>
                    </Select>
                    <Select
                      allowClear
                      placeholder="Payment Status"
                      style={{ width: 150 }}
                      value={filterPayment}
                      onChange={setFilterPayment}
                    >
                      <Option value="PENDING">Pending</Option>
                      <Option value="PAID">Paid</Option>
                    </Select>
                  </Space>

                  {/* Quick Select Unpaid Action */}
                  {bonuses.some((b) => b.paymentStatus !== "PAID") && (
                    <Button
                      size="middle"
                      style={{ borderRadius: 8 }}
                      onClick={() => {
                        const unpaidIds = bonuses
                          .filter((b) => b.paymentStatus !== "PAID")
                          .map((b) => b.id);
                        setSelectedRowKeys(unpaidIds);
                      }}
                    >
                      Select All Unpaid ({bonuses.filter((b) => b.paymentStatus !== "PAID").length})
                    </Button>
                  )}
                </div>

                {/* Bulk Actions Banner */}
                {selectedRowKeys.length > 0 && (
                  <div
                    style={{
                      marginBottom: 16,
                      padding: "12px 18px",
                      background: "#f0fdf4",
                      border: "1px solid #86efac",
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Space size="middle">
                      <span style={{ fontWeight: 700, color: "#166534", fontSize: 14 }}>
                        ✓ {selectedRowKeys.length} bonus record(s) selected
                      </span>
                      <Button size="small" onClick={() => setSelectedRowKeys([])}>
                        Clear Selection
                      </Button>
                    </Space>
                    <Popconfirm
                      title="Bulk Pay Confirmation"
                      description={`Are you sure you want to mark all ${selectedRowKeys.length} selected bonus(es) as Paid?`}
                      onConfirm={handleBulkPay}
                      okText="Yes, Mark All as Paid"
                      cancelText="Cancel"
                      okButtonProps={{ style: { background: "#10b981", borderColor: "#10b981" } }}
                    >
                      <Button
                        type="primary"
                        icon={<DollarOutlined />}
                        style={{ background: "#10b981", borderColor: "#10b981", fontWeight: 700 }}
                        loading={bulkPayLoading}
                      >
                        Bulk Pay Selected ({selectedRowKeys.length})
                      </Button>
                    </Popconfirm>
                  </div>
                )}

                <Table
                  rowSelection={{
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys),
                    getCheckboxProps: (record) => ({
                      disabled: record.paymentStatus === "PAID",
                    }),
                  }}
                  dataSource={bonuses}
                  columns={columns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: "reports",
            label: (
              <span>
                <BarChartOutlined /> Bonus Reports & Department Summary
              </span>
            ),
            children: (
              <Row gutter={16}>
                <Col span={14}>
                  <Card title="Department-wise Bonus Summary" style={{ borderRadius: 16 }}>
                    <Table
                      dataSource={reports?.departmentWise || []}
                      rowKey="department"
                      pagination={false}
                      columns={[
                        { title: "Department", dataIndex: "department", key: "dept" },
                        { title: "Staff Count", dataIndex: "count", key: "count" },
                        {
                          title: "Total Amount",
                          dataIndex: "totalAmount",
                          key: "amt",
                          render: (a) => `₹${Number(a).toLocaleString("en-IN")}`,
                        },
                        {
                          title: "Paid Amount",
                          dataIndex: "paidAmount",
                          key: "paid",
                          render: (a) => `₹${Number(a).toLocaleString("en-IN")}`,
                        },
                      ]}
                    />
                  </Card>
                </Col>
                <Col span={10}>
                  <Card title="Bonus Type Breakdown" style={{ borderRadius: 16 }}>
                    <Table
                      dataSource={reports?.typeBreakdown || []}
                      rowKey="bonusType"
                      pagination={false}
                      columns={[
                        {
                          title: "Type",
                          dataIndex: "bonusType",
                          key: "type",
                          render: (t) => {
                            const b = BONUS_TYPES.find((x) => x.value === t);
                            return b ? b.label.split("/")[0] : t;
                          },
                        },
                        {
                          title: "Total Amount",
                          dataIndex: "amount",
                          key: "amt",
                          render: (a) => `₹${Number(a).toLocaleString("en-IN")}`,
                        },
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      {/* Create Bonus Modal */}
      <Modal
        title="Create Bonus / Incentive Entry"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleSaveBonus}
        destroyOnClose
        width={700}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Select Department (Quick Fill Employees)">
                <Select
                  placeholder="Select Department or All"
                  allowClear
                  onChange={handleDepartmentSelectInCreate}
                >
                  <Option value="ALL" style={{ fontWeight: 600, color: "#059669" }}>
                    ★ All Departments ({staffList.length} Staff)
                  </Option>
                  {departments.map((d) => {
                    const count = staffList.filter((s) => s.department === d.name).length;
                    return (
                      <Option key={d.id} value={d.name}>
                        {d.name} ({count} staff)
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="bonusMonth"
                label="Bonus Month"
                rules={[{ required: true, message: "Select month" }]}
              >
                <DatePicker.MonthPicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>Select Employees (Bulk or Single)</span>
              <Space size="small">
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    createForm.setFieldsValue({
                      staffIds: filteredCreateStaff.map((s) => s.id),
                    });
                  }}
                  style={{ padding: 0, fontWeight: 700, color: "#059669" }}
                >
                  ✓ Select All ({filteredCreateStaff.length})
                </Button>
                <span style={{ color: "#cbd5e1" }}>|</span>
                <Button
                  size="small"
                  type="link"
                  danger
                  onClick={() => {
                    createForm.setFieldsValue({ staffIds: [] });
                  }}
                  style={{ padding: 0 }}
                >
                  Clear Selection
                </Button>
              </Space>
            </div>
            <Form.Item
              name="staffIds"
              rules={[{ required: true, message: "Select at least one employee" }]}
            >
              <Select
                mode="multiple"
                placeholder="Select employees or click 'Select All'"
                showSearch
                maxTagCount="responsive"
                optionFilterProp="label"
                options={filteredCreateStaff.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.employeeId}) — ${s.department || "No Dept"}`,
                }))}
              />
            </Form.Item>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="bonusType"
                label="Bonus Type"
                rules={[{ required: true, message: "Select bonus type" }]}
              >
                <Select placeholder="Select Bonus Type">
                  {BONUS_TYPES.map((b) => (
                    <Option key={b.value} value={b.value}>
                      {b.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="calculationType"
                label="Calculation Type"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="FIXED">Fixed Amount (₹)</Option>
                  <Option value="PERCENTAGE_OF_BASIC">% of Basic Salary</Option>
                  <Option value="PERCENTAGE_OF_GROSS">% of Gross Salary</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Bonus Amount (₹)"
                rules={[{ required: true, message: "Enter amount" }]}
              >
                <InputNumber min={0} prefix="₹" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentDate" label="Target Payment Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="paymentMode" label="Payment Mode">
                <Select>
                  <Option value="BANK_TRANSFER">Bank Direct / Transfer</Option>
                  <Option value="CASH">Cash</Option>
                  <Option value="CHEQUE">Cheque</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="Remarks / Description">
                <Input placeholder="e.g. Diwali Festival Bonus" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Reject Bonus Request"
        open={rejectModalVisible}
        onCancel={() => setRejectModalVisible(false)}
        onOk={handleConfirmReject}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Rejection Reason"
            rules={[{ required: true, message: "Please specify reason" }]}
          >
            <Input.TextArea rows={3} placeholder="State reason for rejecting bonus" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BonusManagementPage;

