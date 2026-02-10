import { Request, Response, NextFunction } from "express";

export const globalErrorHandler = (err: any,req: Request,res: Response,next: NextFunction) => {
  console.error(err);
  if (err.code === 'P2002') {
    const targets = err.meta?.target as string[] | undefined;
    const fieldName = targets ? targets.join(" and ") : "Record";
    const customMessage = targets?.includes('senderId') && targets?.includes('receiverId')
      ? "A friend request has already been sent to this user."
      : `${fieldName} already exists.`;
    return res.status(409).json({
      status: "error",
      message: customMessage,
    });
  }
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    status: "error",
    message: err.message || "An internal server error occurred",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};