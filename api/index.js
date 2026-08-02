import login from "../server/login.js";
import register from "../server/register.js";
import profile from "../server/profile.js";
import updateAvatar from "../server/update-avatar.js";
import activate from "../server/activate.js";
import createKey from "../server/create-key.js";
import stats from "../server/stats.js";

export default async function handler(req,res){
  const path = (req.url || "").split("?")[0].replace(/^\/api\/?/, "");

  if(req.method === "OPTIONS") return res.status(204).end();

  if(path === "login") return login(req,res);
  if(path === "register") return register(req,res);
  if(path === "profile") return profile(req,res);
  if(path === "update-avatar") return updateAvatar(req,res);
  if(path === "activate") return activate(req,res);
  if(path === "create-key") return createKey(req,res);
  if(path === "stats") return stats(req,res);

  if(path === "configs") return res.json({success:true,version:"2.4",minecraft:"1.21.4"});
  if(path === "payment/webhook") return res.status(501).json({success:false,message:"Подключите webhook выбранной платёжной системы"});

  return res.status(404).json({success:false,message:"API route not found"});
}
