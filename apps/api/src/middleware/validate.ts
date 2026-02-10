import { NextFunction, Request, Response } from "express";
import { ZodObject } from "zod";

type RequestSource = "body"|"query"|"params";
export const validate =(schema:ZodObject,source:RequestSource = "body") => {
  return async (req:Request,res:Response,next:NextFunction) => {
    try {
      const parsedData = await schema.safeParseAsync(req[source]);
      if (!parsedData.success){
        res.status(400).json({
          message:"Validation error",
          error:parsedData.error.issues.map(err=>err.message)
        });
        return;
      }
      if (!req.validatedData) {
        req.validatedData = {};
      }
      req.validatedData[source] = parsedData.data;
      next();
    } catch (err) {
      next(err)
    }
  }
}