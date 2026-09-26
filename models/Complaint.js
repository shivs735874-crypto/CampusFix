const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({

    complaintId: {
        type: String,
        unique: true,
        required: true
    },

    title: {
        type: String,
        required: true
    },

    category: {
        type: String,
        required: true
    },

    location: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    priority: {
        type: String,
        required: true
    },

    studentId: {
        type: String,
        required: true
    },

    photo: {
    type: String,
    required: false
},
    status: {
        type: String,
        default: "Pending"
    }

});

module.exports = mongoose.model("Complaint", complaintSchema);