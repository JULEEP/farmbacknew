// import { Vendor } from "../models/vendor.js";
// import { Farmhouse } from "../models/farmhouseModel.js";
// import cloudinary from "../config/cloudinary.js";
// import { sendApplicationEmail } from "../services/emailService.js"; // 👈 ADD THIS LINE





// // controllers/vendorController.js
// export const registerVendor = async (req, res) => {
//   try {
//     const {
//       name,
//       address,
//       description,
//       amenities,
//       price,
//       rating,
//       feedbackSummary,
//       bookingFor,
//       lat,
//       lng,
//       timePrices,
//       email  // 👈 New: Collect email
//     } = req.body;

//     // Validation
//     if (!name || !address || !email) {
//       return res.status(400).json({ 
//         message: "Name, Address & Email are required" 
//       });
//     }

//     if (!lat || !lng) {
//       return res.status(400).json({ message: "Lat & Lng required" });
//     }

//     if (!price || isNaN(Number(price))) {
//       return res.status(400).json({
//         success: false,
//         message: "Valid price is required"
//       });
//     }

//     // Check if vendor with same email already has pending/approved application
//     const existingVendor = await Vendor.findOne({ 
//       email, 
//       status: { $in: ['pending', 'approved'] } 
//     });
    
//     if (existingVendor) {
//       return res.status(400).json({
//         success: false,
//         message: `You already have a ${existingVendor.status} application. Please check your email for application ID: ${existingVendor.applicationId}`
//       });
//     }

//     // Handle image uploads (optional during registration)
//     let imageUrls = [];
//     if (req.files && req.files.length > 0) {
//       for (const file of req.files) {
//         const uploaded = await new Promise((resolve, reject) => {
//           cloudinary.uploader.upload_stream(
//             { folder: "farmhouse_applications", resource_type: "auto" },
//             (err, result) => (err ? reject(err) : resolve(result))
//           ).end(file.buffer);
//         });
//         imageUrls.push(uploaded.secure_url);
//       }
//     }

//     // Parse timePrices
//     let parsedTimePrices = [];
//     if (timePrices) {
//       try {
//         parsedTimePrices = typeof timePrices === 'string'
//           ? JSON.parse(timePrices)
//           : timePrices;
        
//         parsedTimePrices.forEach((slot, index) => {
//           if (!slot.label || !slot.timing) {
//             throw new Error(`Time slot ${index + 1}: Missing label or timing`);
//           }
//           slot.price = Number(price);
//         });
//       } catch (error) {
//         return res.status(400).json({
//           success: false,
//           message: `Invalid timePrices format: ${error.message}`
//         });
//       }
//     }

//     // Parse amenities
//     let amenitiesArray = [];
//     if (amenities) {
//       if (typeof amenities === 'string') {
//         amenitiesArray = amenities.split(',').map(item => item.trim()).filter(Boolean);
//       } else if (Array.isArray(amenities)) {
//         amenitiesArray = amenities;
//       }
//     }

//     // Create vendor application
//     const vendorApplication = await Vendor.create({
//       email,
//       submittedData: {
//         name,
//         address,
//         description,
//         amenities: amenitiesArray,
//         price: Number(price),
//         rating: rating ? Number(rating) : 0,
//         feedbackSummary,
//         bookingFor,
//         lat: Number(lat),
//         lng: Number(lng),
//         timePrices: parsedTimePrices,
//         images: imageUrls
//       },
//       status: 'pending'
//     });

//     // 🔥 Send email with Application ID
//     await sendApplicationEmail({
//       to: email,
//       applicationId: vendorApplication.applicationId,
//       farmhouseName: name,
//       status: 'pending'
//     });

//     res.status(201).json({
//       success: true,
//       message: "Application submitted successfully. Please check your email for application ID.",
//       applicationId: vendorApplication.applicationId,
//       status: vendorApplication.status
//     });

//   } catch (err) {
//     console.error('Registration error:', err);
//     res.status(500).json({ error: err.message });
//   }
// };



// // controllers/vendorController.js
// export const getApplicationStatus = async (req, res) => {
//   try {
//     const { applicationId } = req.params;
    
//     const application = await Vendor.findOne({ applicationId });
    
