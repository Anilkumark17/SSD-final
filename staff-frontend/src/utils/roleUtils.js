/**
 * Role-based Access Control Utility Functions
 * These functions help determine what UI elements and actions are available to each role
 */

/**
 * Check if user has a specific role
 * @param {Object} user - User object with roles array
 * @param {string} role - Role to check for
 * @returns {boolean}
 */
export const hasRole = (user, role) => {
  if (!user) return false;
  
  // Support both roles array and single role property
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.includes(role);
  }
  
  return user.role === role;
};

/**
 * Check if user has any of the specified roles
 * @param {Object} user - User object with roles array
 * @param {string[]} roles - Array of roles to check
 * @returns {boolean}
 */
export const hasAnyRole = (user, roles) => {
  if (!user || !roles || !Array.isArray(roles)) return false;
  
  return roles.some(role => hasRole(user, role));
};

/**
 * Check if user can view reports (utilization, analytics)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canViewReports = (user) => {
  return hasRole(user, 'HOSPITAL_ADMIN');
};

/**
 * Check if user can view forecasting data
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canViewForecasting = (user) => {
  return hasAnyRole(user, ['HOSPITAL_ADMIN', 'ICU_MANAGER']);
};

/**
 * Check if user can update bed status
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canUpdateBedStatus = (user) => {
  return hasAnyRole(user, ['WARD_STAFF', 'HOSPITAL_ADMIN']);
};

/**
 * Check if user can admit patients
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canAdmitPatients = (user) => {
  return hasAnyRole(user, ['ICU_MANAGER', 'HOSPITAL_ADMIN']);
};

/**
 * Check if user can discharge patients
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canDischargePatients = (user) => {
  return hasAnyRole(user, ['ICU_MANAGER', 'HOSPITAL_ADMIN']);
};

/**
 * Check if user can transfer patients
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canTransferPatients = (user) => {
  return hasAnyRole(user, ['ICU_MANAGER', 'HOSPITAL_ADMIN']);
};

/**
 * Check if user can request emergency admission
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canRequestEmergency = (user) => {
  return hasAnyRole(user, ['ER_STAFF', 'HOSPITAL_ADMIN']);
};

/**
 * Check if user can allocate ICU beds
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canAllocateICU = (user) => {
  return hasAnyRole(user, ['ICU_MANAGER', 'HOSPITAL_ADMIN']);
};

/**
 * Check if user can view alerts (threshold alerts)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canViewAlerts = (user) => {
  return hasAnyRole(user, ['ICU_MANAGER', 'HOSPITAL_ADMIN']);
};

/**
 * Check if user can view patient details
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canViewPatientDetails = (user) => {
  return hasAnyRole(user, ['HOSPITAL_ADMIN', 'ICU_MANAGER']);
};

/**
 * Check if user can view bed details (patient info when occupied)
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canViewBedDetails = (user) => {
  // ER_STAFF and WARD_STAFF cannot see patient details
  return hasAnyRole(user, ['HOSPITAL_ADMIN', 'ICU_MANAGER']);
};

/**
 * Check if user can view analytics and charts
 * @param {Object} user - User object
 * @returns {boolean}
 */
export const canViewAnalytics = (user) => {
  return hasAnyRole(user, ['HOSPITAL_ADMIN', 'ICU_MANAGER']);
};

/**
 * Get user's primary role for display purposes
 * @param {Object} user - User object
 * @returns {string}
 */
export const getPrimaryRole = (user) => {
  if (!user) return 'Unknown';
  
  if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles[0];
  }
  
  return user.role || 'Unknown';
};

/**
 * Get role display name
 * @param {string} role - Role code
 * @returns {string}
 */
export const getRoleDisplayName = (role) => {
  const roleNames = {
    'HOSPITAL_ADMIN': 'Hospital Administrator',
    'ICU_MANAGER': 'ICU Manager',
    'ER_STAFF': 'Emergency Room Staff',
    'WARD_STAFF': 'Ward Staff',
    'IT_ADMIN': 'IT Administrator'
  };
  
  return roleNames[role] || role;
};
