import prisma from '@matcha/prisma';
import { ConnectionListType } from '@matcha/redis';
import { connectionIdType, deactivatePasswordType, getConnectionsListType, getFriendRequestsType, initiateProfileType, requestHandleType, requestIdType, sendRequestType, updatePasswordType, updateProfileType, userIdType, usernameCheckType, vibeCheckType } from '@matcha/zod';
import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { COOKIE_OPTIONS } from '../constant/cookie';
import { USERNAME_VIBES } from '../constant/usernameList';
import { redisManager } from '../services/redis';

type LocationMetadata = { id: string; name: string; latitude: number; longitude: number };
type InterestMetadata = { id: string; name: string };
type AvatarMetadata = { id: string; url: string; };

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("Environment variables not available");
}

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
      prisma.avatar.create({ data: { url: url } })
    )),
    Promise.all(cityNames.map(name => 
      prisma.location.create({ data: { name: name, latitude:1,longitude:0} })
    )),
    Promise.all(interestNames.map(name => 
      prisma.interest.create({ data: { name: name } })
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
    const mightExist = await redisManager.bloom.exists('bf:usernames', username);
    if (!mightExist) {
      return res.status(200).json({ available: true, message: "Username available." });
    }
    const existingUser = await prisma.userProfile.findUnique({
      where:{ username },
      select:{ username:true }
    })
    if(existingUser){
      return res.status(200).json({available: false,message:"Username already taken."});
    }
    res.status(200).json({available: true,message:"Username available."})
  }catch(err) {
    next(err)
  }
}

