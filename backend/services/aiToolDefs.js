/**
 * AI Tool Definitions — Role-Based Groq Function Schemas
 *
 * Separate tool sets for Employee and Admin roles.
 * Each tool has a name, description, and JSON Schema parameters.
 */

// ─── Shared Tools (All Roles) ─────────────────────────────────────────────────
const sharedTools = [
  {
    type: 'function',
    function: {
      name: 'navigateDashboard',
      description: 'Navigate to the main dashboard page.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateProfile',
      description: 'Navigate to the user profile page.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateNotifications',
      description: 'Navigate to the notifications page.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateSettings',
      description: 'Navigate to the portal settings / preferences page.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showLeaveBalance',
      description: 'Fetch and read out the current user\'s leave balances (sick, casual, earned leave remaining days).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showLeaveHistory',
      description: 'Navigate to the leave history page to view all leave requests.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'toggleDarkMode',
      description: 'Toggle dark mode on or off for the UI.',
      parameters: {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'True to enable dark mode, false to disable it.'
          }
        },
        required: ['enabled']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'markNotificationRead',
      description: 'Mark specific notification(s) as read. Identify notifications by their number from a previously listed set, or by description/title.',
      parameters: {
        type: 'object',
        properties: {
          notificationNumbers: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Array of notification numbers to mark as read.'
          },
          descriptions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of descriptions, titles, or keywords to identify the notifications.'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'markAllNotificationsRead',
      description: 'Mark all notifications as read for the current user.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showNotifications',
      description: 'Fetch and list all notifications for the current user with numbers for selection.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'performLogout',
      description: 'Log the current user out of the system. Say a friendly goodbye before calling this.',
      parameters: { type: 'object', properties: {} }
    }
  }
];

