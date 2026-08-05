
export const UNIT_TYPE_OPTIONS = [
  'Auto', 'Boat', 'PWC', 'Motorcycle', 'Ebike', '4X4',
  'Three-Wheelers', 'ATV', 'Utility Vehicle', 'Motorhome',
  'Camper', 'Trailer', 'Golf Cart', 'Dirt Bikes', 'Scooter', 'Other'
] as const;

export type UnitType = typeof UNIT_TYPE_OPTIONS[number];

export const DISPOSITION_OPTIONS = [
  'New Acquisition', 'Inventory Received', 'In Transit',
  'Service & Prep', 'Ready To Show', 'Under Contract', 'Sold', 'Dealer Paid'
] as const;
export type Disposition = typeof DISPOSITION_OPTIONS[number];

export interface InventoryItem {
  id: string;
  vin: string; // VIN/HULL Number, "NA" if not applicable
  stockNumberInternal?: string;
  year: number;
  make: string;
  model: string;
  series?: string;
  color?: string;
  unitType: UnitType;
  disposition: Disposition;
  assignedDealerId?: string;
  saleLocation?: string;
  engine1?: string;
  engine1_hours?: string;
  engine2?: string;
  engine2_hours?: string;
  engine3?: string;
  engine3_hours?: string;
  engine4?: string;
  engine4_hours?: string;
  mileage?: string;
  hours?: number;
  purchaseInvoiceItemNotes?: string; 
  conditionNotes?: string;
  productDescription?: string;
  extractedTitleInfoFromInvoice?: string;

  // Acquisition
  auctionHouseId?: string;
  auctionDate?: string;
  auctionLotNumber?: string;
  auctionStockNumber?: string;
  purchasedById?: string;

  // Costs
  cost_auctionItemPrice: number;
  cost_auctionBuyerFee?: number;
  cost_auctionOnlineFee?: number;
  cost_itemManagementFee?: number; 
  cost_allocatedAuctionDocFee?: number;
  cost_allocatedAuctionLicenseFee?: number;
  cost_allocatedAuctionOtherFee?: number;
  cost_freight?: number;
  cost_flooringCurtailment?: number;
  cost_other?: Array<{ description: string; amount: number }>;
  totalAcquisitionCost: number;

  // Title Information
  title_status?: TitleStatus;
  title_number?: string;
  title_state?: string;
  title_dateReceived?: string;
  title_dateSentToBuyer?: string;
  title_scannedDocumentUrl?: string;
  title_receivedFrom?: string;
  title_sentTo?: string;
  title_notes?: string;
  title_expectedDate?: string;
  title_trackingNumberOutgoing?: string;


  // Location & Logistics
  location_current?: UnitLocation;
  location_datePickedUpFromAuction?: string;
  location_pickedUpByFromAuction?: string;

  // Sale Information
  isSold?: boolean;
  sale_soldToCustomerId?: string;
  sale_date?: string;
  sale_price?: number;
  sale_packFee?: number;
  sale_totalInvoiceAmount?: number;
  sale_invoiceId?: string;
  sale_dateUnitPickedUpByBuyer?: string;
  sale_pickedUpByBuyer?: string;
  sale_notes?: string;

  // Financial Summary
  financial_grossProfit?: number;

  // Lifecycle Milestones
  milestone_purchasedDate?: string;
  milestone_paidDate?: string;
  milestone_pickedUpDate?: string;
  milestone_titleReceivedDate?: string;
  milestone_soldOrTransferredDate?: string;

