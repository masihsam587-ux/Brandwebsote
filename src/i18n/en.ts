export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

export interface TranslationDictionary {
  lang: 'en' | 'ur';
  dir: 'ltr' | 'rtl';
  brand: string;
  brandFull: string;
  locationShort: string;
  nav: {
    home: string;
    shop: string;
    orders: string;
    profile: string;
    about: string;
    faq: string;
    sizeGuide: string;
    shipping: string;
    contact: string;
    terms: string;
    privacy: string;
    signIn: string;
    browseShop: string;
    bag: string;
    switchLangLabel: string;
  };
  hero: {
    title: string;
    subtitle: string;
    shopCollection: string;
    installmentPlans: string;
    codTitle: string;
    codDesc: string;
    plansTitle: string;
    plansDesc: string;
    exchangeTitle: string;
    exchangeDesc: string;
  };
  home: {
    featuredProducts: string;
    viewAllProducts: string;
    shopByCategory: string;
    aboutTitle: string;
    aboutBody: string;
    readStory: string;
    howInstallmentsTitle: string;
    readFaq: string;
    needHelpTitle: string;
    needHelpSubtitle: string;
    emailUs: string;
    whatsapp: string;
    noProductsTitle: string;
    noProductsDesc: string;
  };
  shop: {
    heading: string;
    subtitle: string;
    searchPlaceholder: string;
    sortLatest: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    installmentCalc: string;
    hideCalc: string;
    allItems: string;
    noMatchTitle: string;
    noMatchDesc: string;
    resetFilters: string;
    previous: string;
    next: string;
  };
  category: {
    breadcrumbShop: string;
    allCategories: string;
    itemsCountLabel: (count: number) => string;
    sizeGuideCta: string;
    emptyTitle: string;
    emptyDesc: string;
    browseAllCta: string;
    intros: Record<string, string>;
    fallbackIntro: (name: string) => string;
  };
  product: {
    backToCollection: string;
    skuLabel: string;
    sizeLabel: string;
    sizeGuideLink: string;
    quantityLabel: string;
    outOfStock: string;
    lowStock: string;
    inStock: string;
    addToBag: string;
    buyNow: string;
    relatedTitle: string;
    notFoundTitle: string;
    notFoundDesc: string;
  };
  about: {
    heading: string;
    lead: string;
    sections: { heading: string; body: string }[];
    ctaShop: string;
    ctaContact: string;
  };
  faq: {
    heading: string;
    intro: string;
    items: FaqEntry[];
    ctaTitle: string;
    ctaDesc: string;
    ctaButton: string;
  };
  sizeGuide: {
    heading: string;
    intro: string;
    unstitchedTitle: string;
    unstitchedDesc: string;
    unstitchedRows: { piece: string; measurement: string; note: string }[];
    apparelTitle: string;
    apparelDesc: string;
    apparelRows: { size: string; chest: string; length: string; waist: string }[];
    boysTitle: string;
    boysRows: { size: string; waist: string; length: string; ageApprox: string }[];
    careNote: string;
  };
  shipping: {
    heading: string;
    intro: string;
    zonesTitle: string;
    zones: { region: string; eta: string; payment: string }[];
    returnsTitle: string;
    returnsPoints: string[];
  };
  contact: {
    heading: string;
    intro: string;
    addressLabel: string;
    phoneLabel: string;
    emailLabel: string;
    hoursLabel: string;
    whatsappCta: string;
    mapCta: string;
    faqLinkLabel: string;
  };
  footer: {
    summary: string;
    pagesHeading: string;
    guidesHeading: string;
    accountHeading: string;
    darkMode: string;
    lightMode: string;
    privacyNote: string;
    rights: string;
    currencyNote: string;
  };
  notFound: {
    code: string;
    heading: string;
    body: string;
    backHome: string;
  };
}

