import { Router } from "express";
import passport from "passport";
const connectionRouter: Router = Router();
const auth = passport.authenticate("jwt",{session:false});

//TODO - only online users should participate in the match making
connectionRouter.post("/find",auth);
connectionRouter.patch("/:connectionId/extend",auth);
connectionRouter.patch("/:connectionId/convert",auth);
connectionRouter.delete("/:connectionId",auth);

export default connectionRouter;