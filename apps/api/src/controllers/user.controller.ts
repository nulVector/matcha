import prisma from '@matcha/prisma';
import { connectionIdType, deactivatePasswordType, getConnectionsListType, getFriendRequestsType, initiateProfileType, requestHandleType, requestIdType, sendRequestType, updateAvatarType, updateDiscoveryType, updatePasswordType, updateProfileType, userIdType, usernameCheckType } from '@matcha/zod';
import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import { COOKIE_OPTIONS } from '../constant/cookie';
import { USERNAME_VIBES, VibeType } from '../constant/usernameList';

export const seedDB = async (req:Request,res:Response,next:NextFunction) =>{
  try {
    const avatarUrls = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Buddy',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  ];

  const cityNames = ['Delhi', 'Banglore', 'Mumbai', 'Pune', 'Chennai'];

  const interestNames = ['Coding', 'Hiking', 'Photography', 'Cooking', 'Gaming'];

  await Promise.all([
    Promise.all(avatarUrls.map(url => 
      prisma.avatar.create({ data: { avatarUrl: url } })
    )),
    Promise.all(cityNames.map(name => 
      prisma.location.create({ data: { location: name } })
    )),
    Promise.all(interestNames.map(name => 
      prisma.interest.create({ data: { interest: name } })
    )),
  ]);
  res.json({
    message:"Done"
  })
  } catch (err) {
    next(err)
  }
}


export const checkUsername = async (req:Request,res:Response,next:NextFunction) =>{
  try{
    const {username}:usernameCheckType= req.validatedData.query;
    const existingUser = await prisma.userProfile.findUnique({
      where:{
        username
      },
      select:{
        username:true
      }
    })
    if(existingUser){
      res.status(200).json({"available": false,message:"Username already taken."});
      return;
    }
    res.status(200).json({"available": true,message:"Username available."})
  }catch(err) {
    next(err)
  }
}

export const generateUsername = async (req:Request,res:Response,next:NextFunction) => {
  const generatedList:string[]= [];
  let attempts = 0;
  const maxAttempts = 50;
  try{
    //TODO - zod enum
    const vibe = (req.query.vibe as VibeType) || 'chaos';
    const {adjectives,nouns} = USERNAME_VIBES[vibe];
    const getRandom = (arr:string[]) => arr[Math.floor(Math.random()*arr.length)]?.replace(/\s+/g, '');
    while (generatedList.length < 5 && attempts < maxAttempts){
      attempts++;
      const generatedUsername = `${getRandom(adjectives)}_${getRandom(nouns)}_${Math.floor(100 + Math.random() * 900)}`;
      if (generatedList.includes(generatedUsername)) continue;
      const existingUser = await prisma.userProfile.findUnique({
        where:{
          username:generatedUsername
        },select:{
          username:true
        }
      })
      if (!existingUser) {
        generatedList.push(generatedUsername);
      }
    }
    res.json({
      usernames: generatedList
    })
  }catch(err){
    next(err)
  }
}

export const initiateProfile = async (req:Request, res:Response,next:NextFunction) => {
  try {
    const {username,avatarId}:initiateProfileType = req.validatedData.body;
    //TODO- add default avatar id in the frontend
    const userId = req.user!.id;
    const userProfile = await prisma.userProfile.create({
      data: {
        username,
        avatarId,
        userId
      },
      select: {
        username: true,
        avatar: {
          select: {
            avatarUrl:true
          }
        }
      }
    });
    res.status(201).json({
      success:true,
      message: "Profile created successfully",
      data: {
        username:userProfile.username,
        avatar:userProfile.avatar.avatarUrl
      }
    });
    return;
  } catch (err) {
    next(err);
  }
}

export const getMetadata = async (req:Request,res:Response,next:NextFunction) =>{
  try {
    const [locations,interests] = await Promise.all([
      prisma.location.findMany({orderBy:{location:"asc"}}),
      prisma.interest.findMany({orderBy:{interest:"asc"}})
    ]);
    res.json({
      locations,
      interests
    })
  }catch(err){
    next(err);
  }
}

