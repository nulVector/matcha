import { Router } from "express";
import passport from "passport";
const messageRouter: Router = Router();
const auth = passport.authenticate("jwt",{session:false});
messageRouter.get("/messages/:connectionId",auth)
//TODO - how to send message

export default messageRouter;