export const enDictionary: TranslationDictionary = {
  lang: 'en',
  dir: 'ltr',
  brand: 'Cinematic Arts',
  brandFull: 'Cinematic Arts (CA)',
  locationShort: 'Peshawar, Pakistan',
  nav: {
    home: 'Home',
    shop: 'Shop',
    orders: 'Orders',
    profile: 'Profile',
    about: 'About Us',
    faq: 'Installment FAQ',
    sizeGuide: 'Size Guide',
    shipping: 'Shipping & Returns',
    contact: 'Contact',
    terms: 'Terms & Installment Policy',
    privacy: 'Privacy & Data Usage',
    signIn: 'Sign In',
    browseShop: 'Browse Shop',
    bag: 'Bag',
    switchLangLabel: 'اردو',
  },
  hero: {
    title: 'Clothing & Accessories for Everyday Wear',
    subtitle:
      "Women's unstitched suits, boys' trousers, jackets, hoodies, shirts, t-shirts, and daily essentials priced in PKR. Pay on delivery or split your order into monthly installments.",
    shopCollection: 'Shop Collection',
    installmentPlans: 'Installment Plans',
    codTitle: 'Cash on delivery',
    codDesc: 'Delivered to your door anywhere in Pakistan with payment on arrival.',
    plansTitle: 'Monthly PKR plans',
    plansDesc: 'Spread payments across 2, 3, or 4 months using an active Seller Referral ID.',
    exchangeTitle: '7-day size exchange',
    exchangeDesc: 'Easy exchanges on unworn items within seven days of delivery.',
  },
  home: {
    featuredProducts: 'Featured Products',
    viewAllProducts: 'View All Products',
    shopByCategory: 'Shop by Category',
    aboutTitle: 'About Cinematic Arts',
    aboutBody:
      "Based in Peshawar, we put together practical everyday garments for families across Pakistan—from embroidered women's unstitched fabrics to boys' trousers, jackets, hoodies, and shirts. Every piece is priced openly in Pakistani Rupees with straightforward delivery and exchange support.",
    readStory: 'Read Our Story',
    howInstallmentsTitle: 'How Installments Work',
    readFaq: 'Read Installment FAQ',
    needHelpTitle: 'Need sizing help or seller details?',
    needHelpSubtitle: 'Reach our Peshawar store team directly by email, phone, or WhatsApp.',
    emailUs: 'Email Us',
    whatsapp: 'WhatsApp',
    noProductsTitle: 'No products listed yet',
    noProductsDesc: 'Products added to your shop catalog will appear here automatically.',
  },
  shop: {
    heading: 'Shop the Collection',
    subtitle: 'All prices in Pakistani Rupees (PKR)',
    searchPlaceholder: 'Search pieces...',
    sortLatest: 'Latest Drops',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    installmentCalc: 'Installment Calculator',
    hideCalc: 'Hide Calculator',
    allItems: 'All Items',
    noMatchTitle: 'No pieces match your filter',
    noMatchDesc: 'Try clearing your search term or selecting All Items.',
    resetFilters: 'Reset Filters',
    previous: 'Previous',
    next: 'Next',
  },
  category: {
    breadcrumbShop: 'Shop',
    allCategories: 'All Categories',
    itemsCountLabel: (count: number) => `${count} ${count === 1 ? 'item' : 'items'} available in PKR`,
    sizeGuideCta: 'View Size Guide',
    emptyTitle: 'No active listings in this category yet',
    emptyDesc: 'Browse the full storefront catalog or check back soon for newly listed stock.',
    browseAllCta: 'Browse Full Shop',
    intros: {
      'womens-unstitched':
        "Breathable cotton, lawn, and embroidered 3-piece women's unstitched fabrics ready for custom tailoring across every season in Pakistan.",
      'boys-trousers':
        "Durable cotton twill chinos and everyday trousers tailored for active boys with comfortable waistbands and reinforced seams.",
      jackets:
        'Clean-cut outerwear, casual bombers, and lined seasonal jackets built for cool Peshawar evenings and winter travel.',
      hoodies:
        'Brushed-fleece pullovers and heavyweight hoodies made for comfortable everyday warmth without stiff layering.',
      shirts:
        'Yarn-dyed Oxford and crisp cotton button-down shirts suited for workdays, university wear, and family gatherings.',
      't-shirts':
        'Combed cotton crew-neck t-shirts cut for breathable daily comfort and lasting neckline shape after repeated washes.',
      accessories:
        'Classic wristwatches, woven winter scarves, and practical everyday accents priced clearly in PKR.',
    },
    fallbackIntro: (name: string) =>
      `Browse curated ${name} items from Cinematic Arts (CA) in Peshawar, available with Cash on Delivery or monthly PKR installments.`,
  },
  product: {
    backToCollection: 'Back to Collection',
    skuLabel: 'SKU',
    sizeLabel: 'Size',
    sizeGuideLink: 'Size Guide',
    quantityLabel: 'Quantity',
    outOfStock: 'Out of stock',
    lowStock: 'Low stock',
    inStock: 'In stock',
    addToBag: 'Add to Bag',
    buyNow: 'Buy Now',
    relatedTitle: 'Related Items',
    notFoundTitle: 'Piece Not Found',
    notFoundDesc: 'This product link is invalid or the item has been archived.',
  },
  about: {
    heading: 'About Cinematic Arts (CA)',
    lead: 'Cinematic Arts (CA) is a Peshawar-based clothing and accessories store serving families across Pakistan with transparent PKR pricing, Cash on Delivery, and verified monthly installment plans.',
    sections: [
      {
        heading: 'Built Around Everyday Pakistani Wardrobes',
        body: "We focus on dependable staples rather than fleeting hype: embroidered women's 3-piece unstitched suits, boys' stretch cotton trousers, casual jackets, fleece hoodies, crisp Oxford shirts, combed cotton t-shirts, and functional accessories.",
      },
      {
        heading: 'Transparent PKR Pricing & Installments',
        body: 'Every item displays its full Cash on Delivery price alongside live 2-month, 3-month, and 4-month installment totals in PKR. Installment orders are verified through registered CA Seller Referral IDs so customers and local sellers have clear payment records.',
      },
      {
        heading: 'Nationwide Dispatch From Peshawar',
        body: 'Orders are packed and dispatched from Peshawar with tracked delivery across Khyber Pakhtunkhwa, Punjab, Sindh, Balochistan, Islamabad, and Azad Kashmir. Unworn garments and uncut fabrics qualify for easy 7-day exchanges.',
      },
    ],
    ctaShop: 'Browse the Shop',
    ctaContact: 'Contact Our Store',
  },
  faq: {
    heading: 'Installment & Order FAQ',
    intro:
      'Clear answers about Cinematic Arts PKR installment plans, Cash on Delivery, Seller Referral IDs, and nationwide exchanges.',
    items: [
      {
        id: 'faq-installments-how',
        question: 'How do monthly PKR installment plans work at Cinematic Arts?',
        answer:
          'You split your PKR order total across 2 months (15% markup), 3 months (25% markup), or 4 months (40% markup) with zero advance payment required by default when ordering with an active Seller Referral ID. Once you select a plan at checkout and submit a valid referral code (CA-XXXXXX), your order is verified by our team and each due date appears inside My Orders.',
      },
      {
        id: 'faq-cod-referral',
        question: 'Do I need a Seller Referral ID for Cash on Delivery orders?',
        answer:
          'No, Cash on Delivery (COD) orders never require a Seller Referral ID. Any customer anywhere in Pakistan can place a COD order directly and pay the rider in PKR upon delivery, though you may still enter a seller code optionally.',
      },
      {
        id: 'faq-seller-code',
        question: 'Where do I get an active CA Seller Referral ID?',
        answer:
          'You obtain a Seller Referral ID directly from a verified Cinematic Arts seller or by registering for a seller account yourself. Every approved seller receives a unique code in the format CA-XXXXXX on their Profile & Seller Dashboard.',
      },
      {
        id: 'faq-commission',
        question: 'How much commission does a Cinematic Arts seller earn?',
        answer:
          'Verified Cinematic Arts sellers earn a 10% commission on the total PKR value of every referred order once it is marked Complete. Pending or rejected orders do not credit commission until fulfillment is finalized.',
      },
      {
        id: 'faq-delivery-time',
        question: 'How long does nationwide delivery take across Pakistan?',
        answer:
          'Orders within Peshawar arrive within 1 to 2 working days, while deliveries to major cities across Pakistan typically take 2 to 5 working days. Tracking updates are coordinated directly via phone and WhatsApp.',
      },
      {
        id: 'faq-returns',
        question: 'Can I exchange a size or return an unstitched suit?',
        answer:
          'Yes, unworn stitched garments and uncut unstitched fabric suits with original tags may be exchanged within 7 calendar days of delivery. Contact our Peshawar support team on WhatsApp or email with your order ID to arrange a size swap.',
      },
    ],
    ctaTitle: 'Still have a question before ordering?',
    ctaDesc: 'Message our Peshawar team on WhatsApp or check your exact PKR monthly estimate.',
    ctaButton: 'Contact Store Team',
  },
  sizeGuide: {
    heading: 'Clothing Size Guide',
    intro:
      'Use these standard garment measurements in inches (unless stated in meters) to pick the right fit before placing your order.',
    unstitchedTitle: "Women's 3-Piece Unstitched Suits",
    unstitchedDesc: 'Cut lengths provide generous fabric allowance for standard and long tailoring.',
    unstitchedRows: [
      { piece: 'Shirt Front & Back (Embroidered / Printed)', measurement: '2.5 – 3.0 meters', note: 'Suitable for all standard kurtas and kameez styles' },
      { piece: 'Trouser / Shalwar Fabric', measurement: '2.5 meters (dyed)', note: 'Supports straight trousers, shalwar, or culottes' },
      { piece: 'Dupatta / Shawl', measurement: '2.5 meters', note: 'Organza, lawn, chiffon, or woven seasonal finish' },
    ],
    apparelTitle: 'Jackets, Hoodies, Shirts & T-Shirts',
    apparelDesc: 'Garment flat measurements (inches). Size up if you prefer a looser winter layer.',
    apparelRows: [
      { size: 'S', chest: '38 – 40"', length: '27"', waist: '30 – 31"' },
      { size: 'M', chest: '41 – 42"', length: '28"', waist: '32 – 33"' },
      { size: 'L', chest: '43 – 45"', length: '29"', waist: '34 – 36"' },
      { size: 'XL', chest: '46 – 48"', length: '30"', waist: '37 – 38"' },
    ],
    boysTitle: "Boys' Trousers & Chinos",
    boysRows: [
      { size: '26', waist: '26"', length: '34"', ageApprox: '8 – 10 years' },
      { size: '28', waist: '28"', length: '36"', ageApprox: '11 – 12 years' },
      { size: '30', waist: '30"', length: '38"', ageApprox: '13 – 14 years' },
      { size: '32', waist: '32"', length: '39"', ageApprox: '15 – 16 years' },
    ],
    careNote:
      'Need exact measurements for a specific piece? Message us on WhatsApp at 03355329722 with the product title or SKU before checkout.',
  },
  shipping: {
    heading: 'Shipping, Cash on Delivery & 7-Day Returns',
    intro:
      'Every Cinematic Arts order ships from Peshawar with clear delivery timelines and a straightforward 7-day size exchange guarantee.',
    zonesTitle: 'Estimated Delivery Times in Pakistan',
    zones: [
      { region: 'Peshawar & Surrounding Areas', eta: '1 – 2 working days', payment: 'Cash on Delivery & Verified Installments' },
      { region: 'Islamabad, Rawalpindi & Lahore', eta: '2 – 4 working days', payment: 'Cash on Delivery & Verified Installments' },
      { region: 'Karachi, Multan, Faisalabad & Nationwide', eta: '3 – 5 working days', payment: 'Cash on Delivery & Verified Installments' },
    ],
    returnsTitle: '7-Day Exchange & Return Rules',
    returnsPoints: [
      'Unworn garments with original tags attached and uncut unstitched fabrics qualify for a size or item exchange within 7 calendar days of delivery.',
      'Wrong or damaged items delivered in transit are replaced free of any extra delivery fee once reported within 48 hours of arrival.',
      'Installment orders remain subject to the verified repayment schedule; exchanges swap equal-value items or adjust the balance transparently.',
    ],
  },
  contact: {
    heading: 'Contact Cinematic Arts (CA)',
    intro:
      'Reach our Peshawar storefront team for order updates, sizing advice, wholesale or seller onboarding, and installment verification.',
    addressLabel: 'Store Location',
    phoneLabel: 'Phone & Direct Call',
    emailLabel: 'Support Email',
    hoursLabel: 'Store Hours',
    whatsappCta: 'Chat on WhatsApp',
    mapCta: 'Open Store Map',
    faqLinkLabel: 'Read Installment & Delivery FAQ',
  },
  footer: {
    summary:
      "Women's unstitched clothes, boys' trousers, jackets, hoodies, shirts, t-shirts, and accessories shipped nationwide across Pakistan in PKR.",
    pagesHeading: 'Store',
    guidesHeading: 'Guides & Support',
    accountHeading: 'Account & Policies',
    darkMode: 'Dark Appearance',
    lightMode: 'Light Appearance',
    privacyNote: 'Zero third-party advertising trackers. Essential session & delivery storage only.',
    rights: 'Cinematic Arts (CA). Peshawar, Pakistan.',
    currencyNote: 'All prices in Pakistani Rupees (PKR).',
  },
  notFound: {
    code: 'Error 404',
    heading: 'Page not found',
    body: 'This page could not be found. Browse our latest clothing and accessories or return to the main storefront.',
    backHome: 'Back to Home',
  },
};
