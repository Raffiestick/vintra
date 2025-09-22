// In a file like `functions/src/models/jacket.ts`

export interface JacketUnit {
    vinOrHin: string;
    vin?: string;
    hin?: string;
    
    year?: number;
    make?: string;
    model?: string;
    
    color?: string;
    hours?: number;
    odometer?: number;
    
    // Boat-specific
    lengthFeet?: number;
    engine?: string;
  
    // Auction & Dealer Info
    stockNo?: string;
    aucNo?: string;
    saleLocation?: string;
    titleInfo?: string;
  
    // Financials
    itemPrice?: number;
    buyerFee?: number;
    onlineFee?: number;
    managementFee?: number;
    // Add any other fees you need to track
  }