export const updateProfile = async (req:Request,res:Response,next:NextFunction) =>{
  try{
    const {aboutMe, openingQues, locationId, interestsId}:updateProfileType = req.validatedData.body;
    const userId = req.user!.profile!.id;
    const updateData:any= {
      aboutMe,
      openingQues,
      locationId
    };
    //TODO - understand set function 
    if (interestsId) {
      updateData.interest = {
        set: interestsId.map((id: string) => ({ id }))
      };
    }
    //TODO - what if profile doesn't update?
    await prisma.userProfile.update({
      where:{
        id:userId
      },
      data:updateData
    });
    res.json({
      success:true,
      message: "Profile updated successfully",
    });
    return;
  }catch(err){
    next(err)
  }
}

export const updateAvatar = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const {avatarId}:updateAvatarType = req.validatedData.body;
    const userProfileId = req.user!.profile!.id;
    const updatedProfile = await prisma.userProfile.update({
      where:{
        id:userProfileId
      },
      data:{
        avatarId
      },
      select:{
        avatar:{
          select:{
            avatarUrl:true
          }
        }
      }
    });
    if (!updatedProfile.avatar) {
      res.status(404).json({
        success: false,
        message: "Avatar record not found."
      });
      return;
    }
    res.json({
      success:true,
      avatar:updatedProfile.avatar.avatarUrl
    })
  } catch (err){
    next(err)
  }
}

export const updateDiscovery = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const {allowDiscovery}:updateDiscoveryType = req.validatedData.body;
    const userProfileId = req.user!.profile!.id;
    const updatedProfile = await prisma.userProfile.update({
      where:{
        id:userProfileId
      },
      data:{
        allowDiscovery
      },
      select:{
        allowDiscovery:true
      }
    });
    res.json({
      success:true,
      allowDiscovery:updatedProfile.allowDiscovery
    })
  } catch (err){
    next(err)
  }
}

export const getProfile = async (req:Request,res:Response, next:NextFunction) =>{
  try {
    const userId = req.user!.profile!.id;
    const userProfile = await prisma.userProfile.findUnique({
      where:{
        id:userId
      },select:{
        username:true,
        aboutMe:true,
        allowDiscovery:true,
        openingQues:true,
        avatar:{
          select:{
            avatarUrl:true
          }
        },
        location:{
          select:{
            location:true
          }
        },
        interest:{
          select:{
            interest:true
          }
        }
      }
    })
    if (!userProfile) {
      res.status(404).json({ 
        message: "Profile not found. Please complete onboarding." 
      });
      return;
    }
    const interests = userProfile.interest.map(i => i.interest);
    res.json({
      success:true,
      data: {
        username:userProfile.username,
        aboutMe: userProfile.aboutMe,
        allowDiscovery: userProfile.allowDiscovery,
        openingQuestion: userProfile.openingQues,
        location: userProfile.location?.location,
        avatar: userProfile.avatar.avatarUrl,
        interests
      }
    })
  } catch (err) {
    next(err)
  }
}

export const updatePassword = async (req:Request,res:Response, next:NextFunction) =>{
  try{
    //TODO - add session, logout from other devies and new jwt issue
    const {currentPassword,newPassword}:updatePasswordType = req.validatedData.body;
    const userId = req.user!.id;
    const existingUser = await prisma.user.findUnique({
      where:{
        id:userId
      },
      select:{
        password:true
      }
    });
    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }
    const isMatch = await bcrypt.compare(currentPassword,existingUser.password);
    if(!isMatch){
      res.status(400).json({
        messgage:"Password is invalid"
      })
      return
    }
    const hashedPassword = await bcrypt.hash(newPassword,10);
    await prisma.user.update({
      where:{
        id:userId
      },
      data:{
        password:hashedPassword
      }
    })
    res.json({
      success:true,
      message:"Password changed successfully."
    })
  }catch(err){
    next(err)
  }
}

