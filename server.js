require("dotenv").config();

const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");

const Complaint = require("./models/Complaint");
const Student = require("./models/Student");
const MonthlyAnalytics = require("./models/MonthlyAnalytics");

const cloudinary = require("cloudinary").v2;

const app = express();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
app.use("/uploads", express.static("uploads"));
const upload = multer({ storage: multer.memoryStorage() });
function uploadToCloudinary(fileBuffer) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "campusfix"
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        stream.end(fileBuffer);
    });
}
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

        const { studentId, name, password } = req.body;

        const student = await Student.findOne({
            studentId: studentId,
            name: name
        });

        if (!student) {

            return res.json({
                success: false,
                message: "Roll Number or Name is incorrect!"
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
            message: "Login successful!",
            name: student.name
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
async function ensureMonthlyHistory() {

    const now = new Date();

    // Current month start
    const currentMonthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    );

    // Get all complaints before current month
    const oldComplaints = await Complaint.find({
        createdAt: {
            $lt: currentMonthStart
        }
    }).sort({ createdAt: 1 });

    if (oldComplaints.length === 0) {
        return;
    }

    // Find the first month having complaints
    const firstDate = new Date(oldComplaints[0].createdAt);

    let year = firstDate.getFullYear();
    let month = firstDate.getMonth();

    // Check every completed month
    while (
        year < currentMonthStart.getFullYear() ||
        (year === currentMonthStart.getFullYear() &&
         month < currentMonthStart.getMonth())
    ) {

        const startOfMonth = new Date(year, month, 1);

        const startOfNextMonth = new Date(
            year,
            month + 1,
            1
        );

        const monthKey =
            `${year}-${String(month + 1).padStart(2, "0")}`;

        // Check if this month is already saved
        const alreadySaved =
            await MonthlyAnalytics.findOne({ monthKey });

        if (!alreadySaved) {

            const monthlyComplaints =
                oldComplaints.filter(complaint => {

                    const date = new Date(complaint.createdAt);

                    return (
                        date >= startOfMonth &&
                        date < startOfNextMonth
                    );

                });

            if (monthlyComplaints.length > 0) {

                const categoryCounts = {};

                monthlyComplaints.forEach(complaint => {

                    const category = complaint.category;

                    if (category) {
                        categoryCounts[category] =
                            (categoryCounts[category] || 0) + 1;
                    }

                });

                const topCategory =
                    Object.entries(categoryCounts)
                        .sort((a, b) =>
                            b[1] - a[1] ||
                            a[0].localeCompare(b[0])
                        )[0];

                if (topCategory) {

                    await MonthlyAnalytics.create({
                        monthKey: monthKey,

                        monthLabel:
                            startOfMonth.toLocaleDateString("en-IN", {
                                month: "long",
                                year: "numeric"
                            }),

                        topCategory: topCategory[0],

                        complaintCount: topCategory[1]
                    });

                }

            }

        }

        // Move to next month
        month++;

        if (month > 11) {
            month = 0;
            year++;
        }

    }

}
app.get("/analytics/monthly", async (req, res) => {

    try {
        
        await ensureMonthlyHistory();

        const now = new Date();

        // Current month start
        const startOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        // Next month start
        const startOfNextMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
        );

        // Get current month's complaints
        const complaints = await Complaint.find({
            createdAt: {
                $gte: startOfMonth,
                $lt: startOfNextMonth
            }
        });

        // Count complaints category-wise
        const categoryCounts = {};

        complaints.forEach(complaint => {

            const category = complaint.category;

            if (category) {
                categoryCounts[category] =
                    (categoryCounts[category] || 0) + 1;
            }

        });

        // Sort categories by complaint count
        const top5 = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category, count]) => ({
                category: category,
                count: count
            }));

        // Get saved monthly history
        const history = await MonthlyAnalytics.find()
            .sort({ monthKey: -1 });

        res.json({
            success: true,
            currentMonth: {
                month: now.toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric"
                }),
                top5: top5
            },
            history: history
        });

    } catch (error) {

        console.log("Monthly Analytics Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load monthly analytics"
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

      let photoUrl = null;

if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer);
    photoUrl = result.secure_url;
}

