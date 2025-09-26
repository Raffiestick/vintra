export const UNIT_TYPES = [
    "BOAT","PWC","MOTORCYCLE","GOLF_CART","EBIKE",
    "TRAILER","RV","SNOWMOBILE","ATV","4X4","DIRT_BIKE",
  ] as const;
  export type UnitType = (typeof UNIT_TYPES)[number];
  
  export const TITLE_INFO_PILLS = [
    "FL Title","AZ Title","BOS","BT/MTR/TRLR","REPO TITLE",
  ] as const;
  
  export const CURRENCY = (n: number | string | null | undefined) =>
    (Number(n) || 0).toLocaleString("en-US",{style:"currency",currency:"USD"});
  
  export const subtotal = (p: {
    itemPrice?: number | null;
    buyerFee?: number | null;
    onlineFee?: number | null;
    managementFee?: number | null;
    miscFees?: { amount?: number | null }[];
  }) => {
    const nn = (v:any)=>Number(v)||0;
    const { itemPrice, buyerFee, onlineFee, managementFee, miscFees=[] } = p || {};
    const misc = miscFees.reduce((s,x)=>s+nn(x?.amount),0);
    return nn(itemPrice)+nn(buyerFee)+nn(onlineFee)+nn(managementFee)+misc;
  };
  