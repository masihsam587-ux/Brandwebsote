export type UserRole = 'user' | 'seller';
export type OrderStatus = 'pending' | 'proceeding' | 'complete' | 'rejected';
export type PaymentMethod = 'cod' | 'installments';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  fatherName?: string;
  avatarUrl?: string;
  sellerCode?: string; // e.g. CA-XXXXXX
  isActiveSeller?: boolean;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
  emailConfirmationRequired?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
}

export type StockLevel = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number; // Selling price in PKR
  costPrice?: number; // Visible only to Admin
  categoryId: string;
  categoryName: string;
  coverImage: string;
  extraImages: string[];
  sizes?: string[];
  inStock: boolean;
  // UI-only stock readiness fields; kept optional until DB stock schema changes are confirmed
  stockLevel?: StockLevel;
  stockQuantity?: number;
  featured: boolean;
  createdAt: string;
}

export interface InstallmentPlan {
  id: string;
  label: string;
  months: number;
  advancePercent: number;
  markupPercent: number;
  active: boolean;
}

export interface OrderItem {
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
  selectedSize?: string;
  image: string;
}

export interface OrderInstallmentEntry {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidAt: string | null;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  planId?: string;
  planLabel?: string;
  advanceAmount: number;
  advancePaid: boolean;
  monthlyAmount: number;
  totalAmount: number;
  installmentSchedule: OrderInstallmentEntry[];
  referralCode?: string;
  referralSellerId?: string;
  commissionAmount: number;
  commissionCredited: boolean;
  status: OrderStatus;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string | null; // null means global broadcast
  title: string;
  message: string;
  kind: 'broadcast' | 'order' | 'feedback_reply' | 'commission';
  relatedFeedbackId?: string;
  read: boolean;
  createdAt: string;
}

export interface FeedbackMessage {
  id: string;
  senderRole: 'user' | 'admin';
  senderName: string;
  body: string;
  createdAt: string;
}

export interface FeedbackThread {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  status: 'open' | 'replied' | 'resolved';
  messages: FeedbackMessage[];
  updatedAt: string;
}

export interface SellerDashboardData {
  sellerCode: string;
  totalReferrals: number;
  completedReferrals: number;
  commissionEarned: number;
  pendingCommission: number;
  referredOrders: Order[];
  recoverySummary: {
    totalFinanced: number;
    totalRecovered: number;
    totalRemaining: number;
  };
  ownInstallmentOrders: Order[];
  monthlyEarnings: { month: string; commission: number; orders: number }[];
}

export interface AdminOverview {
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  commissionsPayable: number;
  netProfit: number;
  profitMarginPct: number;
  ordersCount: number;
  completedOrdersCount: number;
  pendingOrdersCount: number;
  dailySeries: { label: string; revenue: number; orders: number }[];
  monthlySeries: { label: string; revenue: number; profit: number }[];
}

export interface LoginPayload {
  email: string;
  password: string;
  turnstileToken?: string;
  honeypot?: string;
}

export interface SignupUserPayload {
  role: 'user';
  name: string;
  email: string;
  password: string;
  turnstileToken?: string;
  honeypot?: string;
}

export interface SignupSellerPayload {
  role: 'seller';
  name: string;
  email: string;
  password: string;
  phone: string;
  whatsapp: string;
  address: string;
  city?: string;
  postalCode: string;
  fatherName: string;
  avatarUrl?: string;
  turnstileToken?: string;
  honeypot?: string;
}

export type SignupPayload = SignupUserPayload | SignupSellerPayload;

export interface CreateOrderPayload {
  items: OrderItem[];
  customerName: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  postalCode: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  planId?: string;
  referralCode?: string;
  idempotencyKey?: string;
  turnstileToken?: string;
  honeypot?: string;
}

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  login(payload: LoginPayload): Promise<AuthSession>;
  signup(payload: SignupPayload): Promise<AuthSession>;
  requestPasswordReset(email: string): Promise<{ message: string }>;
  logout(): Promise<void>;
}

export interface TermsPolicySection {
  id: string;
  heading: string;
  body: string;
}

