# **App Name**: JacketMaster

## Core Features:

- Document Parsing: Automatically parse uploaded auction documents using AI to extract key information like Year, Make, Model, VIN, Auction Invoice Total, and Title State/Number. Tool: the AI agent will use external information sources (like auto databases) to confirm the correctness of the automatically parsed entries.
- Invoice Generation: Generate a branded invoice (Page 1 of the jacket) based on the parsed data and pre-defined templates, ensuring all required fields are populated correctly.
- Bill of Sale Generation: Generate a Dealer-to-Dealer Bill of Sale (Page 2 of the jacket) using the parsed data and pre-defined templates, including seller and buyer information, unit details, and sale information.
- PDF Merging: Merge the generated invoice and bill of sale into a single, final 2-page PDF jacket, following a consistent branding theme.
- File Naming: Automatically name the final PDF file according to the naming convention: [Year]_[Make]_[Model]_[Last6VIN]_RizeUp_to_Pulse_COMPLETE_FINAL.pdf.
- Downloadables: Provide download capability of a fillable master PDF with both pages (Invoice + BOS) containing editable fields for manual entry, while keeping dealer information and signatures locked.
- Data Validation: Ensure VIN, Auction Invoice Total, and Title State/Number are double-checked against a live database. Automatically include the $100 Management Fee and set Odometer Status to Exempt.

## Style Guidelines:

- Primary color: Deep Blue (#1E3A8A) to convey trust, reliability, and prestige, aligning with the brand's image.
- Background color: Light Gray (#F5F5F5) to provide a clean, professional backdrop that ensures readability and reduces distractions.
- Accent color: Gold (#D4AF37) to highlight important information and CTAs, reinforcing a sense of luxury and quality.
- Body and headline font: 'Inter' sans-serif font. This provides a modern, clean and highly readable aesthetic suitable for both headings and body text. 
- Code font: 'Source Code Pro' for displaying code snippets.
- Use minimalistic line icons for quick identification of data fields, emphasizing simplicity and efficiency.
- Employ a clean, two-column layout for both the Invoice and Bill of Sale, ensuring optimal information hierarchy and readability.