import {Client,Account,TablesDB,Query,ID,Permission,Role} from "node-appwrite";

const DB="graveyard-db";
const T={g:"graves",e:"grave-events",t:"tributes",f:"flower-gifts",w:"wallets"};
const now=()=>new Date().toISOString();
const clean=(v,n=2000)=>String(v??"").trim().slice(0,n);
const num=v=>Number.isSafeInteger(Number(v))?Number(v):0;
const out=(res,status,body)=>res.json(body,status);

export default async ({req,res,log})=>{
  if(req.method==="OPTIONS") return res.send("",204);
  const endpoint=process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const project=process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const key=req.headers["x-appwrite-key"]||req.headers["X-Appwrite-Key"];
  const client=new Client().setEndpoint(endpoint).setProject(project).setKey(key);
  const db=new TablesDB(client);
  const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
  let user=null;
  const jwt=req.headers["x-appwrite-user-jwt"]||req.headers["X-Appwrite-User-JWT"];
  if(jwt){
    try{
      const userClient=new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt);
      user=await new Account(userClient).get();
    }catch{}
  }
  const need=()=>{if(!user)throw Object.assign(Error("Please sign in first."),{status:401})};
  const list=(table,queries=[])=>db.listRows({databaseId:DB,tableId:table,queries:[...queries,Query.limit(100)]});
  const get=(table,id)=>db.getRow({databaseId:DB,tableId:table,rowId:id});
  const create=(table,data,permissions=[])=>db.createRow({databaseId:DB,tableId:table,rowId:ID.unique(),data,permissions});
  const update=(table,id,data)=>db.updateRow({databaseId:DB,tableId:table,rowId:id,data});
  const event=(id,type,details)=>create(T.e,{grave_id:id,actor_id:user?user.$id:null,event_type:type,details,created_at:now()});
  try{
    switch(body.action){
      case "explore":{
        const queries=[Query.equal("visibility",["public"]),Query.orderDesc("buried_at")];
        if(body.status&&body.status!=="all") queries.push(Query.equal("status",[body.status]));
        if(body.search) queries.push(Query.search("title",clean(body.search,100)));
        const result=await db.listRows({databaseId:DB,tableId:T.g,queries:[...queries,Query.limit(Math.min(60,Math.max(1,num(body.limit)||30)))]});
        const all=await list(T.g,[Query.equal("visibility",["public"])]);
        return out(res,200,{graves:result.rows,stats:{graves:all.total,flowers:all.rows.reduce((sum,g)=>sum+num(g.flower_count),0),resurrections:all.rows.reduce((sum,g)=>sum+num(g.resurrection_count),0)}});
      }
      case "mine":{
        need();
        const result=await list(T.g,[Query.equal("owner_id",[user.$id]),Query.orderDesc("created_at")]);
        return out(res,200,{graves:result.rows});
      }
      case "wallet":{
        need();
        const result=await list(T.w,[Query.equal("user_id",[user.$id])]);
        return out(res,200,{balance:result.rows.length?result.rows[0].balance:0});
      }
      case "create-grave":{
        need();
        const title=clean(body.title,120);
        if(title.length<2) throw Object.assign(Error("Title must be at least 2 characters."),{status:400});
        const visibility=body.visibility==="public"?"public":"private";
        const grave=await create(T.g,{
          owner_id:user.$id,title,description:clean(body.description,2500),
          death_reason:clean(body.death_reason,1500),status:"buried",visibility,
          created_at:now(),buried_at:now(),resurrection_count:0,flower_count:0,
          visit_count:0,theme_id:["classic","moonlit","moss"].includes(body.theme_id)?body.theme_id:"classic",
          image_file_id:null
        },[Permission.read(Role.user(user.$id)),Permission.update(Role.user(user.$id)),Permission.delete(Role.user(user.$id))]);
        await event(grave.$id,"buried","Idea laid to rest");
        return out(res,201,{grave});
      }
      case "view-grave":{
        let grave=await get(T.g,clean(body.grave_id,36));
        if(grave.visibility!=="public"&&(!user||grave.owner_id!==user.$id))
          throw Object.assign(Error("This grave is private."),{status:404});
        if(!user||grave.owner_id!==user.$id)
          grave=await update(T.g,grave.$id,{visit_count:num(grave.visit_count)+1});
        const tributes=await list(T.t,[Query.equal("grave_id",[grave.$id]),Query.orderDesc("created_at")]);
        return out(res,200,{grave,tributes:tributes.rows});
      }
      case "tribute":{
        need();
        const grave=await get(T.g,clean(body.grave_id,36));
        if(grave.visibility!=="public"&&grave.owner_id!==user.$id) throw Error("Grave not found");
        const message=clean(body.message,500);
        if(message.length<2) throw Error("Write a little more.");
        const tribute=await create(T.t,{grave_id:grave.$id,author_id:user.$id,message,created_at:now()},[Permission.read(Role.any()),Permission.delete(Role.user(user.$id))]);
        await event(grave.$id,"tribute","Visitor left a tribute");
        return out(res,201,{tribute});
      }
      case "flower":{
        need();
        const grave=await get(T.g,clean(body.grave_id,36));
        if(grave.visibility!=="public"&&grave.owner_id!==user.$id) throw Error("Grave not found");
        const quantity=Math.min(5,Math.max(1,num(body.quantity)||1));
        await create(T.f,{grave_id:grave.$id,sender_id:user.$id,flower_type:["wildflower","rose","lily"].includes(body.flower_type)?body.flower_type:"wildflower",quantity,created_at:now()},[Permission.read(Role.any())]);
        await update(T.g,grave.$id,{flower_count:num(grave.flower_count)+quantity});
        await event(grave.$id,"flowers",`${quantity} flower(s)`);
        return out(res,200,{ok:true});
      }
      case "resurrect":{
        need();
        const grave=await get(T.g,clean(body.grave_id,36));
        if(grave.owner_id!==user.$id) throw Object.assign(Error("Only the owner can do that."),{status:403});
        const live=body.resurrect===true;
        if((live&&grave.status!=="buried")||(!live&&grave.status!=="resurrected"))
          throw Error("The grave is already in that state.");
        const changes=live
          ?{status:"resurrected",resurrected_at:now(),resurrection_count:num(grave.resurrection_count)+1}
          :{status:"buried",buried_at:now()};
        const updated=await update(T.g,grave.$id,changes);
        await event(grave.$id,live?"resurrected":"buried",live?"Idea brought back":"Idea buried again");
        return out(res,200,{grave:updated});
      }
      case "hall":{
        const result=await list(T.g,[Query.equal("visibility",["public"])]);
        const graves=[...result.rows].sort((a,b)=>num(b.resurrection_count)-num(a.resurrection_count));
        return out(res,200,{graves:graves.slice(0,9),stats:{
          resurrections:result.rows.reduce((sum,g)=>sum+num(g.resurrection_count),0),
          flowers:result.rows.reduce((sum,g)=>sum+num(g.flower_count),0),
          visits:result.rows.reduce((sum,g)=>sum+num(g.visit_count),0)
        }});
      }
      default:return out(res,404,{error:"Unknown action."});
    }
  }catch(error){
    log(`API ${body.action}: ${error.message}`);
    return out(res,error.status||400,{error:error.message||"Something went wrong."});
  }
};