const newComplaint = new Complaint({
    complaintId,
    title,
    category,
    location,
    description,
    priority,
    studentId,
    photo: photoUrl
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
/* ==========================================
   DUPLICATE PROBLEM DETECTOR
========================================== */

function normalizeProblemText(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getProblemTokens(text) {

    const stopWords = new Set([
        "the", "is", "are", "a", "an",
        "in", "on", "of", "to", "and",
        "for", "with", "not", "very",
        "this", "that", "problem",
        "issue", "please"
    ]);

    return new Set(
        normalizeProblemText(text)
            .split(" ")
            .filter(word =>
                word.length > 2 &&
                !stopWords.has(word)
            )
    );
}

function areSimilarProblems(first, second) {

    const firstText =
        normalizeProblemText(
            `${first.title} ${first.description}`
        );

    const secondText =
        normalizeProblemText(
            `${second.title} ${second.description}`
        );

    if (!firstText || !secondText) {
        return false;
    }

    if (
        firstText.includes(secondText) ||
        secondText.includes(firstText)
    ) {
        return true;
    }

    const firstTokens =
        getProblemTokens(firstText);

    const secondTokens =
        getProblemTokens(secondText);

    if (
        firstTokens.size === 0 ||
        secondTokens.size === 0
    ) {
        return false;
    }

    let common = 0;

    firstTokens.forEach(token => {

        if (secondTokens.has(token)) {
            common++;
        }

    });

    const union =
        new Set([
            ...firstTokens,
            ...secondTokens
        ]).size;

    const similarity =
        common / union;

    return similarity >= 0.45;
}


app.get("/same-problems", async (req, res) => {

    try {

        const complaints =
            await Complaint.find({
                status: {
                    $in: [
                        "Pending",
                        "In Progress"
                    ]
                }
            }).sort({
                createdAt: 1
            });


        const locationGroups = {};


        complaints.forEach(complaint => {

            const key =
                `${normalizeProblemText(complaint.category)}|` +
                `${normalizeProblemText(complaint.location)}`;

            if (!locationGroups[key]) {
                locationGroups[key] = [];
            }

            locationGroups[key].push(
                complaint
            );

        });


        const groups = [];


        Object.values(locationGroups)
            .forEach(locationComplaints => {

                const clusters = [];


                locationComplaints.forEach(
                    complaint => {

                        let matchingCluster = null;


                        for (
                            const cluster of clusters
                        ) {

                            if (
                                cluster.some(
                                    existingComplaint =>
                                        areSimilarProblems(
                                            existingComplaint,
                                            complaint
                                        )
                                )
                            ) {

                                matchingCluster =
                                    cluster;

                                break;
                            }

                        }


                        if (matchingCluster) {

                            matchingCluster.push(
                                complaint
                            );

                        } else {

                            clusters.push([
                                complaint
                            ]);

                        }

                    }
                );


                clusters
                    .filter(
                        cluster =>
                            cluster.length >= 2
                    )
                    .forEach(cluster => {

                        groups.push({

                            category:
                                cluster[0].category,

                            location:
                                cluster[0].location,

                            count:
                                cluster.length,

                            complaints:
                                cluster

                        });

                    });

            });


        res.json({
            success: true,
            groups: groups
        });


    } catch (error) {

        console.log(
            "Duplicate Detector Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to detect duplicate problems"

        });

    }

});


app.put(
    "/same-problems/resolve",
    async (req, res) => {

        try {

            const {
                complaintIds
            } = req.body;


            if (
                !Array.isArray(complaintIds) ||
                complaintIds.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "No complaints selected"

                });

            }


            const result =
                await Complaint.updateMany(

                    {
                        _id: {
                            $in: complaintIds
                        }
                    },

                    {
                        $set: {
                            status: "Resolved"
                        }
                    }

                );


            res.json({

                success: true,

                message:
                    `${result.modifiedCount} duplicate complaints resolved successfully!`

            });


        } catch (error) {

            console.log(
                "Duplicate Resolve Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to resolve duplicate complaints"

            });

        }

    }
);

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