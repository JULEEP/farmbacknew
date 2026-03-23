import { Farmhouse } from "../models/farmhouseModel.js";
import cloudinary from "../config/cloudinary.js";
import { User } from "../models/User.js";
import { calculateCheckTimes } from "../utils/timeHelper.js";
import { Vendor } from "../models/vendor.js"; // Add this import

function calculatePrice(basePrice, startStr, endStr, farmhouse) {
  const duration = calculateDuration(startStr, endStr);

  // Use pricePerHour if available
  if (farmhouse.pricePerHour > 0) {
    return Math.round(farmhouse.pricePerHour * duration);
  }

  // Rest of the logic...
  return basePrice;
}

export const createFarmhouse = async (req, res) => {
  try {
    const {
      name,
      address,
      description,
      amenities,
      price, // 🔥 Single price field
      rating,
      feedbackSummary,
      bookingFor,
      lat,
      lng,
      timePrices,
      active = true
    } = req.body;

    if (!name || !address) {
      return res.status(400).json({ message: "Name & Address required" });
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

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: "farmhouses", resource_type: "auto" },
            (err, result) => (err ? reject(err) : resolve(result))
          ).end(file.buffer);
        });
        imageUrls.push(uploaded.secure_url);
      }
    }

    // 🔥 Parse timePrices (NO calculation)
    let parsedTimePrices = [];
    if (timePrices && (typeof timePrices === 'string' ? timePrices.trim() : true)) {
      try {
        parsedTimePrices = typeof timePrices === 'string'
          ? JSON.parse(timePrices)
          : timePrices;

        parsedTimePrices.forEach((slot, index) => {
          if (!slot.label || !slot.timing) {
            throw new Error(`Time slot ${index + 1}: Missing label or timing`);
          }

          // Just store same price in every slot
          slot.price = Number(price);
        });

      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Invalid timePrices format: ${error.message}`,
          expectedFormat: '[{"label": "Morning", "timing": "9am-8pm"}]'
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

    const farmhouse = await Farmhouse.create({
      name,
      images: imageUrls,
      address,
      description,
      amenities: amenitiesArray,
      price: Number(price), // 🔥 Single price field
      rating: rating ? Number(rating) : 0,
      feedbackSummary,
      bookingFor,
      timePrices: parsedTimePrices,
      active: active === true || active === 'true',
      location: {
        type: "Point",
        coordinates: [Number(lng), Number(lat)]
      }
    });

    // 🔥 Vendor Creation (UNCHANGED)
    let vendorCredentials = null;

    try {
      const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const firstThreeLetters = cleanName.substring(0, 3);
      const vendorNameBase = firstThreeLetters || cleanName.substring(0, 9);

      const farmhouseIdStr = farmhouse._id.toString();
      const idPrefix = farmhouseIdStr.substring(0, 6);

      const vendorName = `${vendorNameBase}${idPrefix}`;
      const password = vendorName;

      const vendor = new Vendor({
        name: vendorName,
        password: password,
        farmhouseId: farmhouse._id,
        farmhouseName: name
      });

      await vendor.save();

      vendorCredentials = {
        name: vendorName,
        password: password,
        vendorId: vendor._id,
        farmhouseId: farmhouse._id
      };

    } catch (credentialError) {
      vendorCredentials = {
        error: "Vendor creation failed",
        details: credentialError.message
      };
    }

    res.status(201).json({
      success: true,
      message: "Farmhouse created successfully",
      farmhouse,
      vendorCredentials
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Helper function to calculate duration in hours
function calculateDuration(startTime, endTime) {
  const startMinutes = convertToMinutes(startTime);
  const endMinutes = convertToMinutes(endTime);

  if (endMinutes < startMinutes) {
    // Handle overnight slots (e.g., 8pm-6am)
    return (endMinutes + (24 * 60) - startMinutes) / 60;
  }

  return (endMinutes - startMinutes) / 60;
}

// Helper function to convert time string to minutes
function convertToMinutes(timeStr) {
  timeStr = timeStr.toLowerCase().trim();

  let hours, minutes = 0;

  // Check if time has minutes (e.g., "9:30am")
  if (timeStr.includes(':')) {
    const [timePart, ampm] = timeStr.split(/(?=[ap]m)/);
    const [h, m] = timePart.split(':');
    hours = parseInt(h);
    minutes = parseInt(m);

    if (ampm === 'pm' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'am' && hours === 12) {
      hours = 0;
    }
  } else {
    // No minutes (e.g., "9am")
    const match = timeStr.match(/(\d+)([ap]m)/);
    if (match) {
      hours = parseInt(match[1]);
      const ampm = match[2];

      if (ampm === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }
    } else {
      hours = parseInt(timeStr);
    }
  }

  return hours * 60 + minutes;
}


// ============================================
// GET ALL FARMHOUSES (Filter by active status)
// ============================================
export const getAllInactiveFarmhouses = async (req, res) => {
  try {
    const { showInactive = 'false' } = req.query;

    let query = {};
    if (showInactive !== 'true') {
      query.active = true;
    }

    const farmhouses = await Farmhouse.find(query).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: farmhouses.length,
      farmhouses
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// TOGGLE ACTIVE STATUS
// ============================================
export const toggleActiveStatus = async (req, res) => {
  try {
    const { farmhouseId } = req.params;
    const { active, reason } = req.body;

    const farmhouse = await Farmhouse.findById(farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({ message: "Farmhouse not found" });
    }

    // Update active status
    farmhouse.active = active === true || active === 'true';
    await farmhouse.save();

    res.json({
      success: true,
      message: `Farmhouse ${farmhouse.active ? 'activated' : 'deactivated'} successfully`,
      farmhouse
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// ADD INACTIVE DATE
// ============================================
export const addInactiveDate = async (req, res) => {
  try {
    const { farmhouseId } = req.params;
    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const farmhouse = await Farmhouse.findById(farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({ message: "Farmhouse not found" });
    }

    // Parse and validate date
    const inactiveDate = new Date(date);
    if (isNaN(inactiveDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Set time to start of day for comparison
    inactiveDate.setHours(0, 0, 0, 0);

    // Check if date already exists
    const dateExists = farmhouse.inactiveDates.some(inactiveDateItem => {
      const existingDate = new Date(inactiveDateItem.date);
      existingDate.setHours(0, 0, 0, 0);
      return existingDate.getTime() === inactiveDate.getTime();
    });

    if (dateExists) {
      return res.status(400).json({ message: "Date already marked as inactive" });
    }

    // Add inactive date
    farmhouse.inactiveDates.push({
      date: inactiveDate,
      reason: reason || "Farmhouse not available on this date"
    });

    await farmhouse.save();

    res.json({
      success: true,
      message: "Inactive date added successfully",
      inactiveDates: farmhouse.inactiveDates
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// REMOVE INACTIVE DATE
// ============================================
export const removeInactiveDate = async (req, res) => {
  try {
    const { farmhouseId, dateId } = req.params;

    const farmhouse = await Farmhouse.findById(farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({ message: "Farmhouse not found" });
    }

    // Remove inactive date by ID
    farmhouse.inactiveDates = farmhouse.inactiveDates.filter(
      date => date._id.toString() !== dateId
    );

    await farmhouse.save();

    res.json({
      success: true,
      message: "Inactive date removed successfully",
      inactiveDates: farmhouse.inactiveDates
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// GET INACTIVE DATES
// ============================================
export const getInactiveDates = async (req, res) => {
  try {
    const { farmhouseId } = req.params;
    const { startDate, endDate } = req.query;

    const farmhouse = await Farmhouse.findById(farmhouseId)
      .select('inactiveDates')
      .lean();

    if (!farmhouse) {
      return res.status(404).json({ message: "Farmhouse not found" });
    }

    let inactiveDates = farmhouse.inactiveDates;

    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

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
      inactiveDates
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ============================================
// GET ALL FARMHOUSES
// ============================================
// ============================================
// GET ALL FARMHOUSES
// ============================================
export const getAllFarmhouses = async (req, res) => {
  try {
    const farmhouses = await Farmhouse.find().sort({ createdAt: -1 });

    // Get vendor credentials for each farmhouse
    const farmhousesWithVendors = await Promise.all(
      farmhouses.map(async (farmhouse) => {
        // Find vendor for this farmhouse
        const vendor = await Vendor.findOne({ farmhouseId: farmhouse._id });

        // Convert farmhouse to plain object and add vendor info
        const farmhouseObj = farmhouse.toObject();

        return {
          ...farmhouseObj,
          vendorCredentials: vendor ? {
            name: vendor.name,
            password: vendor.password,
            vendorId: vendor._id,
            createdAt: vendor.createdAt
          } : null
        };
      })
    );

    res.json({
      success: true,
      count: farmhousesWithVendors.length,
      farmhouses: farmhousesWithVendors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ============================================
// GET SINGLE FARMHOUSE BY ID
// ============================================
export const getFarmhouseById = async (req, res) => {
  try {
    const farmhouse = await Farmhouse.findById(req.params.farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({ message: "Farmhouse not found" });
    }

    // Find vendor for this farmhouse
    const vendor = await Vendor.findOne({ farmhouseId: farmhouse._id });

    // Convert farmhouse to plain object and add vendor info
    const farmhouseObj = farmhouse.toObject();
    const farmhouseWithVendor = {
      ...farmhouseObj,
      vendorCredentials: vendor ? {
        name: vendor.name,
        password: vendor.password,
        vendorId: vendor._id,
        createdAt: vendor.createdAt
      } : null
    };

    res.json({
      success: true,
      farmhouse: farmhouseWithVendor
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ============================================
// UPDATE FARMHOUSE
// ============================================
export const updateFarmhouse = async (req, res) => {
  try {
    const { farmhouseId } = req.params;
    const farmhouse = await Farmhouse.findById(farmhouseId);

    if (!farmhouse) {
      return res.status(404).json({ success: false, message: "Farmhouse not found" });
    }

    const {
      name,
      address,
      description,
      amenities,
      price, // 🔥 Single price field
      rating,
      feedbackSummary,
      bookingFor,
      timePrices,
      active,
      lat,
      lng
    } = req.body;

    const updateData = {};

    // Basic fields
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (rating !== undefined) updateData.rating = Number(rating);
    if (feedbackSummary !== undefined) updateData.feedbackSummary = feedbackSummary;
    if (bookingFor !== undefined) updateData.bookingFor = bookingFor;
    if (active !== undefined) updateData.active = active === true || active === 'true';

    // Amenities
    if (amenities !== undefined) {
      if (typeof amenities === 'string' && amenities.trim()) {
        updateData.amenities = amenities.split(',').map(item => item.trim()).filter(Boolean);
      } else if (Array.isArray(amenities)) {
        updateData.amenities = amenities;
      }
    }

    // Location
    if (lat !== undefined && lng !== undefined) {
      updateData.location = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)]
      };
    }

    // Images
    if (req.files && req.files.length > 0) {
      if (farmhouse.images && farmhouse.images.length > 0) {
        for (const img of farmhouse.images) {
          try {
            const publicId = img.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`farmhouses/${publicId}`);
          } catch (err) {
            console.warn("Failed to delete old image:", err.message);
          }
        }
      }

      const newImages = [];
      for (const file of req.files) {
        const uploaded = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: "farmhouses", resource_type: "auto" },
            (err, result) => (err ? reject(err) : resolve(result))
          ).end(file.buffer);
        });
        newImages.push(uploaded.secure_url);
      }
      updateData.images = newImages;
    }

    // 🔥 Handle price
    if (price !== undefined) {
      updateData.price = Number(price); // ✅ update top-level price

      // Update all existing timePrices slots
      if (farmhouse.timePrices && farmhouse.timePrices.length > 0) {
        const updatedSlots = farmhouse.timePrices.map(slot => ({
          ...slot.toObject(),
          price: Number(price)
        }));
        updateData.timePrices = updatedSlots;
      }
    }

    // Handle explicit timePrices array (overwrite slots)
    if (timePrices !== undefined) {
      try {
        const parsedTimePrices = typeof timePrices === 'string' ? JSON.parse(timePrices) : timePrices;

        const validatedTimePrices = parsedTimePrices.map((slot, index) => {
          if (!slot.label || !slot.timing) {
            throw new Error(`Time slot ${index + 1}: Missing label or timing`);
          }

          // Use top-level price if available
          const slotPrice = price !== undefined ? Number(price) : Number(slot.price);

          return {
            label: slot.label.trim(),
            timing: slot.timing.trim(),
            price: slotPrice,
            isActive: slot.isActive !== undefined ? slot.isActive : true,
            inactiveDates: Array.isArray(slot.inactiveDates) ? slot.inactiveDates : []
          };
        });

        updateData.timePrices = validatedTimePrices;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: `Invalid timePrices: ${err.message}`,
          expectedFormat: '[{"label": "Morning", "timing": "9am-8pm"}]'
        });
      }
    }

    // Update farmhouse
    const updatedFarmhouse = await Farmhouse.findByIdAndUpdate(
      farmhouseId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Farmhouse updated successfully",
      farmhouse: updatedFarmhouse
    });

  } catch (err) {
    console.error("Update farmhouse error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
// Helper function to validate time range format
function isValidTimeRange(timeStr) {
  const timeRangeRegex = /^(\d{1,2}(:\d{2})?[ap]m)\s*-\s*(\d{1,2}(:\d{2})?[ap]m)$/i;
  return timeRangeRegex.test(timeStr.trim());
}
// ============================================
// DELETE FARMHOUSE
// ============================================
export const deleteFarmhouse = async (req, res) => {
  try {
    const farmhouse = await Farmhouse.findById(req.params.farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({ message: "Farmhouse not found" });
    }

    // Delete images from cloudinary
    for (const img of farmhouse.images) {
      const publicId = img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`farmhouses/${publicId}`);
    }

    await Farmhouse.findByIdAndDelete(req.params.farmhouseId);

    res.json({
      success: true,
      message: "Farmhouse deleted successfully"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// TOGGLE WISHLIST
// ============================================
export const toggleWishlist = async (req, res) => {
  try {
    const { farmhouseId, userId } = req.params;

    const farmhouse = await Farmhouse.findById(farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({ message: "Farmhouse not found" });
    }

    const exists = farmhouse.wishlist.includes(userId);

    if (exists) {
      farmhouse.wishlist.pull(userId);
      await farmhouse.save();
      return res.json({
        success: true,
        message: "Removed from wishlist"
      });
    } else {
      farmhouse.wishlist.push(userId);
      await farmhouse.save();
      return res.json({
        success: true,
        message: "Added to wishlist"
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Get all farmhouses that a user has wishlisted
export const getUserWishlists = async (req, res) => {
  try {
    const { userId } = req.params;

    const wishlistedFarmhouses = await Farmhouse.find({
      wishlist: userId
    });

    res.json({
      success: true,
      count: wishlistedFarmhouses.length,
      data: wishlistedFarmhouses
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// // ============================================
// // GET NEARBY FARMHOUSES (Updated with date filtering)
// // ============================================
export const getNearbyFarmhouses = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const [lng, lat] = user.liveLocation?.coordinates || [];
    if (!lat || !lng) {
      return res.status(400).json({
        message: "User location missing. Please update live location first."
      });
    }

    const maxDistance = 100000;

    let farmhouses = await Farmhouse.find({
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: maxDistance
        }
      },
      active: true
    }).lean();

    // -------------------------------
    // DATE FILTER (inactive dates)
    // -------------------------------
    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);

      farmhouses = farmhouses.filter(fh => {
        return !(fh.inactiveDates || []).some(inactiveDate => {
          const inactiveDateObj = new Date(inactiveDate.date);
          inactiveDateObj.setHours(0, 0, 0, 0);

          return inactiveDateObj.getTime() === searchDate.getTime();
        });
      });
    }

    // -------------------------------
    // SLOT LEVEL FILTER (IMPORTANT FIX)
    // -------------------------------
    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);

      farmhouses = farmhouses.map(fh => {
        const bookedSlots = fh.bookedSlots || [];
        const timePrices = fh.timePrices || [];

        const availableTimePrices = timePrices.filter(slot => {
          const isBooked = bookedSlots.some(booked => {
            const bookedDate = new Date(booked.date);
            bookedDate.setHours(0, 0, 0, 0);

            return (
              bookedDate.getTime() === searchDate.getTime() &&
              booked.label === slot.label
            );
          });

          return !isBooked; // remove booked slot only
        });

        return {
          ...fh,
          timePrices: availableTimePrices
        };
      });
    }

    // -------------------------------
    // Availability enrichment
    // -------------------------------
    if (date) {
      farmhouses = await Promise.all(
        farmhouses.map(async (farmhouse) => {
          const availableSlots = await calculateAvailableSlots(farmhouse, date);

          return {
            ...farmhouse,
            availableSlots: availableSlots.length,
            isAvailableToday: availableSlots.length > 0
          };
        })
      );
    }

    res.json({
      success: true,
      userLocation: { lat, lng },
      date: date || "Not specified",
      count: farmhouses.length,
      farmhouses
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// GET NEARBY FARMHOUSES (without location - shows all)
// ============================================
// export const getNearbyFarmhouses = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     let farmhouses;
//     let lat = null;
//     let lng = null;

//     //  If guest → show all
//     if (user.isGuest) {
//       farmhouses = await Farmhouse.find();
//     } else {
//       //  Normal user → nearby logic
//       [lng, lat] = user.liveLocation?.coordinates || [];

//       if (!lat || !lng) {
//         return res.status(400).json({
//           message: "User location missing. Please update live location first.",
//         });
//       }

//       farmhouses = await Farmhouse.find({
//         location: {
//           $near: {
//             $geometry: { type: "Point", coordinates: [lng, lat] },
//             $maxDistance: 5000,
//           },
//         },
//       });
//     }

//     //  Response SAME
//     res.json({
//       success: true,
//       userLocation: lat && lng ? { lat, lng } : null,
//       count: farmhouses.length,
//       farmhouses,
//     });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };




// ============================================
// GET AVAILABLE SLOTS (DEBUG VERSION)
// ============================================
// export const getAvailableSlots = async (req, res) => {
//   try {
//     const { farmhouseId } = req.params;
//     const { date } = req.query;

//     console.log("📅 Getting available slots for:", { farmhouseId, date });

//     if (!date) {
//       return res.status(400).json({ 
//         success: false,
//         message: "date is required" 
//       });
//     }

//     const farmhouse = await Farmhouse.findById(farmhouseId);
//     if (!farmhouse) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Farmhouse not found" 
//       });
//     }

//     console.log("🏠 Farmhouse found:", farmhouse.name);
//     console.log("📊 Time prices:", farmhouse.timePrices);
//     console.log("📅 Booked slots:", farmhouse.bookedSlots);
//     console.log("📆 Requested date:", date);

//     const slots = [];

//     // If no timePrices defined, return empty slots
//     if (!farmhouse.timePrices || farmhouse.timePrices.length === 0) {
//       return res.json({
//         success: true,
//         date,
//         message: "No slots defined for this farmhouse",
//         slots: []
//       });
//     }

//     for (const tp of farmhouse.timePrices) {
//       if (!tp.timing) {
//         console.log("⚠️ Skipping slot with no timing:", tp);
//         continue;
//       }

//       // Normalize timing
//       const timing = String(tp.timing)
//         .trim()
//         .replace(/\s+/g, "")
//         .replace("–", "-")
//         .toLowerCase();

//       console.log(`Processing slot: ${tp.label} - ${timing}`);

//       try {
//         const { checkIn, checkOut } = calculateCheckTimes(date, timing);

//         console.log(`Calculated times: ${checkIn} to ${checkOut}`);

//         // Check if slot is booked
//         const blocked = farmhouse.bookedSlots.some(
//           (slot) => {
//             const isOverlap = checkIn < slot.checkOut && checkOut > slot.checkIn;
//             console.log(`Checking overlap with booked slot ${slot.label}: ${isOverlap}`);
//             return isOverlap;
//           }
//         );

//         slots.push({
//           label: tp.label,
//           timing: timing,
//           price: tp.price || 0,
//           available: !blocked,
//           checkIn,
//           checkOut
//         });

//         console.log(`Slot ${tp.label}: ${blocked ? 'Booked' : 'Available'}`);

//       } catch (err) {
//         console.error("❌ Error calculating times for slot:", tp.timing, err.message);
//         // Skip invalid slot
//       }
//     }

//     console.log("✅ Final slots:", slots);

//     return res.json({
//       success: true,
//       date,
//       slots
//     });
//   } catch (err) {
//     console.error("❌ Error in getAvailableSlots:", err);
//     return res.status(500).json({ 
//       success: false,
//       error: err.message 
//     });
//   }
// };

// ============================================
// TOGGLE SLOT ACTIVE STATUS FOR SPECIFIC DATE
// ============================================
export const toggleSlotActive = async (req, res) => {
  try {
    const { farmhouseId, slotId } = req.params;
    const { date } = req.query; // Date from query parameter
    const { isActive, reason } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date query parameter is required"
      });
    }

    const farmhouse = await Farmhouse.findById(farmhouseId);
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

    // Parse and validate date
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD"
      });
    }

    // Set time to start of day for comparison
    targetDate.setHours(0, 0, 0, 0);

    // Ensure slot.inactiveDates exists
    if (!slot.inactiveDates) {
      slot.inactiveDates = [];
    }

    const dateIndex = slot.inactiveDates.findIndex(inactiveDate => {
      const existingDate = new Date(inactiveDate.date);
      existingDate.setHours(0, 0, 0, 0);
      return existingDate.getTime() === targetDate.getTime();
    });

    if (isActive === false || isActive === 'false') {
      // Deactivate slot for this date
      if (dateIndex === -1) {
        slot.inactiveDates.push({
          date: targetDate,
          reason: reason || "Slot not available on this date"
        });
      } else {
        // Update existing inactive date
        slot.inactiveDates[dateIndex].reason = reason || slot.inactiveDates[dateIndex].reason;
      }
    } else {
      // Activate slot for this date (remove from inactiveDates)
      if (dateIndex !== -1) {
        slot.inactiveDates.splice(dateIndex, 1);
      }
    }

    await farmhouse.save();

    res.json({
      success: true,
      message: isActive ?
        `Slot activated for ${date}` :
        `Slot deactivated for ${date}`,
      date: date,
      slot: {
        _id: slot._id,
        label: slot.label,
        timing: slot.timing,
        inactiveDates: slot.inactiveDates
      }
    });
  } catch (err) {
    console.error("Error in toggleSlotActive:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ============================================
// ADD INACTIVE DATE TO SLOT
// ============================================
export const addInactiveDateToSlot = async (req, res) => {
  try {
    const { farmhouseId, slotId } = req.params;
    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const farmhouse = await Farmhouse.findById(farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({ message: "Farmhouse not found" });
    }

    const slot = farmhouse.timePrices.id(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    const inactiveDate = new Date(date);
    if (isNaN(inactiveDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    inactiveDate.setHours(0, 0, 0, 0);

    // Check if date already exists
    const dateExists = slot.inactiveDates.some(item => {
      const existingDate = new Date(item.date);
      existingDate.setHours(0, 0, 0, 0);
      return existingDate.getTime() === inactiveDate.getTime();
    });

    if (dateExists) {
      return res.status(400).json({ message: "Date already marked as inactive" });
    }

    slot.inactiveDates.push({
      date: inactiveDate,
      reason: reason || "Slot not available"
    });

    await farmhouse.save();

    res.json({
      success: true,
      message: "Inactive date added to slot",
      slot: {
        _id: slot._id,
        label: slot.label,
        timing: slot.timing,
        inactiveDates: slot.inactiveDates
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// REMOVE INACTIVE DATE FROM SLOT
// ============================================
export const removeInactiveDateFromSlot = async (req, res) => {
  try {
    const { farmhouseId, slotId, inactiveDateId } = req.params;

    const farmhouse = await Farmhouse.findById(farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({ message: "Farmhouse not found" });
    }

    const slot = farmhouse.timePrices.id(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    const initialLength = slot.inactiveDates.length;
    slot.inactiveDates = slot.inactiveDates.filter(
      date => date._id.toString() !== inactiveDateId
    );

    if (slot.inactiveDates.length === initialLength) {
      return res.status(404).json({ message: "Inactive date not found" });
    }

    await farmhouse.save();

    res.json({
      success: true,
      message: "Inactive date removed from slot",
      slot: {
        _id: slot._id,
        label: slot.label,
        inactiveDates: slot.inactiveDates
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// GET SLOT INACTIVE DATES
// ============================================
export const getSlotInactiveDates = async (req, res) => {
  try {
    const { farmhouseId, slotId } = req.params;

    const farmhouse = await Farmhouse.findById(farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({ message: "Farmhouse not found" });
    }

    const slot = farmhouse.timePrices.id(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    res.json({
      success: true,
      slot: {
        _id: slot._id,
        label: slot.label,
        timing: slot.timing,
        isActive: slot.isActive
      },
      inactiveDates: slot.inactiveDates
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ============================================
// BULK ADD INACTIVE DATES TO SLOT
// ============================================
export const bulkAddInactiveDatesToSlot = async (req, res) => {
  try {
    const { farmhouseId, slotId } = req.params;
    const { dates, reason } = req.body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ message: "Dates array is required" });
    }

    const farmhouse = await Farmhouse.findById(farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({ message: "Farmhouse not found" });
    }

    const slot = farmhouse.timePrices.id(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    const addedDates = [];
    const skippedDates = [];

    for (const dateStr of dates) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        skippedDates.push({ date: dateStr, reason: "Invalid format" });
        continue;
      }

      date.setHours(0, 0, 0, 0);

      // Check if date already exists
      const dateExists = slot.inactiveDates.some(item => {
        const existingDate = new Date(item.date);
        existingDate.setHours(0, 0, 0, 0);
        return existingDate.getTime() === date.getTime();
      });

      if (dateExists) {
        skippedDates.push({ date: dateStr, reason: "Already exists" });
        continue;
      }

      slot.inactiveDates.push({
        date,
        reason: reason || "Slot not available"
      });
      addedDates.push(dateStr);
    }

    await farmhouse.save();

    res.json({
      success: true,
      message: "Bulk dates added to slot",
      added: addedDates.length,
      skipped: skippedDates.length,
      addedDates,
      skippedDates
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ============================================
// GET AVAILABLE SLOTS - WORKING VERSION
// ============================================
export const getAvailableSlots = async (req, res) => {
  try {
    const { farmhouseId } = req.params;
    const { date } = req.query;

    console.log("📅 Getting available slots for:", { farmhouseId, date });

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query parameter is required"
      });
    }

    // Validate date format
    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD format"
      });
    }

    const farmhouse = await Farmhouse.findById(farmhouseId);
    if (!farmhouse) {
      return res.status(404).json({
        success: false,
        message: "Farmhouse not found"
      });
    }

    console.log("🏠 Farmhouse found:", farmhouse.name);
    console.log("📊 Time prices count:", farmhouse.timePrices?.length || 0);
    console.log("📅 Booked slots count:", farmhouse.bookedSlots?.length || 0);

    // Normalize selected date for comparison
    const normalizedSelectedDate = new Date(selectedDate);
    normalizedSelectedDate.setHours(0, 0, 0, 0);
    const selectedDateString = normalizedSelectedDate.toISOString().split('T')[0];

    // Check if farmhouse is active
    if (!farmhouse.active) {
      return res.json({
        success: true,
        date,
        message: "Farmhouse is currently inactive",
        slots: []
      });
    }

    // Check if farmhouse is inactive on this date
    const isFarmhouseInactiveOnDate = farmhouse.inactiveDates?.some(inactiveDate => {
      if (!inactiveDate.date) return false;
      const inactiveDateObj = new Date(inactiveDate.date);
      inactiveDateObj.setHours(0, 0, 0, 0);
      return inactiveDateObj.getTime() === normalizedSelectedDate.getTime();
    });

    if (isFarmhouseInactiveOnDate) {
      return res.json({
        success: true,
        date,
        message: "Farmhouse is inactive on this date",
        slots: []
      });
    }

    // If no timePrices defined, return empty slots
    if (!farmhouse.timePrices || farmhouse.timePrices.length === 0) {
      return res.json({
        success: true,
        date,
        message: "No time slots defined for this farmhouse",
        slots: []
      });
    }

    const slots = [];

    // Filter booked slots for the selected date
    const bookedSlotsForDate = farmhouse.bookedSlots?.filter(booking => {
      try {
        // Use date field if available, otherwise fallback to checkIn
        let dateToCheck = booking.date;

        // If date field doesn't exist, use checkIn
        if (!dateToCheck && booking.checkIn) {
          dateToCheck = booking.checkIn;
        }

        if (!dateToCheck) {
          console.log(`⚠️ Booking has no date or checkIn:`, booking._id);
          return false;
        }

        const bookingDate = new Date(dateToCheck);
        if (isNaN(bookingDate.getTime())) {
          console.log(`⚠️ Invalid date in booking:`, dateToCheck);
          return false;
        }

        bookingDate.setHours(0, 0, 0, 0);
        const bookingDateString = bookingDate.toISOString().split('T')[0];

        const isSameDate = bookingDateString === selectedDateString;

        if (isSameDate) {
          console.log(`✅ Found booking for ${selectedDateString}: ${booking.label} (${booking.timing})`);
        }

        return isSameDate;
      } catch (err) {
        console.error("❌ Error processing booking date:", err);
        return false;
      }
    }) || [];

    console.log("📅 Booked slots for this date:", bookedSlotsForDate.length);

    // Process each time slot
    for (const tp of farmhouse.timePrices) {
      // Skip if slot doesn't have timing
      if (!tp.timing) {
        console.log("⚠️ Skipping slot with no timing:", tp);
        continue;
      }

      // Skip if slot is explicitly inactive
      if (tp.isActive === false) {
        console.log("⚠️ Skipping inactive slot:", tp.label);
        slots.push({
          label: tp.label,
          timing: tp.timing,
          price: tp.price || 0,
          available: false,
          reason: "Slot is inactive",
          slotId: tp._id ? tp._id.toString() : null
        });
        continue;
      }

      // Check if slot is inactive on this specific date
      const isSlotInactiveOnDate = tp.inactiveDates?.some(inactiveDate => {
        if (!inactiveDate.date) return false;
        const inactiveDateObj = new Date(inactiveDate.date);
        inactiveDateObj.setHours(0, 0, 0, 0);
        return inactiveDateObj.getTime() === normalizedSelectedDate.getTime();
      });

      if (isSlotInactiveOnDate) {
        slots.push({
          label: tp.label,
          timing: tp.timing,
          price: tp.price || 0,
          available: false,
          reason: "Slot is inactive on this date",
          slotId: tp._id ? tp._id.toString() : null
        });
        continue;
      }

      try {
        // Calculate check-in and check-out times for the SPECIFIC DATE
        const { checkIn, checkOut } = calculateCheckTimes(date, tp.timing);

        // Check if this exact slot is already booked for this date
        const isBooked = bookedSlotsForDate.some(bookedSlot => {
          // Match by label AND timing
          return bookedSlot.label === tp.label && bookedSlot.timing === tp.timing;
        });

        const isAvailable = !isBooked;

        slots.push({
          slotId: tp._id ? tp._id.toString() : null,
          label: tp.label,
          timing: tp.timing,
          price: tp.price || 0,
          available: isAvailable,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          isActive: tp.isActive !== false,
          reason: isBooked ? "Already booked" : "Available"
        });

        console.log(`Slot "${tp.label}" for ${selectedDateString}: ${isAvailable ? '✅ Available' : '❌ Booked'}`);

      } catch (err) {
        console.error("❌ Error calculating times for slot:", tp.timing, err.message);
        slots.push({
          label: tp.label,
          timing: tp.timing,
          price: tp.price || 0,
          available: false,
          reason: "Invalid time format",
          slotId: tp._id ? tp._id.toString() : null
        });
      }
    }

    // Calculate statistics
    const availableSlots = slots.filter(s => s.available).length;
    const totalSlots = slots.length;

    console.log("✅ Final slots for", selectedDateString, ":", {
      total: totalSlots,
      available: availableSlots,
      booked: totalSlots - availableSlots
    });

    return res.json({
      success: true,
      date: selectedDateString,
      farmhouse: {
        id: farmhouse._id,
        name: farmhouse.name,
        active: farmhouse.active
      },
      statistics: {
        totalSlots,
        availableSlots,
        bookedSlots: totalSlots - availableSlots
      },
      slots
    });
  } catch (err) {
    console.error("❌ Error in getAvailableSlots:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
// ============================================
// CALCULATE AVAILABLE SLOTS (Helper function)
// ============================================
async function calculateAvailableSlots(farmhouse, date) {
  try {
    const selectedDate = new Date(date);
    const availableSlots = [];

    if (!farmhouse.timePrices || farmhouse.timePrices.length === 0) {
      return availableSlots;
    }

    // Filter booked slots for the selected date
    const bookedSlotsForDate = farmhouse.bookedSlots?.filter(booking => {
      const bookingDate = new Date(booking.checkIn);
      return bookingDate.toDateString() === selectedDate.toDateString();
    }) || [];

    // Process each time slot
    for (const tp of farmhouse.timePrices) {
      // Skip if slot is inactive
      if (tp.isActive === false) {
        continue;
      }

      // Check if slot is inactive on this specific date
      const isSlotInactiveOnDate = tp.inactiveDates?.some(inactiveDate => {
        const inactiveDateObj = new Date(inactiveDate.date);
        inactiveDateObj.setHours(0, 0, 0, 0);
        const searchDate = new Date(selectedDate);
        searchDate.setHours(0, 0, 0, 0);
        return inactiveDateObj.getTime() === searchDate.getTime();
      });

      if (isSlotInactiveOnDate) {
        continue;
      }

      try {
        const { checkIn, checkOut } = calculateCheckTimes(date, tp.timing);

        // Check if this slot overlaps with any booked slot
        const isBooked = bookedSlotsForDate.some(bookedSlot => {
          const bookedCheckIn = new Date(bookedSlot.checkIn);
          const bookedCheckOut = new Date(bookedSlot.checkOut);

          return (
            (checkIn < bookedCheckOut && checkOut > bookedCheckIn)
          );
        });

        if (!isBooked) {
          availableSlots.push({
            slotId: tp._id,
            label: tp.label,
            timing: tp.timing,
            price: tp.price || 0,
            duration: tp.duration || 0,
            checkIn: checkIn.toISOString(),
            checkOut: checkOut.toISOString()
          });
        }
      } catch (err) {
        console.error("Error calculating slot times:", err.message);
      }
    }

    return availableSlots;
  } catch (err) {
    console.error("Error in calculateAvailableSlots:", err);
    return [];
  }
}


// ============================================
// CREATE REVIEW
// ============================================
export const createReview = async (req, res) => {
  try {
    const { farmhouseId } = req.params;
    const { userId, rating, content } = req.body;

    const farmhouse = await Farmhouse.findById(farmhouseId);
    const user = await User.findById(userId);

    if (!farmhouse || !user) {
      return res.status(404).json({ message: "Invalid data" });
    }

    farmhouse.reviews.push({
      userId,
      name: user.name,
      image: user.profileImage,
      rating,
      content
    });

    await farmhouse.save();

    res.json({
      success: true,
      message: "Review added successfully"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// SEARCH FARMHOUSE
// ============================================

export const searchFarmhouse = async (req, res) => {
  try {
    const { query, minPrice, maxPrice, amenities, date } = req.query;

    let andConditions = [];

    /* 🔍 TEXT SEARCH */
    if (query) {
      andConditions.push({
        $or: [
          { name: { $regex: query, $options: "i" } },
          { address: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } }
        ]
      });
    }

    /* 💰 PRICE FILTER */
    if (minPrice || maxPrice) {
      let priceFilter = {};
      if (minPrice) priceFilter.$gte = Number(minPrice);
      if (maxPrice) priceFilter.$lte = Number(maxPrice);

      andConditions.push({
        pricePerHour: priceFilter
      });
    }

    /* 🏊 AMENITIES FILTER */
    if (amenities) {
      const amenityList = amenities.split(",");
      andConditions.push({
        amenities: { $all: amenityList }
      });
    }

    /* 📅 DATE AVAILABILITY FILTER */
    if (date) {
      const selectedDate = new Date(date);
      if (isNaN(selectedDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format"
        });
      }

      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);

      andConditions.push({
        bookedSlots: {
          $not: {
            $elemMatch: {
              checkIn: { $lt: nextDay },
              checkOut: { $gt: selectedDate }
            }
          }
        }
      });
    }

    // Final filter
    const filter =
      andConditions.length > 0 ? { $and: andConditions } : {};

    const farmhouses = await Farmhouse.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: farmhouses.length,
      farmhouses
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


export const filterFarmhouses = async (req, res) => {
  try {
    const {
      search,
      minPrice,
      maxPrice,
      amenities,
      date,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc"
    } = req.query;

    let filter = {};

    /* 🔍 SEARCH */
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    /* 💰 PRICE FILTER */
    if (minPrice || maxPrice) {
      filter.pricePerHour = {};
      if (minPrice) filter.pricePerHour.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerHour.$lte = Number(maxPrice);
    }

    /* 🏊 AMENITIES FILTER */
    if (amenities) {
      const amenitiesArray = amenities.split(",");
      filter.amenities = { $all: amenitiesArray };
    }

    /* 📅 DATE AVAILABILITY FILTER */
    if (date) {
      const selectedDate = new Date(date);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);

      filter.bookedSlots = {
        $not: {
          $elemMatch: {
            checkIn: { $lt: nextDay },
            checkOut: { $gt: selectedDate }
          }
        }
      };
    }

    /* 📊 SORT */
    const sortOrder = order === "asc" ? 1 : -1;

    const farmhouses = await Farmhouse.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Farmhouse.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      farmhouses
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
