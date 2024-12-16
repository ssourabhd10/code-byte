import bcrypt from 'bcrypt';
import { Users } from '../model/userModel.js';
import _ from 'lodash';

export const register = async (req, res, next) => {
    try {
        req.body.username = _.toLower(req.body.username);
        const { username, password: loginPassword, email } = req.body;
        const usernamecheck = await Users.findOne({ username });
        const emailcheck = await Users.findOne({ email });
        if (usernamecheck)
            return res.json({ msg: "Username already taken, Try another", status: false });
        if (emailcheck)
            return res.json({ msg: "Account with Email already exists, Try logging in or use diffrent Email address", status: false });
        const hashedPass = await bcrypt.hash(loginPassword, 10);
        const user = await Users.create({
            username: username,
            email: email,
            password: hashedPass
        });
        await Users.findOneAndUpdate({ username: 'vedantgore1331' }, { $addToSet: { followers: user._id.toString() } });
        await Users.findOneAndUpdate({ username: 'codebyte-admin' }, { $addToSet: { followers: user._id.toString() } });
        await Users.findOneAndUpdate({ username: 'codebyte-admin' }, { $addToSet: { following: user._id.toString() } });
        // Exclude sensitive fields from the response
        const { password, followers, following, courseProgress, isAdmin, userData, ...userWithoutSensitiveInfo } = user.toObject();
        return res.json({ status: true, user: userWithoutSensitiveInfo });

    } catch (error) {
        next(error);
    }
}

export const login = async (req, res, next) => {
    try {
        req.body.username = _.toLower(req.body.username);
        const { username, password: loginPassword } = req.body;
        const user = await Users.findOne({ $or: [{ 'username': username }, { 'email': username }] });

        if (!user)
            return res.json({ msg: "User with this Email or Username does not exist", status: false });

        if (!user.password) {
            return res.json({ msg: "Account registered using Google or Facebook, try logging in with the same method", status: false });
        }

        const IsPassValid = await bcrypt.compare(loginPassword, user.password);
        if (!IsPassValid)
            return res.json({ msg: "Incorrect Password", status: false });

        // Exclude sensitive fields from the response
        const { password, followers, following, courseProgress, isAdmin, userData, ...userWithoutSensitiveInfo } = user.toObject();
        return res.json({ status: true, user: userWithoutSensitiveInfo });

    } catch (error) {
        next(error);
    }
}


export const setavatar = async (req, res, next) => {
    try {
        const id = req.params.id;

        const user = await Users.findByIdAndUpdate(id, {
            IsAvatarImageSet: true,
            AvatarImage: req.body.image
        }, { new: true });
        return res.json({ isSet: user.IsAvatarImageSet, setimage: user.AvatarImage });

    } catch (error) {
        next(error);
    }
}

export const getallusers = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { selectedTab } = req.query;
        const idList = await Users.findOne({ _id: id }).select([selectedTab]);
        var List = [];

        if (selectedTab === 'following') {
            List = idList.following;
        } else if (selectedTab === 'followers') {
            List = idList.followers;
        }

        const users = await Users.find({ _id: { $in: List } }).select(
            [
                "username",
                "IsAvatarImageSet",
                "AvatarImage",
                "_id",
                'userData'
            ]
        ).sort({ 'username': 1 });
        return res.json(users);
    } catch (error) {
        next(error);
    }
}

export const follow = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const followingId = req.body.id;
        const user = await Users.findOne({ _id: followingId }).select("username");
        // Update the 'following' array of the user who is following
        await Users.findByIdAndUpdate(userId, { $addToSet: { following: followingId } });
        // Update the 'followers' array of the user who is being followed
        await Users.findByIdAndUpdate(followingId, { $addToSet: { followers: userId } });
        return res.json({ msg: `Started Following ${user.username} ` });
    }
    catch (error) {
        next(error);
    }
}

export const followunfollow = async (req, res, next) => {
    try {
        const userId = req.body.user._id;
        const userData = req.body.user;
        const currentuser = req.body.currentuser;
        if (!userData.isFollowing) {
            const user = await Users.findOne({ _id: userId }).select("username");
            // Update the 'following' array of the user who is following
            await Users.findByIdAndUpdate(currentuser._id, { $addToSet: { following: userId } });
            // Update the 'followers' array of the user who is being followed
            await Users.findByIdAndUpdate(userId, { $addToSet: { followers: currentuser._id } });
            return res.json({ msg: `Started Following ${user.username} ` });
        }
        else {
            const user = await Users.findOne({ _id: userId }).select("username");
            await Users.findByIdAndUpdate(currentuser._id, { $pull: { following: userId } });
            // Remove the 'userId' from the 'followers' array of the user being unfollowed
            await Users.findByIdAndUpdate(userId, { $pull: { followers: currentuser._id } });
            return res.json({ msg: `Unfollowed ${user.username}` });
        }

    } catch (error) {
        next(error)
    }
}

