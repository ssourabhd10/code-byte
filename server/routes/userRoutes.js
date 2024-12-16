import express from 'express';
import {googlelogin ,login, register, setavatar,getallusers,fblogin,getMatchingUsers, follow, getuser, followunfollow,shop, leaderboard} from '../controllers/usersController.js';
const router=express.Router();

router.post("/register",register);
router.post("/login",login);
router.post("/googlelogin",googlelogin);
router.post("/fblogin",fblogin);
router.post("/setavatar/:id",setavatar);
router.get("/getallusers/:id",getallusers);
router.get("/getmatchingusers/:id",getMatchingUsers);
router.get("/getuser/:id",getuser);
router.post("/follow/:id",follow);
router.post("/followunfollow",followunfollow);
router.post("/shop/:id",shop);
router.get("/leaderboard",leaderboard)

export default router;