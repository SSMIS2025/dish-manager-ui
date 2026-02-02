// Helper function for generating unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function for MySQL datetime format (YYYY-MM-DD HH:MM:SS)
const getMySQLDateTime = () => {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
};

// Error handler middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('Server error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  });
};

// Transform camelCase to snake_case
const camelToSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// Transform snake_case to camelCase
const snakeToCamel = (str) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

// Transform object keys to snake_case
const transformToSnakeCase = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
};

// Transform object keys to camelCase
const transformToCamelCase = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
};

module.exports = {
  generateId,
  getMySQLDateTime,
  asyncHandler,
  camelToSnake,
  snakeToCamel,
  transformToSnakeCase,
  transformToCamelCase
};
