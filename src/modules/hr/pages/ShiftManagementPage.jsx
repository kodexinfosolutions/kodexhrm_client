import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  TimePicker,
  DatePicker,
  Tag,
  Space,
  message,
  Popconfirm,
  Tabs,
  Row,
  Col,
  Switch,
  Tooltip,
  Badge,
  Typography,
} from "antd";
import {
  ScheduleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserSwitchOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SwapOutlined,
  ClockCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  assignShift,
  bulkAssignShift,
  getShiftRoster,
  getEmployeeShiftHistory,
} from "../hr.service";
import { getAllStaff } from "../../staff/staff.service";
import dayjs from "dayjs";

const { Option } = Select;
const { Text, Title } = Typography;

const DAYS_OF_WEEK = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const ShiftManagementPage = () => {
  const [shifts, setShifts] = useState([]);
  const [roster, setRoster] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("shifts");

  // Modal states
  const [shiftModalVisible, setShiftModalVisible] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedStaffHistory, setSelectedStaffHistory] = useState([]);
  const [selectedStaffName, setSelectedStaffName] = useState("");

  const [shiftForm] = Form.useForm();
  const [assignForm] = Form.useForm();

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const data = await getShifts();
      setShifts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error("Failed to load shifts");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoster = async () => {
    try {
      setLoading(true);
      const data = await getShiftRoster();
      setRoster(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error("Failed to load shift roster");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const data = await getAllStaff();
      setStaffList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchRoster();
    fetchStaff();
  }, []);

  const handleOpenCreateShift = () => {
    setEditingShift(null);
    shiftForm.resetFields();
    shiftForm.setFieldsValue({
      breakDuration: 60,
      gracePeriod: 15,
      weeklyOff: "SUNDAY",
      isNightShift: false,
      isActive: true,
    });
    setShiftModalVisible(true);
  };

  const handleOpenEditShift = (record) => {
    setEditingShift(record);
    shiftForm.setFieldsValue({
      name: record.name,
      code: record.code,
      startTime: record.startTime ? dayjs(record.startTime, "HH:mm") : null,
      endTime: record.endTime ? dayjs(record.endTime, "HH:mm") : null,
      breakDuration: record.breakDuration,
      gracePeriod: record.gracePeriod,
      weeklyOff: record.weeklyOff,
      isNightShift: record.isNightShift,
      isActive: record.isActive,
    });
    setShiftModalVisible(true);
  };

  const handleSaveShift = async () => {
    try {
      const values = await shiftForm.validateFields();
      const payload = {
        name: values.name,
        code: values.code,
        startTime: values.startTime ? values.startTime.format("HH:mm") : "08:00",
        endTime: values.endTime ? values.endTime.format("HH:mm") : "17:00",
        breakDuration: values.breakDuration,
        gracePeriod: values.gracePeriod,
        weeklyOff: values.weeklyOff,
        isNightShift: values.isNightShift ?? false,
        isActive: values.isActive ?? true,
      };

      if (editingShift) {
        await updateShift(editingShift.id, payload);
        message.success("Shift updated successfully");
      } else {
        await createShift(payload);
        message.success("Shift created successfully");
      }

      setShiftModalVisible(false);
      fetchShifts();
      fetchRoster();
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.message || "Failed to save shift");
    }
  };

  const handleDeleteShift = async (id) => {
    try {
      await deleteShift(id);
      message.success("Shift deleted successfully");
      fetchShifts();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete shift");
    }
  };

  const handleOpenAssignShift = (preselectedStaffId = null) => {
    assignForm.resetFields();
    assignForm.setFieldsValue({
      staffIds: preselectedStaffId ? [preselectedStaffId] : [],
      effectiveFrom: dayjs(),
    });
    setAssignModalVisible(true);
  };

  const handleSaveAssignment = async () => {
    try {
      const values = await assignForm.validateFields();
      const payload = {
        staffIds: values.staffIds,
        shiftId: values.shiftId,
        effectiveFrom: values.effectiveFrom.format("YYYY-MM-DD"),
        effectiveTo: values.effectiveTo ? values.effectiveTo.format("YYYY-MM-DD") : undefined,
        notes: values.notes,
      };

      await bulkAssignShift(payload);
      message.success("Shift assigned successfully");
      setAssignModalVisible(false);
      fetchRoster();
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.message || "Failed to assign shift");
    }
  };

  const handleViewHistory = async (staffRecord) => {
    setSelectedStaffName(`${staffRecord.name} (${staffRecord.employeeId})`);
    try {
      const history = await getEmployeeShiftHistory(staffRecord.id);
      setSelectedStaffHistory(Array.isArray(history) ? history : []);
      setHistoryModalVisible(true);
    } catch (err) {
      message.error("Failed to fetch shift history");
    }
  };

  const shiftColumns = [
    {
      title: "Shift Code",
      dataIndex: "code",
      key: "code",
      render: (code) => <Tag color="blue" style={{ fontWeight: 700 }}>{code}</Tag>,
    },
    {
      title: "Shift Name",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          {record.isNightShift && <Tag color="purple">Night Shift 🌙</Tag>}
        </div>
      ),
    },
    {
      title: "Timings",
      key: "timings",
      render: (_, r) => (
        <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
          {r.startTime} — {r.endTime}
        </span>
      ),
    },
    {
      title: "Break Duration",
      dataIndex: "breakDuration",
      key: "breakDuration",
      render: (b) => `${b || 0} mins`,
    },
    {
      title: "Grace Period",
      dataIndex: "gracePeriod",
      key: "gracePeriod",
      render: (g) => `${g || 0} mins`,
    },
    {
      title: "Weekly Off",
      dataIndex: "weeklyOff",
      key: "weeklyOff",
      render: (w) => <Tag color="orange">{w || "SUNDAY"}</Tag>,
    },
    {
      title: "Active Staff",
      key: "staffCount",
      render: (_, r) => <Badge count={r._count?.assignments || 0} showZero color="#10b981" />,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined style={{ color: "#3b82f6" }} />}
            onClick={() => handleOpenEditShift(record)}
          />
          <Popconfirm
            title="Delete Shift?"
            description="Are you sure you want to delete this shift?"
            onConfirm={() => handleDeleteShift(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rosterColumns = [
    {
      title: "Employee ID",
      dataIndex: "employeeId",
      key: "employeeId",
      render: (id) => <Tag color="default" style={{ fontWeight: 700 }}>{id}</Tag>,
    },
    {
      title: "Staff Name",
      dataIndex: "name",
      key: "name",
      render: (name, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{r.department} • {r.designation}</div>
        </div>
      ),
    },
    {
      title: "Current Shift",
      key: "currentShift",
      render: (_, r) => {
        const assignment = r.shiftAssignments?.[0];
        if (!assignment || !assignment.shift) {
          return <Tag color="warning">Not Assigned</Tag>;
        }
        return (
          <div>
            <Tag color="cyan" style={{ fontWeight: 700 }}>
              {assignment.shift.code} ({assignment.shift.name})
            </Tag>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
              {assignment.shift.startTime} - {assignment.shift.endTime}
            </div>
          </div>
        );
      },
    },
    {
      title: "Effective From",
      key: "effectiveFrom",
      render: (_, r) => {
        const assignment = r.shiftAssignments?.[0];
        return assignment?.effectiveFrom
          ? dayjs(assignment.effectiveFrom).format("DD-MMM-YYYY")
          : "-";
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<UserSwitchOutlined />}
            onClick={() => handleOpenAssignShift(r.id)}
          >
            Change Shift
          </Button>
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleViewHistory(r)}
          >
            History
          </Button>
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
            Shift Management
          </h2>
          <p style={{ color: "#64748b", margin: "4px 0 0" }}>
            Configure textile mill shifts, work hours, grace periods, and employee shift rosters.
          </p>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateShift}
            size="large"
            style={{ borderRadius: 10 }}
          >
            Create New Shift
          </Button>
          <Button
            icon={<UserSwitchOutlined />}
            onClick={() => handleOpenAssignShift()}
            size="large"
            style={{ borderRadius: 10 }}
          >
            Bulk Assign Shift
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: "shifts",
            label: (
              <span>
                <ClockCircleOutlined /> Shift Configurations ({shifts.length})
              </span>
            ),
            children: (
              <Card style={{ borderRadius: 16 }}>
                <Table
                  dataSource={shifts}
                  columns={shiftColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: "roster",
            label: (
              <span>
                <TeamOutlined /> Employee Shift Roster ({roster.length})
              </span>
            ),
            children: (
              <Card style={{ borderRadius: 16 }}>
                <Table
                  dataSource={roster}
                  columns={rosterColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 15 }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Create / Edit Shift Modal */}
      <Modal
        title={editingShift ? "Edit Shift" : "Create New Shift"}
        open={shiftModalVisible}
        onCancel={() => setShiftModalVisible(false)}
        onOk={handleSaveShift}
        destroyOnClose
        width={600}
      >
        <Form form={shiftForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="name"
                label="Shift Name"
                rules={[{ required: true, message: "Please enter shift name" }]}
              >
                <Input placeholder="e.g. Morning Shift (Shift 1)" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="code"
                label="Shift Code"
                rules={[{ required: true, message: "Please enter unique code" }]}
              >
                <Input placeholder="e.g. MS1, GS, NS" style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="Start Time"
                rules={[{ required: true, message: "Please select start time" }]}
              >
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endTime"
                label="End Time"
                rules={[{ required: true, message: "Please select end time" }]}
              >
                <TimePicker format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="breakDuration" label="Break Duration (minutes)">
                <InputNumber min={0} max={180} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gracePeriod" label="Late Grace Period (minutes)">
                <InputNumber min={0} max={60} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="weeklyOff" label="Weekly Off Day">
                <Select placeholder="Select Day">
                  {DAYS_OF_WEEK.map((d) => (
                    <Option key={d} value={d}>
                      {d}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="isNightShift" label="Night Shift?" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="isActive" label="Is Active?" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Assign Shift Modal */}
      <Modal
        title="Assign Shift to Staff"
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        onOk={handleSaveAssignment}
        destroyOnClose
        width={650}
      >
        <Form form={assignForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="staffIds"
            label="Select Staff Member(s)"
            rules={[{ required: true, message: "Please select at least one employee" }]}
          >
            <Select
              mode="multiple"
              placeholder="Select employees"
              showSearch
              filterOption={(input, option) =>
                option?.children?.toLowerCase()?.includes(input.toLowerCase())
              }
            >
              {staffList.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.name} ({s.employeeId}) — {s.department || "No Dept"}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="shiftId"
                label="Assign Shift"
                rules={[{ required: true, message: "Please select shift" }]}
              >
                <Select placeholder="Select Shift">
                  {shifts.map((s) => (
                    <Option key={s.id} value={s.id}>
                      {s.code} - {s.name} ({s.startTime} to {s.endTime})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="effectiveFrom"
                label="Effective From Date"
                rules={[{ required: true, message: "Please select effective date" }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Assignment Remarks / Reason">
            <Input.TextArea rows={2} placeholder="Optional reason for shift change" />
          </Form.Item>
        </Form>
      </Modal>

      {/* History Modal */}
      <Modal
        title={`Shift Assignment History — ${selectedStaffName}`}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setHistoryModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        <Table
          dataSource={selectedStaffHistory}
          rowKey="id"
          pagination={false}
          columns={[
            {
              title: "Shift",
              key: "shift",
              render: (_, r) => (
                <span>
                  <Tag color="blue">{r.shift?.code}</Tag>
                  <strong>{r.shift?.name}</strong> ({r.shift?.startTime} - {r.shift?.endTime})
                </span>
              ),
            },
            {
              title: "Effective From",
              dataIndex: "effectiveFrom",
              key: "effectiveFrom",
              render: (d) => dayjs(d).format("DD-MMM-YYYY"),
            },
            {
              title: "Effective To",
              dataIndex: "effectiveTo",
              key: "effectiveTo",
              render: (d) => (d ? dayjs(d).format("DD-MMM-YYYY") : <Tag color="green">Current Active</Tag>),
            },
            {
              title: "Notes",
              dataIndex: "notes",
              key: "notes",
              render: (n) => n || "-",
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default ShiftManagementPage;