//     if (!application) {
//       return res.status(404).json({
//         success: false,
//         message: "Application not found"
//       });
//     }
    
//     res.json({
//       success: true,
//       applicationId: application.applicationId,
//       status: application.status,
//       farmhouseName: application.submittedData.name,
//       submittedAt: application.createdAt,
//       reviewedAt: application.reviewedAt,
//       adminNotes: application.adminNotes,
//       rejectedReason: application.rejectedReason,
//       // If approved, include credentials
//       credentials: application.status === 'approved' && application.name ? {
//         vendorName: application.name,
//         password: application.password
//       } : null
//     });
    
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // ============================================
// // VENDOR LOGIN
// // ============================================
// export const vendorLogin = async (req, res) => {
//   try {
//     const { name, password } = req.body;

//     if (!name || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Name and password are required"
//       });
//     }

//     // Find vendor by name and password
//     const vendor = await Vendor.findOne({ name, password });

//     if (!vendor) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials"
//       });
//     }

//     // Get farmhouse details
//     const farmhouse = await Farmhouse.findById(vendor.farmhouseId);

//     // Prepare vendor data (excluding password for security)
//     const vendorData = {
//       _id: vendor._id,
//       name: vendor.name,
//       farmhouseId: vendor.farmhouseId,
//       createdAt: vendor.createdAt
//     };

//     res.json({
//       success: true,
//       message: "Login successful",
//       vendor: vendorData,
//       farmhouse: farmhouse || null
//     });
//   } catch (err) {
//     console.error("Vendor login error:", err);
//     res.status(500).json({
//       success: false,
//       error: err.message
//     });
//   }
// };


















import { Vendor } from "../models/vendor.js";
import { Farmhouse } from "../models/farmhouseModel.js";
import { Booking } from "../models/bookingModel.js";
import cloudinary from "../config/cloudinary.js";
import mongoose from "mongoose";