export const generateUsername = async (req:Request,res:Response,next:NextFunction) => {
  const generatedList:string[]= [];
  let attempts = 0;
  const maxAttempts = 50;
  try{
    const {vibe} = (req.validatedData.query as vibeCheckType) || 'chaos';
    const {adjectives,nouns} = USERNAME_VIBES[vibe];
    const getRandom = (arr:string[]) => arr[Math.floor(Math.random()*arr.length)]?.replace(/\s+/g, '');
    while (generatedList.length < 5 && attempts < maxAttempts){
      attempts++;
      const generatedUsername = `${getRandom(adjectives)}_${getRandom(nouns)}_${Math.floor(100 + Math.random() * 900)}`;
      if (generatedList.includes(generatedUsername)) continue;
      const mightExist = await redisManager.bloom.exists('bf:usernames', generatedUsername);
      if (mightExist) continue;
      generatedList.push(generatedUsername);
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
    const {
      username,
      avatarUrl,
      aboutMe,
      openingQues,
      location,
      locationLatitude,
      locationLongitude,
      interest
    }:initiateProfileType = req.validatedData.body;
    const userId = req.user!.id;
    const tokenVersion = req.user!.tokenVersion;
    const userProfile = await prisma.userProfile.create({
      data: {
        userId,
        username,
        avatarUrl,
        aboutMe,
        openingQues,
        location,
        locationLatitude,
        locationLongitude,
        interest
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true
      }
    });
    //TODO - push to a queue(bullmq)
    await redisManager.bloom.add('bf:usernames', userProfile.username);
    await redisManager.auth.cacheSession(userId, tokenVersion, userProfile.id);
    await redisManager.userDetail.cacheProfile(userProfile.id, {
      id: userProfile.id,
      username: userProfile.username,
      avatarUrl: userProfile.avatarUrl,
      aboutMe,
      openingQues,
      location,
      locationLatitude,
      locationLongitude,
      interest,
      isActive: true,
      allowDiscovery: false
    });
    await redisManager.match.updateUserStatus(
      userProfile.id, 
      locationLatitude, 
      locationLongitude, 
      interest
    );
    res.status(201).json({
      success:true,
      message: "Profile created successfully",
      data: {
        username:userProfile.username,
        avatar:userProfile.avatarUrl
      }
    });
    return;
  } catch (err) {
    next(err);
  }
}

export const getMetadata = async (req:Request,res:Response,next:NextFunction) =>{
  try {
    const [cachedLocations,cachedInterests,cachedAvatars] = await Promise.all([
      redisManager.metaData.getMetadata<LocationMetadata>('locations'),
      redisManager.metaData.getMetadata<InterestMetadata>('interests'),
      redisManager.metaData.getMetadata<AvatarMetadata>('avatars'),
    ]);
    if (cachedLocations && cachedInterests && cachedAvatars) {
      return res.json({
        success: true,
        data: {
          locations: cachedLocations,
          interests: cachedInterests,
          avatars: cachedAvatars
        }
      });
    }
    const [locations, interests, avatars] = await Promise.all([
      cachedLocations || prisma.location.findMany({ orderBy: { name: 'asc' } }),
      cachedInterests || prisma.interest.findMany({ orderBy: { name: 'asc' } }),
      cachedAvatars || prisma.avatar.findMany()
    ]);
    const cachePromises: Promise<void>[] = [];
    if (!cachedLocations) cachePromises.push(redisManager.metaData.cacheMetadata('locations', locations));
    if (!cachedInterests) cachePromises.push(redisManager.metaData.cacheMetadata('interests', interests));
    if (!cachedAvatars) cachePromises.push(redisManager.metaData.cacheMetadata('avatars', avatars));
    Promise.all(cachePromises).catch(err => console.error("Failed to cache metadata:", err));
    res.json({
      success: true,
      data: {
        locations,
        interests,
        avatars
      }
    })
  }catch(err){
    next(err);
  }
}

export const updateProfile = async (req:Request,res:Response,next:NextFunction) =>{
  try{
    const {
      avatarUrl,
      aboutMe,
      openingQues,
      location,
      locationLatitude,
      locationLongitude,
      interest,
      allowDiscovery
    }:updateProfileType = req.validatedData.body;
    const profileId = req.user!.profile!.id;
    const updateData: any = {};
    if (aboutMe !== undefined) updateData.aboutMe = aboutMe;
    if (openingQues !== undefined) updateData.openingQues = openingQues;
    if (location !== undefined) updateData.location = location;
    if (locationLatitude !== undefined) updateData.locationLatitude = locationLatitude;
    if (locationLongitude !== undefined) updateData.locationLongitude = locationLongitude;
    if (interest !== undefined) updateData.interest = interest;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (allowDiscovery !== undefined) updateData.allowDiscovery = allowDiscovery;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No fields provided to update" });
    }

    const updatedProfile = await prisma.userProfile.update({
      where: { id: profileId },
      data: updateData,
      select: {
        interest: true,
        locationLatitude: true,
        locationLongitude: true,
        allowDiscovery: true
      }
    });
    await redisManager.userDetail.updateProfileFields(profileId, updateData);
    if (interest || (locationLatitude && locationLongitude)) {
      await redisManager.match.updateUserStatus(
        profileId, 
        updatedProfile.locationLatitude, 
        updatedProfile.locationLongitude, 
        updatedProfile.interest
      );
    }
    res.json({
      success:true,
      message: "Profile updated successfully",
      allowDiscovery: updatedProfile.allowDiscovery
    });
    return;
  }catch(err){
    next(err)
  }
}

export const getProfile = async (req:Request,res:Response, next:NextFunction) =>{
  try {
    const profileId = req.user!.profile!.id;
    const cachedProfile = await redisManager.userDetail.getProfile(profileId);
    
    if (cachedProfile) {
      return res.json({
        success: true,
        data: cachedProfile
      });
    }
    const userProfile = await prisma.userProfile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        username: true,
        aboutMe: true,
        allowDiscovery: true,
        openingQues: true,
        avatarUrl: true,
        location: true,
        interest: true,
        isActive: true
      }
    });
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found. Please complete onboarding." 
      });
    }
    redisManager.userDetail.cacheProfile(profileId, userProfile).catch(err => {
      console.error("Failed to cache profile", err);
    });
    res.json({
      success: true,
      data: userProfile
    });
  } catch (err) {
    next(err)
  }
}

