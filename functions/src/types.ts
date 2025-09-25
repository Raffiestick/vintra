import { Timestamp } from "firebase-admin/firestore";

// This is the single, authoritative definition for a Jacket, based on Firestore.
export interface JacketData {
    vin: string;
    vinOrHin?: string;
    jacketNumber?: string;
    year?: number;
    make?: string;
    model?: string;
    color?: string;
    odometer?: number;
    titleInfo?: string;
    titleNumber?: string;
    auctionSaleDate?: Timestamp;
    invoiceDate?: string;
    
    // Properties for templates that may not be on every document
    bodyType?: string;
    titleState?: string;
    saleLocation?: string;

    // Financials
    itemPrice?: number;
    buyerFee?: number;
    onlineFee?: number;
    managementFee?: number;
    miscFees?: { id: string; name?: string; description?: string; amount: number; }[];
    amountPaid?: number;
    isAuctionPaid?: boolean;
    isMgmtFeePaid?: boolean;
    auctionPaidAt?: Timestamp;
    auctionPaymentRef?: string;
    mgmtPaidAt?: Timestamp;
    mgmtPaymentRef?: string;

    // Associations
    dealerId?: string;
    invoiceId?: string;
    bosId?: string;
    stagedSid?: string;

    // Document URLs
    invoiceUrl?: string;
    bosUrl?: string;
    packetUrl?: string;
    reassignmentUrl?: string;
    documents?: { id: string; name: string; type: string; url: string; createdAt: Timestamp }[];
}

export interface Company {
    name: string;
    dba?: string;
    line1: string;
    line2: string;
    fullAddress: string;
    phone: string;
    email: string;
}

export interface Party {
    name: string;
    line1: string;
    line2: string;
    phone: string;
    email: string;
}

