import { z } from 'zod';

const cleanText = (max: number, min = 1, label = 'Field') =>
  z
    .string()
    .trim()
    .min(min, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`)
    .refine((val) => !/[<>]/.test(val), 'HTML angle brackets (< >) are not permitted.');

const pkPhone = (label: string) =>
  z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, ''))
    .refine(
      (s) => /^(\+92|0)?3\d{9}$/.test(s) || /^\+?[0-9]{10,15}$/.test(s),
      `Enter a valid ${label} (e.g. 03355329722).`
    );

export const passwordPolicySchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .refine((p) => /[A-Za-z]/.test(p) && /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p), {
    message: 'Password must include both letters and at least one number or symbol.',
  });

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(120).toLowerCase(),
  password: z.string().min(1, 'Password is required.').max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(120).toLowerCase(),
});

export const signupUserSchema = z.object({
  role: z.literal('user'),
  name: cleanText(80, 2, 'Full name'),
  email: z.string().trim().email('Enter a valid email address.').max(120).toLowerCase(),
  password: passwordPolicySchema,
});

export const signupSellerSchema = z.object({
  role: z.literal('seller'),
  name: cleanText(80, 2, 'Full name'),
  email: z.string().trim().email('Enter a valid email address.').max(120).toLowerCase(),
  password: passwordPolicySchema,
  fatherName: cleanText(80, 2, "Father's name"),
  phone: pkPhone('mobile number'),
  whatsapp: pkPhone('WhatsApp number'),
  address: cleanText(200, 6, 'Residential or office address'),
  city: cleanText(60, 2, 'City').optional().default('Peshawar'),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9\-\s]{4,12}$/, 'Enter a valid postal code (4-12 characters).'),
  avatarUrl: z.string().max(1500000).optional(),
});

export const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (code) => code === '' || /^CA-[A-Z0-9]{4,12}$/.test(code),
    'Seller Referral ID must match format CA-XXXXXX.'
  );

export const checkoutSchema = z
  .object({
    fullName: cleanText(80, 2, 'Full name'),
    phone: pkPhone('mobile number'),
    whatsapp: pkPhone('WhatsApp number'),
    address: cleanText(200, 6, 'Complete street address'),
    city: cleanText(60, 2, 'City'),
    postalCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9\-\s]{4,12}$/, 'Postal code must be 4-12 characters.'),
    notes: z
      .string()
      .trim()
      .max(300, 'Notes must be 300 characters or fewer.')
      .refine((v) => !/[<>]/.test(v), 'HTML angle brackets are not permitted.')
      .optional()
      .default(''),
    paymentMethod: z.enum(['cod', 'installments']),
    referralCode: referralCodeSchema.default(''),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'installments' && !data.referralCode.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['referralCode'],
        message: 'An active Seller Referral ID (format CA-XXXXXX) is required for installment orders.',
      });
    }
  });

export const profileUpdateSchema = z.object({
  name: cleanText(80, 2, 'Full name'),
  phone: z
    .string()
    .trim()
    .max(24)
    .refine((s) => s === '' || /^(\+92|0)?3\d{9}$|^\+?[0-9\s-]{10,16}$/.test(s), 'Enter a valid phone number.'),
  whatsapp: z
    .string()
    .trim()
    .max(24)
    .refine((s) => s === '' || /^(\+92|0)?3\d{9}$|^\+?[0-9\s-]{10,16}$/.test(s), 'Enter a valid WhatsApp number.'),
  city: cleanText(60, 2, 'City'),
  address: cleanText(200, 4, 'Street address'),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9\-\s]{4,12}$/, 'Postal code must be 4-12 characters.'),
});

export const feedbackCreateSchema = z.object({
  subject: cleanText(120, 3, 'Subject'),
  message: cleanText(800, 4, 'Message'),
});

export const feedbackReplySchema = z.object({
  body: cleanText(800, 2, 'Reply message'),
});

export const adminManualEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid YYYY-MM-DD date is required.'),
  label: cleanText(120, 2, 'Entry description'),
  revenue: z.coerce.number().min(0, 'Revenue cannot be negative.').max(100_000_000),
  costOfGoods: z.coerce.number().min(0, 'Cost cannot be negative.').max(100_000_000),
  commissionAmount: z.coerce.number().min(0).max(100_000_000),
  ordersCount: z.coerce.number().int().min(1).max(10000),
  notes: z.string().trim().max(240).optional(),
});

export const adminProductSchema = z.object({
  title: cleanText(120, 2, 'Product title'),
  price: z.coerce.number().positive('Selling price must be greater than 0 PKR.').max(10_000_000),
  costPrice: z.coerce.number().min(0, 'Cost price cannot be negative.').max(10_000_000),
  categoryId: z.string().trim().min(1, 'Category is required.').max(80),
  description: z.string().trim().max(1200).optional().default(''),
});

export const adminTermsSchema = z.object({
  effectiveLabel: cleanText(120, 2, 'Effective label'),
  title: cleanText(160, 3, 'Document title'),
  footerNote: z.string().trim().max(300).optional().default(''),
  sections: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        heading: cleanText(160, 2, 'Section heading'),
        body: cleanText(2500, 5, 'Section body'),
      })
    )
    .min(1, 'At least one policy section is required.'),
});

export const urlSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, 'Invalid product slug.')
  .refine(
    (s) => !s.startsWith('-') && !s.endsWith('-') && !s.includes('--'),
    'Invalid product slug.'
  );

export const persistedCartItemSchema = z.object({
  productId: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  unitPrice: z.number().nonnegative().max(10_000_000),
  quantity: z.number().int().min(1).max(20),
  selectedSize: z.string().max(40).optional(),
  image: z.string().max(1000),
});

export function extractZodFieldErrors(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] || 'form');
    if (!map[key]) {
      map[key] = issue.message;
    }
  }
  return map;
}