// ============================================
// VENDOR REGISTRATION
// ============================================
export const registerVendor = async (req, res) => {
  try {
    const {
      name,
      address,
      description,
      amenities,
      price,
      rating,
      feedbackSummary,
      bookingFor,
      lat,
      lng,
      timePrices,
      email
    } = req.body;

    // Validation
    if (!name || !address || !email) {
      return res.status(400).json({ 
        message: "Name, Address & Email are required" 
      });
    }

    if (!lat || !lng) {
      return res.status(400).json({ message: "Lat & Lng required" });
    }

    if (!price || isNaN(Number(price))) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required"
      });
    }

    // Check if vendor with same email already has pending/approved application
    const existingVendor = await Vendor.findOne({ 
      email, 
      status: { $in: ['pending', 'approved'] } 
    });
    
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${existingVendor.status} application. Please check your email for application ID: ${existingVendor.applicationId}`
      });
    }

    // Handle image uploads
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: "farmhouse_applications", resource_type: "auto" },
            (err, result) => (err ? reject(err) : resolve(result))
          ).end(file.buffer);
        });
        imageUrls.push(uploaded.secure_url);
      }
    }

    // Parse timePrices
    let parsedTimePrices = [];
    if (timePrices) {
      try {
        parsedTimePrices = typeof timePrices === 'string'
          ? JSON.parse(timePrices)
          : timePrices;
        
        parsedTimePrices.forEach((slot, index) => {
          if (!slot.label || !slot.timing) {
            throw new Error(`Time slot ${index + 1}: Missing label or timing`);
          }
          slot.price = Number(price);
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Invalid timePrices format: ${error.message}`
        });
      }
    }

    // Parse amenities
    let amenitiesArray = [];
    if (amenities) {
      if (typeof amenities === 'string') {
        amenitiesArray = amenities.split(',').map(item => item.trim()).filter(Boolean);
      } else if (Array.isArray(amenities)) {
        amenitiesArray = amenities;
      }
    }

    // Create vendor application
    const vendorApplication = await Vendor.create({
      email,
      submittedData: {
        name,
        address,
        description,
        amenities: amenitiesArray,
        price: Number(price),
        rating: rating ? Number(rating) : 0,
        feedbackSummary,
        bookingFor,
        lat: Number(lat),
        lng: Number(lng),
        timePrices: parsedTimePrices,
        images: imageUrls
      },
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully. Save this Application ID for tracking.",
      applicationId: vendorApplication.applicationId,
      status: vendorApplication.status,
      email: email
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// GET APPLICATION STATUS
// ============================================
export const getApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    const application = await Vendor.findOne({ applicationId });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }
    
    res.json({
      success: true,
      applicationId: application.applicationId,
      status: application.status,
      farmhouseName: application.submittedData.name,
      submittedAt: application.createdAt,
      reviewedAt: application.reviewedAt,
      adminNotes: application.adminNotes,
      rejectedReason: application.rejectedReason,
      credentials: application.status === 'approved' && application.name ? {
        vendorName: application.name,
        password: application.password
      } : null
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// VENDOR LOGIN
// ============================================
export const vendorLogin = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({
        success: false,
        message: "Name and password are required"
      });
    }

    const vendor = await Vendor.findOne({ name, password, status: 'approved' });

    if (!vendor) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or application not approved yet"
      });
    }

    const farmhouse = await Farmhouse.findById(vendor.farmhouseId);

    const vendorData = {
      _id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      farmhouseId: vendor.farmhouseId,
      createdAt: vendor.createdAt
    };

    res.json({
      success: true,
      message: "Login successful",
      vendor: vendorData,
      farmhouse: farmhouse || null
    });
  } catch (err) {
    console.error("Vendor login error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ============================================
// VENDOR DASHBOARD - GET STATISTICS
// ============================================
export const getVendorDashboard = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Find vendor and their farmhouse
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or not approved"
      });
    }

    const farmhouse = await Farmhouse.findById(vendor.farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({
        success: false,
        message: "Farmhouse not found"
      });
    }

    const currentDate = new Date();
    const startOfToday = new Date(currentDate);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(currentDate);
    endOfToday.setHours(23, 59, 59, 999);

    // Get all bookings for this farmhouse
    const allBookings = await Booking.find({ farmhouseId: vendor.farmhouseId });

    // Calculate statistics
    const todayBookings = allBookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDetails?.checkIn);
      return bookingDate >= startOfToday && bookingDate <= endOfToday;
    });

    const upcomingBookings = allBookings.filter(booking => {
      const checkIn = new Date(booking.bookingDetails?.checkIn);
      return booking.status !== 'cancelled' && checkIn > currentDate;
    });

    const completedBookings = allBookings.filter(booking => {
      const checkOut = new Date(booking.bookingDetails?.checkOut);
      return booking.status === 'confirmed' && checkOut < currentDate;
    });

    const totalBookings = allBookings.filter(b => b.status !== 'cancelled').length;
    const totalRevenue = allBookings
      .filter(b => b.status === 'confirmed' && b.paymentStatus === 'completed')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    // Get recent bookings (last 5)
    const recentBookings = await Booking.find({ farmhouseId: vendor.farmhouseId })
      .populate('userId', 'fullName email phoneNumber')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get monthly revenue (last 6 months)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      const monthRevenue = allBookings
        .filter(b => {
          const bookingDate = new Date(b.createdAt);
          return b.status === 'confirmed' && 
                 b.paymentStatus === 'completed' &&
                 bookingDate >= monthStart && 
                 bookingDate <= monthEnd;
        })
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      
      monthlyRevenue.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        revenue: monthRevenue
      });
    }

    // Prepare dashboard data
    const dashboardData = {
      success: true,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        farmhouseId: vendor.farmhouseId
      },
      farmhouse: {
        id: farmhouse._id,
        name: farmhouse.name,
        address: farmhouse.address,
        price: farmhouse.price,
        rating: farmhouse.rating,
        active: farmhouse.active,
        images: farmhouse.images,
        amenities: farmhouse.amenities
      },
      statistics: {
        totalBookings,
        totalRevenue,
        todayBookings: todayBookings.length,
        upcomingBookings: upcomingBookings.length,
        completedBookings: completedBookings.length,
        cancelledBookings: allBookings.filter(b => b.status === 'cancelled').length
      },
      recentBookings: recentBookings.map(booking => ({
        id: booking._id,
        user: booking.userId?.fullName || 'Unknown',
        userEmail: booking.userId?.email,
        date: booking.bookingDetails?.date,
        checkIn: booking.bookingDetails?.checkIn,
        label: booking.bookingDetails?.label,
        totalAmount: booking.totalAmount,
        status: booking.status,
        paymentStatus: booking.paymentStatus
      })),
      monthlyRevenue,
      currentDateTime: new Date().toISOString()
    };

    res.json(dashboardData);

  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ============================================
