import { Product, User, Order, PurchaseOrder, Review } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Amrit Assam Gold - Sachet',
    description: 'Perfect for single use. Kadak taste instantly.',
    image: 'https://picsum.photos/seed/tea1/400/400',
    weight: '20g',
    mrp: 10,
    distributorPrice: 7.5,
    costPrice: 5,
    stock: 5000,
    lowStockThreshold: 500,
    category: 'Sachet'
  },
  {
    id: 'p2',
    name: 'Amrit Assam Gold - Family Pack',
    description: 'The standard choice for every Indian household. Rich color and aroma.',
    image: 'https://picsum.photos/seed/tea2/400/400',
    weight: '250g',
    mrp: 120,
    distributorPrice: 90,
    costPrice: 65,
    stock: 1000,
    lowStockThreshold: 100,
    category: 'Pouch'
  },
  {
    id: 'p3',
    name: 'Amrit Assam Gold - Jumbo Pack',
    description: 'Best value for large families and tea stalls.',
    image: 'https://picsum.photos/seed/tea3/400/400',
    weight: '500g',
    mrp: 230,
    distributorPrice: 175,
    costPrice: 130,
    stock: 800,
    lowStockThreshold: 100,
    category: 'Pouch'
  },
  {
    id: 'p4',
    name: 'Hotel Special Dust',
    description: 'Extra strong dust tea specifically for tapris and hotels.',
    image: 'https://picsum.photos/seed/tea4/400/400',
    weight: '1kg',
    mrp: 400,
    distributorPrice: 320,
    costPrice: 250,
    stock: 200,
    lowStockThreshold: 50,
    category: 'Bulk'
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'admin1',
    name: 'Super Admin',
    mobile: '8898750419',
    password: 'admin',
    role: 'ADMIN',
    approved: true,
  },
  {
    id: 'dist1',
    name: 'Rajesh Traders',
    mobile: '6913228416',
    password: '123',
    role: 'DISTRIBUTOR',
    territory: 'Navi Mumbai - Vashi',
    approved: true,
    address: 'Shop 4, APMC Market, Vashi'
  },
  {
    id: 'cust1',
    name: 'Amit Sharma',
    mobile: '9324270409',
    password: '123',
    role: 'CUSTOMER',
    approved: true,
    address: 'Flat 102, Shanti Nagar, Mumbai'
  }
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-001',
    userId: 'cust1',
    userName: 'Amit Sharma',
    items: [{ ...PRODUCTS[1], quantity: 2 }],
    totalAmount: 252,
    taxAmount: 12,
    status: 'Delivered',
    paymentMethod: 'UPI',
    paymentStatus: 'Paid',
    transactionId: 'pay_M3k29sl29dJ',
    date: '2023-10-15',
    type: 'RETAIL'
  },
  {
    id: 'ORD-002',
    userId: 'dist1',
    userName: 'Rajesh Traders',
    items: [{ ...PRODUCTS[2], quantity: 50 }, { ...PRODUCTS[3], quantity: 10 }],
    totalAmount: 12548,
    taxAmount: 598,
    status: 'Processing',
    paymentMethod: 'UPI',
    paymentStatus: 'Pending',
    date: '2023-10-20',
    type: 'WHOLESALE'
  }
];

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po1',
    poNumber: 'PO-2023-001',
    supplierName: 'Assam Gardens Pvt Ltd',
    date: '2023-10-01',
    status: 'Received',
    totalAmount: 50000,
    items: [
      { productId: 'p4', productName: 'Hotel Special Dust', quantity: 100, unitCost: 250, totalCost: 25000 },
      { productId: 'p3', productName: 'Amrit Assam Gold - Jumbo Pack', quantity: 100, unitCost: 130, totalCost: 13000 }
    ]
  }
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'r1',
    productId: 'p1',
    userId: 'cust1',
    userName: 'Amit Sharma',
    rating: 5,
    comment: 'Absolutely love the strong taste! Perfect for my morning routine.',
    date: '2023-10-12'
  },
  {
    id: 'r2',
    productId: 'p2',
    userId: 'u2',
    userName: 'Priya Patel',
    rating: 4,
    comment: 'Great value for money. The color is very rich.',
    date: '2023-10-15'
  },
  {
    id: 'r3',
    productId: 'p4',
    userId: 'dist1',
    userName: 'Rajesh Traders',
    rating: 5,
    comment: 'My hotel clients are very happy with the dust tea quality. Highly recommended for business.',
    date: '2023-10-18'
  }
];