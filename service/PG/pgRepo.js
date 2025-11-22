const { file } = require("zod");
const pool = require("../../config/db");
const toCamelCase = require("../../utils/toCamelCase");
const AppError = require("../../utils/appError");
const { route } = require("../../app");

class PgRepo {
  static async findAllPGroom() {
    const query = `
      SELECT COALESCE(json_agg(prop), '[]'::json) AS properties
      FROM (
        SELECT
          p.property_id,
          p.user_id,
          p.title,
          p.address_line_1 AS address,
          p.city,
          p.area_name AS areaName,
          p.security_deposit_months,
          p.description,
          p.monthly_rent_base AS monthlyFees,
          p.is_deposit_refundable AS refundable,
          p.near_me AS nearMe,

          -- amenities
          COALESCE((
            SELECT json_agg(DISTINCT a.amenity_name)
            FROM property_amenities pa
            JOIN pg_amenities a ON a.amenity_id = pa.amenity_id
            WHERE pa.property_id = p.property_id
          ), '[]'::json) AS included_amenities,

          -- images
          COALESCE((
            SELECT json_agg(DISTINCT ph.image_url)
            FROM pg_photos ph
            WHERE ph.property_id = p.property_id
          ), '[]'::json) AS images

        FROM pg_properties p
      ) prop;

    `;

    // const query = `
    //   SELECT * FROM pg_properties;
    // `;

    try {
      const { rows } = await pool.query(query);
      const result = toCamelCase(rows);
      return result;
    } catch (err) {
      console.error("Error fetching PG rooms:", err.message);
      throw err;
    }
  }

  static async findPgById(userId) {
    const pgQuery = `
    SELECT COALESCE(json_agg(prop), '[]'::json) AS properties
    FROM (
      SELECT
        p.property_id,
        p.user_id,
        p.title,
        p.address_line_1 AS address,
        p.city,
        p.area_name AS areaName,
        p.description,
        p.monthly_rent_base AS monthlyFees,
        p.is_deposit_refundable AS refundable,
        p.status,
        p.near_me AS nearMe,

        COALESCE((
          SELECT json_agg(DISTINCT a.amenity_name)
          FROM property_amenities pa
          JOIN pg_amenities a ON a.amenity_id = pa.amenity_id
          WHERE pa.property_id = p.property_id
        ), '[]'::json) AS included_amenities,

        COALESCE((
          SELECT json_agg(DISTINCT ph.image_url)
          FROM pg_photos ph
          WHERE ph.property_id = p.property_id
        ), '[]'::json) AS images

      FROM pg_properties p
      WHERE p.user_id = $1       
    ) prop;
  `;

    const { rows } = await pool.query(pgQuery, [userId]);

    return rows[0]?.properties;
  }

