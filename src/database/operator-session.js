/*
 * Name: operator-session.js
 * Author: Tango Hunter
 * Date: 8/26/26
 * Description: Initializes the PostgreSQL session table used by the operator authentication system.
 */


import config from "../configs/config.js";


/*==============================================================================
    TABLE CONFIGURATION
==============================================================================*/

const TABLE_NAME = "operator_sessions";


/*==============================================================================
    CREATE SESSION TABLE
==============================================================================*/

export async function createOperatorSessionTable() {

    const query = `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            sid TEXT PRIMARY KEY,
            sess JSON NOT NULL,
            expire TIMESTAMP(6) NOT NULL
        );
    `;

    await config.database.query(query);

    console.log(
        `Session table "${TABLE_NAME}" is ready.`
    );
}


/*==============================================================================
    CREATE SESSION TABLE INDEX
==============================================================================*/

export async function createOperatorSessionIndex() {

    const query = `
        CREATE INDEX IF NOT EXISTS operator_sessions_expire_idx
        ON ${TABLE_NAME} (expire);
    `;

    await config.database.query(query);

    console.log(
        "Session expiration index is ready."
    );
}


/*==============================================================================
    INITIALIZE SESSION DATABASE
==============================================================================*/

export async function initializeOperatorSession() {

    console.log(
        "Initializing operator session database..."
    );

    try {

        await createOperatorSessionTable();
        await createOperatorSessionIndex();

        console.log(
            "Operator session database initialized successfully."
        );

    }
    catch (error) {

        console.error(
            "Failed to initialize operator session database."
        );

        throw error;
    }
}
