// Incoming data from Frontend
const reqBody = {
  wifi: true,
  ac: false,
  power_backup: true,
  cleaning: true,
  parking: false,
};

// 1. Transform Object to Array of Strings
const selectedAmenities = Object.keys(reqBody).filter((key) => {
  return reqBody[key] === true;
});

console.log(selectedAmenities);
