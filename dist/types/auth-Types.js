"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserEmail = exports.getUserId = exports.requireAuthentication = exports.getUserFromRequest = exports.hasValidUser = exports.isAuthenticatedRequest = void 0;
const isAuthenticatedRequest = (req) => {
    if (!('user' in req))
        return false;
    const user = req.user;
    if (typeof user !== 'object' || user === null)
        return false;
    const userObj = user;
    return 'uid' in userObj && typeof userObj.uid === 'string';
};
exports.isAuthenticatedRequest = isAuthenticatedRequest;
const hasValidUser = (req) => {
    return (0, exports.isAuthenticatedRequest)(req) &&
        req.user &&
        typeof req.user.uid === 'string' &&
        req.user.uid.length > 0;
};
exports.hasValidUser = hasValidUser;
const getUserFromRequest = (req) => {
    if (!(0, exports.isAuthenticatedRequest)(req)) {
        return null;
    }
    if (!(0, exports.hasValidUser)(req)) {
        return null;
    }
    return req.user;
};
exports.getUserFromRequest = getUserFromRequest;
const requireAuthentication = (req) => {
    const user = (0, exports.getUserFromRequest)(req);
    if (!user) {
        throw new Error('Authentication required');
    }
    return user;
};
exports.requireAuthentication = requireAuthentication;
const getUserId = (req) => {
    const user = (0, exports.requireAuthentication)(req);
    return user.uid;
};
exports.getUserId = getUserId;
const getUserEmail = (req) => {
    const user = (0, exports.requireAuthentication)(req);
    return user.email;
};
exports.getUserEmail = getUserEmail;