export const getConnectionsList = async (req: Request, res: Response, next: NextFunction) => {
  //TODO- ADD pagination, either OFFSET based(static list) or ID based(Like insta)
  try {
    const userProfileId = req.user!.profile!.id;
    const {status}:getConnectionsListType = req.validatedData.query;

    const connections = await prisma.connection.findMany({
      where: {
        status,
        OR: [
          { AND: [{ user1Id: userProfileId }, { user1DeletedAt: null }] },
          { AND: [{ user2Id: userProfileId }, { user2DeletedAt: null }] }
        ]
      },
      select: {
        id: true,
        user1: { select: { id: true, username: true, isActive: true, avatar: { select: { avatarUrl: true } } } },
        user2: { select: { id: true, username: true, isActive: true, avatar: { select: { avatarUrl: true } } } }
      }
    });
    const formattedList = connections.map((conn) => {
      const otherUser = conn.user1.id === userProfileId ? conn.user2 : conn.user1;
      return {
        id: otherUser.id,
        username: otherUser.username,
        isActive: otherUser.isActive,
        avatarUrl: otherUser.avatar.avatarUrl || null,
        connectionId: conn.id
      };
    });
    res.json({
      success: true,
      status: status,
      count: formattedList.length,
      data: formattedList
    });
  } catch (err) {
    next(err);
  }
};

export const deleteConnection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {connectionId}:connectionIdType = req.validatedData.params;
    const myProfileId = req.user!.profile!.id;
    const now = new Date();
    const [res1, res2] = await Promise.all([
      prisma.connection.updateMany({
        where: { id: connectionId, user1Id: myProfileId },
        data: { user1DeletedAt: now }
      }),
      prisma.connection.updateMany({
        where: { id: connectionId, user2Id: myProfileId },
        data: { user2DeletedAt: now }
      })
    ]);

    if (res1.count === 0 && res2.count === 0) {
      res.status(404).json({
        success: false,
        message: "Chat not found or access denied."
      });
      return;
    }
    res.json({
      success:true
    })
  } catch (err) {
    next(err)
  }
}

export const getFriendRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myProfileId = req.user!.profile!.id;
    const {type}:getFriendRequestsType = req.validatedData.query;
    const isIncoming = type === "incoming";
    const requestList = await prisma.friendRequest.findMany({
      where: {
        status: "PENDING",
        [isIncoming ? "receiverId" : "senderId"]: myProfileId,
        [isIncoming ? "sender" : "receiver"]:{
          isActive: true
        }
      },
      select: {
        id: true,
        origin: true,
        matchId:true,
        [isIncoming ? "sender" : "receiver"]: {
          select: { 
            id: true, 
            username: true,
            isActive:true,
            avatar: { select: { avatarUrl: true } },
          }
        }
      }
    });
    const formattedData = requestList.map((request) => ({
      requestId: request.id,
      origin: request.origin,
      matchId:request.matchId,
      type: type.toUpperCase(),
      user: isIncoming ? request.sender : request.receiver
    }));
    //TODO- avatarURl flattening
    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
    });
  } catch (err) {
    next(err);
  }
}

export const searchUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {username:requestedUsername}: usernameCheckType = req.validatedData.query;
    const requestedUser = await prisma.userProfile.findFirst({
      where:{
        username:requestedUsername,
        allowDiscovery:true,
        isActive:true
      },
      select:{
        username:true,
        avatar:{
          select:{
            avatarUrl:true
          }
        }
      }
    })
    if (!requestedUser) {
      res.status(404).json({
        success: false,
        message: "User not found or private"
      });
      return;
    };
    res.json({
      success:true,
      data:{
        username:requestedUser.username,
        avatar: requestedUser.avatar.avatarUrl
      }
    })
  } catch (err) {
    next(err)
  }
}

