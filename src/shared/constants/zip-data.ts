export const RIDER = {
  name: "Arun Kumar",
  initial: "A",
  phone: "+91 93426 64663",
  email: "arunkumar@gmail.com",
  memberSince: "January 2024",
  dob: "12 Jan 1998",
  gender: "Male",
  referral: "ARUN2024",
  rating: 4.9,
  totalRides: 47,
  totalSpent: "₹6.2K",
  wallet: 1250,
};

export const DRIVER = {
  name: "Ramesh Kumar",
  initial: "R",
  rating: 4.8,
  trips: 423,
  car: "Swift Dzire White",
  plate: "TN 72 AB 1234",
  phone: "+91 98765 43210",
  email: "ramesh.driver@gmail.com",
  online: true,
  todayEarnings: 1840,
  todayTrips: 12,
};

export type VehicleType = {
  id: string;
  name: string;
  desc: string;
  eta: string;
  price: number;
  seats: number;
  emoji: string;
};

export const VEHICLES: VehicleType[] = [
  {
    id: "taxi",
    name: "Taxi",
    desc: "Comfortable everyday rides",
    eta: "3 min",
    price: 198,
    seats: 4,
    emoji: "🚕",
  },
];

export const RIDES = [
  {
    id: "r1",
    date: "24 May 2024, 10:30 AM",
    from: "Virudhunagar Bus Stand",
    to: "AAA College of Engineering",
    type: "Sedan",
    km: "4.2 km",
    mins: "18 mins",
    pay: "Cash",
    fare: 198,
    status: "Completed",
  },
  {
    id: "r2",
    date: "23 May 2024, 07:15 PM",
    from: "New Bus Stand",
    to: "Sivakasi Bus Stand",
    type: "Sedan",
    km: "3.8 km",
    mins: "14 mins",
    pay: "UPI",
    fare: 156,
    status: "Completed",
  },
  {
    id: "r3",
    date: "22 May 2024, 08:45 AM",
    from: "Rajapalayam",
    to: "SankaranKovil",
    type: "SUV",
    km: "12.4 km",
    mins: "32 mins",
    pay: "Cash",
    fare: 320,
    status: "Completed",
  },
  {
    id: "r4",
    date: "20 May 2024, 11:20 AM",
    from: "Sivakasi Town",
    to: "Virudhunagar Railway Station",
    type: "Hatchback",
    km: "6.1 km",
    mins: "22 mins",
    pay: "UPI",
    fare: 145,
    status: "Completed",
  },
  {
    id: "r5",
    date: "18 May 2024, 03:00 PM",
    from: "Aruppukottai",
    to: "Virudhunagar",
    type: "Sedan",
    km: "22 km",
    mins: "45 mins",
    pay: "Cash",
    fare: 0,
    status: "Cancelled",
  },
];

export const TRANSACTIONS = [
  { id: "t1", title: "Ride Payment", date: "24 May 2024 · Cash", amount: -198, kind: "ride" },
  { id: "t2", title: "Added Money", date: "20 May 2024 · UPI", amount: 500, kind: "add" },
  { id: "t3", title: "Ride Payment", date: "18 May 2024 · UPI", amount: -156, kind: "ride" },
  { id: "t4", title: "Referral Bonus", date: "15 May 2024", amount: 100, kind: "bonus" },
  { id: "t5", title: "Ride Payment", date: "12 May 2024 · Cash", amount: -320, kind: "ride" },
];

export const NOTIFICATIONS = [
  {
    id: "n1",
    title: "Driver arriving soon",
    body: "Ramesh is 3 minutes away from your pickup point.",
    time: "2 min ago",
    type: "ride",
    unread: true,
  },
  {
    id: "n2",
    title: "Ride completed",
    body: "Your trip to AAA College of Engineering is complete. Fare ₹198.",
    time: "1 hr ago",
    type: "ride",
    unread: true,
  },
  {
    id: "n3",
    title: "₹100 Referral bonus added",
    body: "Your friend joined ZipRide using your code ARUN2024.",
    time: "Yesterday",
    type: "wallet",
    unread: false,
  },
  {
    id: "n4",
    title: "Weekend offer — 20% off",
    body: "Use code ZIP20 on your next 3 rides this weekend.",
    time: "2 days ago",
    type: "promo",
    unread: false,
  },
  {
    id: "n5",
    title: "Money added to wallet",
    body: "₹500 added successfully via UPI.",
    time: "4 days ago",
    type: "wallet",
    unread: false,
  },
];

export const TRIP = {
  from: "Virudhunagar Bus Stand",
  to: "AAA College of Engineering",
  km: "4.2 km",
  mins: "18 mins",
  fare: 198,
  pay: "Cash",
};