export const updatePassword = async (req:Request,res:Response, next:NextFunction) =>{
  try{
    const {currentPassword,newPassword}:updatePasswordType = req.validatedData.body;
    const userId = req.user!.id;
    const profileId = req.user!.profile!.id;
    const existingUser = await prisma.user.findUnique({
      where:{ id:userId },
      select:{ password:true }
    });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    const isMatch = await bcrypt.compare(currentPassword,existingUser.password);
    if(!isMatch){
      return res.status(400).json({
        messgage:"Password is invalid"
      })
    }
    const hashedPassword = await bcrypt.hash(newPassword,10);
    const updatedUser = await prisma.user.update({
      where:{ id:userId },
      data:{
        password:hashedPassword,
        tokenVersion: { increment: 1 }
      },
      select: { tokenVersion: true }
    })
    await redisManager.auth.cacheSession(userId, updatedUser.tokenVersion, profileId);
    const token = jwt.sign({ 
        id: userId, 
        tokenVersion: updatedUser.tokenVersion 
      },jwtSecret,{ expiresIn: '7d' });

    res.cookie("token", token, COOKIE_OPTIONS);
    return res.json({
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
        user1: { select: { id: true, username: true, isActive: true, avatarUrl: true } },
        user2: { select: { id: true, username: true, isActive: true, avatarUrl: true } }
      }
    });
    const formattedList = connections.map((conn) => {
      const otherUser = conn.user1.id === userProfileId ? conn.user2 : conn.user1;
      return {
        id: otherUser.id,
        username: otherUser.username,
        isActive: otherUser.isActive,
        avatarUrl: otherUser.avatarUrl,
        connectionId: conn.id
      };
    });

    const connectionIds = formattedList.map(user => user.id);
    const redisListType = status === "FRIEND" 
      ? ConnectionListType.FRIEND 
      : ConnectionListType.ARCHIVED;
    redisManager.userDetail.cacheConnectionList(userProfileId, connectionIds, redisListType)
      .catch(err => console.error("Failed to warm connection cache:", err));

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
    const profileId = req.user!.profile!.id;
    const now = new Date();
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        OR: [{ user1Id: profileId }, { user2Id: profileId }]
      },
      select: { user1Id: true, user2Id: true }
    });
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Chat not found or access denied."
      });
    }
    const isUser1 = connection.user1Id === profileId;
    await prisma.connection.update({
      where: { id: connectionId },
      data: isUser1 ? { user1DeletedAt: now } : { user2DeletedAt: now }
    });
    await Promise.all([
      redisManager.userDetail.cacheConnectionList(profileId, [], ConnectionListType.FRIEND),
      redisManager.userDetail.cacheConnectionList(profileId, [], ConnectionListType.ARCHIVED)
    ]);
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
        connectionId:true,
        [isIncoming ? "sender" : "receiver"]: {
          select: { 
            id: true, 
            username: true,
            isActive:true,
            avatarUrl:true
          }
        }
      }
    });
    const formattedData = requestList.map((request) => ({
      requestId: request.id,
      origin: request.origin,
      connectionId:request.connectionId,
      type: type.toUpperCase(),
      user: isIncoming ? request.sender : request.receiver
    }));

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
        id: true,
        username:true,
        avatarUrl:true
      }
    })
    if (!requestedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found or private"
      });
    };
    res.json({
      success:true,
      data:{
        id: requestedUser.id,
        username:requestedUser.username,
        avatar: requestedUser.avatarUrl
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
        interest: true,
        avatarUrl:true,
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
        interest: requestedUserProfile.interest,
        avatarUrl: requestedUserProfile.avatarUrl,
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
    const {origin,connectionId}: sendRequestType = req.validatedData.body;
    const myProfileId = req.user!.profile!.id;
    if (myProfileId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Self-requests are not allowed"
      });
    }
    const target = await prisma.userProfile.findFirst({
      where:{
        id:targetUserId,
        isActive:true,
        allowDiscovery:true
      },
      select:{ id:true }
    });
    if(!target){
      return res.status(404).json({
        success:false,
        message:"User not found"
      })
    }
    const requestData = await prisma.$transaction(async (tx) => {
      const existingConnection = await tx.connection.findFirst({
        where: {
          OR: [
            { user1Id: myProfileId, user2Id: targetUserId },
            { user1Id: targetUserId, user2Id: myProfileId }
          ]
        },
        select:{
          id:true,
          status:true
        }
      });
      if (existingConnection?.status === "FRIEND") return { status: "ALREADY_CONNECTED" };
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
        return { status: "PENDING", senderId: pendingRequest.senderId };
      }
      let finalOrigin = origin;
      let finalconnectionId = connectionId;

      if (existingConnection) {
        finalOrigin = "ARCHIVE";
        finalconnectionId = existingConnection.id;
      }
      await tx.friendRequest.create({
        data: {
          origin: finalOrigin,
          connectionId: finalconnectionId,
          senderId: myProfileId,
          receiverId:targetUserId
        }
      });
      return { status: "SUCCESS" };
    });
    if (requestData.status === "ALREADY_CONNECTED") {
      return res.status(400).json({
        success: false,
        message: "You are already friends with this user"
      });
    }

    if (requestData.status === "PENDING") {
      return res.status(400).json({
        success: false,
        message: requestData.senderId === myProfileId 
          ? "Request already pending" 
          : "This user has already sent you a request! Check your inbox." 
      });
    }

    //TODO - notification of friend request
    res.status(201).json({
      success: true,
      message: "Friend Request sent successfully"
    });
  } catch (err) {
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
        connectionId: true
      }
    });
    if (!friendRequest) {
      return res.status(404).json({ message: "Request not found or already processed." });
    }
    if (action === "REJECT") {
      await prisma.friendRequest.delete({ where: { id: requestId } });
      return res.status(200).json({
        success: true,
        message: "Request rejected."
      });
    }
    if (action === "ACCEPT") {
      await prisma.$transaction(async (tx) => {
        await tx.friendRequest.update({
          where: { id: requestId },
          data: { status: 'ACCEPTED' }
        });
        if (friendRequest.origin === 'SEARCH' || !friendRequest.connectionId) {
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
              id: friendRequest.connectionId,
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
      await Promise.all([
        redisManager.userDetail.cacheConnectionList(userId, [friendRequest.senderId], ConnectionListType.FRIEND),
        redisManager.userDetail.cacheConnectionList(friendRequest.senderId, [userId], ConnectionListType.FRIEND)
      ])
      return res.status(200).json({
        success: true,
        message: "Friend Request accepted."
      });
    }
  } catch (err) {
    next(err);
  }
}

export const handleUnfriendRequest = async (req:Request,res:Response,next:NextFunction) => {
  try{
    const { userId: targetUserId }: userIdType = req.validatedData.params;
    const myProfileId = req.user!.profile!.id;
    const now = new Date();
    const THIRTY_DAYS = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const connection = await prisma.connection.findFirst({
      where: {
        status: 'FRIEND',
        OR: [
          { user1Id: myProfileId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: myProfileId }
        ]
      },
      select: { id: true, user1Id: true }
    });
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "No active friendship found" 
      });
    }
    const isUser1 = connection.user1Id === myProfileId;
    await prisma.connection.update({
      where: { id: connection.id },
      data: {
        status: 'UNFRIENDED',
        finalDeleteAt: THIRTY_DAYS,
        [isUser1 ? 'user1DeletedAt' : 'user2DeletedAt']: now
      }
    });
    Promise.all([
      redisManager.userDetail.cacheConnectionList(myProfileId, [], ConnectionListType.FRIEND),
      redisManager.userDetail.cacheConnectionList(targetUserId, [], ConnectionListType.FRIEND)
    ]).catch(err => console.error("Failed to invalidate friend cache on unfriend:", err));

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
    const profileId = req.user!.profile!.id;
    const now = new Date();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const userDetails = await prisma.user.findUnique({
      where:{ id:userId },
      select:{
        password:true,
        reactivatedAt:true
      }
    });
    if (userDetails!.reactivatedAt && (now.getTime() - userDetails!.reactivatedAt.getTime() < SEVEN_DAYS)) {
      return res.status(400).json({
        success:false,
        message:"You can only deactivate your account once every 7 days"
      })
    }
    const isMatch = await bcrypt.compare(password,userDetails!.password);
    if(!isMatch){
      return res.status(401).json({
        success:false,
        message:'Invalid password'
      })
    }
    await prisma.user.update({
      where:{ id:userId },
      data:{
        deletedAt: now,
        tokenVersion:{increment:1},
        profile:{ 
          update:{ isActive: false }
        }
      }
    })
    await Promise.all([
      redisManager.match.leaveQueue(profileId),
      redisManager.userDetail.cacheConnectionList(profileId, [], ConnectionListType.FRIEND),
      redisManager.auth.invalidateSession(userId)
    ])
    res.clearCookie("token",{...COOKIE_OPTIONS,maxAge:0});
    res.json({
      success:true,
      messgage:"Account deactivated"
    })
  } catch (err) {
    next(err)   
  }
}