// import express from "express";
// import {
//   vendorLogin,
//   registerVendor,
//   getApplicationStatus

// } from "../controllers/vendorController.js";
// import upload from "../utils/upload.js";


// const router = express.Router();

// // Public routes
// router.post("/login", vendorLogin);
// router.post('/register', upload.array('images', 10), registerVendor);
// router.get('/application/:applicationId/status', getApplicationStatus);

// export default router;














import express from "express";
import multer from "multer";
import {
  registerVendor,
  getApplicationStatus,
  vendorLogin,
  getVendorDashboard,
  getVendorFarmhouse,
  updateVendorFarmhouse,
  getVendorBookings,
  toggleFarmhouseActive,
  getInactiveDates,
  toggleSlotActive,
  getVendorEarnings
} from "../controllers/vendorController.js";

const router = express.Router();

// Multer configuration for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes
router.post("/login", vendorLogin);
router.post('/register', upload.array('images', 10), registerVendor);
router.get('/application/:applicationId/status', getApplicationStatus);

// Vendor dashboard routes (authenticated)
router.get('/dashboard/:vendorId', getVendorDashboard);
router.get('/farmhouse/:vendorId', getVendorFarmhouse);
router.put('/farmhouse/:vendorId', updateVendorFarmhouse);
router.get('/bookings/:vendorId', getVendorBookings);
router.get('/earnings/:vendorId', getVendorEarnings);

// Farmhouse availability management
router.put('/farmhouse/:vendorId/toggle-active', toggleFarmhouseActive);
router.get('/farmhouse/:vendorId/inactive-dates', getInactiveDates);

// Slot management
router.put('/farmhouse/:vendorId/slot/:slotId/toggle', toggleSlotActive);

export default router;