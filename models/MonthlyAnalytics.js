const mongoose = require("mongoose");

const monthlyAnalyticsSchema = new mongoose.Schema({
    monthKey: {
        type: String,
        required: true,
        unique: true
    },

    monthLabel: {
        type: String,
        required: true
    },

    topCategory: {
        type: String,
        required: true
    },

    complaintCount: {
        type: Number,
        required: true,
        default: 0
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    "MonthlyAnalytics",
    monthlyAnalyticsSchema
);