export const PERMISSION_MAP = {
  // Admissions
  'admission:create': { module: 'Admissions', page: 'Applications', action: 'Create' },
  'admission:read': { module: 'Admissions', page: 'Applications', action: 'Read' },
  'admission:update': { module: 'Admissions', page: 'Applications', action: 'Update' },
  'admission:approve': { module: 'Admissions', page: 'Applications', action: 'Approve' },
  'admission:delete': { module: 'Admissions', page: 'Applications', action: 'Delete' },

  // Students
  'student:create': { module: 'Students', page: 'Student List', action: 'Create' },
  'student:read': { module: 'Students', page: 'Student List', action: 'Read' },
  'student:update': { module: 'Students', page: 'Student List', action: 'Update' },
  'student:delete': { module: 'Students', page: 'Student List', action: 'Delete' },

  // Fees
  'fees:dashboard': { module: 'Fees', page: 'Dashboard', action: 'Read' },
  'fees:structure:create': { module: 'Fees', page: 'Fee Structure', action: 'Create' },
  'fees:structure:read': { module: 'Fees', page: 'Fee Structure', action: 'Read' },
  'fees:structure:update': { module: 'Fees', page: 'Fee Structure', action: 'Update' },
  'fees:structure:delete': { module: 'Fees', page: 'Fee Structure', action: 'Delete' },
  'fees:assign': { module: 'Fees', page: 'Assign Fees', action: 'Manage' },
  'fees:collect': { module: 'Fees', page: 'Collect Payment', action: 'Manage' },
  'fees:read': { module: 'Fees', page: 'Dashboard', action: 'Read' },

  // Transport
  'transport:dashboard': { module: 'Transport', page: 'Dashboard', action: 'Read' },
  'transport:route:create': { module: 'Transport', page: 'Routes', action: 'Create' },
  'transport:route:read': { module: 'Transport', page: 'Routes', action: 'Read' },
  'transport:route:update': { module: 'Transport', page: 'Routes', action: 'Update' },
  'transport:route:delete': { module: 'Transport', page: 'Routes', action: 'Delete' },
  'transport:assign': { module: 'Transport', page: 'Assign Transport', action: 'Manage' },
  'transport:read': { module: 'Transport', page: 'View Transport', action: 'Read' },
  'location:create': { module: 'Transport', page: 'View Transport', action: 'Create Location' },
  'location:read': { module: 'Transport', page: 'View Transport', action: 'Live Tracking' },

  // Staff
  'staff:create': { module: 'Staff', page: 'Staff List', action: 'Create' },
  'staff:read': { module: 'Staff', page: 'Staff List', action: 'Read' },
  'staff:update': { module: 'Staff', page: 'Staff List', action: 'Update' },
  'staff:delete': { module: 'Staff', page: 'Staff List', action: 'Delete' },

  // Users
  'user:create': { module: 'Users', page: 'User List', action: 'Create' },
  'user:read': { module: 'Users', page: 'User List', action: 'Read' },
  'user:update': { module: 'Users', page: 'User List', action: 'Update' },
  'user:delete': { module: 'Users', page: 'User List', action: 'Delete' },

  // Reports
  'reports:read': { module: 'Reports', page: 'General', action: 'Read' },

  // Settings
  'settings:read': { module: 'Settings', page: 'General', action: 'Read' },
  'settings:update': { module: 'Settings', page: 'General', action: 'Update' },

  // HR
  'hr:dashboard': { module: 'HR', page: 'Dashboard', action: 'Read' },
  'hr:attendance:read': { module: 'HR', page: 'Attendance Leave', action: 'Read' },
  'hr:attendance:manage': { module: 'HR', page: 'Attendance Leave', action: 'Manage' },
  'hr:leave:read': { module: 'HR', page: 'Leave Management', action: 'Read' },
  'hr:leave:manage': { module: 'HR', page: 'Leave Management', action: 'Manage' },
  'hr:leave:approve': { module: 'HR', page: 'Leave Management', action: 'Approve' },
  'hr:permission:read': { module: 'HR', page: 'Permission', action: 'Read' },
  'hr:permission:manage': { module: 'HR', page: 'Permission', action: 'Manage' },
  'hr:permission:approve': { module: 'HR', page: 'Permission', action: 'Approve' },
  'hr:statutory:read': { module: 'HR', page: 'Statutory Settings', action: 'Read' },
  'hr:statutory:manage': { module: 'HR', page: 'Statutory Settings', action: 'Manage' },
  'hr:essl:read': { module: 'HR', page: 'ESSL', action: 'Read' },
  'hr:essl:manage': { module: 'HR', page: 'ESSL', action: 'Manage' },
  'hr:payroll:read': { module: 'HR', page: 'Payroll Wizard', action: 'Read' },
  'hr:payroll:manage': { module: 'HR', page: 'Payroll Wizard', action: 'Manage' },
  'hr:payroll:approve': { module: 'HR', page: 'Payroll Wizard', action: 'Approve' },

  // Store & POS
  'pos:dashboard': { module: 'Store & POS', page: 'Dashboard', action: 'Read' },
  'pos:read': { module: 'Store & POS', page: 'Sales (POS)', action: 'Read' },
  'pos:manage': { module: 'Store & POS', page: 'Sales (POS)', action: 'Manage' },
  'pos:sell': { module: 'Store & POS', page: 'Sales (POS)', action: 'Sell' },
  'pos:purchase:create': { module: 'Store & POS', page: 'Purchases', action: 'Create' },
  'pos:purchase:read': { module: 'Store & POS', page: 'Purchases', action: 'Read' },
  'pos:purchase:update': { module: 'Store & POS', page: 'Purchases', action: 'Update' },
  'pos:purchase:delete': { module: 'Store & POS', page: 'Purchases', action: 'Delete' },
  'pos:purchase': { module: 'Store & POS', page: 'Purchases', action: 'Manage' },
  'pos:sale:create': { module: 'Store & POS', page: 'Sales (POS)', action: 'Create' },
  'pos:sale:read': { module: 'Store & POS', page: 'Sales (POS)', action: 'Read' },

  // Documents
  'doc:request:create': { module: 'Documents', page: 'Issue Book', action: 'Create' },
  'doc:request:read': { module: 'Documents', page: 'Issue Book', action: 'Read' },
  'doc:request:review': { module: 'Documents', page: 'Issue Book', action: 'Review' },
  'doc:request:issue': { module: 'Documents', page: 'Issue Book', action: 'Issue' },
  'doc:request:delete': { module: 'Documents', page: 'Issue Book', action: 'Delete' },

  // Houses
  'house:create': { module: 'Houses', page: 'House Management', action: 'Create' },
  'house:read': { module: 'Houses', page: 'House Management', action: 'Read' },
  'house:update': { module: 'Houses', page: 'House Management', action: 'Update' },
  'house:delete': { module: 'Houses', page: 'House Management', action: 'Delete' },

  // Exams
  'exam:create': { module: 'Exams', page: 'General', action: 'Create' },
  'exam:read': { module: 'Exams', page: 'General', action: 'Read' },
  'exam:update': { module: 'Exams', page: 'General', action: 'Update' },
  'exam:delete': { module: 'Exams', page: 'General', action: 'Delete' },
  'exam:subject:manage': { module: 'Exams', page: 'Subject Creation', action: 'Manage' },
  'exam:hall:manage': { module: 'Exams', page: 'Hall Creation', action: 'Manage' },
  'exam:timetable:manage': { module: 'Exams', page: 'Exam Timetable', action: 'Manage' },
  'exam:roll:generate': { module: 'Exams', page: 'Auto Roll Generation', action: 'Generate' },
  'exam:seat:allocate': { module: 'Exams', page: 'Seat Allocation', action: 'Allocate' }
};

export const parsePermission = (rawPerm) => {
  if (PERMISSION_MAP[rawPerm]) {
    return { ...PERMISSION_MAP[rawPerm], raw: rawPerm };
  }

  // Dynamic fallback for unknown permissions
  const parts = rawPerm.split(':');
  const moduleKey = parts[0];
  const moduleName = moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1);
  const pageName = parts.length > 2 ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'General';
  const actionName = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);

  return { module: moduleName, page: pageName, action: actionName, raw: rawPerm };
};