  // Documents
  documents?: Array<UploadedDocument>;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export const TITLE_STATUS_OPTIONS = ['Pending From Auction', 'Received', 'Transferred', 'Sent To Buyer', 'Problem', 'NA'] as const;
export type TitleStatus = typeof TITLE_STATUS_OPTIONS[number];


export type UnitLocation = 'Auction House' | 'In Transit' | 'RizeUp Storage' | 'Sold - Awaiting Pickup' | 'Delivered' | 'Other';
export const UNIT_LOCATION_OPTIONS: UnitLocation[] = ['Auction House', 'In Transit', 'RizeUp Storage', 'Sold - Awaiting Pickup', 'Delivered', 'Other'];


export interface UploadedDocument {
  id: string;
  name: string;
  url: string;
  category: DocumentCategory;
  uploadedAt: string;
}

export type DocumentCategory =
  | 'Auction Invoice'
  | 'Freight Bill'
  | 'Title Front'
  | 'Title Back'
  | 'Sales Invoice'
  | 'Unit Photo'
  | 'Condition Report'
  | 'Other Document';

export interface PurchaseInvoice { 
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  vendorId: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  datePaid?: string;
  uploadedInvoiceUrl?: string;
  lineItems?: Array<PurchaseInvoiceLineItem>; 
  extractedData?: any;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessedInvoiceLineItem {
  vinOrHull: string;
  originalDescription: string;
  year: string;
  make: string;
  model: string;
  unitType: UnitType | string;
  color: string;
  saleLocation: string;
  engine1: string;
  engine1_hours: string;
  engine2: string;
  engine2_hours: string;
  engine3: string;
  engine3_hours: string;
  engine4: string;
  engine4_hours: string;
  mileage: string;
  titleInfo: string; 
  amount: number;
  buyerFee: number;
  itemManagementFee: number; 
}


export interface StoredPurchaseInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  vendor: string;
  totalAmount: number;
  mode: 'ai' | 'manual';
  processedItemIdentifiers: string[];
  lineItems: ProcessedInvoiceLineItem[]; 
  createdAt: string;
  updatedAt: string;
}


export interface PurchaseInvoiceLineItem { 
  id: string;
  inventoryItemId?: string;
  originalDescription: string;
  amount: number;

  vinOrHull?: string;
  year?: string;
  make?: string;
  model?: string;
  unitType?: string;
  color?: string;
  saleLocation?: string;
  engine1?: string;
  engine1_hours?: string;
  engine2?: string;
  engine2_hours?: string;
  engine3?: string;
  engine3_hours?: string;
  engine4?: string;
  engine4_hours?: string;
  mileage?: string;
  titleInfo?: string;

  mapsTo_itemPrice?: boolean;
  mapsTo_auctionBuyerFee?: boolean;
  mapsTo_freightCost?: boolean;
}

export type PaymentStatus = 'Paid' | 'Unpaid' | 'Partially Paid' | 'Pending' | 'Overdue';

export interface DealerProfile {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxExemptNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
}

export type VendorType = 'Auction House' | 'Freight Company' | 'Service Provider' | 'Other';


export interface CustomerDealer {
  id: string;
  name: string;
  dealerLicenseNumber?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type UserRole = 'Admin' | 'Dealer' | 'Staff' | 'Finance';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  isLoading?: boolean;
  descriptionClassName?: string;
}

export interface GenAIInvoiceInputItem {
    description: string;
    amount: number;
    vinOrHull: string;
}

export interface GenAIInvoiceInputData {
    invoiceNumber: string;
    invoiceDate: string;
    vendor: string;
    items: GenAIInvoiceInputItem[];
    totalAmount: number;
}

export interface RecordSaleFormValues {
  sale_soldToCustomerId: string;
  sale_date: string;
  sale_price: number;
  sale_packFee?: number;
  sale_invoiceId?: string;
  sale_notes?: string;
  location_current?: UnitLocation;
  disposition?: Disposition;
}

// Types for Dealer Invoicing
export const DEALER_INVOICE_STATUS_OPTIONS = ['Draft', 'Sent', 'Paid', 'Overdue', 'Void'] as const;
export type DealerInvoiceStatus = typeof DEALER_INVOICE_STATUS_OPTIONS[number];

export const PAYMENT_TYPE_OPTIONS = ['Check', 'Wire', 'ACH', 'Cash', 'Zelle', 'Credit Card'] as const;
export type PaymentType = typeof PAYMENT_TYPE_OPTIONS[number];

export interface DealerInvoiceItem {
  inventoryItemId: string;
  vin: string;
  description: string;
  salePrice: number; 
  itemBuyerFee?: number;
  itemManagementFee?: number; 
}

export interface DealerInvoice {
  id: string;
  invoiceNumber: string;
  dealerId: string;
  items: DealerInvoiceItem[];
  subTotal: number; 
  taxAmount?: number;
  managementFee?: number; 
  totalAmount: number; 
  status: DealerInvoiceStatus;
  invoiceDate: string;
  dueDate?: string;
  dateSent?: string;
  datePaid?: string;
  paymentType?: PaymentType;
  notesToDealer?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ITEM_MANAGEMENT_FEE = 100;
export const ERROR_MODEL_OVERLOADED_INDICATOR = "__ERROR_MODEL_OVERLOADED__";
