// ==================== services/adminService.js ====================
const { pool } = require("../config/database");

// Get system statistics
exports.getSystemStats = async () => {
  const userStats = await pool.query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN role = 'free' THEN 1 END) as free_users,
      COUNT(CASE WHEN role = 'premium' THEN 1 END) as premium_users,
      COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
      COUNT(CASE WHEN last_reset_date = CURRENT_DATE THEN 1 END) as active_today
    FROM users
  `);

  const fileStats = await pool.query(`
    SELECT 
      COUNT(*) as total_files,
      SUM(file_size) as total_storage,
      COUNT(CASE WHEN conversion_status = 'completed' THEN 1 END) as completed_conversions,
      COUNT(CASE WHEN conversion_status = 'processing' THEN 1 END) as processing_conversions,
      COUNT(CASE WHEN conversion_status = 'failed' THEN 1 END) as failed_conversions,
      COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as uploads_today
    FROM files
    WHERE deleted_at IS NULL
  `);

  const activityStats = await pool.query(`
    SELECT 
      COUNT(*) as total_requests,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as requests_today
    FROM activity_logs
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `);

  return {
    users: userStats.rows[0],
    files: fileStats.rows[0],
    activity: activityStats.rows[0],
  };
};

// Get daily statistics
exports.getDailyStats = async (days = 30) => {
  const stats = await pool.query(
    `SELECT 
      date,
      total_uploads,
      total_conversions,
      active_users,
      free_users,
      premium_users
     FROM system_stats
     WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
     ORDER BY date DESC`,
    []
  );

  return stats.rows;
};

// Get all users with filters
exports.getAllUsers = async ({ limit, offset, role, search }) => {
  let query = "SELECT * FROM users WHERE 1=1";
  const params = [];
  let paramCount = 1;

  if (role) {
    query += ` AND role = ${paramCount}`;
    params.push(role);
    paramCount++;
  }

  if (search) {
    query += ` AND (email ILIKE ${paramCount} OR clerk_id ILIKE ${paramCount})`;
    params.push(`%${search}%`);
    paramCount++;
  }

  query += ` ORDER BY created_at DESC LIMIT ${paramCount} OFFSET ${
    paramCount + 1
  }`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  const countQuery = "SELECT COUNT(*) FROM users";
  const countResult = await pool.query(countQuery);

  return {
    users: result.rows,
    total: parseInt(countResult.rows[0].count),
    limit,
    offset,
  };
};

// Get user details
exports.getUserDetails = async (userId) => {
  const userResult = await pool.query(
    "SELECT * FROM users WHERE clerk_id = $1",
    [userId]
  );

  if (userResult.rows.length === 0) {
    return null;
  }

  const user = userResult.rows[0];

  const fileStats = await pool.query(
    `SELECT 
      COUNT(*) as total_files,
      SUM(file_size) as total_storage,
      COUNT(CASE WHEN conversion_status = 'completed' THEN 1 END) as completed_conversions
     FROM files
     WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  const recentActivity = await pool.query(
    `SELECT * FROM activity_logs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );

  return {
    ...user,
    stats: fileStats.rows[0],
    recentActivity: recentActivity.rows,
  };
};

// Get file statistics
exports.getFileStats = async () => {
  const stats = await pool.query(`
    SELECT 
      file_type,
      COUNT(*) as count,
      SUM(file_size) as total_size,
      AVG(file_size) as avg_size
    FROM files
    WHERE deleted_at IS NULL
    GROUP BY file_type
    ORDER BY count DESC
  `);

  const conversionStats = await pool.query(`
    SELECT 
      operation_type,
      COUNT(*) as count,
      COUNT(CASE WHEN conversion_status = 'completed' THEN 1 END) as successful,
      COUNT(CASE WHEN conversion_status = 'failed' THEN 1 END) as failed
    FROM files
    WHERE operation_type IS NOT NULL
    GROUP BY operation_type
    ORDER BY count DESC
  `);

  return {
    byType: stats.rows,
    byOperation: conversionStats.rows,
  };
};