// ─── Employee-Only Tools ──────────────────────────────────────────────────────
const employeeTools = [
  {
    type: 'function',
    function: {
      name: 'applyLeave',
      description: 'Submit a leave application. You MUST have ALL 4 fields: leaveType, startDate, endDate, reason. If ANY field is missing, DO NOT call this tool — instead ASK the user for the missing information. NEVER auto-guess leaveType.',
      parameters: {
        type: 'object',
        properties: {
          leaveType: {
            type: 'string',
            enum: ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Work From Home', 'Emergency Leave', 'Loss Of Pay'],
            description: 'The type of leave. NEVER guess this — always ask the user explicitly.'
          },
          startDate: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD. Resolve relative dates like "tomorrow" or "next Monday" from today\'s date.'
          },
          endDate: {
            type: 'string',
            description: 'End date in YYYY-MM-DD.'
          },
          reason: {
            type: 'string',
            description: 'Reason for the leave.'
          }
        },
        required: ['leaveType', 'startDate', 'endDate', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateApplyLeave',
      description: 'Navigate to the leave application form page.',
      parameters: { type: 'object', properties: {} }
    }
  }
];

// ─── Admin-Only Tools ─────────────────────────────────────────────────────────
const adminTools = [
  {
    type: 'function',
    function: {
      name: 'createEmployee',
      description: 'Create a new employee record. Requires firstName, lastName, email, phone (10 digits), department, and designation.',
      parameters: {
        type: 'object',
        properties: {
          firstName: { type: 'string', description: 'First name of the employee.' },
          lastName: { type: 'string', description: 'Last name of the employee.' },
          email: { type: 'string', description: 'Email address.' },
          phone: { type: 'string', description: 'Phone number (exactly 10 digits).' },
          department: { type: 'string', description: 'Department name (e.g. Engineering, HR, Finance, Marketing, Operations, Sales).' },
          designation: { type: 'string', description: 'Job title / designation.' },
          role: { type: 'string', enum: ['Employee', 'Admin'], description: 'Role. Default is Employee.' },
          gender: { type: 'string', enum: ['Male', 'Female', 'Other', 'Prefer not to say'], description: 'Gender.' }
        },
        required: ['firstName', 'lastName', 'email', 'phone', 'department', 'designation']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteEmployee',
      description: 'Delete an employee from the system. Provide the employee name or number from search results.',
      parameters: {
        type: 'object',
        properties: {
          employeeName: { type: 'string', description: 'Name of the employee to delete.' },
          employeeNumber: { type: 'integer', description: 'Number from previously listed search results.' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchEmployee',
      description: 'Search for employees by name, department, or designation. Returns a numbered list.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (name, department, or designation).' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'viewEmployee',
      description: 'View detailed information about a specific employee.',
      parameters: {
        type: 'object',
        properties: {
          employeeName: { type: 'string', description: 'Name of the employee to view.' },
          employeeNumber: { type: 'integer', description: 'Number from previously listed search results.' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'approveLeave',
      description: 'Approve a pending leave request. Provide employee name and optionally a number from the pending list.',
      parameters: {
        type: 'object',
        properties: {
          employeeName: { type: 'string', description: 'Name of the employee whose leave to approve.' },
          leaveNumber: { type: 'integer', description: 'Number from the previously listed pending requests.' },
          remarks: { type: 'string', description: 'Approval remarks. Default: "Approved via AI Assistant".' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'rejectLeave',
      description: 'Reject a pending leave request. Provide employee name and optionally a number from the pending list.',
      parameters: {
        type: 'object',
        properties: {
          employeeName: { type: 'string', description: 'Name of the employee whose leave to reject.' },
          leaveNumber: { type: 'integer', description: 'Number from the previously listed pending requests.' },
          remarks: { type: 'string', description: 'Rejection reason. Default: "Rejected via AI Assistant".' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showPendingRequests',
      description: 'List all pending leave requests with numbers for selection. Admin only.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateEmployees',
      description: 'Navigate to the employee management directory page.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateLeaveApprovals',
      description: 'Navigate to the leave approvals page.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateAuditLogs',
      description: 'Navigate to the audit logs / system logs page.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateAIHistory',
      description: 'Navigate to the AI command history / AI assistant logs page.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'exportEmployeesExcel',
      description: 'Export all employees to an Excel (.xlsx) file and trigger download.',
      parameters: { type: 'object', properties: {} }
    }
  },
  // Admin can also apply leave on behalf (uses same tool)
  {
    type: 'function',
    function: {
      name: 'applyLeave',
      description: 'Submit a leave application. You MUST have ALL 4 fields: leaveType, startDate, endDate, reason. If ANY field is missing, DO NOT call this tool — instead ASK the user. NEVER auto-guess leaveType.',
      parameters: {
        type: 'object',
        properties: {
          leaveType: {
            type: 'string',
            enum: ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Work From Home', 'Emergency Leave', 'Loss Of Pay'],
            description: 'The type of leave. NEVER guess this.'
          },
          startDate: { type: 'string', description: 'Start date in YYYY-MM-DD.' },
          endDate: { type: 'string', description: 'End date in YYYY-MM-DD.' },
          reason: { type: 'string', description: 'Reason for the leave.' }
        },
        required: ['leaveType', 'startDate', 'endDate', 'reason']
      }
    }
  }
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the complete tool set for a given role.
 */
export const getToolsForRole = (role) => {
  if (role === 'Admin') {
    return [...sharedTools, ...adminTools];
  }
  return [...sharedTools, ...employeeTools];
};

/**
 * Check if a tool is allowed for the given role.
 */
export const isToolAllowed = (toolName, role) => {
  const tools = getToolsForRole(role);
  return tools.some(t => t.function.name === toolName);
};

/**
 * Get the names of all admin-only tools (for permission checks).
 */
export const getAdminOnlyToolNames = () => {
  return adminTools.map(t => t.function.name).filter(name => name !== 'applyLeave');
};

/**
 * Get the names of employee-only tools.
 */
export const getEmployeeOnlyToolNames = () => {
  return employeeTools.map(t => t.function.name);
};