export const getMatchingUsers = async (req, res, next) => {
    try {
        const { searchQuery } = req.query;
        const id = req.params.id;
        let users;
        const user = await Users.findOne({ _id: id }).select("following");
        const { following } = user;
        if (searchQuery === "") {
            users = await Users.find({ _id: { $ne: id } }).select([
                "username",
                "IsAvatarImageSet",
                "AvatarImage",
                "_id",
                'userData'
            ]).sort({ 'username': 1 });
        }
        else {
            users = await Users.find({
                username: { $regex: new RegExp(searchQuery, 'i') }, // Search for usernames that include the provided string (case-insensitive)
                _id: { $ne: id } // Exclude the current user by ID
            }).select([
                "username",
                "IsAvatarImageSet",
                "AvatarImage",
                "_id",
                'userData'
            ]);
        }
        // Adding the isFollowing field for each user
        users = users.map(user => ({
            ...user.toObject(),
            isFollowing: following.includes(user._id)
        }));
        return res.json(users);

    } catch (error) {
        next(error);
    }
};

export const getuser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const currentUserId = req.headers.id;
        let user = await Users.findOne({ _id: userId });
        let { password, ...userWithoutSensitiveInfo } = user.toObject();

        // Find all users sorted by XP in descending order
        const allUsers = await Users.find().sort({ 'userData.xp': -1 });
        const userRank = allUsers.findIndex(user => user._id.toString() === userId);
        const actualRank = userRank + 1;

        //dailychallenges update
        const now = new Date();
        const offset = 5.5 * 60 * 60 * 1000;
        const today = (new Date(now.getTime() + offset)).toISOString().split('T')[0];

        if (new Date(user.userData.dailyChallenges.date).toISOString().split('T')[0] !== today) {
            user.userData.dailyChallenges.xp = 0;
            user.userData.dailyChallenges.lessonsNumber = 0;
            user.userData.dailyChallenges.correctQuestions = 0;
            user.userData.dailyChallenges.date = today;
        }

        //add streak to user data
        user.userData.streak.days = calculateStreak(user.userData.streak.dates);
        await user.save();

        // Adding the isFollowing field for each user
        userWithoutSensitiveInfo = { ...userWithoutSensitiveInfo, isFollowing: user.followers.includes(currentUserId), rank: actualRank }
        return res.json(userWithoutSensitiveInfo);
    } catch (error) {
        next(error)
    }
}

export const googlelogin = async (req, res, next) => {
    try {

        var { username, email, buffer } = req.body;
        const emailcheck = await Users.findOne({ email });

        if (emailcheck && emailcheck.password)
            return res.json({ msg: "Account with Email already exists, Try logging in with password or use diffrent Email address", status: false });
        else if (emailcheck) {
            const { password, followers, following, courseProgress, ...userWithoutSensitiveInfo } = emailcheck.toObject();
            return res.json({ status: true, user: userWithoutSensitiveInfo });
        }
        username = username + (Math.floor(Math.random() * 10000) + 10000).toString().substring(1);

        while (await Users.findOne({ username })) {
            username = username + (Math.floor(Math.random() * 10000) + 10000).toString().substring(1);
        }

        const user = await Users.create({
            username: username,
            email: email,
            profilePic: buffer
        });

        await Users.findOneAndUpdate({ username: 'vedantgore1331' }, { $addToSet: { followers: user._id.toString() } });
        await Users.findOneAndUpdate({ username: 'codebyte-admin' }, { $addToSet: { followers: user._id.toString() } });
        await Users.findOneAndUpdate({ username: 'codebyte-admin' }, { $addToSet: { following: user._id.toString() } });

        const { password, followers, following, courseProgress, isAdmin, userData, ...userWithoutSensitiveInfo } = user.toObject();
        return res.json({ status: true, user: userWithoutSensitiveInfo });

    } catch (error) {
        next(error)
    }
}

