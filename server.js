require("dotenv").config();

const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const Complaint = require("./models/Complaint");
const Student = require("./models/Student");
const app = express();
app.use("/uploads", express.static("uploads"));
const upload = multer({ dest: "uploads/" });
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully!");
    })
    .catch((error) => {
        console.log("MongoDB Connection Error:", error);
    });

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});
app.post("/register", async (req, res) => {

    try {

        const { name, studentId, email, password } = req.body;

        const existingStudent = await Student.findOne({
            $or: [
                { studentId: studentId },
                { email: email }
            ]
        });

        if (existingStudent) {
            return res.json({
                success: false,
                message: "Student ID or Email already registered!"
            });
        }

        const newStudent = new Student({
            name,
            studentId,
            email,
            password
        });

        await newStudent.save();

        res.json({
            success: true,
            message: "Registration successful!"
        });

    } catch (error) {

        console.log("Registration Error:", error);

        res.status(500).json({
            success: false,
            message: "Registration failed!"
        });

    }

});
app.post("/login", async (req, res) => {

    try {

        const { studentId, password } = req.body;

        const student = await Student.findOne({
            studentId: studentId
        });

        if (!student) {

            return res.json({
                success: false,
                message: "Student ID not found!"
            });

        }

        if (student.password !== password) {

            return res.json({
                success: false,
                message: "Incorrect password!"
            });

        }

        res.json({
            success: true,
            message: "Login successful!"
        });

    } catch (error) {

        console.log("Login Error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed!"
        });

    }

});
app.post("/admin-login", (req, res) => {
    const { username, password } = req.body;

  if (username === "admin" && password === "shiv0000") {
        res.json({
            success: true,
            message: "Admin login successful!"
        });
    } else {
        res.json({
            success: false,
            message: "Invalid username or password!"
        });
    }
});
app.get("/complaints", async (req, res) => {
    try {
        const complaints = await Complaint.find();

        res.json(complaints);

    } catch (error) {
        console.log("Error fetching complaints:", error);

        res.status(500).json({
            message: "Failed to fetch complaints"
        });
    }
});
app.post("/report", upload.single("photo"), async (req, res) => {
    try {

        const {
            title,
            category,
            location,
            description,
            priority,
            studentId
        } = req.body;

        // Generate unique Complaint ID
        const complaintId = "CF-" + Date.now();

        const newComplaint = new Complaint({
    complaintId,
    title,
    category,
    location,
    description,
    priority,
    studentId,
    photo: req.file ? req.file.path : null
});

        await newComplaint.save();

        console.log("Complaint saved to MongoDB!");

        res.json({
            success: true,
            message: "Complaint submitted successfully!",
            complaintId: complaintId
        });

    } catch (error) {

        console.log("Error saving complaint:", error);

        res.status(500).json({
            success: false,
            message: "Failed to save complaint"
        });

    }
});
app.put("/complaints/:id", async (req, res) => {
    try {
        const { status } = req.body;

        const updatedComplaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { new: true }
        );

        res.json({
            message: "Status updated successfully!",
            complaint: updatedComplaint
        });

    } catch (error) {
        console.log("Error updating status:", error);

        res.status(500).json({
            message: "Failed to update status"
        });
    }
});
app.listen(3000, () => {
    console.log("CampusFix server running on http://localhost:3000");
});