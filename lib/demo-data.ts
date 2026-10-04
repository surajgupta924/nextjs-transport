export const demoTenants = [
  { id: "1", name: "Apex Logistics", slug: "apex-logistics", email: "ops@apexlogistics.in", phone: "+91 98765 43210", plan: "Growth", status: "Active", joined: "12 Jun 2025", revenue: "₹24,500", logo: "A", color: "#2563eb", users: 28, trips: 156 },
  { id: "2", name: "Northstar Cargo", slug: "northstar-cargo", email: "hello@northstar.in", phone: "+91 98765 12345", plan: "Business", status: "Active", joined: "08 Jun 2025", revenue: "₹42,000", logo: "N", color: "#e99a2d", users: 46, trips: 284 },
  { id: "3", name: "Swift Move Express", slug: "swift-move", email: "info@swiftmove.in", phone: "+91 99887 66554", plan: "Starter", status: "Trial", joined: "02 Jun 2025", revenue: "₹8,500", logo: "S", color: "#8e74d3", users: 12, trips: 62 },
  { id: "4", name: "Bluebird Transport", slug: "bluebird-transport", email: "care@bluebird.in", phone: "+91 97654 32109", plan: "Growth", status: "Active", joined: "28 May 2025", revenue: "₹24,500", logo: "B", color: "#4aa58b", users: 19, trips: 108 },
];

export const demoTrips = [
  { id: "TR-2025-0891", customer: "Mehta Traders", origin: "Mumbai, MH", destination: "Pune, MH", driver: "Rajesh Kumar", vehicle: "MH 12 AB 4521", status: "In Transit", date: "Today, 10:30 AM", amount: "₹18,500", initials: "MT", color: "#f4a461" },
  { id: "TR-2025-0890", customer: "Sharma Industries", origin: "Delhi, DL", destination: "Jaipur, RJ", driver: "Amit Singh", vehicle: "DL 8C AA 9012", status: "Delivered", date: "Today, 09:15 AM", amount: "₹12,800", initials: "SI", color: "#648bf1" },
  { id: "TR-2025-0889", customer: "Green Leaf Foods", origin: "Nashik, MH", destination: "Surat, GJ", driver: "Suresh Patil", vehicle: "MH 15 XY 6623", status: "Pending", date: "Today, 08:45 AM", amount: "₹9,250", initials: "GL", color: "#75bd9d" },
  { id: "TR-2025-0888", customer: "Kapoor Textiles", origin: "Surat, GJ", destination: "Mumbai, MH", driver: "Vikram Jadhav", vehicle: "GJ 05 DK 2241", status: "Delivered", date: "Yesterday", amount: "₹21,600", initials: "KT", color: "#ae8ade" },
];

export const demoTeam = [
  { name: "Rajesh Kumar", email: "rajesh@apex.in", role: "Driver", status: "On trip", initials: "RK", color: "#e1a163", detail: "MH 12 AB 4521" },
  { name: "Amit Singh", email: "amit@apex.in", role: "Driver", status: "Available", initials: "AS", color: "#6b95e8", detail: "DL 8C AA 9012" },
  { name: "Mehta Traders", email: "contact@mehtatraders.in", role: "Customer", status: "Active", initials: "MT", color: "#72af94", detail: "12 shipments" },
  { name: "Sharma Industries", email: "accounts@sharma.in", role: "Customer", status: "Active", initials: "SI", color: "#a284d6", detail: "8 shipments" },
];
