import { Edit, Mail, CheckCircle2, XCircle } from 'lucide-react';

const EmployeeTable = ({ employees = [], onEdit }) => {
  const getRoleBadgeClass = (role) => {
    const classes = {
      'IT_ADMIN': 'badge-purple',
      'HOSPITAL_ADMIN': 'badge-blue',
      'ICU_MANAGER': 'badge-indigo',
      'ER_STAFF': 'badge-orange',
      'WARD_STAFF': 'badge-emerald'
    };
    return classes[role] || 'badge-slate';
  };

  // Ensure employees is always an array
  const safeEmployees = Array.isArray(employees) ? employees : [];

  return (
    <>
      {/* Desktop Table View */}
      <div className="table-desktop">
        <table className="employee-table">
          <thead>
            <tr className="table-header-row">
              <th className="table-header">Employee</th>
              <th className="table-header">Role & Access</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {safeEmployees.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-state">
                  No employees found matching your criteria.
                </td>
              </tr>
            ) : (
              safeEmployees.map((employee, index) => {
                // Ensure roles is always an array
                const roles = Array.isArray(employee?.roles) ? employee.roles : [];
                const name = employee?.name || 'Unknown';
                const email = employee?.email || 'No email';
                const isActive = employee?.isActive ?? false;

                return (
                  <tr key={employee?._id || `employee-${index}`} className="table-row">
                    <td className="table-cell">
                      <div className="employee-info">
                        <div className="avatar">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="employee-details">
                          <div className="employee-name">{name}</div>
                          <div className="employee-email">
                            <Mail />
                            {email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="roles-list">
                        {roles.length === 0 ? (
                          <span className="role-badge badge-slate">No Role</span>
                        ) : (
                          roles.map((role, roleIndex) => (
                            <span 
                              key={`${role}-${roleIndex}`}
                              className={`role-badge ${getRoleBadgeClass(role)}`}
                            >
                              {role.replace('_', ' ')}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className={`status-badge ${
                        isActive ? 'status-active' : 'status-inactive'
                      }`}>
                        {isActive ? (
                          <CheckCircle2 />
                        ) : (
                          <XCircle />
                        )}
                        {isActive ? 'Active' : 'Inactive'}
                      </div>
                    </td>
                    <td className="table-cell">
                      <button 
                        onClick={() => onEdit(employee)}
                        className="btn-edit"
                      >
                        <Edit />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="table-mobile">
        {safeEmployees.length === 0 ? (
          <div className="empty-state-mobile">
            No employees found.
          </div>
        ) : (
          safeEmployees.map((employee, index) => {
            // Ensure roles is always an array
            const roles = Array.isArray(employee?.roles) ? employee.roles : [];
            const name = employee?.name || 'Unknown';
            const email = employee?.email || 'No email';
            const isActive = employee?.isActive ?? false;

            return (
              <div key={employee?._id || `employee-mobile-${index}`} className="employee-card">
                <div className="card-header">
                  <div className="employee-info">
                    <div className="avatar">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="employee-details">
                      <div className="employee-name">{name}</div>
                      <div className="employee-email-simple">{email}</div>
                    </div>
                  </div>
                  <div className={`status-icon ${
                    isActive ? 'status-icon-active' : 'status-icon-inactive'
                  }`}>
                    {isActive ? <CheckCircle2 /> : <XCircle />}
                  </div>
                </div>

                <div className="card-roles">
                  <div className="roles-label">Roles</div>
                  <div className="roles-list">
                    {roles.length === 0 ? (
                      <span className="role-badge badge-slate">No Role</span>
                    ) : (
                      roles.map((role, roleIndex) => (
                        <span 
                          key={`${role}-${roleIndex}`}
                          className={`role-badge ${getRoleBadgeClass(role)}`}
                        >
                          {role.replace('_', ' ')}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="card-actions">
                  <button 
                    onClick={() => onEdit(employee)}
                    className="btn-edit-mobile"
                  >
                    <Edit />
                    Edit Employee Details
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default EmployeeTable;