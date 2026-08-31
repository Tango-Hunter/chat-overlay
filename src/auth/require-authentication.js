/*
 * Name: require-authentication.js
 * Author: Tango Hunter
 * Date Created: 8/27/26
 * Description: Middleware for validating and enforcing operator authentication.
 */

const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000;
const SESSION_MAXIMUM_AGE = 8 * 60 * 60 * 1000;


/*==============================================================================
    SESSION VALIDATION
==============================================================================*/

export function isSessionAuthenticated(session) {

    if (!session?.authenticated) {
        return false;
    }

    const now = Date.now();
    const createdAt = Number(session.createdAt);
    const lastActivity = Number(session.lastActivity);

    if (!createdAt || !lastActivity) {
        return false;
    }

    if (now - lastActivity > SESSION_IDLE_TIMEOUT) {
        return false;
    }

    if (now - createdAt > SESSION_MAXIMUM_AGE) {
        return false;
    }

    return true;
}


/*==============================================================================
    SESSION ACTIVITY
==============================================================================*/

function updateSessionActivity(session) {
    session.lastActivity = Date.now();
}


/*==============================================================================
    DESTROY EXPIRED SESSION
==============================================================================*/

function destroySession(req) {

    return new Promise(resolve => {
        if (!req.session) {
            resolve();
            return;
        }

        req.session.destroy(() => resolve());
    });
}


/*==============================================================================
    API AUTHENTICATION
==============================================================================*/

export async function requireAuthentication(req, res, next) {

    if (!isSessionAuthenticated(req.session)) {

        await destroySession(req);

        return res.status(401).json({
            authenticated: false
        });
    }

    updateSessionActivity(req.session);

    req.session.save(error => {

        if (error) {
            console.error(
                "Failed to update authentication session.",
                error
            );

            return res.status(500).json({
                authenticated: false,
                message: "Authentication system failure."
            });
        }

        next();
    });
}


/*==============================================================================
    PAGE AUTHENTICATION
==============================================================================*/

export async function requirePageAuthentication(req, res, next) {

    if (!isSessionAuthenticated(req.session)) {

        await destroySession(req);

        const returnPath =
            encodeURIComponent(
                req.originalUrl
            );

        return res.redirect(
            `/authentication?return=${returnPath}`
        );
    }

    updateSessionActivity(req.session);

    req.session.save(error => {

        if (error) {
            console.error(
                "Failed to update authentication session.",
                error
            );

            return res.status(500).send(
                "Authentication system failure."
            );
        }

        next();
    });
}