export const fblogin = async (req, res, next) => {
    try {
        var { username, email, buffer } = req.body;
        const emailcheck = await Users.findOne({ email });
        
        if (emailcheck && emailcheck.password)
            return res.json({ msg: "Account with Email already exists, Try logging in with password or use diffrent Email address", status: false });
        else if (emailcheck) {
            const { password, followers, following, ...userWithoutSensitiveInfo } = emailcheck.toObject();
            return res.json({ status: true, user: userWithoutSensitiveInfo });
        }

        username = username + (Math.floor(Math.random() * 10000) + 10000).toString().substring(1);

        while (await Users.findOne({ username })) {
            username = username + (Math.floor(Math.random() * 10000) + 10000).toString().substring(1);
        }

        const user = await Users.create({
            username: username,
            email: email,
            profilePic: buffer
        });

        await Users.findOneAndUpdate({ username: 'vedantgore1331' }, { $addToSet: { followers: user._id.toString() } });
        await Users.findOneAndUpdate({ username: 'codebyte-admin' }, { $addToSet: { followers: user._id.toString() } });
        await Users.findOneAndUpdate({ username: 'codebyte-admin' }, { $addToSet: { following: user._id.toString() } });

        const { password, followers, following, courseProgress, isAdmin, userData, ...userWithoutSensitiveInfo } = user.toObject();
        return res.json({ status: true, user: userWithoutSensitiveInfo });

    } catch (error) {
        next(error);
    }
}

export const shop = async (req, res, next) => {
    try {
        const id = req.params.id;
        const User = await Users.findOne({ _id: id });

        // Find today's date
        const now = new Date();
        const offset = 5.5 * 60 * 60 * 1000;
        const today = (new Date(now.getTime() + offset)).toISOString().split('T')[0];
        // Find yesterday's date
        const yesterday = (new Date(now.getTime() + offset));
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayWithoutTime = yesterday.toISOString().split('T')[0];
        if (User.userData.gems >= 200) {
            if (!User.userData.streak.dates.some(date => new Date(date).toISOString().split('T')[0] === yesterdayWithoutTime && calculateStreak(User.userData.streak.dates)==0)) {
                User.userData.streak.dates.push(yesterdayWithoutTime);
                User.userData.gems -= 200;
            }
            else if (!User.userData.streak.dates.some(date => new Date(date).toISOString().split('T')[0] === today)) {
                User.userData.streak.dates.push(today);
                User.userData.gems -= 200;
            }
            //add streak to user data
            User.userData.streak.days = calculateStreak(User.userData.streak.dates);
            // Save the changes to the database
            await User.save();
            return res.send({ status: true })
        }
        return res.send({ status: false })
    } catch (error) {
        next(error)
    }
}

const calculateStreak = (dates) => {
    const now = new Date();
    const offset = 5.5 * 60 * 60 * 1000;
    const today = (new Date(now.getTime() + offset)).toISOString().split('T')[0];

    const todayIndex = dates.findIndex(date => {
        const dateWithoutTime = new Date(date).toISOString().split('T')[0];
        return dateWithoutTime === today;
    });

    // Find yesterday's date
    const yesterday = (new Date(now.getTime() + offset));
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayWithoutTime = yesterday.toISOString().split('T')[0];

    // Find yesterday's index
    const yesterdayIndex = dates.findIndex(date => {
        const dateWithoutTime = new Date(date).toISOString().split('T')[0];
        return dateWithoutTime === yesterdayWithoutTime;
    });

    // Check if today is part of the dates
    if (yesterdayIndex === -1 && todayIndex === -1) {
        return 0; // Streak is broken if yesterday is not in the array
    }

    let streak = 1;
    // Iterate through the dates starting from today's index
    for (let i = yesterdayIndex; i >= 0; i--) {
        // Check if the dates are consecutive
        if (new Date(dates[i]) - new Date(dates[i - 1]) === 24 * 60 * 60 * 1000) {
            streak++;
        } else {
            break; // Streak is broken
        }
    }

    if (todayIndex != -1 && yesterdayIndex != -1) {
        streak++;
    }

    return streak;
};

export const leaderboard = async (req, res, next) => {
    try {
        // Find all users sorted by XP in descending order
        const allUsers = await Users.find()
        .select('AvatarImage username userData.xp _id')
        .sort({ 'userData.xp': -1 });
        return res.json(allUsers);
    } 
    catch (error) {
        next(error)
    }
}