export const RIDE_REQUESTS = [
  {
    id: "rr1",
    rider: "Arun Kumar",
    from: "Virudhunagar Bus Stand",
    to: "AAA College of Engineering",
    km: "4.2 km",
    fare: 198,
    pickupAway: "1.2 km",
    pay: "Cash",
    rating: 4.9,
  },
  {
    id: "rr2",
    rider: "Priya S",
    from: "New Bus Stand",
    to: "Sivakasi Bus Stand",
    km: "3.8 km",
    fare: 156,
    pickupAway: "0.8 km",
    pay: "UPI",
    rating: 4.7,
  },
];

export const ADMIN_USERS = [
  {
    id: "u1",
    name: "Arun Kumar",
    phone: "+91 93426 64663",
    rides: 47,
    spent: "₹6.2K",
    status: "Active",
    joined: "Jan 2024",
  },
  {
    id: "u2",
    name: "Priya Sundaram",
    phone: "+91 98841 22310",
    rides: 32,
    spent: "₹4.1K",
    status: "Active",
    joined: "Feb 2024",
  },
  {
    id: "u3",
    name: "Karthik R",
    phone: "+91 90034 55218",
    rides: 8,
    spent: "₹980",
    status: "Inactive",
    joined: "Mar 2024",
  },
  {
    id: "u4",
    name: "Divya M",
    phone: "+91 78459 11200",
    rides: 61,
    spent: "₹8.7K",
    status: "Active",
    joined: "Dec 2023",
  },
  {
    id: "u5",
    name: "Vignesh T",
    phone: "+91 99526 87410",
    rides: 2,
    spent: "₹240",
    status: "Suspended",
    joined: "May 2024",
  },
];

export const ADMIN_DRIVERS = [
  {
    id: "d1",
    name: "Ramesh Kumar",
    car: "Swift Dzire",
    plate: "TN 72 AB 1234",
    trips: 423,
    rating: 4.8,
    status: "Online",
    earnings: "₹84K",
  },
  {
    id: "d2",
    name: "Suresh B",
    car: "Toyota Etios",
    plate: "TN 67 CD 9921",
    trips: 318,
    rating: 4.6,
    status: "Offline",
    earnings: "₹61K",
  },
  {
    id: "d3",
    name: "Manoj P",
    car: "Hyundai Aura",
    plate: "TN 59 EF 4410",
    trips: 512,
    rating: 4.9,
    status: "Online",
    earnings: "₹98K",
  },
  {
    id: "d4",
    name: "Anand V",
    car: "Maruti Ertiga",
    plate: "TN 72 GH 7782",
    trips: 144,
    rating: 4.4,
    status: "On Trip",
    earnings: "₹29K",
  },
];

export const ADMIN_VERIFICATIONS = [
  {
    id: "v1",
    name: "Vijay Anand",
    car: "Honda Amaze",
    plate: "TN 72 KL 5521",
    submitted: "2 hrs ago",
    docs: ["License", "RC", "Insurance", "Photo"],
    status: "Pending",
  },
  {
    id: "v2",
    name: "Gopal S",
    car: "Tata Tigor",
    plate: "TN 59 MN 3340",
    submitted: "5 hrs ago",
    docs: ["License", "RC", "Insurance"],
    status: "Pending",
  },
  {
    id: "v3",
    name: "Hari Krishnan",
    car: "Maruti Swift",
    plate: "TN 67 PQ 8810",
    submitted: "1 day ago",
    docs: ["License", "RC", "Insurance", "Photo"],
    status: "Pending",
  },
];

export const ADMIN_RIDES = [
  {
    id: "ZR-9921",
    rider: "Arun Kumar",
    driver: "Ramesh Kumar",
    route: "Virudhunagar → AAA College",
    fare: 198,
    status: "Completed",
    time: "10:30 AM",
  },
  {
    id: "ZR-9918",
    rider: "Priya S",
    driver: "Manoj P",
    route: "New Bus Stand → Sivakasi",
    fare: 156,
    status: "Ongoing",
    time: "10:12 AM",
  },
  {
    id: "ZR-9910",
    rider: "Divya M",
    driver: "Suresh B",
    route: "Rajapalayam → SankaranKovil",
    fare: 320,
    status: "Completed",
    time: "09:40 AM",
  },
  {
    id: "ZR-9902",
    rider: "Vignesh T",
    driver: "Anand V",
    route: "Aruppukottai → Virudhunagar",
    fare: 0,
    status: "Cancelled",
    time: "09:05 AM",
  },
];

export const REVENUE_TREND = [
  { month: "Jan", revenue: 142, rides: 820 },
  { month: "Feb", revenue: 168, rides: 940 },
  { month: "Mar", revenue: 195, rides: 1120 },
  { month: "Apr", revenue: 221, rides: 1290 },
  { month: "May", revenue: 264, rides: 1510 },
  { month: "Jun", revenue: 298, rides: 1680 },
];

export const RIDE_SPLIT = [
  { name: "Sedan", value: 42 },
  { name: "Hatchback", value: 28 },
  { name: "SUV", value: 18 },
  { name: "Auto", value: 12 },
];
