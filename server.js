import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import dns from "dns"; // ✅ ADD THIS
import authRoutes from "./routes/authRoutes.js";
import farmhouse from "./routes/farmhouseRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import feeConfigRoutes from "./routes/feeConfigRoutes.js";
import vendor from "./routes/vendor.js";
import dotenv from "dotenv";

dotenv.config(); // MUST be first

// ==================== DNS FIX ====================
// Force IPv4 first
dns.setDefaultResultOrder('ipv4first');

// Set custom DNS servers
dns.setServers([
  '8.8.8.8',       // Google
  '8.8.4.4',       // Google secondary
  '1.1.1.1',       // Cloudflare
  '208.67.222.222' // OpenDNS
]);

console.log('🌐 DNS Configuration:');
console.log('   - Default order: ipv4first');
console.log('   - DNS Servers:', dns.getServers());
// =================================================

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Debug
console.log("JWT_SECRET loaded:", process.env.JWT_SECRET ? "✅ Yes" : "❌ No");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", farmhouse);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/fees", feeConfigRoutes);
app.use("/api/vendor", vendor);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => console.error("Mongo Error:", err.message));

// Default route
app.get("/", (req, res) => {
  res.send("Server Running Successfully 🚀");
});

// Server
const PORT = process.env.PORT || 5124;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});