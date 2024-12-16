import Quiz from '../model/quizModel.js';
import { Users } from '../model/userModel.js'

export const createUnits = async (req, res, next) => {
    try {
        const { topic, unitnum, heading, guidebook } = req.body.formdata;

        // Check if the topic exists
        let existingTopic = await Quiz.findOne({ name: topic });

        if (!existingTopic) {
            // If the topic doesn't exist, create it
            existingTopic = await Quiz.create({ name: topic, units: [] });
        }
        // Check if the unit exists within the topic
        const existingUnit = existingTopic.units.find(unit => unit.unitNumber == unitnum);

        if (existingUnit) {
            // If the unit exists, update other unit data
            existingUnit.heading = heading;
            existingUnit.guideBook = guidebook;
        } else {
            // If the unit doesn't exist, create it within the topic
            existingTopic.units.push({ unitNumber: unitnum, heading: heading, guideBook: guidebook });
        }

        // Save the changes to the database
        await existingTopic.save();
        return res.json({ status: true, msg: 'Unit created or updated successfully' });
    } catch (error) {
        return res.json({ status: false, msg: 'Failed to Create or Update Unit' });
        next(error);
    }
};

export const createQuestions = async (req, res, next) => {
    try {
        const { topic, unitnum, level, question, one, two, three, four, correctoption } = req.body.formdata;

        let existingTopic = await Quiz.findOne({ name: topic });
        let existingUnit = null;
        if (existingTopic) {
            existingUnit = existingTopic.units.find(unit => unit.unitNumber == unitnum);
        }

        if (!existingUnit) {
            return res.json({ status: false, msg: ' Create Unit first before adding questions' })
        }

        // Find the lesson with the specified level in the unit
        const existingLesson = existingUnit.lessons.find(lesson => lesson.lessonNumber == level);

        // If the lesson doesn't exist, create it; otherwise, update its questions
        if (!existingLesson) {
            existingUnit.lessons.push({ lessonNumber: level, questions: [{ question, options: [one, two, three, four], correctAnswer: correctoption }] });
        } else {
            existingLesson.questions.push({ question, options: [one, two, three, four], correctAnswer: correctoption });
        }
        // Save the changes to the database
        await existingTopic.save();
        return res.json({ status: true, msg: 'Question Added to lesson successfully' });

    } catch (error) {
        return res.json({ status: false, msg: 'Failed to Create Question' });
        next(error)
    }
}

export const getQuestions = async (req, res, next) => {
    try {
        const { unitnum, levelnum } = req.params;
        const course = req.query.course;
        const id = req.query.id;

        const Topic = await Quiz.findOne({ name: course });
        const Unit = Topic.units.find(unit => unit.unitNumber == unitnum);
        const Lesson = Unit.lessons.find(lesson => lesson.lessonNumber == levelnum);
        const quiz = {
            questions: Lesson.questions.map(question => ({
                question: question.question,
                choices: question.options,
                correctAnswer: question.correctAnswer,
            })),
        }

        //locked or unlocked level check
        const User = await Users.findOne({ _id: id, 'courseProgress.courseName': course });
        const progress = await User.courseProgress.find(course => course.courseName === req.query.course);
        const unit = await progress.units.find(unit => unit.unitNumber == unitnum);

        if (levelnum > unit.level + 1) {
            return res.json(null)
        }

        return res.json(quiz);
    } catch (error) {
        next(error)
    }
}

export const getcourse = async (req, res, next) => {
    try {
        const { topic, id } = req.params;

        const Topic = await Quiz.findOne({ name: topic }, { 'units.lessons.questions': 0 }).lean();
        // Search for the user with the given course name
        const user = await Users.findOne({ _id: id, 'courseProgress.courseName': topic });
        // Find the Quiz document for the specified course
        const quiz = await Quiz.findOne({ name: topic });

        if (!user && quiz) {
            // If the user does not have the course, create it
            await Users.updateOne(
                { _id: id },
                {
                    $push: {
                        courseProgress: {
                            courseName: topic,
                            units: quiz.units.map(unit => ({
                                unitNumber: unit.unitNumber,
                                level: 0,
                            })),
                        },
                    },
                },
                { upsert: true }
            );
        } else if (user && quiz) {
            // If the user has the course, update the progress for new units
            const existingUnits = user.courseProgress.find(course => course.courseName === topic)?.units || [];

            for (const unit of quiz.units) {
                const existingUnit = existingUnits.find(userUnit => userUnit.unitNumber === unit.unitNumber);

                if (!existingUnit) {
                    await Users.updateOne(
                        { _id: id, 'courseProgress.courseName': topic },
                        {
                            $push: {
                                'courseProgress.$.units': {
                                    unitNumber: unit.unitNumber,
                                    level: 0,
                                },
                            },
                        }
                    );
                }
            }
        }

        // Retrieve and send the user's courseProgress
        const updatedUser = await Users.findOne({ _id: id, 'courseProgress.courseName': topic });
        const progress = await updatedUser.courseProgress.find(course => course.courseName === topic);
        const combineCourseData = (Topic, progress) => {
            const updatedUnits = Topic.units.map(courseUnit => {
                const progressUnit = progress.units.find(progressUnit => progressUnit.unitNumber === courseUnit.unitNumber);
                return {
                    ...courseUnit,
                    level: progressUnit ? progressUnit.level : 0, // Adding progress level data to the courseUnit or default to 0
                };
            });
            // Return the updated Topic object
            return {
                ...Topic,
                units: updatedUnits,
            };
        };
        const CombinedData = combineCourseData(Topic, progress);
        return res.json(CombinedData);
    } catch (error) {
        console.log(error);
        next(error)
    }
}

export const submitResults = async (req, res, next) => {
    try {
        const { xp, noofques, level, gems, unitnum, topic, id, totalques } = JSON.parse(req.body.postDataString);
        const User = await Users.findOne({ _id: id, 'courseProgress.courseName': topic });
        const progress = await User.courseProgress.find(course => course.courseName === topic);
        const unit = await progress.units.find(unit => unit.unitNumber == unitnum);

        if ((unit.level + 1 == level) && noofques > 0) {
            // If so, update the level to plus 1
            unit.level += 1;
        }

        // Add today's date to streak.dates array if not already present
        const now = new Date();
        const offset = 5.5 * 60 * 60 * 1000;
        const today = (new Date(now.getTime() + offset)).toISOString().split('T')[0];

        if (!User.userData.streak.dates.some(date => new Date(date).toISOString().split('T')[0] === today)) {
            User.userData.streak.dates.push(today);
        }

        User.userData.xp += xp;
        User.userData.dailyChallenges.xp += xp;
        User.userData.dailyChallenges.correctQuestions += noofques;
        if (totalques == noofques) {
            User.userData.dailyChallenges.lessonsNumber += 1;
        }
        User.userData.gems += gems;
        User.userData.correctQues += noofques;
        // Save the changes to the database
        await User.save();
        res.send({ msg: "result submission successful" });
    } catch (error) {
        next(error)
    }
}



