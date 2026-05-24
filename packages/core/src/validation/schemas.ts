import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(10, "Valid phone required"),
  alternatePhone: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  branchId: z.string().optional(),
  notes: z.string().optional(),
});

export const invoiceItemSchema = z.object({
  description: z.string().min(1),
  serviceType: z.string().default("other"),
  hsnCode: z.string().optional(),
  quantity: z.number().min(0),
  unit: z.string().default("nos"),
  rate: z.number().min(0),
  discount: z.number().min(0).default(0),
  cgstRate: z.number().min(0).default(9),
  sgstRate: z.number().min(0).default(9),
  igstRate: z.number().min(0).default(18),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1),
  branchId: z.string().optional(),
  invoiceDate: z.string().min(1),
  dueDate: z.string().optional(),
  isInterState: z.boolean().default(false),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item required"),
});

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive("Amount must be positive"),
  paymentDate: z.string().min(1),
  paymentMethod: z.string().default("cash"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  itemAllocations: z.array(z.object({
    invoiceItemId: z.string(),
    amount: z.number().positive(),
  })).optional(),
});

export const borewellJobSchema = z.object({
  clientId: z.string().min(1),
  siteAddress: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().default("pending"),
  totalDepth: z.number().min(0).default(0),
  waterFoundAt: z.number().optional(),
  waterSuccess: z.boolean().default(false),
  drillingCost: z.number().min(0).default(0),
  casingDepth: z.number().optional(),
  pumpType: z.string().optional(),
  notes: z.string().optional(),
});

export const vehicleSchema = z.object({
  name: z.string().min(1),
  registrationNumber: z.string().min(1),
  vehicleType: z.string().default("truck"),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  status: z.string().default("active"),
  fuelType: z.string().optional(),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  expenseDate: z.string().min(1),
  paymentMethod: z.string().default("cash"),
  vehicleId: z.string().optional(),
  borewellJobId: z.string().optional(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const settingsSchema = z.record(z.string(), z.string());

export type LoginInput = z.infer<typeof loginSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type BorewellJobInput = z.infer<typeof borewellJobSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
