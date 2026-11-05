import {Client,TablesDB,Query} from "node-appwrite";

export default async ({req,log,error})=>{
  try{
    const key=req.headers["x-appwrite-key"]||req.headers["X-Appwrite-Key"];
    const client=new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(key);
    const db=new TablesDB(client);
    const result=await db.listRows({databaseId:"graveyard-db",tableId:"graves",queries:[Query.limit(1)]});
    log(`Daily safe check completed; total graves: ${result.total}`);
    return {status:"ok",checkedAt:new Date().toISOString()};
  }catch(error){
    error(error.message);
    throw error;
  }
};
