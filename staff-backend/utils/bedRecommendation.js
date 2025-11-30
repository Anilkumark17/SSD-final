const Bed = require('../models/Bed');

/**
 * Recommend the best available bed based on criteria
 * @param {String} preferredWard - Preferred ward for the patient
 * @param {Array} requiredEquipment - Array of required equipment
 * @returns {Object|null} - Recommended bed or null
 */
const recommendBed = async (preferredWard, requiredEquipment = []) => {
  try {
    // First, try to find a bed in the preferred ward with all required equipment
    let bed = await Bed.findOne({
      ward: preferredWard,
      status: 'available',
      equipmentType: { $all: requiredEquipment }
    });

    if (bed) return bed;

    // If not found, try preferred ward with partial equipment match
    if (requiredEquipment.length > 0) {
      bed = await Bed.findOne({
        ward: preferredWard,
        status: 'available',
        equipmentType: { $in: requiredEquipment }
      });

      if (bed) return bed;
    }

    // If still not found, try preferred ward without equipment requirement
    bed = await Bed.findOne({
      ward: preferredWard,
      status: 'available'
    });

    if (bed) return bed;

    // Last resort: any available bed with required equipment
    if (requiredEquipment.length > 0) {
      bed = await Bed.findOne({
        status: 'available',
        equipmentType: { $all: requiredEquipment }
      });

      if (bed) return bed;
    }

    // Absolute last resort: any available bed
    bed = await Bed.findOne({
      status: 'available'
    });

    return bed;
  } catch (error) {
    console.error('Error in bed recommendation:', error);
    return null;
  }
};

module.exports = { recommendBed };
