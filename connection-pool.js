import {MongoClient} from "mongodb";
const URL = 'mongodb://localhost:27017/swetaDb';
const connection_queue = [], waiting_queue=[];

async function nonPoolConnection() {
    let mongoConnection;
    const connDb = new MongoClient(URL);
    mongoConnection = await connDb.connect();
    return mongoConnection;
}

async function invokeNonPoolRequest() {
    try {
        const startTime = Date.now();
        console.log('Before starting request...........starttime:: '+(new Date()));
        for(let i=1; i<=5500; i++){
            const connection = await nonPoolConnection();
            const db = connection.db('swetaDb');
            await db.listCollections().toArray();
            connection.close();
        }
        const endTime = Date.now();
        console.log('after completing request...........endTime:: '+(new Date()));
        const timeDifference = endTime - startTime; 
        console.log('Time Difference (in ms):', timeDifference+'ms');
    } catch(err) {
        console.log('Error.......', err);
    }
}

async function invokePoolRequest() {
    const startTime = Date.now();
    console.log('Before starting request...........starttime:: '+(new Date()));
    await createPoolConnection();
    let request = [];
    for(let i=1; i<=15; i++){
        request.push(
            new Promise(async (resolve, reject) => {
                let dbConn = await getPoolConnection();
                try {
                    const db = dbConn.db('swetaDb');
                    await db.listCollections().toArray();
                    resolve();
                } catch(error) {
                    console.error(`Error processing request ${i}:`, error);
                    reject(error);
                } finally {
                    if(dbConn) {
                        releaseConnection(dbConn);
                    }
                    
                }
            })
        )
    }

    await Promise.all(request);
    const endTime = Date.now();
    console.log('after completing request...........endTime:: '+(new Date()));
    const timeDifference = endTime - startTime;
    console.log('Time Difference (in ms):', timeDifference+'ms');
}

async function createPoolConnection() {
    try {
        let mongoConnection;
        for (let index = 0; index < 10; index++) {
            const connDb = new MongoClient(URL);
            mongoConnection = await connDb.connect();
            connection_queue.push(mongoConnection);
        }
    } catch(err) {
        console.error('Error creating pool connection:', err);
        throw new Error("Failed to create connections for the pool");
    }
}

async function getPoolConnection() {
    if(connection_queue.length > 0) {
        console.log('Taking connection from pool, remaining connections:', connection_queue.length);
        return connection_queue.pop();
    } else {
        console.log('No connections available, adding request to waiting queue.');
        return new Promise((resolve) => {
            waiting_queue.push(resolve);
        });
    }
}

function releaseConnection(connection) {
    
    if(waiting_queue.length > 0) {
        console.log('Releasing connection. Waiting queue size:', waiting_queue.length);
        console.log('Resolving waiting request.');
        let resolve = waiting_queue.shift();
        resolve(connection);
    } else {
        console.log('Returning connection to pool.');
        connection_queue.push(connection);
        console.log('Connection pool size after returning:', connection_queue.length);
    }
}

//invokeNonPoolRequest();
invokePoolRequest();