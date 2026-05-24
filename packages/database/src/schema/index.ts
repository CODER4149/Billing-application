import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const permissions = sqliteTable("permissions", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  module: text("module").notNull(),
  action: text("action").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const rolePermissions = sqliteTable("role_permissions", {
  id: text("id").primaryKey(),
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: text("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  roleId: text("role_id").notNull().references(() => roles.id),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(false),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const branches = sqliteTable("branches", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  phone: text("phone"),
  email: text("email"),
  gstin: text("gstin"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  email: text("email"),
  phone: text("phone").notNull(),
  alternatePhone: text("alternate_phone"),
  gstin: text("gstin"),
  pan: text("pan"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  branchId: text("branch_id").references(() => branches.id),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const shippingAddresses = sqliteTable("shipping_addresses", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  label: text("label").notNull().default("Default"),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const invoiceStatuses = sqliteTable("invoice_statuses", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  color: text("color"),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  clientId: text("client_id").notNull().references(() => clients.id),
  branchId: text("branch_id").references(() => branches.id),
  status: text("status").notNull().default("draft"),
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date"),
  subtotal: real("subtotal").notNull().default(0),
  cgstTotal: real("cgst_total").notNull().default(0),
  sgstTotal: real("sgst_total").notNull().default(0),
  igstTotal: real("igst_total").notNull().default(0),
  taxTotal: real("tax_total").notNull().default(0),
  discountTotal: real("discount_total").notNull().default(0),
  grandTotal: real("grand_total").notNull().default(0),
  paidAmount: real("paid_amount").notNull().default(0),
  pendingAmount: real("pending_amount").notNull().default(0),
  isInterState: integer("is_inter_state", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  terms: text("terms"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const invoiceItems = sqliteTable("invoice_items", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  serviceType: text("service_type").notNull().default("other"),
  hsnCode: text("hsn_code"),
  quantity: real("quantity").notNull().default(1),
  unit: text("unit").default("nos"),
  rate: real("rate").notNull().default(0),
  amount: real("amount").notNull().default(0),
  discount: real("discount").notNull().default(0),
  cgstRate: real("cgst_rate").notNull().default(0),
  sgstRate: real("sgst_rate").notNull().default(0),
  igstRate: real("igst_rate").notNull().default(0),
  cgstAmount: real("cgst_amount").notNull().default(0),
  sgstAmount: real("sgst_amount").notNull().default(0),
  igstAmount: real("igst_amount").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  totalAmount: real("total_amount").notNull().default(0),
  paidAmount: real("paid_amount").notNull().default(0),
  pendingAmount: real("pending_amount").notNull().default(0),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  paymentDate: text("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  recordedBy: text("recorded_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const itemPayments = sqliteTable("item_payments", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  invoiceItemId: text("invoice_item_id").notNull().references(() => invoiceItems.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const borewellJobs = sqliteTable("borewell_jobs", {
  id: text("id").primaryKey(),
  jobNumber: text("job_number").notNull().unique(),
  clientId: text("client_id").notNull().references(() => clients.id),
  invoiceId: text("invoice_id").references(() => invoices.id),
  siteAddress: text("site_address").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: text("status").notNull().default("pending"),
  totalDepth: real("total_depth").default(0),
  waterFoundAt: real("water_found_at"),
  waterSuccess: integer("water_success", { mode: "boolean" }).default(false),
  drillingCost: real("drilling_cost").default(0),
  casingDepth: real("casing_depth"),
  pumpType: text("pump_type"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const vehicles = sqliteTable("vehicles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  registrationNumber: text("registration_number").notNull().unique(),
  vehicleType: text("vehicle_type").notNull().default("truck"),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  status: text("status").notNull().default("active"),
  fuelType: text("fuel_type"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const machineLogs = sqliteTable("machine_logs", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  borewellJobId: text("borewell_job_id").references(() => borewellJobs.id),
  logDate: text("log_date").notNull(),
  hoursUsed: real("hours_used").default(0),
  fuelConsumed: real("fuel_consumed").default(0),
  maintenanceCost: real("maintenance_cost").default(0),
  operatorName: text("operator_name"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  expenseDate: text("expense_date").notNull(),
  paymentMethod: text("payment_method").default("cash"),
  vehicleId: text("vehicle_id").references(() => vehicles.id),
  borewellJobId: text("borewell_job_id").references(() => borewellJobs.id),
  receiptNumber: text("receipt_number"),
  notes: text("notes"),
  recordedBy: text("recorded_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const gstRecords = sqliteTable("gst_records", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  invoiceItemId: text("invoice_item_id").references(() => invoiceItems.id),
  recordDate: text("record_date").notNull(),
  hsnCode: text("hsn_code"),
  taxableAmount: real("taxable_amount").notNull().default(0),
  cgstAmount: real("cgst_amount").notNull().default(0),
  sgstAmount: real("sgst_amount").notNull().default(0),
  igstAmount: real("igst_amount").notNull().default(0),
  totalTax: real("total_tax").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  module: text("module"),
  referenceId: text("reference_id"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  module: text("module").notNull(),
  action: text("action").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  deviceInfo: text("device_info"),
  remarks: text("remarks"),
  timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
});

export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey(),
  level: text("level").notNull().default("info"),
  module: text("module").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"),
  timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category").notNull().default("general"),
  description: text("description"),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const dashboardCache = sqliteTable("dashboard_cache", {
  id: text("id").primaryKey(),
  cacheKey: text("cache_key").notNull().unique(),
  period: text("period"),
  data: text("data").notNull(),
  computedAt: text("computed_at").notNull().default(sql`(datetime('now'))`),
});

export const schemaMigrations = sqliteTable("schema_migrations", {
  id: text("id").primaryKey(),
  revision: text("revision").notNull().unique(),
  appliedAt: text("applied_at").notNull().default(sql`(datetime('now'))`),
});