// GET VENDOR FARMHOUSE DETAILS
// ============================================
export const getVendorFarmhouse = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or not approved"
      });
    }

    const farmhouse = await Farmhouse.findById(vendor.farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({
        success: false,
        message: "Farmhouse not found"
      });
    }

    res.json({
      success: true,
      farmhouse
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// UPDATE VENDOR FARMHOUSE
// ============================================
export const updateVendorFarmhouse = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const updateData = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or not approved"
      });
    }

    const farmhouse = await Farmhouse.findById(vendor.farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({
        success: false,
        message: "Farmhouse not found"
      });
    }

    // Fields vendor can update
    const allowedUpdates = ['name', 'address', 'description', 'amenities', 'price', 'bookingFor', 'timePrices'];
    
    for (const field of allowedUpdates) {
      if (updateData[field] !== undefined) {
        if (field === 'amenities' && typeof updateData[field] === 'string') {
          farmhouse[field] = updateData[field].split(',').map(item => item.trim()).filter(Boolean);
        } else if (field === 'price') {
          farmhouse[field] = Number(updateData[field]);
          // Update price in all time slots
          if (farmhouse.timePrices && farmhouse.timePrices.length > 0) {
            farmhouse.timePrices.forEach(slot => {
              slot.price = Number(updateData[field]);
            });
          }
        } else if (field === 'timePrices' && typeof updateData[field] === 'string') {
          farmhouse[field] = JSON.parse(updateData[field]);
        } else {
          farmhouse[field] = updateData[field];
        }
      }
    }

    await farmhouse.save();

    res.json({
      success: true,
      message: "Farmhouse updated successfully",
      farmhouse
    });
  } catch (err) {
    console.error("Update farmhouse error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// GET VENDOR BOOKINGS (Only their farmhouse)
// ============================================
export const getVendorBookings = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or not approved"
      });
    }

    // Build query
    let query = { farmhouseId: vendor.farmhouseId };
    
    if (status && status !== 'all') {
      if (status === 'upcoming') {
        query['bookingDetails.checkIn'] = { $gt: new Date() };
        query.status = 'confirmed';
      } else if (status === 'completed') {
        query['bookingDetails.checkOut'] = { $lt: new Date() };
        query.status = 'confirmed';
      } else if (status === 'active') {
        query['bookingDetails.checkIn'] = { $lte: new Date() };
        query['bookingDetails.checkOut'] = { $gte: new Date() };
        query.status = 'confirmed';
      } else {
        query.status = status;
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [bookings, totalCount] = await Promise.all([
      Booking.find(query)
        .populate('userId', 'fullName email phoneNumber profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(query)
    ]);

    // Process bookings with additional info
    const processedBookings = bookings.map(booking => {
      const checkIn = new Date(booking.bookingDetails?.checkIn);
      const checkOut = new Date(booking.bookingDetails?.checkOut);
      const currentDate = new Date();

      let bookingStatus = booking.status;
      if (bookingStatus !== 'cancelled') {
        if (checkOut < currentDate) bookingStatus = 'completed';
        else if (checkIn <= currentDate && checkOut >= currentDate) bookingStatus = 'active';
        else if (checkIn > currentDate) bookingStatus = 'upcoming';
      }

      return {
        _id: booking._id,
        user: {
          id: booking.userId?._id,
          name: booking.userId?.fullName,
          email: booking.userId?.email,
          phone: booking.userId?.phoneNumber,
          profileImage: booking.userId?.profileImage
        },
        bookingDetails: booking.bookingDetails,
        slotPrice: booking.slotPrice,
        cleaningFee: booking.cleaningFee,
        serviceFee: booking.serviceFee,
        totalAmount: booking.totalAmount,
        advancePayment: booking.advancePayment,
        remainingAmount: booking.remainingAmount,
        paymentStatus: booking.paymentStatus,
        status: bookingStatus,
        originalStatus: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt
      };
    });

    res.json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      },
      bookings: processedBookings
    });
  } catch (err) {
    console.error("Get vendor bookings error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// TOGGLE FARMHOUSE ACTIVE STATUS (With date check)
// ============================================
export const toggleFarmhouseActive = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { active, date, reason } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or not approved"
      });
    }

    const farmhouse = await Farmhouse.findById(vendor.farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({
        success: false,
        message: "Farmhouse not found"
      });
    }

    // If date is provided, toggle specific date
    if (date) {
      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD"
        });
      }
      targetDate.setHours(0, 0, 0, 0);

      // Check if there are any bookings on this date
      const bookingsOnDate = await Booking.find({
        farmhouseId: vendor.farmhouseId,
        status: { $ne: 'cancelled' },
        'bookingDetails.date': {
          $gte: targetDate,
          $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      if (active === false || active === 'false') {
        // Trying to deactivate on a date with bookings
        if (bookingsOnDate.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot deactivate farmhouse on ${date} because there are ${bookingsOnDate.length} active booking(s) on this date.`,
            bookings: bookingsOnDate.map(b => ({
              id: b._id,
              user: b.userId,
              checkIn: b.bookingDetails?.checkIn
            }))
          });
        }

        // Add to inactiveDates
        const dateExists = farmhouse.inactiveDates.some(inactive => {
          const existingDate = new Date(inactive.date);
          existingDate.setHours(0, 0, 0, 0);
          return existingDate.getTime() === targetDate.getTime();
        });

        if (!dateExists) {
          farmhouse.inactiveDates.push({
            date: targetDate,
            reason: reason || "Farmhouse not available on this date"
          });
        }

        await farmhouse.save();

        return res.json({
          success: true,
          message: `Farmhouse deactivated for ${date}`,
          inactiveDates: farmhouse.inactiveDates
        });
      } else {
        // Reactivate on this date - remove from inactiveDates
        farmhouse.inactiveDates = farmhouse.inactiveDates.filter(inactive => {
          const existingDate = new Date(inactive.date);
          existingDate.setHours(0, 0, 0, 0);
          return existingDate.getTime() !== targetDate.getTime();
        });

        await farmhouse.save();

        return res.json({
          success: true,
          message: `Farmhouse activated for ${date}`,
          inactiveDates: farmhouse.inactiveDates
        });
      }
    }

    // No date provided - toggle overall farmhouse active status
    // Check if there are any future bookings before deactivating
    if (active === false || active === 'false') {
      const futureBookings = await Booking.find({
        farmhouseId: vendor.farmhouseId,
        status: { $ne: 'cancelled' },
        'bookingDetails.checkIn': { $gt: new Date() }
      });

      if (futureBookings.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate farmhouse because there are ${futureBookings.length} future booking(s). Please cancel or complete them first.`,
          futureBookings: futureBookings.map(b => ({
            id: b._id,
            checkIn: b.bookingDetails?.checkIn,
            user: b.userId
          }))
        });
      }
    }

    farmhouse.active = active === true || active === 'true';
    await farmhouse.save();

    res.json({
      success: true,
      message: `Farmhouse ${farmhouse.active ? 'activated' : 'deactivated'} successfully`,
      active: farmhouse.active,
      inactiveDates: farmhouse.inactiveDates
    });
  } catch (err) {
    console.error("Toggle farmhouse active error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// GET FARMHOUSE INACTIVE DATES
// ============================================
export const getInactiveDates = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { startDate, endDate } = req.query;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or not approved"
      });
    }

    const farmhouse = await Farmhouse.findById(vendor.farmhouseId)
      .select('inactiveDates')
      .lean();

    if (!farmhouse) {
      return res.status(404).json({
        success: false,
        message: "Farmhouse not found"
      });
    }

    let inactiveDates = farmhouse.inactiveDates || [];

    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      inactiveDates = inactiveDates.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= start && itemDate <= end;
      });
    }

    // Sort by date
    inactiveDates.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      count: inactiveDates.length,
      inactiveDates: inactiveDates.map(date => ({
        id: date._id,
        date: date.date,
        reason: date.reason,
        createdAt: date.createdAt
      }))
    });
  } catch (err) {
    console.error("Get inactive dates error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// TOGGLE SLOT ACTIVE FOR SPECIFIC DATE
// ============================================
export const toggleSlotActive = async (req, res) => {
  try {
    const { vendorId, slotId } = req.params;
    const { date, isActive, reason } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required"
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or not approved"
      });
    }

    const farmhouse = await Farmhouse.findById(vendor.farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({
        success: false,
        message: "Farmhouse not found"
      });
    }

    const slot = farmhouse.timePrices.id(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found"
      });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD"
      });
    }
    targetDate.setHours(0, 0, 0, 0);

    // Check if there are any bookings for this slot on this date
    const bookingsOnDate = await Booking.find({
      farmhouseId: vendor.farmhouseId,
      status: { $ne: 'cancelled' },
      'bookingDetails.date': {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
      },
      'bookingDetails.label': slot.label,
      'bookingDetails.timing': slot.timing
    });

    if (isActive === false || isActive === 'false') {
      // Trying to deactivate slot on a date with bookings
      if (bookingsOnDate.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate ${slot.label} slot on ${date} because there are ${bookingsOnDate.length} active booking(s) for this slot.`,
          bookings: bookingsOnDate.map(b => ({
            id: b._id,
            user: b.userId,
            checkIn: b.bookingDetails?.checkIn
          }))
        });
      }

      // Ensure slot.inactiveDates exists
      if (!slot.inactiveDates) {
        slot.inactiveDates = [];
      }

      // Check if date already exists
      const dateExists = slot.inactiveDates.some(inactive => {
        const existingDate = new Date(inactive.date);
        existingDate.setHours(0, 0, 0, 0);
        return existingDate.getTime() === targetDate.getTime();
      });

      if (!dateExists) {
        slot.inactiveDates.push({
          date: targetDate,
          reason: reason || "Slot not available on this date"
        });
      }
    } else {
      // Reactivate - remove from inactiveDates
      slot.inactiveDates = slot.inactiveDates.filter(inactive => {
        const existingDate = new Date(inactive.date);
        existingDate.setHours(0, 0, 0, 0);
        return existingDate.getTime() !== targetDate.getTime();
      });
    }

    await farmhouse.save();

    res.json({
      success: true,
      message: isActive ? 
        `${slot.label} slot activated for ${date}` : 
        `${slot.label} slot deactivated for ${date}`,
      slot: {
        id: slot._id,
        label: slot.label,
        timing: slot.timing,
        inactiveDates: slot.inactiveDates
      }
    });
  } catch (err) {
    console.error("Toggle slot active error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// GET VENDOR EARNINGS/REVENUE
// ============================================
export const getVendorEarnings = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { period = 'month' } = req.query; // day, week, month, year, all

    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or not approved"
      });
    }

    const currentDate = new Date();
    let startDate = new Date();

    switch(period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(currentDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setMonth(currentDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate.setFullYear(currentDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate.setMonth(currentDate.getMonth() - 1);
    }

    const bookings = await Booking.find({
      farmhouseId: vendor.farmhouseId,
      status: 'confirmed',
      paymentStatus: 'completed',
      createdAt: { $gte: startDate }
    });

    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalBookings = bookings.length;
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Group by month for chart
    const monthlyData = {};
    bookings.forEach(booking => {
      const date = new Date(booking.createdAt);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, count: 0 };
      }
      monthlyData[monthKey].revenue += booking.totalAmount || 0;
      monthlyData[monthKey].count++;
    });

    const monthlyBreakdown = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      bookings: data.count
    })).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      period,
      dateRange: {
        start: startDate,
        end: currentDate
      },
      summary: {
        totalRevenue,
        totalBookings,
        averageBookingValue: Math.round(averageBookingValue * 100) / 100
      },
      monthlyBreakdown,
      recentTransactions: bookings.slice(-10).map(b => ({
        id: b._id,
        amount: b.totalAmount,
        date: b.createdAt,
        user: b.userId
      }))
    });
  } catch (err) {
    console.error("Get vendor earnings error:", err);
    res.status(500).json({ error: err.message });
  }
};