export interface TermsPolicyDocument {
  effectiveLabel: string;
  title: string;
  sections: TermsPolicySection[];
  footerNote: string;
  updatedAt: string;
}

export interface ManualDashboardEntry {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  revenue: number;
  costOfGoods: number;
  commissionAmount: number;
  ordersCount: number;
  notes?: string;
  createdAt: string;
}

export interface ProductService {
  listProducts(params?: {
    categoryId?: string;
    search?: string;
    sort?: 'latest' | 'price_asc' | 'price_desc';
    page?: number;
    limit?: number;
  }): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
  listCategories(): Promise<Category[]>;
  listInstallmentPlans(): Promise<InstallmentPlan[]>;
  getTermsPolicy(): Promise<TermsPolicyDocument>;
}

export interface OrderService {
  validateSellerReferral(code: string): Promise<{ valid: boolean; sellerId?: string; sellerName?: string }>;
  createOrder(payload: CreateOrderPayload): Promise<Order>;
  listMyOrders(): Promise<Order[]>;
}

export interface UserService {
  updateProfile(patch: Partial<User>): Promise<User>;
  deleteAccount(confirmationEmail: string): Promise<void>;
  getSellerDashboard(): Promise<SellerDashboardData>;
}

export interface NotificationService {
  listNotifications(): Promise<NotificationItem[]>;
  markAsRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface FeedbackService {
  listMyThreads(): Promise<FeedbackThread[]>;
  createThread(subject: string, message: string): Promise<FeedbackThread>;
  replyToThread(threadId: string, body: string): Promise<FeedbackThread>;
}

export interface AdminService {
  getAuthStatus(): Promise<{ configured: boolean }>;
  setupInitialPassword(password: string): Promise<{ token: string }>;
  verifyAdminPassword(password: string, email?: string): Promise<{ token: string }>;
  getOverview(adminToken: string): Promise<AdminOverview>;
  listManualEntries(adminToken: string): Promise<ManualDashboardEntry[]>;
  addManualEntry(
    adminToken: string,
    entry: Omit<ManualDashboardEntry, 'id' | 'createdAt'>
  ): Promise<ManualDashboardEntry>;
  deleteManualEntry(adminToken: string, entryId: string): Promise<void>;
  listAllOrders(adminToken: string): Promise<Order[]>;
  updateOrderStatus(adminToken: string, orderId: string, status: OrderStatus): Promise<Order>;
  toggleInstallmentPayment(
    adminToken: string,
    orderId: string,
    installmentNumber: number,
    paid: boolean,
    isAdvance?: boolean
  ): Promise<Order>;
  listAllUsers(adminToken: string): Promise<User[]>;
  sendNotification(
    adminToken: string,
    payload: { targetUserId: string | null; title: string; message: string }
  ): Promise<void>;
  listFeedbackThreads(adminToken: string): Promise<FeedbackThread[]>;
  replyFeedbackThread(adminToken: string, threadId: string, body: string): Promise<FeedbackThread>;
  listAdminProducts(adminToken: string): Promise<Product[]>;
  saveProduct(adminToken: string, product: Partial<Product> & { title: string; price: number; categoryId: string }): Promise<Product>;
  deleteProduct(adminToken: string, productId: string): Promise<void>;
  saveCategory(adminToken: string, category: Partial<Category> & { name: string }): Promise<Category>;
  saveInstallmentPlans(adminToken: string, plans: InstallmentPlan[]): Promise<InstallmentPlan[]>;
  saveTermsPolicy(adminToken: string, doc: Omit<TermsPolicyDocument, 'updatedAt'>): Promise<TermsPolicyDocument>;
}

export interface StorageService {
  uploadImage(file: File, folder: 'products' | 'avatars'): Promise<string>;
}

export interface BackendApi {
  mode: 'mock' | 'rest' | 'supabase';
  authService: AuthService;
  productService: ProductService;
  orderService: OrderService;
  userService: UserService;
  notificationService: NotificationService;
  feedbackService: FeedbackService;
  adminService: AdminService;
  storageService: StorageService;
}
