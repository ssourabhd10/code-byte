import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import 'dotenv/config';
import userRoutes from './routes/userRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import { createServer } from "http";

const app=express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/auth',userRoutes);
app.use('/api/quiz',quizRoutes)

mongoose.connect(process.env.MONGO_URL,{
    useNewUrlParser:true,
    useUnifiedTopology:true,
})
.then(()=>{
    console.log("DataBase Connection Succesful");
})

const server=app.listen(process.env.PORT,()=>{
    console.log('Server started on Port '+process.env.PORT);
})

