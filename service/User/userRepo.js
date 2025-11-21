const pool = require("../../config/db");
const AppError = require("../../utils/appError");
const toCamelCase = require("../../utils/toCamelCase");
const bcrypt = require("bcryptjs");
const generateToken = require("../../utils/generateToken");

class UserRepo {
  static async userCreate({
    email,
    full_name,
    phone_number,
    profile_picture_url = "http://localhost:8000/user.png",
    is_active = true,
    password,
  }) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const values = [
      email,
      full_name,
      phone_number,
      profile_picture_url,
      is_active,
      hashedPassword,
    ];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insertUserQuery = `
        INSERT INTO users (email, full_name, phone_number, profile_picture_url, is_active,password)
        VALUES ($1, $2, $3, $4, $5,$6)
        RETURNING *;
      `;
      const insertResult = await client.query(insertUserQuery, values);

      if (insertResult.rowCount === 0) {
        throw new Error("Failed to create user");
      }

      // convert DB row(s) to camelCase and pick the created user
      const insertedRowsCamel = toCamelCase(insertResult.rows);
      const createdUser = Array.isArray(insertedRowsCamel)
        ? insertedRowsCamel[0]
        : insertedRowsCamel;

      const newUserId = createdUser.userId;

      // Determine role to assign (default to 'Admin' if not provided)
      const roleToAssign = "Admin";
      const findRoleText = `SELECT role_id, role_name FROM roles WHERE role_name = $1`;
      const roleResult = await client.query(findRoleText, [roleToAssign]);

      if (roleResult.rowCount === 0) {
        throw new Error(`Role "${roleToAssign}" not found`);
      }

      const roleId = roleResult.rows[0].role_id;

      const insertUserRoleQuery = `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        RETURNING *;
      `;
      await client.query(insertUserRoleQuery, [newUserId, roleId]);

      await client.query("COMMIT");
      delete createdUser.password; // Preventing password

      // Return a single user object with roles attached
      return {
        ...createdUser,
        role: [roleToAssign],
      };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.error("userCreate error:", err);
      throw err;
    } finally {
      client.release();
    }
  }

  // CHECK USER EXISTS--------------------------------------
  static async findUser({ email, password }) {
    const userQuery = `
      SELECT 
        u.*,
        ARRAY_AGG(r.role_name) FILTER(WHERE r.role_name IS NOT NULL) AS roles
      FROM users u
      JOIN user_roles ur 
        ON ur.user_id = u.user_id
      JOIN roles r 
        ON r.role_id = ur.role_id
      WHERE  
        u.email =$1
      GROUP BY u.user_id
      
      ;
    `;

    const { rows, rowCount } = await pool.query(userQuery, [email]);

    const [user] = toCamelCase(rows);

    if (!user) throw new AppError("Invalid password or email", 400);
    if (user.is_active === "false") throw new AppError("User is inactive", 400);

    // Check if the password is correct

    const storedHashedPassword = user.password;
    const isPasswordCorrect = await bcrypt.compare(
      password, // plainpassword
      storedHashedPassword // Hashed password from DB
    );

    if (!isPasswordCorrect) {
      throw new AppError("Invalid password or email", 400);
    }

    // --- If we get here, login is successful! ---

    // **SECURITY (Best Practice)**: Remove the hash before creating the token
    // or returning the user object.
    delete user.password;
    const token = generateToken.createSendToken({ userId: user.userId });

    return { token, user };
  }
  // GET ALL USERS........................................
  static async findAllUsers() {
    const query = `
      SELECT 
        u.user_id,
        u.full_name,
        u.email,
        u.phone_number,
        u.is_active,
        u.profile_picture_url,
        u.created_at,
        u.updated_at,
        u.deleted_at,
        COALESCE(ARRAY_AGG(DISTINCT r.role_name ORDER BY r.role_name) FILTER (WHERE r.role_name IS NOT NULL), ARRAY[]::text[]) AS assigned_role
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.user_id
      LEFT JOIN roles r ON r.role_id = ur.role_id
      WHERE u.deleted_at IS NULL AND  u.is_active = true 
      GROUP BY u.user_id
      ORDER BY u.user_id;
    `;
    try {
      const { rows } = await pool.query(query);
      const users = toCamelCase(rows);
      return users;
    } catch (err) {
      console.error("Error fetching users:", err);
      throw err;
    }
  }

  // FIND USER BY ID .......................................................
  static async findById(id) {
    const query = `
      SELECT u.user_id, u.full_name,u.profile_picture_url, u.email, u.phone_number,  r.role_name
      FROM users u
      JOIN user_roles ur
        ON ur.user_id = u.user_id
      JOIN roles r
        ON ur.role_id = r.role_id
      WHERE u.user_id = $1
      LIMIT 1;
    `;
    const values = [id];

    try {
      const { rows } = await pool.query(query, values);
      if (rows.length === 0) return null;

      const userCamel = toCamelCase(rows);
      // toCamelCase returns array => return first element
      return Array.isArray(userCamel) ? userCamel[0] : userCamel;
    } catch (err) {
      console.error("Error fetching user:", err);
      throw err;
    }
  }

  static async findByIdAndUpdate(id, updateFields = {}) {
    // Defensive: if nothing to update, return current user or null
    if (!updateFields || Object.keys(updateFields).length === 0) {
      return this.findById(id);
    }

    let setClauses = [];
    let values = [];
    let count = 1;

    for (const [key, value] of Object.entries(updateFields)) {
      // Object.entries return an array with key vale [["name","Amrit"]]
      setClauses.push(`${key} = $${count}`);
      values.push(value);
      count++;
    }

    // placeholder index for WHERE
    const idPlaceholderIndex = count;
    values.push(id);

    const query = `
      UPDATE users
      SET ${setClauses.join(", ")}
      WHERE user_id = $${idPlaceholderIndex}
      RETURNING *;
    `;

    try {
      const { rows } = await pool.query(query, values);

      if (rows.length === 0) {
        return null;
      }

      const userCamel = toCamelCase(rows);
      return Array.isArray(userCamel) ? userCamel[0] : userCamel;
    } catch (err) {
      console.error("Error during user update:", err);
      throw err;
    }
  }

  static async findByIdAndDelete(id) {
    const query = `
      UPDATE users
      SET 
        deleted_at = NOW(),
        is_active = false
      WHERE 
        user_id = $1
        AND deleted_at IS NULL
      RETURNING user_id;
    `;
    const values = [id];

    try {
      const { rows } = await pool.query(query, values);
      if (rows.length === 0) return null;

      const result = toCamelCase(rows);
      return result;
    } catch (err) {
      console.error("Error deleting user:", err);
      throw err;
    }
  }
}

module.exports = UserRepo;
