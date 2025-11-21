// Helper to convert a string to camelCase
function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Main function to convert array of objects
function arrayKeysToCamel(arr) {
  if (!Array.isArray(arr)) return [];

  return arr.map((obj) => {
    if (typeof obj !== "object" || obj === null) return obj;

    const newObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        newObj[toCamel(key)] = obj[key];
      }
    }
    return newObj;
  });
}

// Export the function as a module
module.exports = arrayKeysToCamel;
