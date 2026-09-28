require("dotenv").config();

const mongoose = require("mongoose");
const Student = require("./models/Student");

const students = [
    {
        name: "Shashikant Singh",
        studentId: "124258090046",
        password: process.env.STUDENT_DEFAULT_PASSWORD
    },
    {
        name: "Shiv Singh",
        studentId: "124258090008",
        password: process.env.STUDENT_DEFAULT_PASSWORD
    },
    {
        name: "Samar Mishra",
        studentId: "124258090002",
        password: process.env.STUDENT_DEFAULT_PASSWORD
    },
    {
        name: "Mohd Ayan",
        studentId: "124258090147",
        password: process.env.STUDENT_DEFAULT_PASSWORD
    },
    {
        name: "Saurabh Yadav",
        studentId: "124258090092",
        password: process.env.STUDENT_DEFAULT_PASSWORD
    }
];

async function seedStudents() {

    try {

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB Connected!");

        await Student.deleteMany({});

        await Student.insertMany(students);

        console.log("5 students added successfully!");

        await mongoose.connection.close();

    } catch (error) {

        console.log("Error:", error);

    }

}

seedStudents();