  // PG CREATE...............................
  static async pgCreate(id, fields) {
    // <--- FIX 1: Removed { }
    const allowedColumns = [
      "title",
      "description",
      "address_line_1",
      "city",
      "area_name",
      "monthly_rent_base",
      "security_deposit_months",
      "is_deposit_refundable",
      "near_me",
    ];

    const columns = [];
    const values = [];
    const placeholders = [];

    let idx = 1;

    // 1. Build Dynamic Query
    for (const col of allowedColumns) {
      // check if value exists (allow false/0, but filter undefined)
      if (fields[col] !== undefined) {
        columns.push(col);
        values.push(fields[col]);
        placeholders.push(`$${idx}`);
        idx++;
      }
    }

    // Add User ID
    columns.push("user_id");
    placeholders.push(`$${idx}`);
    values.push(id);

    // 2. Insert Property
    const insertPGquery = `
      INSERT INTO pg_properties(${columns.join(",")})
      VALUES (${placeholders.join(", ")})
      RETURNING *;
    `;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { rows } = await client.query(insertPGquery, values);
      // Assuming toCamelCase is a utility you imported
      const result = toCamelCase ? toCamelCase(rows) : rows;
      const newPropertyId = rows[0].property_id;

      // 3. Insert Images
      if (
        fields.image_url &&
        Array.isArray(fields.image_url) &&
        fields.image_url.length > 0
      ) {
        // Creates ($1, $2), ($1, $3)...
        const photoPlaceholders = fields.image_url
          .map((_, i) => `($1, $${i + 2})`)
          .join(",");

        const photoQuery = `
          INSERT INTO pg_photos (property_id, image_url) 
          VALUES ${photoPlaceholders} 
          RETURNING *;
        `;

        await client.query(photoQuery, [newPropertyId, ...fields.image_url]);
      }

      // 4. Insert Amenities
      if (
        fields.amenities &&
        Array.isArray(fields.amenities) &&
        fields.amenities.length > 0
      ) {
        // A. Insert Amenities into Master Table (Ignore if exists)
        const insertPlaceholders = fields.amenities
          .map((_, i) => `($${i + 1})`)
          .join(", ");

        const insertAmenitiesSql = `
          INSERT INTO pg_amenities (amenity_name)
          VALUES ${insertPlaceholders}
          ON CONFLICT (amenity_name) DO NOTHING;
        `;
        await client.query(insertAmenitiesSql, fields.amenities);

        // B. Fetch IDs of these amenities
        const { rows: amenRows } = await client.query(
          `SELECT amenity_id, amenity_name FROM pg_amenities WHERE amenity_name = ANY($1::text[]);`,
          [fields.amenities]
        );

        const nameToId = new Map(
          amenRows.map((r) => [r.amenity_name, r.amenity_id])
        );

        // C. Link Amenities to Property
        const paPlaceholders = [];
        const paValues = [];
        let pIdx = 1;

        for (const amenName of fields.amenities) {
          const amenId = nameToId.get(amenName);
          if (!amenId) continue;

          paPlaceholders.push(`($${pIdx}, $${pIdx + 1})`);
          paValues.push(newPropertyId, amenId);
          pIdx += 2;
        }

        if (paPlaceholders.length > 0) {
          const paSql = `
            INSERT INTO property_amenities (property_id, amenity_id)
            VALUES ${paPlaceholders.join(", ")}
            ON CONFLICT DO NOTHING; 
          `;
          // Note: Ensure property_amenities has UNIQUE(property_id, amenity_id) for ON CONFLICT to work
          await client.query(paSql, paValues);
        }
      }

      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error inserting PG: ", err); // Changed log to console.error
      throw err;
    } finally {
      client.release();
    }
  }
  static async findByIdAndUpdate(propertyId, updateFields) {
    console.log("updatedFields: ", updateFields);

    // 1. Input Validation
    if (!updateFields || Object.keys(updateFields).length === 0) {
      // Throwing a custom error for clarity
      throw new AppError("Please provide fields to update.", 400);
    }

    const setClauses = [];
    const values = [];
    let count = 1;

    // 2. Dynamic Query Construction
    for (const [key, value] of Object.entries(updateFields)) {
      if (Array.isArray(value)) {
        // If the value is an array (e.g., 'images'):
        // We pass the entire JavaScript array as a single value ($N).
        // The driver converts it to a native PostgreSQL array.
        // We explicitly cast it to text[] in the SQL for clarity.
        // This logic REPLACES the entire array in the database.
        setClauses.push(`${key} = $${count}::text[]`);
        values.push(value);
        count++;
      } else {
        // For standard fields (text, number, boolean):
        setClauses.push(`${key} = $${count}`);
        values.push(value);
        count++;
      }
    }

    // 3. Add the WHERE clause parameter (the property ID)
    const whereClause = `id = $${count}`;
    values.push(propertyId);

    // 4. Construct the Final SQL Query
    const sql = `
            UPDATE pg_photos 
            SET ${setClauses.join(", ")} 
            WHERE ${whereClause}
            RETURNING *;`; // RETURNING * sends the updated row back

    console.log("Generated SQL:", sql);
    console.log("Parameter Values:", values);

    // 5. Execute the Query
    // You MUST replace 'db.query' with your actual database execution method
    try {
      // Example execution using node-postgres syntax:
      const result = await db.query(sql, values);

      if (result.rows.length === 0) {
        throw new AppError(`No property found with ID ${propertyId}`, 404);
      }

      return result.rows[0]; // Return the updated property object
    } catch (error) {
      console.error("Database Update Error:", error);
      // Re-throw or wrap the error to handle it in the controller/global handler
      throw new AppError("Failed to update property.", 500);
    }
  }

  static async deletePgPhoto(propertyId, photoId) {
    const deleteQuery = `
      DELETE FROM pg_photos
      WHERE 
        propertyId=$1
        And photoId=$2;
    `;
    const { rows } = await pool.query(deleteQuery, [propertyId, photoId]);
    return rows;
  }

  // Upload pg photos-----------------------------------

  static async uploadPhotos(propertyId, imageFilenames) {
    const uploadQuery = `
     INSERT INTO pg_photos (property_id, image_url)
     SELECT $1, unnest($2::text[])
     RETURNING *;
    `;

    const { rows } = await pool.query(uploadQuery, [
      propertyId,
      imageFilenames,
    ]);
    console.log("result rows: ", rows);
    const result = toCamelCase(rows);
    return result;
  }

  // UPDATE PG dETAILS -----------------------------------

  static async upDatepgdetils(userID, updateFields) {
    if (!updateFields || Object.keys(updateFields).length === 0) {
      return this.findPgById(userID);
    }

    let setClauses = [];
    let values = [];
    let count = 1;

    for (const [key, value] of Object.entries(updateFields)) {
      setClauses.push(`${key} = $${count}`);
      values.push(value);
      count += 1;
    }

    // placeholder index for WHERE
    const idPlaceholder = count;
    values.push(userID);

    const query = `
      UPDATE pg_properties
      SET ${setClauses.join(", ")}
      WHERE user_id = $${idPlaceholder}
      RETURNING *;
    `;

    try {
      const { rows } = await pool.query(query, values);
      const result = toCamelCase(rows);
      return result;
    } catch (err) {
      console.log("Error durinng update pg Details", err);
      throw err;
    }
  }

  static async getPgdetailById(productid) {
    const pgQuery = `
    SELECT COALESCE(json_agg(prop), '[]'::json) AS properties
    FROM (
      SELECT
        p.property_id,
        p.user_id,
        p.title,
        p.address_line_1 AS address,
        p.city,
        p.area_name AS areaName,
        p.description,
        p.monthly_rent_base AS monthlyFees,
        p.is_deposit_refundable AS refundable,
        p.status,
        p.near_me AS nearMe,

        COALESCE((
          SELECT json_agg(DISTINCT a.amenity_name)
          FROM property_amenities pa
          JOIN pg_amenities a ON a.amenity_id = pa.amenity_id
          WHERE pa.property_id = p.property_id
        ), '[]'::json) AS included_amenities,

        COALESCE((
          SELECT json_agg(DISTINCT ph.image_url)
          FROM pg_photos ph
          WHERE ph.property_id = p.property_id
        ), '[]'::json) AS images

      FROM pg_properties p
      WHERE p.property_id = $1       
    ) prop;
  `;
    try {
      const { rows, rowCount } = await pool.query(pgQuery, [productid]);
      // console.log(rowCount);
      // console.log(rows);
      const result = rows[0]?.properties;
      if (rowCount === 0 || !result || result.length === 0) {
        throw new AppError(`No property found with ID ${productid}`, 404);
      }
      return result;
    } catch (err) {
      console.log("Error fetching pgDetail", err);
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError("Error fetching pgDetails", 500);
    }
  }
}

module.exports = PgRepo;