export const getUserProfile = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const {username:requestedUsername}: usernameCheckType = req.validatedData.params;
    const myUserProfileId = req.user!.profile!.id;
    const requestedUserProfile = await prisma.userProfile.findFirst({
      where: {
        username: requestedUsername,
        allowDiscovery: true,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        aboutMe: true,
        interest: { select: { interest: true } },
        avatar: { select: { avatarUrl: true } },
        matchAsUser1: {
          where: { user2Id: myUserProfileId },
          select: { id: true, status: true }
        },
        matchAsUser2: {
          where: { user1Id: myUserProfileId },
          select: { id: true, status: true }
        },
        sentRequests: {
          where: { receiverId: myUserProfileId, status: "PENDING" },
          select: { id: true, senderId: true }
        },
        receivedRequests: {
          where: { senderId: myUserProfileId, status: "PENDING" },
          select: { id: true, senderId: true }
        }
      }
    });

    if (!requestedUserProfile) {
      res.status(404).json({
        success: false,
        message: "User not found, private, or on a break"
      });
      return;
    }
    const connection = requestedUserProfile.matchAsUser1[0] || requestedUserProfile.matchAsUser2[0];
    const pendingReq = requestedUserProfile.sentRequests[0] || requestedUserProfile.receivedRequests[0];

    res.json({
      success: true,
      data: {
        id: requestedUserProfile.id,
        username: requestedUserProfile.username,
        aboutMe: requestedUserProfile.aboutMe,
        interest: requestedUserProfile.interest.map(i=>i.interest),
        avatar: requestedUserProfile.avatar,
        relationship: {
          connectionId: connection?.id || null,
          status: connection?.status || "NONE",
          hasPendingRequest: !!pendingReq,
          iAmTheSender: pendingReq?.senderId === myUserProfileId
        }
      }
    });
  } catch (err) {
    next(err)
  }
}

export const sendRequest = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const {userId:targetUserId}: userIdType = req.validatedData.params;
    const {origin,matchId}: sendRequestType = req.validatedData.body;
    const myProfileId = req.user!.profile!.id;
    if (myProfileId === targetUserId) {
      res.status(400).json({
        success: false,
        message: "Self-requests are not allowed"
      });
      return;
    }
    const target = await prisma.userProfile.findFirst({
      where:{
        id:targetUserId,
        isActive:true,
        allowDiscovery:true
      },select:{
        id:true
      }
    });
    if(!target){
      res.status(404).json({
        success:false,
        message:"User not found"
      })
      return;
    }
    const requestData = await prisma.$transaction(async (tx) => {
      const existingConnection = await tx.connection.findFirst({
        where: {
          OR: [
            { user1Id: myProfileId, user2Id: targetUserId },
            { user1Id: targetUserId, user2Id: myProfileId }
          ]
        },select:{
          id:true,
          status:true
        }
      });
      if (existingConnection?.status === "FRIEND") throw new Error("Already_connected");
      const pendingRequest = await tx.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: myProfileId, receiverId:targetUserId },
            { senderId: targetUserId, receiverId: myProfileId }
          ],
          status: "PENDING"
        },
        select: { senderId: true }
      });

      if (pendingRequest) {
        return { error: "PENDING", senderId: pendingRequest.senderId };
      }
      let finalOrigin = origin;
      let finalMatchId = matchId;

      if (existingConnection) {
        finalOrigin = "ARCHIVE";
        finalMatchId = existingConnection.id;
      }
      await tx.friendRequest.create({
        data: {
          origin: finalOrigin,
          matchId: finalMatchId,
          senderId: myProfileId,
          receiverId:targetUserId
        }
      });
      return { success: true };
    });
    if (requestData.error === "PENDING") {
      return res.status(400).json({
        success: false,
        message: requestData.senderId === myProfileId 
          ? "Request already pending" 
          : "This user has already sent you a request! Check your inbox." 
      });
    }
    res.status(201).json({
      success: true,
      message: "Friend Request sent successfully"
    });
  } catch (err:any) {
    if (err.message === "Already_connected") {
      res.status(400).json({
        success: false,
        message: "You are already friends with this user"
      })
      return;
    }
    next(err)
  }
}

export const cancelRequest = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const {requestId}:requestIdType = req.validatedData.params;
    const userId = req.user!.profile!.id;
    const deleteRequest = await prisma.friendRequest.deleteMany({
      where: {
        id: requestId,
        senderId: userId,
        status: 'PENDING'
      }
    });
    if (deleteRequest.count === 0) {
      res.status(404).json({ 
        success: false,
        message: "Request not found, already processed, or you are not the sender." 
      });
      return;
    }
    res.json({
      success: true,
      message: "Friend Request canceled successfully."
    });
    return;
  } catch (err) {
    next(err);
  }
}

