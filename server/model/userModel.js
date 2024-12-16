import mongoose from "mongoose";

const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true,
        min:3,
        unique:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        // required:true,
        required:false,
        min:3,
    },
    profilePic:{
        type:String,
    },
    IsAvatarImageSet:{
        type:Boolean,
        default:false
    },
    AvatarImage:{
        type:String,
        default:""
    },
    followers:{
        type:Array,
        default:['6542a9485d3dc1e54da56996']
    },
    following:{
        type:Array,
        default:['6542ab5f857e00e53615e01b','6542a9485d3dc1e54da56996']
    },
    userData:{
        xp:{type:Number,default:100},
        gems:{type:Number,default:200},
        correctQues:{type:Number,default:0},
        streak:{
            dates:{type:[Date],default:[]},
            days:{type:Number,default:0}
        },
        dailyChallenges: {
            xp: { type: Number, default: 0 },
            correctQuestions: { type: Number, default: 0 },
            lessonsNumber :{ type: Number, default: 0 },
            date:{type:Date,default:new Date().toISOString().split('T')[0]}
        }
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    courseProgress: [
        {
          courseName: { type: String },
          units: [
            {
              unitNumber: { type: Number },
              level: { type: Number },
            },
          ],
        },
      ]
});

export const Users=new mongoose.model('users',userSchema);