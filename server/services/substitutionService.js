
const Timetable = require("../models/Timetable");
const Substitution = require("../models/Substitution");

const generateSubstitutionRecords = async (leave) => {
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);

    const dayNames = [
        "Sunday", "Monday", "Tuesday",
        "Wednesday", "Thursday", "Friday", "Saturday"
    ];

    let createdRecords = [];
    let skippedDuplicates = 0;
    let skippedConflicts = 0;

    // Normalize dates to UTC midnight
    const currentDate = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate()
    ));

    const lastDate = new Date(Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate()
    ));

    while (currentDate <= lastDate) {
        const dayOfWeek = dayNames[currentDate.getUTCDay()];

        const dayStart = new Date(currentDate);
        const nextDay = new Date(currentDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        const timetableEntries = await Timetable.find({
            faculty: leave.faculty,
            dayOfWeek
        });

        for (const entry of timetableEntries) {

            // Check whether this leave already generated this period
            const sameLeaveRecord = await Substitution.findOne({
                leave: leave._id,
                date: {
                    $gte: dayStart,
                    $lt: nextDay
                },
                period: entry.period
            });

            if (sameLeaveRecord) {
                skippedDuplicates++;
                continue;
            }

            // Prevent another active substitution for the same faculty,
            // date and period, even if it belongs to a different leave.
            const existingPeriodRecord = await Substitution.findOne({
                absentFaculty: leave.faculty,
                date: {
                    $gte: dayStart,
                    $lt: nextDay
                },
                period: entry.period,
                status: {
                    $in: ["pending", "offered", "accepted", "completed"]
                }
            });

            if (existingPeriodRecord) {
                skippedConflicts++;
                continue;
            }

            const substitution = await Substitution.create({
                leave: leave._id,
                absentFaculty: leave.faculty,
                department: entry.department,
                subject: entry.subject,
                date: new Date(dayStart),
                dayOfWeek,
                period: entry.period,
                startTime: entry.startTime,
                endTime: entry.endTime,
                room: entry.room
            });

            createdRecords.push(substitution);
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return {
        createdCount: createdRecords.length,
        skippedDuplicates,
        skippedConflicts,
        substitutions: createdRecords
    };
};

module.exports = generateSubstitutionRecords;