export const handleRequest = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const {requestId}:requestIdType = req.validatedData.params;
    const userId = req.user!.profile!.id;
    const {action}:requestHandleType = req.validatedData.body;

    const friendRequest = await prisma.friendRequest.findFirst({
      where: { 
        id: requestId,
        receiverId: userId,
        sender:{
          isActive:true,
        },
        status: 'PENDING'
      },
      select: {
        senderId: true,
        origin: true,
        matchId: true
      }
    });
    if (!friendRequest) {
      res.status(404).json({ message: "Request not found or already processed." })
      return;
    }
    if (action === "REJECT") {
      await prisma.friendRequest.delete({ where: { id: requestId } });
      res.status(200).json({
        success: true,
        message: "Request rejected."
      });
      return;
    }
    if (action === "ACCEPT") {
      await prisma.$transaction(async (tx) => {
        await tx.friendRequest.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED' }
        });
        if (friendRequest.origin === 'SEARCH') {
          await tx.connection.create({
            data: { 
              status: 'FRIEND',
              user1Id: userId,
              user2Id: friendRequest.senderId 
            }
          });
        } else if (friendRequest.origin === 'ARCHIVE') {
          
          const updateResult = await tx.connection.updateMany({
            where: { 
              //@ts-ignore
              id: friendRequest.matchId,
              OR: [
                { user1Id: userId, user2Id: friendRequest.senderId },
                { user1Id: friendRequest.senderId, user2Id: userId }
              ]
             },
            data: { 
              status: 'FRIEND',
              finalDeleteAt: null,
              user1DeletedAt:null,
              user2DeletedAt:null
            }
          });
          if (updateResult.count === 0) {
            await tx.connection.create({
              data: {
                status: 'FRIEND',
                user1Id: userId,
                user2Id: friendRequest.senderId
              }
            });
          }
        }
      });
      res.status(200).json({
        success: true,
        message: "Friend Request accepted."
      });
      return;
    }
  } catch (err) {
    next(err);
  }
}

export const handleUnfriendRequest = async (req:Request,res:Response,next:NextFunction) => {
  try{
    const { userId: receiverId }: userIdType = req.validatedData.params;
    const myProfileId = req.user!.profile!.id;
    const now = new Date();
    const THIRTY_DAYS = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [res1,res2] = await Promise.all([
      prisma.connection.updateMany({
        where: { 
          user1Id: myProfileId, 
          user2Id: receiverId, 
          status: 'FRIEND' 
        },
        data: {
          status: 'UNFRIENDED',
          user1DeletedAt: now,
          finalDeleteAt: THIRTY_DAYS
        }
      }),
      prisma.connection.updateMany({
        where: { 
          user1Id: receiverId, 
          user2Id: myProfileId, 
          status: 'FRIEND' 
        },
        data: {
          status: 'UNFRIENDED',
          user2DeletedAt: now,
          finalDeleteAt: THIRTY_DAYS
        }
      })
    ])
    if (res1.count === 0 && res2.count === 0) {
      res.status(404).json({
        success: false,
        message: "No active friendship found" 
      });
      return;
    }
    res.json({
      success: true,
      status: 'UNFRIENDED',
      finalDeleteAt: THIRTY_DAYS
    });
  }catch(err){
    next(err)
  }
}

export const deactivateProfile = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const {password}:deactivatePasswordType = req.validatedData.body;
    const userId = req.user!.id;
    const now = new Date();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const userDetails = await prisma.user.findUnique({
      where:{
        id:userId
      },
      select:{
        password:true,
        reactivatedAt:true
      }
    });
    if (userDetails!.reactivatedAt && (now.getTime() - userDetails!.reactivatedAt.getTime() < SEVEN_DAYS)) {
      res.status(400).json({
        success:false,
        message:"You can only deactivate your account once every 7 days"
      })
      return;
    }
    const isMatch = await bcrypt.compare(password,userDetails!.password);
    if(!isMatch){
      res.status(401).json({
        success:false,
        message:'Invalid password'
      })
      return;
    }
    await prisma.user.update({
      where:{
        id:userId
      },
      data:{
        deletedAt: now,
        profile:{ 
          update:{
            isActive: false
          }
        }
      }
    })
    res.clearCookie("token",{...COOKIE_OPTIONS,maxAge:0});
    res.json({
      success:true,
      messgage:"Account deactivated"
    })
  } catch (err) {
    next(err)
  }
}