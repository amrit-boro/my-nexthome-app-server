const { z } = require("zod");

// utility to coerce numeric strings to numbers for specific fields
const coerceNumber = (isFloat = false) => {
  return z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === "") return undefined;
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const n = isFloat ? Number(val) : Number.parseInt(val, 10);
        if (!Number.isNaN(n)) return n;
      }
      return val;
    },
    isFloat ? z.number() : z.number().int()
  );
};

// utility to coerce boolean-like strings
const coerceBoolean = z.preprocess((val) => {
  if (val === undefined || val === "") return undefined;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;
  }
  if (typeof val === "number") {
    return val === 1;
  }
  return val;
}, z.boolean());

exports.PgShema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().optional(),
  area_name: z.string().optional(),
  city: z.string().optional(),
  type: z.string().optional(),

  // FIX: Use coerceBoolean here because FormData sends "true"/"false" strings
  near_me: z.string().optional(),

  address_line_1: z.string(),
  google_maps_url: z.string().optional(),

  latitude: coerceNumber(true).optional(),
  longitude: coerceNumber(true).optional(),
  monthly_rent_base: coerceNumber(true),
  security_deposit_months: coerceNumber(false),
  is_deposit_refundable: coerceBoolean,
  status: coerceBoolean.optional(),

  // FIX: It should be an Optional Array of Strings, not an Array of Optional Strings
  image_url: z.array(z.string()).optional(),

  // Amenities will be forced into an array by the controller before reaching here
  amenities: z.array(z.string().min(1)).optional(),
});

/*

exports.createPG = catchAsync(async (req, res, next) => {
  // 1. Extract the data (assuming everything is inside req.body.formData)
  const rawData = req.body.formData;
  console.log("data: ", rawData);
  const amenitiesObj = rawData.amenities || {}; // Fallback to empty object if undefined

  // 2. Transform { "wifi": true } -> ["wifi"]
  const amenitiesArray = Object.keys(amenitiesObj).filter((key) => {
    return amenitiesObj[key] === true;
  });

  console.log("Transformed amenities:", amenitiesArray);

  // 3. Prepare data for validation
  // We create a new object spreading the original data, but overwriting 'amenities'
  // with our new array.
  const dataToValidate = {
    ...rawData,
    amenities: amenitiesArray,
  };

  console.log("data to validate: ", dataToValidate);

  // 4. Schema Validation
  // We validate the CLEAN data, not the raw req.body
  const parsed = PgShema.safeParse(dataToValidate);

  // if (!parsed.success) {
  //   // It is good practice to log the Zod error to see why it failed
  //   console.error(parsed.error);
  //   return next(new AppError("Validation failed", 400));
  // }

  // const fields = parsed.data;

  // // 5. Create in DB
  // const result = await pgRepo.pgCreate(id, fields); // Passed 'fields' directly

  // res.status(200).json({
  //   status: "succes",
  //   data: result,
  // });
});

*/
